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
    <div class="bg-sidebar-surface-secondary border-l border-gray-700 h-full overflow-y-auto px-3 py-4">
      <h2 class="text-md font-semibold text-typo-secondary mb-2">Участники — {{ members().length }}</h2>
      <button *ngFor="let m of rows(); trackBy: byId" (click)="openProfile(m.user_id)"
              class="w-full flex items-center space-x-2 py-2 rounded-md hover:bg-main-surface-secondary text-left">
        <div class="relative w-10 h-10 shrink-0">
          <div class="w-full h-full rounded-full overflow-hidden">
            <AvatarUI [src]="m.avatar" [name]="m.name" />
          </div>
          <StatusUI *ngIf="withStatus()" [userId]="m.user_id"></StatusUI>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-sm text-typo-primary truncate">{{ m.name }}</span>
          <span class="text-xs text-typo-secondary truncate">{{ m.username }}</span>
        </div>
      </button>
      <p *ngIf="loaded() && !members().length" class="text-sm text-typo-secondary">Нет участников.</p>
    </div>
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
