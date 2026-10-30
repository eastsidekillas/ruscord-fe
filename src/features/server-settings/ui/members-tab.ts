import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FullGuild, Member, Perm, Role, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { AvatarUI } from '@shared/ui/avatar';

const PAGE = 1000;

/**
 * Members of a guild with what the caller may do to them: give or take
 * roles, kick, ban. Buttons follow the caller's permissions; whether the
 * target is below the caller's highest role the server decides, and a
 * refusal shows its message.
 */
@Component({
  selector: 'MembersTab',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input [(ngModel)]="query" placeholder="Поиск участника" name="q"
           class="w-full mb-3 px-3 py-1.5 text-sm rounded-lg bg-main-surface-secondary border border-gray-700 focus:outline-none" />
    <p *ngIf="error()" class="text-red-400 text-sm mb-2">{{ error() }}</p>
    <div class="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
      <div *ngFor="let m of shown(); trackBy: byId" class="flex items-center gap-2 py-1.5">
        <div class="w-8 h-8 rounded-full overflow-hidden shrink-0"><AvatarUI [src]="avatar(m)" [name]="name(m)" /></div>
        <div class="min-w-0 flex-1">
          <div class="text-sm truncate">{{ name(m) }} <span *ngIf="m.user_id === guild().owner_id" class="text-xs text-yellow-400">владелец</span></div>
          <div class="flex flex-wrap gap-1 mt-0.5">
            <span *ngFor="let r of rolesOf(m)" class="text-[11px] px-1.5 rounded bg-white/5 text-gray-300">
              {{ r.name }}
              <button *ngIf="canRoles()" type="button" (click)="setRole(m, r, false)" title="Снять роль" class="ml-0.5 text-gray-500 hover:text-red-400">×</button>
            </span>
            <select *ngIf="canRoles() && rolesToGive(m).length" (change)="give(m, $event)"
                    class="text-[11px] bg-transparent text-green-400 focus:outline-none">
              <option value="">+ роль</option>
              <option *ngFor="let r of rolesToGive(m)" [value]="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>
        <ng-container *ngIf="actsOn(m)">
          <button *ngIf="canKick()" type="button" (click)="kick(m)" [disabled]="busy()"
                  class="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50">Выгнать</button>
          <button *ngIf="canBan()" type="button" (click)="ban(m)" [disabled]="busy()"
                  class="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40 disabled:opacity-50">Забанить</button>
        </ng-container>
      </div>
      <p *ngIf="loaded() && !shown().length" class="text-sm text-typo-secondary">Никого не найдено.</p>
    </div>
  `,
})
export class MembersTab implements OnInit {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);

  protected readonly members = signal<Member[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected query = '';

  protected readonly canKick = computed(() => hasPerm(this.guild().permissions, Perm.KickMembers));
  protected readonly canBan = computed(() => hasPerm(this.guild().permissions, Perm.BanMembers));
  protected readonly canRoles = computed(() => hasPerm(this.guild().permissions, Perm.ManageRoles));
  private readonly assignable = computed(() =>
    this.guild().roles.filter(r => r.id !== this.guild().id).sort((a, b) => b.position - a.position));

  ngOnInit(): void {
    this.load();
  }

  protected shown(): Member[] {
    const q = this.query.trim().toLowerCase();
    const list = this.members();
    return q ? list.filter(m => this.name(m).toLowerCase().includes(q) || (m.user?.username ?? '').includes(q)) : list;
  }

  protected byId = (_: number, m: Member) => m.user_id;
  protected name(m: Member): string { return m.nick || nameOf(this.store.user(m.user ?? null)); }
  protected avatar(m: Member): string | null { return this.store.user(m.user ?? null)?.avatar ?? null; }
  protected rolesOf(m: Member): Role[] { return this.assignable().filter(r => m.roles.includes(r.id)); }
  protected rolesToGive(m: Member): Role[] { return this.assignable().filter(r => !m.roles.includes(r.id)); }
  /** Nobody acts on themselves or the owner here. */
  protected actsOn(m: Member): boolean {
    return m.user_id !== this.store.me()?.id && m.user_id !== this.guild().owner_id;
  }

  protected give(m: Member, ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    const role = this.assignable().find(r => r.id === select.value);
    select.value = '';
    if (role) this.setRole(m, role, true);
  }

  protected setRole(m: Member, r: Role, on: boolean): void {
    this.run(this.api.setMemberRole(this.guild().id, m.user_id, r.id, on), 'Не удалось изменить роли', () =>
      this.members.update(list => list.map(x => x.user_id !== m.user_id ? x : {
        ...x, roles: on ? [...x.roles, r.id] : x.roles.filter(id => id !== r.id),
      })));
  }

  protected kick(m: Member): void {
    if (!confirm(`Выгнать ${this.name(m)}? Вернуться можно по приглашению.`)) return;
    this.run(this.api.kick(this.guild().id, m.user_id), 'Не удалось выгнать участника', () => this.drop(m));
  }

  protected ban(m: Member): void {
    const reason = prompt(`Забанить ${this.name(m)}? Причина (необязательно):`, '');
    if (reason === null) return;
    this.run(this.api.ban(this.guild().id, m.user_id, reason.trim()), 'Не удалось забанить участника', () => this.drop(m));
  }

  private drop(m: Member): void {
    this.members.update(list => list.filter(x => x.user_id !== m.user_id));
  }

  private load(): void {
    const id = this.guild().id;
    const page = (after?: string) =>
      this.api.members(id, after).subscribe({
        next: list => {
          this.members.update(cur => [...cur, ...list]);
          if (list.length === PAGE) page(list[list.length - 1].user_id);
          else this.loaded.set(true);
        },
        error: err => {
          this.loaded.set(true);
          this.error.set(errorText(err, 'Не удалось загрузить участников'));
        },
      });
    page();
  }

  private run(req: import('rxjs').Observable<void>, fallback: string, done: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, fallback));
      },
    });
  }
}
