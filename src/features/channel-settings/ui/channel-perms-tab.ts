import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Check, LucideAngularModule, Slash, X } from 'lucide-angular';
import { ApiService, FullGuild, GuildChannel, Member, Overwrite, Role, channelPermLabels, errorText, nameOf } from '@shared/api';
import { AvatarUI } from '@shared/ui/avatar';

export type Tri = 'deny' | 'inherit' | 'allow';

/** Where a bit stands in an overwrite. */
export function triOf(allow: bigint, deny: bigint, bit: bigint): Tri {
  if ((deny & bit) === bit) return 'deny';
  if ((allow & bit) === bit) return 'allow';
  return 'inherit';
}

/** The overwrite with one bit moved to deny, default or allow. */
export function withTri(allow: bigint, deny: bigint, bit: bigint, t: Tri): { allow: bigint; deny: bigint } {
  const a = allow & ~bit;
  const d = deny & ~bit;
  return t === 'allow' ? { allow: a | bit, deny: d } : t === 'deny' ? { allow: a, deny: d | bit } : { allow: a, deny: d };
}

interface Target { id: string; type: 1 | 2; name: string; color?: number; avatar?: string | null; saved: boolean }

const STATES: { t: Tri; label: string }[] = [
  { t: 'deny', label: 'Запретить' },
  { t: 'inherit', label: 'По умолчанию' },
  { t: 'allow', label: 'Разрешить' },
];

/**
 * «Права» of a channel by the mockup: roles and members with an overwrite
 * (@everyone always), adding one, and per permission deny / default /
 * allow. Saved with PUT /channels/{id}/permissions/{target}; the server lets
 * you set only bits you have yourself, and its refusal shows here. The
 * channel comes back through CHANNEL_UPDATE.
 */
@Component({
  selector: 'ChannelPermsTab',
  standalone: true,
  imports: [NgClass, FormsModule, LucideAngularModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap min-h-full">
      <section aria-label="Для кого" class="flex-[1_1_240px] max-w-[280px] px-4 py-12 box-border flex flex-col gap-1 border-r border-ok-border relative">
        <h1 class="m-0 mx-2 mb-2 text-[20px] leading-7 font-semibold">Права</h1>
        <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pt-2 pb-1">РОЛИ</div>
        @for (t of roleTargets(); track t.id) {
          <button type="button" (click)="select(t)" [attr.aria-current]="t.id === selectedId() ? 'true' : null"
                  class="flex items-center gap-2.5 p-2.5 rounded-[10px] text-left"
                  [ngClass]="t.id === selectedId() ? 'bg-ok-surface-2' : 'hover:bg-ok-surface-1'">
            <span class="w-3 h-3 rounded-[4px] shrink-0" [style.background]="t.color ? hex(t.color) : 'var(--color-ok-border-control)'"></span>
            <span class="truncate">{{ t.name }}</span>
          </button>
        }
        @if (memberTargets().length) {
          <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pt-3 pb-1">УЧАСТНИКИ</div>
          @for (t of memberTargets(); track t.id) {
            <button type="button" (click)="select(t)" [attr.aria-current]="t.id === selectedId() ? 'true' : null"
                    class="flex items-center gap-2.5 p-2.5 rounded-[10px] text-left"
                    [ngClass]="t.id === selectedId() ? 'bg-ok-surface-2' : 'hover:bg-ok-surface-1'">
              <span class="w-6 h-6 rounded-md overflow-hidden shrink-0 text-[11px]"><AvatarUI [src]="t.avatar ?? null" [name]="t.name" /></span>
              <span class="truncate">{{ t.name }}</span>
            </button>
          }
        }
        <button type="button" (click)="adding.set(!adding())" [attr.aria-expanded]="adding()"
                class="mt-2 h-10 rounded-[10px] border border-dashed border-ok-border-control text-ok-muted text-[13px] font-semibold hover:text-ok-text">Добавить роль или участника</button>
        @if (adding()) {
          <div role="dialog" aria-label="Добавить роль или участника"
               class="mx-0 mt-1 rounded-2xl bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-2 flex flex-col gap-1">
            @for (r of rolesToAdd(); track r.id) {
              <button type="button" (click)="addRole(r)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-ok-surface-2">
                <span class="w-2.5 h-2.5 rounded-[3px]" [style.background]="r.color ? hex(r.color) : 'var(--color-ok-border-control)'"></span>{{ r.name }}
              </button>
            }
            <label for="cp-find" class="sr-only-ok">Найти участника</label>
            <input id="cp-find" type="text" placeholder="Найти участника" [ngModel]="find()" (ngModelChange)="find.set($event)"
                   class="h-10 box-border rounded-[10px] border border-ok-border-control bg-ok-sidebar text-ok-text px-3 mt-1" />
            @for (m of membersToAdd(); track m.user_id) {
              <button type="button" (click)="addMember(m)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-ok-surface-2">{{ memberName(m) }}</button>
            }
          </div>
        }
      </section>

      @if (selected(); as t) {
        <form class="flex-[999_1_480px] min-w-0 max-w-[760px] px-10 pt-12 pb-4 box-border flex flex-col gap-4" (ngSubmit)="save(t)">
          <div class="flex items-center gap-3 flex-wrap pr-14">
            <h2 class="m-0 flex-1 text-[20px] leading-7 font-semibold">{{ t.name }} в «{{ channel().name }}»</h2>
            @if (t.saved && !isEveryone(t)) {
              <button type="button" (click)="remove(t)" [disabled]="busy()" class="h-9 px-3.5 rounded-lg bg-ok-surface-2 text-ok-danger text-[13px] font-semibold disabled:opacity-50">Убрать переопределение</button>
            } @else if (t.saved) {
              <button type="button" (click)="remove(t)" [disabled]="busy()" class="h-9 px-3.5 rounded-lg bg-ok-surface-2 text-ok-danger text-[13px] font-semibold disabled:opacity-50">Сбросить всё</button>
            }
          </div>
          <p class="m-0 text-[13px] leading-[18px] text-ok-muted">«По умолчанию» — как в ролях сервера. Менять можно только права, которые есть у вас самих.</p>

          @for (p of perms(); track p.label) {
            <div role="radiogroup" [attr.aria-label]="p.label" data-perm
                 class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-ok-sidebar flex-wrap"
                 [ngClass]="state(p.bit) === 'deny' ? 'shadow-[inset_0_0_0_1px_var(--color-ok-danger)]' : state(p.bit) === 'allow' ? 'shadow-[inset_0_0_0_1px_var(--color-ok-success)]' : ''">
              <span class="flex-[1_1_200px]">{{ p.label }}</span>
              <span class="inline-flex rounded-lg bg-ok-bg p-0.5 gap-0.5">
                @for (s of states; track s.t) {
                  <button type="button" role="radio" [attr.aria-checked]="state(p.bit) === s.t" [attr.aria-label]="s.label" [title]="s.label"
                          (click)="set(p.bit, s.t)" class="w-9 h-8 rounded-md flex items-center justify-center"
                          [ngClass]="state(p.bit) !== s.t ? 'text-ok-muted' : s.t === 'deny' ? 'bg-ok-danger text-ok-on-danger' : s.t === 'allow' ? 'bg-ok-success text-ok-on-accent' : 'bg-ok-surface-2 text-ok-text'">
                    <lucide-angular class="w-4 h-4" [img]="s.t === 'deny' ? X : s.t === 'allow' ? Check : Slash" aria-hidden="true"></lucide-angular>
                  </button>
                }
              </span>
            </div>
          }

          @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }

          @if (dirty() || !t.saved) {
            <div class="sticky bottom-4 flex items-center gap-3 px-4 py-3 rounded-[14px] bg-ok-surface-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex-wrap">
              <span class="flex-1 text-[13px]">{{ channel().type === 2 ? 'Кто сейчас в голосе, получит новые права сразу' : 'Есть несохранённые изменения' }}</span>
              <button type="button" (click)="select(t)" class="h-10 px-4 rounded-[10px] text-ok-text font-semibold">Сбросить</button>
              <button type="submit" [disabled]="busy()" class="h-10 px-4 rounded-[10px] bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Сохранить</button>
            </div>
          }
        </form>
      }
    </div>
  `,
})
export class ChannelPermsTab implements OnInit {
  readonly guild = input.required<FullGuild>();
  readonly channel = input.required<GuildChannel>();
  private readonly api = inject(ApiService);

  protected readonly states = STATES;
  protected readonly X = X;
  protected readonly Check = Check;
  protected readonly Slash = Slash;
  protected readonly perms = computed(() => channelPermLabels(this.channel().type));
  protected readonly members = signal<Member[]>([]);
  /** Targets added here and not saved yet. */
  private readonly drafts = signal<Target[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly adding = signal(false);
  protected readonly find = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly allow = signal(0n);
  private readonly deny = signal(0n);

  private readonly overwrites = computed(() => new Map(this.channel().permission_overwrites.map(o => [o.id, o])));

  private readonly targets = computed<Target[]>(() => {
    const g = this.guild();
    const ows = this.overwrites();
    const roles = [...g.roles].sort((a, b) => b.position - a.position);
    const list: Target[] = roles
      .filter(r => r.id === g.id || ows.has(r.id))
      .map(r => ({ id: r.id, type: 1, name: r.id === g.id ? '@everyone' : r.name, color: r.color, saved: ows.has(r.id) }));
    for (const o of ows.values()) {
      if (o.type !== 2) continue;
      const m = this.members().find(x => x.user_id === o.id);
      list.push({ id: o.id, type: 2, name: m ? this.memberName(m) : 'Участник', avatar: m?.user?.avatar ?? null, saved: true });
    }
    for (const d of this.drafts()) if (!list.some(t => t.id === d.id)) list.push(d);
    return list;
  });
  protected readonly roleTargets = computed(() => this.targets().filter(t => t.type === 1));
  protected readonly memberTargets = computed(() => this.targets().filter(t => t.type === 2));
  protected readonly selected = computed(() => this.targets().find(t => t.id === this.selectedId()) ?? null);

  protected readonly rolesToAdd = computed(() => {
    const have = new Set(this.targets().map(t => t.id));
    return this.guild().roles.filter(r => !have.has(r.id)).sort((a, b) => b.position - a.position);
  });
  protected readonly membersToAdd = computed(() => {
    const q = this.find().trim().toLowerCase();
    if (!q) return [];
    const have = new Set(this.targets().map(t => t.id));
    return this.members()
      .filter(m => !have.has(m.user_id) && (this.memberName(m).toLowerCase().includes(q) || (m.user?.username ?? '').includes(q)))
      .slice(0, 8);
  });

  protected readonly dirty = computed(() => {
    const o = this.overwrites().get(this.selectedId() ?? '');
    return this.allow() !== BigInt(o?.allow ?? '0') || this.deny() !== BigInt(o?.deny ?? '0');
  });

  constructor() {
    // @everyone first; keep the choice while the channel changes live.
    effect(() => {
      const list = this.targets();
      untracked(() => {
        if (!this.selectedId() && list.length) this.select(list[0]);
      });
    });
  }

  ngOnInit(): void {
    this.api.members(this.guild().id).subscribe({ next: list => this.members.set(list), error: () => undefined });
  }

  protected isEveryone(t: Target): boolean { return t.id === this.guild().id; }
  protected hex(c: number): string { return '#' + c.toString(16).padStart(6, '0'); }
  protected memberName(m: Member): string { return m.nick || nameOf(m.user ?? null); }
  protected state(bit: bigint): Tri { return triOf(this.allow(), this.deny(), bit); }

  protected select(t: Target): void {
    const o: Overwrite | undefined = this.overwrites().get(t.id);
    this.selectedId.set(t.id);
    this.error.set(null);
    this.allow.set(BigInt(o?.allow ?? '0'));
    this.deny.set(BigInt(o?.deny ?? '0'));
  }

  protected set(bit: bigint, t: Tri): void {
    const next = withTri(this.allow(), this.deny(), bit, t);
    this.allow.set(next.allow);
    this.deny.set(next.deny);
  }

  protected addRole(r: Role): void {
    this.addDraft({ id: r.id, type: 1, name: r.name, color: r.color, saved: false });
  }

  protected addMember(m: Member): void {
    this.addDraft({ id: m.user_id, type: 2, name: this.memberName(m), avatar: m.user?.avatar ?? null, saved: false });
  }

  private addDraft(t: Target): void {
    this.drafts.update(list => [...list, t]);
    this.adding.set(false);
    this.find.set('');
    this.select(t);
  }

  protected save(t: Target): void {
    this.run(this.api.putOverwrite(this.channel().id, t.id, { type: t.type, allow: this.allow().toString(), deny: this.deny().toString() }), () =>
      this.drafts.update(list => list.filter(d => d.id !== t.id)));
  }

  protected remove(t: Target): void {
    this.run(this.api.deleteOverwrite(this.channel().id, t.id), () => {
      this.drafts.update(list => list.filter(d => d.id !== t.id));
      this.selectedId.set(null);
    });
  }

  private run<T>(req: Observable<T>, done: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сохранить права'));
      },
    });
  }
}
