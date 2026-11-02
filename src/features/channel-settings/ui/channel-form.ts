import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { filter, take, timeout } from 'rxjs';
import { Hash, LucideAngularModule, LucideIconData, List, Volume2 } from 'lucide-angular';
import { ApiService, FullGuild, GatewayService, GuildChannel, GuildChannelType, errorText } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

const TYPES: { value: GuildChannelType; label: string; icon: LucideIconData }[] = [
  { value: 0, label: 'Текстовый', icon: Hash },
  { value: 2, label: 'Голосовой', icon: Volume2 },
  { value: 4, label: 'Категория', icon: List },
];

/** user_limit of ruscord-core: 0 (no limit) to 99. */
const MAX_LIMIT = 99;

const FIELD = 'h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text';

/**
 * The channel form of «Создать канал»: type (when creating), name, topic of
 * a text channel, category and user limit of a voice one. Without `channel`
 * it creates, with it it edits. Needs MANAGE_CHANNELS; the server checks it
 * too. `done` fires after a save.
 */
@Component({
  selector: 'ChannelForm',
  standalone: true,
  imports: [NgClass, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
      <form class="flex flex-col gap-[18px]" (ngSubmit)="save()">
        @if (!editing()) {
          <fieldset class="border-0 m-0 p-0 flex flex-col gap-2">
            <legend class="text-[13px] font-medium text-ok-muted pb-2">Тип</legend>
            @for (t of types; track t.value) {
              <label class="flex items-center gap-3 px-3.5 py-3 rounded-ok-md cursor-pointer"
                     [ngClass]="type === t.value ? 'bg-ok-surface-2 shadow-[inset_0_0_0_2px_var(--color-ok-accent)]' : 'bg-ok-sidebar'">
                <input type="radio" name="type" class="accent-ok-accent" [value]="t.value" [checked]="type === t.value" (change)="type = t.value" />
                <lucide-angular class="w-[18px] h-[18px] text-ok-muted" [img]="t.icon" aria-hidden="true"></lucide-angular>
                <span class="flex-1">{{ t.label }}</span>
              </label>
            }
          </fieldset>
        }

        <div class="flex flex-col gap-1.5">
          <label for="cc-name" class="text-[13px] font-medium text-ok-muted">Название</label>
          <input id="cc-name" name="name" [(ngModel)]="name" maxlength="100" required class="${FIELD} px-4" />
        </div>

        @if (type === 0) {
          <div class="flex flex-col gap-1.5">
            <label for="cc-topic" class="text-[13px] font-medium text-ok-muted">Тема</label>
            <input id="cc-topic" name="topic" [(ngModel)]="topic" maxlength="1024" class="${FIELD} px-4" />
          </div>
        }

        @if (type !== 4) {
          <div class="grid gap-3" [class.grid-cols-2]="type === 2">
            <div class="flex flex-col gap-1.5">
              <label for="cc-cat" class="text-[13px] font-medium text-ok-muted">Категория</label>
              <select id="cc-cat" name="parent" [(ngModel)]="parentId" class="${FIELD} px-3">
                <option [ngValue]="null">Без категории</option>
                @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            @if (type === 2) {
              <div class="flex flex-col gap-1.5">
                <label for="cc-lim" class="text-[13px] font-medium text-ok-muted">Лимит участников</label>
                <input id="cc-lim" name="limit" type="number" min="0" [max]="maxLimit" [(ngModel)]="limit" class="${FIELD} px-3.5" />
              </div>
            }
          </div>
          @if (type === 2) {
            <span class="-mt-2 text-[12px] text-ok-muted">0 — без лимита. Лимит есть только у голосовых каналов.</span>
          }
        }

        @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }

        <div class="flex items-center gap-2">
          <span class="flex-1"></span>
          @if (!editing()) {
            <button type="button" (click)="cancelled.emit()" class="h-11 px-[18px] rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold">Отмена</button>
          }
          <button type="submit" [disabled]="busy() || !name.trim()" class="h-11 px-[18px] rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">
            {{ editing() ? 'Сохранить' : 'Создать канал' }}
          </button>
        </div>
      </form>
  `,
})
export class ChannelForm implements OnInit {
  readonly guild = input.required<FullGuild>();
  readonly channel = input<GuildChannel | null>(null);
  readonly parent = input<string | null>(null);
  readonly done = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly gateway = inject(GatewayService);

  protected readonly types = TYPES;
  protected readonly maxLimit = MAX_LIMIT;
  protected readonly editing = computed(() => this.channel());
  protected readonly categories = computed(() =>
    this.guild().channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position));
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected type: GuildChannelType = 0;
  protected name = '';
  protected topic = '';
  protected limit = 0;
  protected parentId: string | null = null;

  ngOnInit(): void {
    this.parentId = this.parent();
    const ch = this.channel();
    if (ch) {
      this.type = ch.type;
      this.name = ch.name;
      this.topic = ch.topic ?? '';
      this.limit = ch.user_limit ?? 0;
      this.parentId = ch.parent_id ?? null;
    }
  }

  protected save(): void {
    const g = this.guild();
    const name = this.name.trim();
    if (!name || this.busy()) return;
    const limit = Math.trunc(Number(this.limit) || 0);
    if (this.type === 2 && (limit < 0 || limit > MAX_LIMIT)) {
      this.error.set(`Лимит — от 0 до ${MAX_LIMIT}.`);
      return;
    }
    const ch = this.editing();
    const req = ch
      ? this.api.updateChannel(ch.id, {
          name,
          ...(ch.type === 0 ? { topic: this.topic.trim() } : {}),
          ...(ch.type === 2 ? { user_limit: limit } : {}),
          ...(ch.type !== 4 ? { parent_id: this.parentId } : {}),
        })
      : this.api.createChannel(g.id, {
          type: this.type,
          name,
          ...(this.type === 0 && this.topic.trim() ? { topic: this.topic.trim() } : {}),
          ...(this.type === 2 && limit ? { user_limit: limit } : {}),
          ...(this.type !== 4 && this.parentId ? { parent_id: this.parentId } : {}),
        });
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: created => {
        this.busy.set(false);
        this.done.emit();
        // A new text channel opens at once, like in Discord.
        if (!ch && created.type === 0) this.openWhenKnown(g.id, created.id);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сохранить'));
      },
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
}
