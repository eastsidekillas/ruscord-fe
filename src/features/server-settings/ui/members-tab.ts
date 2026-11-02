import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { LucideAngularModule, Plus, X } from 'lucide-angular';
import { ApiService, FullGuild, Member, Perm, Role, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { AvatarUI } from '@shared/ui/avatar';
import { ModalFrame } from '@shared/ui/modal-frame';
import { colorHex } from './roles-tab';

const PAGE = 1000;
const MAX_REASON = 512;
const SHORT_DATE = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

/** «12 окт»: the joining date of the mockup, without the dot. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : SHORT_DATE.format(d).replace('.', '');
}

const GRID = 'grid grid-cols-[2fr_2fr_1fr_1.6fr] gap-3 items-center px-4 py-3';

/**
 * «Участники» by the mockup: a table of members with roles, the joining date
 * and what the caller may do (give or take roles, kick, ban with a reason).
 * Buttons follow the caller's permissions; whether the target is below the
 * caller's highest role the server decides, and a refusal shows its message.
 */
@Component({
  selector: 'MembersTab',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, AvatarUI, ModalFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="m-h" class="flex flex-col gap-3">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 id="m-h" class="m-0 flex-1 text-[20px] leading-7 font-semibold">Участники · {{ members().length }}</h1>
        <label for="m-find" class="sr-only-ok">Найти участника</label>
        <input id="m-find" name="q" type="text" placeholder="Найти участника" [(ngModel)]="query"
               class="w-60 h-10 box-border rounded-[10px] border border-ok-border-control bg-ok-sidebar text-ok-text px-3.5" />
      </div>
      @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }

      <div class="rounded-2xl bg-ok-surface-1 border border-ok-border overflow-x-auto">
        <div class="min-w-[640px] flex flex-col" role="table" aria-labelledby="m-h">
          <div role="row" class="${GRID} text-[12px] font-semibold tracking-[0.1em] text-ok-muted border-b border-ok-border">
            <span role="columnheader">УЧАСТНИК</span><span role="columnheader">РОЛИ</span><span role="columnheader">НА СЕРВЕРЕ С</span><span role="columnheader"><span class="sr-only-ok">Действия</span></span>
          </div>
          @for (m of shown(); track m.user_id; let last = $last) {
            <div role="row" data-member class="${GRID}" [class.border-b]="!last" [class.border-ok-border]="!last">
              <span role="cell" class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-lg overflow-hidden shrink-0 text-[13px]"><AvatarUI [src]="avatar(m)" [name]="name(m)" /></span>
                <span class="min-w-0">
                  <span class="block font-semibold truncate">{{ name(m) }}@if (m.nick) { <span class="font-normal text-ok-muted"> (ник)</span> }</span>
                  <span class="block text-[12px] text-ok-muted truncate">{{ m.user?.username }}@if (m.user_id === guild().owner_id) { · владелец }</span>
                </span>
              </span>
              <span role="cell" class="flex gap-1.5 flex-wrap items-center relative">
                @for (r of rolesOf(m); track r.id) {
                  <span class="text-[12px] px-2 py-0.5 rounded-md bg-ok-surface-2 inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[3px]" [style.background]="r.color ? hex(r.color) : 'var(--color-ok-border-control)'"></span>{{ r.name }}
                    @if (canRoles()) {
                      <button type="button" (click)="setRole(m, r, false)" [attr.aria-label]="'Снять роль ' + r.name + ' у ' + name(m)" class="text-ok-muted hover:text-ok-danger">
                        <lucide-angular class="w-3 h-3" [img]="X" aria-hidden="true"></lucide-angular>
                      </button>
                    }
                  </span>
                } @empty {
                  @if (!canRoles() || !rolesToGive(m).length) { <span class="text-[13px] text-ok-muted">—</span> }
                }
                @if (canRoles() && rolesToGive(m).length) {
                  <button type="button" (click)="toggleGive(m)" [attr.aria-label]="'Выдать роль ' + name(m)" [attr.aria-expanded]="giving() === m.user_id"
                          class="w-6 h-6 rounded-md border border-dashed border-ok-border-control text-ok-muted hover:text-ok-text inline-flex items-center justify-center">
                    <lucide-angular class="w-3 h-3" [img]="Plus" aria-hidden="true"></lucide-angular>
                  </button>
                  @if (giving() === m.user_id) {
                    <div role="menu" [attr.aria-label]="'Роли для ' + name(m)"
                         class="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-2xl bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1.5 flex flex-col gap-0.5">
                      @for (r of rolesToGive(m); track r.id) {
                        <button type="button" role="menuitem" (click)="giving.set(null); setRole(m, r, true)"
                                class="flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-ok-surface-2">
                          <span class="w-2.5 h-2.5 rounded-[3px]" [style.background]="r.color ? hex(r.color) : 'var(--color-ok-border-control)'"></span>{{ r.name }}
                        </button>
                      }
                    </div>
                  }
                }
              </span>
              <span role="cell" class="text-[13px] text-ok-muted">{{ joined(m) }}</span>
              <span role="cell" class="flex gap-1.5 justify-end">
                @if (actsOn(m)) {
                  @if (canKick()) {
                    <button type="button" (click)="kick(m)" [disabled]="busy()" class="h-8 px-3 rounded-lg bg-ok-surface-2 text-ok-text text-[13px] font-semibold disabled:opacity-50">Выгнать</button>
                  }
                  @if (canBan()) {
                    <button type="button" (click)="banning.set(m); reason = ''" [disabled]="busy()" class="h-8 px-3 rounded-lg bg-ok-surface-2 text-ok-danger text-[13px] font-semibold disabled:opacity-50">Забанить</button>
                  }
                }
              </span>
            </div>
          } @empty {
            @if (loaded()) { <p class="m-0 px-4 py-3 text-[13px] text-ok-muted">Никого не найдено.</p> }
          }
        </div>
      </div>
    </section>

    @if (banning(); as m) {
      <ModalFrame [title]="'Забанить ' + name(m) + '?'" (closed)="banning.set(null)">
        <form class="flex flex-col gap-4" (ngSubmit)="ban(m)">
          <p class="m-0 text-[13px] leading-[18px] text-ok-muted">{{ name(m) }} выйдет с сервера и не сможет вернуться по приглашению, пока его не разбанят. Если он в голосе, его отключит сразу.</p>
          <div class="flex flex-col gap-1.5">
            <label for="ban-r" class="text-[13px] font-medium text-ok-muted">Причина <span class="font-normal">(необязательно, видят те, кто может банить)</span></label>
            <textarea id="ban-r" name="reason" rows="3" [maxlength]="maxReason" [(ngModel)]="reason"
                      class="box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-3.5 py-3 resize-y"></textarea>
          </div>
          @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
          <div class="flex gap-2 justify-end">
            <button type="button" (click)="banning.set(null)" class="h-11 px-[18px] rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold">Отмена</button>
            <button type="submit" [disabled]="busy()" class="h-11 px-[18px] rounded-ok-md bg-ok-danger text-ok-on-danger font-semibold disabled:opacity-50">Забанить</button>
          </div>
        </form>
      </ModalFrame>
    }
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
  protected readonly giving = signal<string | null>(null);
  protected readonly banning = signal<Member | null>(null);
  protected readonly maxReason = MAX_REASON;
  protected readonly Plus = Plus;
  protected readonly X = X;
  protected query = '';
  protected reason = '';

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

  protected name(m: Member): string { return m.nick || nameOf(this.store.user(m.user ?? null)); }
  protected avatar(m: Member): string | null { return this.store.user(m.user ?? null)?.avatar ?? null; }
  protected joined(m: Member): string { return shortDate(m.joined_at); }
  protected hex(c: number): string { return colorHex(c); }
  protected rolesOf(m: Member): Role[] { return this.assignable().filter(r => m.roles.includes(r.id)); }
  protected rolesToGive(m: Member): Role[] { return this.assignable().filter(r => !m.roles.includes(r.id)); }
  /** Nobody acts on themselves or the owner here. */
  protected actsOn(m: Member): boolean {
    return m.user_id !== this.store.me()?.id && m.user_id !== this.guild().owner_id;
  }

  protected toggleGive(m: Member): void {
    this.giving.update(id => (id === m.user_id ? null : m.user_id));
  }

  @HostListener('document:click', ['$event'])
  protected outside(ev: MouseEvent): void {
    const t = ev.target as HTMLElement | null;
    if (this.giving() && !t?.closest('[role="menu"], [aria-expanded]')) this.giving.set(null);
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
    this.run(this.api.ban(this.guild().id, m.user_id, this.reason.trim()), 'Не удалось забанить участника', () => {
      this.banning.set(null);
      this.drop(m);
    });
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

  private run(req: Observable<void>, fallback: string, done: () => void): void {
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
