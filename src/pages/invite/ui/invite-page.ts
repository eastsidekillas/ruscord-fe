import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService, InvitePreview, apiError, nameOf } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import { AppStateStore, firstTextChannel } from '@entities/app-state';
import { AvatarUI } from '@shared/ui/avatar';
import { members } from '@shared/lib/plural';
import { APP_MARK, WORDMARK } from '@shared/config/brand';

interface InviteDetails {
  server_name: string;
  server_avatar: string | null;
  server_description: string | null;
  member_count: number;
  creator_name: string | null;
  creator_avatar: string | null;
  /** When it stops working, in local time; null for an invite without an end. */
  expires: string | null;
}

@Component({
  selector: 'app-invite-page',
  standalone: true,
  imports: [CommonModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-ok-bg text-ok-text text-[15px]">
      <div class="flex items-center gap-3 text-2xl font-semibold tracking-[-0.02em]">
        <img [src]="mark" alt="" class="w-9 h-9" />{{ wordmark }}
      </div>

      <section *ngIf="loading()" aria-busy="true" aria-label="Загрузка приглашения"
               class="w-full max-w-[440px] rounded-ok-lg bg-ok-surface-1 border border-ok-border p-10 flex flex-col items-center gap-6">
        <div class="w-20 h-20 rounded-ok-lg bg-ok-surface-2 animate-pulse"></div>
        <div class="w-40 h-6 rounded-md bg-ok-surface-2 animate-pulse"></div>
        <div class="w-full h-12 rounded-ok-md bg-ok-surface-2 animate-pulse"></div>
      </section>

      <section *ngIf="!loading() && error()" role="alert"
               class="w-full max-w-[440px] rounded-ok-lg bg-ok-surface-1 border border-ok-border p-8 flex flex-col items-center gap-3 text-center">
        <img [src]="mark" alt="" class="w-10 h-10 opacity-60" />
        <h1 class="text-xl font-semibold">Приглашение недействительно</h1>
        <p class="text-[13px] text-ok-muted">{{ error() }}</p>
        <button type="button" (click)="goHome()" class="mt-1 h-10 px-4 rounded-[10px] bg-ok-surface-2 font-semibold">На главную</button>
      </section>

      <section *ngIf="!loading() && !error() && !isLoggedIn()"
               class="w-full max-w-[440px] rounded-ok-lg bg-ok-surface-1 border border-ok-border p-10 flex flex-col items-center gap-6 text-center">
        <div class="flex flex-col gap-2">
          <h1 class="text-[32px] leading-10 font-semibold tracking-[-0.02em]">Вас позвали на сервер</h1>
          <p class="text-[13px] text-ok-muted">Войдите, чтобы увидеть приглашение и принять его.</p>
        </div>
        <button type="button" (click)="goLogin()" class="w-full h-12 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold">Войти, чтобы принять</button>
      </section>

      <section *ngIf="!loading() && !error() && details() as d" aria-labelledby="inv-title"
               class="w-full max-w-[440px] rounded-ok-lg bg-ok-surface-1 border border-ok-border p-10 flex flex-col items-center gap-6 text-center">
        <div class="w-20 h-20 rounded-ok-lg overflow-hidden text-[28px]">
          <AvatarUI [src]="d.server_avatar" [name]="d.server_name" [letters]="2" tone="bg-ok-accent text-ok-on-accent" />
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-[13px] text-ok-muted">{{ d.creator_name ? d.creator_name + ' зовёт вас на сервер' : 'Вас зовут на сервер' }}</div>
          <h1 id="inv-title" class="text-[32px] leading-10 font-semibold tracking-[-0.02em] break-words">{{ d.server_name }}</h1>
          <div class="text-[13px] text-ok-muted">{{ d.member_count }} {{ members(d.member_count) }} · канал {{ d.server_description }}</div>
        </div>

        <div *ngIf="!joined()" class="w-full flex flex-col gap-2">
          <button type="button" (click)="joinServer()" [disabled]="joining()"
                  class="h-12 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-60">
            {{ joining() ? 'Подключение…' : 'Принять приглашение' }}
          </button>
          <button type="button" (click)="switchAccount()" class="h-12 rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold">Войти другим аккаунтом</button>
        </div>
        <p *ngIf="joined()" role="status" class="text-ok-success font-semibold">Вы на сервере. Открываем канал…</p>
        <p *ngIf="joinError()" role="alert" class="text-[13px] text-ok-danger">{{ joinError() }}</p>

        <p class="text-[13px] leading-[18px] text-ok-muted">
          Вы вошли как <span class="font-semibold text-ok-text">{{ username() }}</span>.
          {{ d.expires ? 'Приглашение действует до ' + d.expires + '.' : 'Приглашение бессрочное.' }}
        </p>
      </section>
    </div>
  `,
})
export class InvitePage implements OnInit {
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly details = signal<InviteDetails | null>(null);
  protected readonly joining = signal(false);
  protected readonly joined = signal(false);
  protected readonly joinError = signal<string | null>(null);
  private readonly auth = inject(AuthService);
  private readonly store = inject(AppStateStore);
  protected readonly isLoggedIn = this.auth.signedIn;
  protected readonly username = computed(() => this.auth.user()?.username ?? '');
  protected readonly wordmark = WORDMARK;
  protected readonly mark = APP_MARK;

  private token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.error.set('Неверная ссылка приглашения.');
      this.loading.set(false);
      return;
    }
    this.auth.ensureLoaded().subscribe(user => {
      if (!user) {
        this.loading.set(false);
        return;
      }
      this.apiService.invite(this.token!).subscribe({
        next: p => {
          this.details.set(toDetails(p));
          this.loading.set(false);
        },
        error: err => {
          this.error.set(apiError(err)?.code === 'rate_limited'
            ? 'Слишком много попыток, попробуйте через минуту.'
            : 'Ссылка недействительна или истёк срок её действия.');
          this.loading.set(false);
        },
      });
    });
  }

  protected readonly members = members;

  /** Signs out and comes back here after signing in as someone else. */
  protected switchAccount(): void {
    this.auth.logout().subscribe({ complete: () => this.goLogin(), error: () => this.goLogin() });
  }

  protected serverInitials(): string {
    const name = this.details()?.server_name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w.charAt(0).toUpperCase())
      .join('');
  }

  protected joinServer(): void {
    if (!this.token || this.joining()) return;
    this.joining.set(true);
    this.joinError.set(null);
    this.apiService.acceptInvite(this.token).subscribe({
      next: guild => {
        this.store.noteGuild(guild);
        this.joined.set(true);
        this.joining.set(false);
        const ch = firstTextChannel(guild);
        setTimeout(() => this.router.navigate(ch ? ['/channels', guild.id, ch.id] : ['/channels', guild.id]), 800);
      },
      error: () => {
        this.joinError.set('Не удалось присоединиться. Ссылка могла истечь.');
        this.joining.set(false);
      },
    });
  }

  protected goLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/invite/${this.token}` },
    });
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }
}

const EXPIRES_DAY = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });
const EXPIRES_TIME = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });

/** "2 ноября, 21:51" in the browser's time zone. */
export function expiresText(d: Date): string {
  return `${EXPIRES_DAY.format(d)}, ${EXPIRES_TIME.format(d)}`;
}

function toDetails(p: InvitePreview): InviteDetails {
  return {
    server_name: p.guild.name,
    server_avatar: p.guild.icon ?? null,
    server_description: `#${p.channel.name}`,
    member_count: p.member_count,
    creator_name: p.inviter ? nameOf(p.inviter) : null,
    creator_avatar: p.inviter?.avatar ?? null,
    expires: p.expires_at ? expiresText(new Date(p.expires_at)) : null,
  };
}
