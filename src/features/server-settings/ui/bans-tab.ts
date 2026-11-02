import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { ApiService, Ban, FullGuild, Member, errorText, nameOf } from '@shared/api';
import { AvatarUI } from '@shared/ui/avatar';
import { shortDate } from './members-tab';

/**
 * «Баны» by the mockup (BAN_MEMBERS): who, why, who banned and when, and
 * lifting a ban. The moderator's name comes from the member list; one who
 * has left is not named.
 */
@Component({
  selector: 'BansTab',
  standalone: true,
  imports: [AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="b-h" class="flex flex-col gap-3">
      <h1 id="b-h" class="m-0 text-[20px] leading-7 font-semibold">Баны · {{ bans().length }}</h1>
      @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
      @for (b of bans(); track b.user_id) {
        <div data-ban class="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-ok-surface-1 border border-ok-border flex-wrap">
          <span class="w-8 h-8 rounded-lg overflow-hidden shrink-0 text-[13px]"><AvatarUI [src]="b.user.avatar" [name]="name(b)" /></span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ name(b) }}</div>
            <div class="text-[13px] text-ok-muted">{{ details(b) }}</div>
          </div>
          <button type="button" (click)="unban(b)" [disabled]="busy()"
                  class="h-8 px-3 rounded-lg border border-ok-border-control text-ok-text text-[13px] font-semibold disabled:opacity-50">Разбанить</button>
        </div>
      } @empty {
        @if (loaded()) { <p class="m-0 text-[13px] text-ok-muted">Банов нет.</p> }
      }
    </section>
  `,
})
export class BansTab implements OnInit {
  readonly guild = input.required<FullGuild>();
  private readonly api = inject(ApiService);

  protected readonly bans = signal<Ban[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly moderators = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.api.bans(this.guild().id).subscribe({
      next: list => {
        this.bans.set(list);
        this.loaded.set(true);
      },
      error: err => {
        this.loaded.set(true);
        this.error.set(errorText(err, 'Не удалось загрузить баны'));
      },
    });
    // One page is enough to name the moderators of a small server.
    this.api.members(this.guild().id).subscribe({
      next: list => this.moderators.set(Object.fromEntries(list.map((m: Member) => [m.user_id, m.nick || nameOf(m.user ?? null)]))),
      error: () => undefined,
    });
  }

  protected name(b: Ban): string { return nameOf(b.user); }

  /** «Спам ссылками» · забанил(а) Аня · 28 окт */
  protected details(b: Ban): string {
    const parts: string[] = [];
    if (b.reason) parts.push(`«${b.reason}»`);
    const who = b.moderator_id ? this.moderators()[b.moderator_id] : null;
    if (who) parts.push(`забанил(а) ${who}`);
    parts.push(shortDate(b.created_at));
    return parts.filter(Boolean).join(' · ');
  }

  protected unban(b: Ban): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.unban(this.guild().id, b.user_id).subscribe({
      next: () => {
        this.busy.set(false);
        this.bans.update(list => list.filter(x => x.user_id !== b.user_id));
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось снять бан'));
      },
    });
  }
}
