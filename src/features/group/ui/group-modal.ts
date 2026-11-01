import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ModalService } from '@shared/model/modal.service';
import { AvatarUI } from '@shared/ui/avatar';
import { ModalFrame } from '@shared/ui/modal-frame';
import { ApiService, PublicUser, errorText, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

/** People in a group at most, the owner included (ruscord-core docs/api.md). */
export const GROUP_MAX = 10;

/** How many more can be picked: a new group has only its owner so far. */
export function groupRoom(members: number): number {
  return Math.max(0, GROUP_MAX - members);
}

/** The line under the dialog's title. */
export function roomText(room: number): string {
  return room > 0 ? `Только друзья. Можно добавить ещё ${room}.` : 'В группе уже 10 человек.';
}

interface Friend {
  id: string;
  name: string;
  avatar: string | null;
  username: string;
}

/**
 * Picks friends for a new group, or adds them to an existing one
 * (`channelId` in the modal data).
 */
@Component({
  selector: 'GroupModal',
  standalone: true,
  imports: [NgFor, NgIf, AvatarUI, ModalFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame [title]="title()" [subtitle]="roomText(room())" (closed)="close()">
      <label for="group-find" class="sr-only-ok">Найти друга</label>
      <input id="group-find" type="text" placeholder="Найти друга" autocomplete="off" (input)="query.set($any($event.target).value)"
             class="h-11 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-3.5 placeholder:text-ok-muted" />
      <div class="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
        <label *ngFor="let f of shown(); trackBy: byId" class="flex items-center gap-3 p-2 rounded-[10px] cursor-pointer hover:bg-ok-surface-2"
               [class.bg-ok-surface-2]="picked().has(f.id)">
          <span class="w-8 h-8 rounded-lg overflow-hidden shrink-0"><AvatarUI [src]="f.avatar" [name]="f.name" /></span>
          <span class="flex-1 min-w-0 truncate">{{ f.name }}</span>
          <input type="checkbox" class="w-[18px] h-[18px] accent-ok-accent" [checked]="picked().has(f.id)"
                 [disabled]="!picked().has(f.id) && picked().size >= room()" (change)="toggle(f.id)" />
        </label>
        <p *ngIf="!shown().length" class="m-0 py-2 text-[13px] text-ok-muted">{{ friends().length ? 'Никого не нашлось' : 'Некого добавить: все друзья уже здесь или друзей пока нет.' }}</p>
      </div>
      <p *ngIf="error()" role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p>
      <div class="flex gap-2 justify-end">
        <button type="button" class="h-11 px-[18px] rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold" (click)="close()">Отмена</button>
        <button type="button" class="h-11 px-[18px] rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50"
                [disabled]="!picked().size || busy()" (click)="submit()">{{ channelId ? 'Добавить' : 'Создать группу' }}</button>
      </div>
    </ModalFrame>
  `,
})
export class GroupModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);

  protected readonly channelId: string | null = this.modal.modalData()['channelId'] ?? null;
  private readonly group = computed(() => (this.channelId ? this.store.dm(this.channelId) : null));

  protected readonly query = signal('');
  protected readonly picked = signal(new Set<string>());
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly roomText = roomText;

  protected readonly title = computed(() => {
    const g = this.group();
    return g ? `Добавить в «${this.store.groupTitle(g)}»` : 'Новая группа';
  });

  protected readonly room = computed(() => groupRoom(this.group()?.recipients.length ?? 1));

  /** Friends who are not in the group yet, by name. */
  protected readonly friends = computed<Friend[]>(() => {
    const inGroup = new Set((this.group()?.recipients ?? []).map(r => r.id));
    return this.store.friends()
      .filter(r => !inGroup.has(r.id))
      .map(r => {
        const u: PublicUser | null = this.store.user(r.user ?? null);
        return { id: r.id, name: nameOf(u), avatar: u?.avatar ?? null, username: u?.username ?? '' };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  });

  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.friends().filter(f => f.name.toLowerCase().includes(q) || f.username.includes(q)) : this.friends();
  });

  protected byId = (_: number, f: Friend) => f.id;

  protected toggle(id: string): void {
    this.picked.update(s => {
      const next = new Set(s);
      if (!next.delete(id) && next.size < this.room()) next.add(id);
      return next;
    });
  }

  protected submit(): void {
    const ids = [...this.picked()];
    if (!ids.length || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const fail = (text: string) => (err: unknown) => {
      this.busy.set(false);
      this.error.set(errorText(err, text));
    };
    if (this.channelId) {
      const id = this.channelId;
      forkJoin(ids.map(u => this.api.addToGroup(id, u))).subscribe({ next: () => this.close(), error: fail('Не удалось добавить в группу') });
      return;
    }
    this.api.createGroup(ids).subscribe({
      next: dm => {
        this.store.noteDM(dm);
        this.close();
        this.router.navigate(['/channels/me', dm.id]);
      },
      error: fail('Не удалось создать группу'),
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
