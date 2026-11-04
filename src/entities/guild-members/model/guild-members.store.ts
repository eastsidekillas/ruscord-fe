import { Injectable, inject, signal } from '@angular/core';
import { Subscription, filter } from 'rxjs';
import { ApiService, GatewayService, Member } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

const PAGE = 1000;

/**
 * Members of the guild being looked at, loaded page by page and kept up to
 * date by the gateway. The member list and mentions share it, so a guild's
 * members are loaded once however many parts of the page need them.
 */
@Injectable({ providedIn: 'root' })
export class GuildMembersStore {
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private id = '';
  private loading?: Subscription;

  readonly members = signal<Member[]>([]);
  readonly loaded = signal(false);

  constructor() {
    inject(GatewayService).dispatches
      .pipe(filter(ev => (ev.d as Member | null)?.guild_id === this.id || ev.t === 'READY'))
      .subscribe(ev => {
        const m = ev.d as Member;
        switch (ev.t) {
          case 'READY':
            if (this.id) this.load(); // a new session: anything may have changed
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
  }

  /** Makes guild id the one whose members are kept; a no-op when it already is. */
  use(id: string): void {
    if (id === this.id) return;
    this.id = id;
    this.load();
  }

  member(userId: string): Member | null {
    return this.members().find(m => m.user_id === userId) ?? null;
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
