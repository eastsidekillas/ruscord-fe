import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { LucideAngularModule, Trash2 } from 'lucide-angular';
import { ApiService, FullGuild, Invite, Member, Perm, errorText, hasPerm, nameOf } from '@shared/api';
import { sameDay } from '@shared/lib/dates';
import { InviteCreator } from '@features/invite-server';

const TIME = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

/** «завтра, 22:30», «сегодня, 09:05», «4 нояб, 10:00», «бессрочно». */
export function expiresText(iso: string | null, now: Date): string {
  if (!iso) return 'бессрочно';
  const d = new Date(iso);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const day = sameDay(d, now) ? 'сегодня' : sameDay(d, tomorrow) ? 'завтра' : DAY.format(d).replace('.', '');
  return `${day}, ${TIME.format(d)}`;
}

/** «0», «3 из 5». */
export function usesText(inv: Pick<Invite, 'uses' | 'max_uses'>): string {
  return inv.max_uses ? `${inv.uses} из ${inv.max_uses}` : String(inv.uses);
}

const GRID = 'grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_48px] gap-3 items-center px-4 py-3';

/**
 * «Приглашения» by the mockup: a new link for any channel the caller may
 * invite to, and — with MANAGE_GUILD — the guild's live invites with who
 * made them, how often they were used, when they expire, and deleting them.
 */
@Component({
  selector: 'InvitesTab',
  standalone: true,
  imports: [LucideAngularModule, InviteCreator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-8">
      <section aria-labelledby="ni-h" class="flex flex-col gap-4 rounded-ok-lg bg-ok-surface-1 border border-ok-border p-6">
        <h1 id="ni-h" class="m-0 text-[20px] leading-7 font-semibold">Пригласить своих</h1>
        <InviteCreator [guild]="guild()" (created)="added($event)" />
      </section>

      @if (canList()) {
        <section aria-labelledby="li-h" class="flex flex-col gap-3">
          <h2 id="li-h" class="m-0 text-[20px] leading-7 font-semibold">Действующие приглашения</h2>
          @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
          <div class="rounded-2xl bg-ok-surface-1 border border-ok-border overflow-x-auto">
            <div class="min-w-[640px]" role="table" aria-labelledby="li-h">
              <div role="row" class="${GRID} text-[12px] font-semibold tracking-[0.1em] text-ok-muted border-b border-ok-border">
                <span role="columnheader">КОД</span><span role="columnheader">КАНАЛ</span><span role="columnheader">СОЗДАЛ</span>
                <span role="columnheader">ИСПОЛЬЗОВАНО</span><span role="columnheader">ИСТЕКАЕТ</span><span role="columnheader"><span class="sr-only-ok">Удалить</span></span>
              </div>
              @for (inv of invites(); track inv.code; let last = $last) {
                <div role="row" data-invite class="${GRID} tabular-nums" [class.border-b]="!last" [class.border-ok-border]="!last">
                  <span role="cell" class="font-semibold truncate">{{ inv.code }}</span>
                  <span role="cell" class="truncate">{{ channelName(inv.channel_id) }}</span>
                  <span role="cell" class="truncate">{{ creator(inv) }}</span>
                  <span role="cell">{{ uses(inv) }}</span>
                  <span role="cell" class="text-ok-muted">{{ expires(inv) }}</span>
                  <button type="button" role="cell" (click)="remove(inv)" [disabled]="busy()" [attr.aria-label]="'Удалить приглашение ' + inv.code"
                          class="w-9 h-9 rounded-lg text-ok-danger hover:bg-ok-surface-2 flex items-center justify-center disabled:opacity-50">
                    <lucide-angular class="w-4 h-4" [img]="Trash" aria-hidden="true"></lucide-angular>
                  </button>
                </div>
              } @empty {
                @if (loaded()) { <p class="m-0 px-4 py-3 text-[13px] text-ok-muted">Действующих приглашений нет.</p> }
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class InvitesTab implements OnInit {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);

  protected readonly Trash = Trash2;
  protected readonly canList = computed(() => hasPerm(this.guild().permissions, Perm.ManageGuild));
  protected readonly invites = signal<Invite[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly names = signal<Record<string, string>>({});

  ngOnInit(): void {
    if (!this.canList()) return;
    const id = this.guild().id;
    this.api.guildInvites(id).subscribe({
      next: list => {
        this.invites.set(list);
        this.loaded.set(true);
      },
      error: err => {
        this.loaded.set(true);
        this.error.set(errorText(err, 'Не удалось загрузить приглашения'));
      },
    });
    this.api.members(id).subscribe({
      next: list => this.names.set(Object.fromEntries(list.map((m: Member) => [m.user_id, m.nick || nameOf(m.user ?? null)]))),
      error: () => undefined,
    });
  }

  protected added(inv: Invite): void {
    if (this.canList()) this.invites.update(list => [inv, ...list.filter(x => x.code !== inv.code)]);
  }

  protected channelName(id: string): string {
    const ch = this.guild().channels.find(c => c.id === id);
    return !ch ? '—' : ch.type === 0 ? '# ' + ch.name : ch.name;
  }

  protected creator(inv: Invite): string {
    return (inv.inviter_id && this.names()[inv.inviter_id]) || '—';
  }

  protected uses(inv: Invite): string { return usesText(inv); }
  protected expires(inv: Invite): string { return expiresText(inv.expires_at, new Date()); }

  protected remove(inv: Invite): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.deleteInvite(inv.code).subscribe({
      next: () => {
        this.busy.set(false);
        this.invites.update(list => list.filter(x => x.code !== inv.code));
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось удалить приглашение'));
      },
    });
  }
}
