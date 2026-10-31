import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalService } from '@shared/model/modal.service';
import { filter, take, timeout } from 'rxjs';
import { ApiService, GatewayService, GuildChannelType, errorText } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

const TYPES: { value: GuildChannelType; label: string }[] = [
  { value: 0, label: 'Текстовый' },
  { value: 2, label: 'Голосовой' },
  { value: 4, label: 'Категория' },
];

/**
 * Creates a channel or category (modal data: serverId, parentId?) or edits
 * one (serverId, channelId). Needs MANAGE_CHANNELS; the server checks it too.
 */
@Component({
  selector: 'ChannelModal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50" (click)="close()">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <form class="relative bg-main-surface-primary text-white w-full max-w-md p-6 rounded-2xl shadow-xl flex flex-col gap-4"
            (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2 class="text-xl font-semibold text-center">{{ editing() ? 'Настройки канала' : 'Создать канал' }}</h2>

        <div *ngIf="!editing()" class="flex gap-2">
          <button *ngFor="let t of types" type="button" (click)="type = t.value"
                  class="flex-1 py-2 rounded-xl text-sm border transition"
                  [ngClass]="type === t.value ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-gray-500'">
            {{ t.label }}
          </button>
        </div>

        <label class="flex flex-col gap-1 text-sm">
          <span class="text-typo-secondary">Название</span>
          <input name="name" [(ngModel)]="name" maxlength="100" required
                 class="px-3 py-2 rounded-xl bg-main-surface-secondary border border-gray-700 focus:outline-none" />
        </label>

        <label *ngIf="type === 0" class="flex flex-col gap-1 text-sm">
          <span class="text-typo-secondary">Тема</span>
          <input name="topic" [(ngModel)]="topic" maxlength="1024"
                 class="px-3 py-2 rounded-xl bg-main-surface-secondary border border-gray-700 focus:outline-none" />
        </label>

        <label *ngIf="type !== 4" class="flex flex-col gap-1 text-sm">
          <span class="text-typo-secondary">Категория</span>
          <select name="parent" [(ngModel)]="parentId"
                  class="px-3 py-2 rounded-xl bg-main-surface-secondary border border-gray-700 focus:outline-none">
            <option [ngValue]="null">Без категории</option>
            <option *ngFor="let c of categories()" [ngValue]="c.id">{{ c.name }}</option>
          </select>
        </label>

        <p *ngIf="error()" class="text-red-400 text-sm">{{ error() }}</p>

        <div class="flex items-center gap-2 mt-2">
          <button *ngIf="editing()" type="button" (click)="remove()" [disabled]="busy()"
                  class="text-sm text-red-400 hover:underline disabled:opacity-50">Удалить</button>
          <span class="flex-1"></span>
          <button type="button" (click)="close()" class="px-4 py-2 text-sm text-gray-300 hover:text-white">Отмена</button>
          <button type="submit" [disabled]="busy() || !name.trim()"
                  class="px-4 py-2 bg-green-500 text-sm rounded-xl hover:bg-green-600 transition disabled:opacity-50">
            {{ editing() ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ChannelModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly gateway = inject(GatewayService);

  protected readonly types = TYPES;
  private readonly data = this.modal.modalData();
  protected readonly guild = computed(() => this.store.guild(this.data['serverId']));
  protected readonly editing = computed(() => this.guild()?.channels.find(c => c.id === this.data['channelId']) ?? null);
  protected readonly categories = computed(() =>
    (this.guild()?.channels ?? []).filter(c => c.type === 4).sort((a, b) => a.position - b.position));
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected type: GuildChannelType = 0;
  protected name = '';
  protected topic = '';
  protected parentId: string | null = this.data['parentId'] ?? null;

  constructor() {
    const ch = this.editing();
    if (ch) {
      this.type = ch.type;
      this.name = ch.name;
      this.topic = ch.topic ?? '';
      this.parentId = ch.parent_id ?? null;
    }
  }

  protected save(): void {
    const g = this.guild();
    const name = this.name.trim();
    if (!g || !name || this.busy()) return;
    const ch = this.editing();
    const req = ch
      ? this.api.updateChannel(ch.id, {
          name,
          ...(ch.type === 0 ? { topic: this.topic.trim() } : {}),
          ...(ch.type !== 4 ? { parent_id: this.parentId } : {}),
        })
      : this.api.createChannel(g.id, {
          type: this.type,
          name,
          ...(this.type === 0 && this.topic.trim() ? { topic: this.topic.trim() } : {}),
          ...(this.type !== 4 && this.parentId ? { parent_id: this.parentId } : {}),
        });
    this.run(req, created => {
      this.close();
      // A new text channel opens at once, like in Discord.
      if (!ch && created.type === 0) this.openWhenKnown(g.id, created.id);
    });
  }

  /**
   * Opens the new channel once the store has it. The REST answer can arrive
   * before CHANNEL_CREATE, and the channel page sends you away from a
   * channel the store does not know.
   */
  private openWhenKnown(guildId: string, channelId: string): void {
    const open = () => this.router.navigate(['/channels', guildId, channelId]);
    if (this.store.guild(guildId)?.channels.some(c => c.id === channelId)) {
      open();
      return;
    }
    // The store reduces each dispatch before later subscribers see it.
    this.gateway.dispatches.pipe(
      filter(ev => ev.t === 'CHANNEL_CREATE' && (ev.d as { id?: string } | null)?.id === channelId),
      take(1),
      timeout({ first: 10_000 }),
    ).subscribe({ next: open, error: () => undefined });
  }

  protected remove(): void {
    const ch = this.editing();
    if (!ch) return;
    const what = ch.type === 4 ? `категорию «${ch.name}» (каналы в ней останутся без категории)` : `канал «${ch.name}» со всеми сообщениями`;
    if (!confirm(`Удалить ${what}? Это нельзя отменить.`)) return;
    this.run(this.api.deleteChannel(ch.id), () => this.close());
  }

  /** The state changes through CHANNEL_* events; the answer only closes the form. */
  private run<T>(req: import('rxjs').Observable<T>, done: (v: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: v => {
        this.busy.set(false);
        done(v);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сохранить'));
      },
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
