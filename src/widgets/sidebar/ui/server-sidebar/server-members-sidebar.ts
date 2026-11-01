import { ChangeDetectionStrategy, Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { ApiService, GatewayService, Member, nameOf } from '@shared/api';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';
import { AppStateStore } from '@entities/app-state';
import { ModalService } from '@shared/model/modal.service';

/** Statuses of members come only for guilds up to this size (ruscord-core ADR-0018). */
const STATUS_MAX_MEMBERS = 250;
const PAGE = 1000;

@Component({
  selector: 'ServerMembersSidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatusUi, AvatarUI],
  template: `
    <aside aria-label="Участники" class="h-full overflow-y-auto bg-ok-sidebar px-2 py-4 flex flex-col gap-0.5">
      <ng-container *ngFor="let section of sections(); let first = first">
        <h2 class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pb-2" [class.pt-4]="!first">
          {{ section.title }} — {{ section.rows.length }}
        </h2>
        <button *ngFor="let m of section.rows; trackBy: byId" type="button" (click)="openProfile(m.user_id)"
                class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-ok-surface-1"
                [ngClass]="section.offline ? 'text-ok-muted' : 'text-ok-text'">
          <span class="relative w-8 h-8 shrink-0">
            <span class="block w-full h-full rounded-lg overflow-hidden" [class.grayscale]="section.offline">
              <AvatarUI [src]="m.avatar" [name]="m.name" [tone]="section.offline ? 'bg-ok-surface-2 text-ok-muted' : 'bg-ok-avatar text-ok-text'" />
            </span>
            <StatusUI *ngIf="withStatus() && !section.offline" [userId]="m.user_id" />
          </span>
          <span class="text-[13px] font-medium truncate">{{ m.name }}</span>
        </button>
      </ng-container>
      <p *ngIf="loaded() && !members().length" class="text-[13px] text-ok-muted px-2">Нет участников.</p>
    </aside>
  `,
})
export class ServerMembersSidebar {
  @Input({ required: true }) set guildId(id: string) {
    if (id !== this.id) {
      this.id = id;
      this.load();
    }
  }

  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly modal = inject(ModalService);
  private id = '';
  private loading?: Subscription;

  protected readonly members = signal<Member[]>([]);
  protected readonly loaded = signal(false);
  protected readonly withStatus = computed(() => this.members().length <= STATUS_MAX_MEMBERS);

  protected readonly rows = computed(() =>
    this.members()
      .map(m => {
        const u = this.store.user(m.user ?? null);
        return { user_id: m.user_id, name: m.nick || nameOf(u), username: u?.username ?? '', avatar: u?.avatar ?? null };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
  );

  /** "В сети" and "Не в сети" where statuses are known, otherwise one list. */
  protected readonly sections = computed(() => {
    const rows = this.rows();
    if (!this.withStatus()) return [{ title: 'УЧАСТНИКИ', rows, offline: false }];
    const off = rows.filter(r => this.store.status(r.user_id) === 'offline');
    const on = rows.filter(r => this.store.status(r.user_id) !== 'offline');
    return [
      { title: 'В СЕТИ', rows: on, offline: false },
      { title: 'НЕ В СЕТИ', rows: off, offline: true },
    ].filter(s => s.rows.length);
  });

  constructor() {
    const sub = inject(GatewayService).dispatches
      .pipe(filter(ev => (ev.d as Member | null)?.guild_id === this.id || ev.t === 'READY'))
      .subscribe(ev => {
        const m = ev.d as Member;
        switch (ev.t) {
          case 'READY':
            this.load(); // a new session: anything may have changed
            break;
          case 'GUILD_MEMBER_ADD':
            if (m.user) this.members.update(list => [...list.filter(x => x.user_id !== m.user_id), m]);
            else this.load();
            break;
          case 'GUILD_MEMBER_UPDATE':
            this.members.update(list => list.map(x => (x.user_id === m.user_id ? { ...x, ...m, user: m.user ?? x.user } : x)));
            break;
          case 'GUILD_MEMBER_REMOVE':
            this.members.update(list => list.filter(x => x.user_id !== (ev.d as { user_id: string }).user_id));
            break;
        }
      });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.loading?.unsubscribe();
    });
  }

  protected byId = (_: number, m: { user_id: string }) => m.user_id;

  protected openProfile(userId: string): void {
    this.modal.open('userProfile', { userId });
  }

  private load(): void {
    this.loading?.unsubscribe();
    this.members.set([]);
    this.loaded.set(false);
    const id = this.id;
    const page = (after?: string) => {
      this.loading = this.api.members(id, after).subscribe({
        next: list => {
          this.members.update(cur => [...cur, ...list]);
          this.store.notePresences(list);
          if (list.length === PAGE) page(list[list.length - 1].user_id);
          else this.loaded.set(true);
        },
        error: () => this.loaded.set(true),
      });
    };
    page();
  }
}
