import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@shared/api/api.service';
import { CommonModule } from '@angular/common';

interface InviteDetails {
  server_name: string;
  server_avatar: string | null;
  server_description: string | null;
  invite_token: string;
  member_count: number;
  online_count: number;
  creator_name: string | null;
  creator_avatar: string | null;
}

@Component({
  selector: 'app-invite-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in .35s ease both; }
  `,
  template: `
    <div class="min-h-screen bg-main-surface-primary flex items-center justify-center p-4">

      <!-- Loading skeleton -->
      <div *ngIf="loading()" class="w-full max-w-sm bg-main-surface-secondary rounded-2xl p-8 flex flex-col items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-white/10 animate-pulse"></div>
        <div class="w-40 h-4 rounded bg-white/10 animate-pulse"></div>
        <div class="w-28 h-3 rounded bg-white/10 animate-pulse"></div>
        <div class="w-36 h-10 rounded-xl bg-white/10 animate-pulse mt-2"></div>
      </div>

      <!-- Error state -->
      <div *ngIf="!loading() && error()"
           class="w-full max-w-sm bg-main-surface-secondary rounded-2xl p-8 flex flex-col items-center gap-3 animate-fade-in text-center">
        <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
          </svg>
        </div>
        <p class="text-white font-semibold text-lg">Приглашение недействительно</p>
        <p class="text-gray-400 text-sm">{{ error() }}</p>
        <button (click)="goHome()"
                class="mt-2 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
          На главную
        </button>
      </div>

      <!-- Invite card -->
      <div *ngIf="!loading() && !error() && details()"
           class="w-full max-w-sm bg-main-surface-secondary rounded-2xl overflow-hidden shadow-2xl animate-fade-in">

        <!-- Server banner area -->
        <div class="h-20 bg-gradient-to-br from-green-500 to-[#015249] relative">
          <!-- Server avatar -->
          <div class="absolute -bottom-10 left-6">
            <div class="w-20 h-20 rounded-2xl border-4 border-main-surface-secondary overflow-hidden bg-green-500 flex items-center justify-center shadow-lg">
              <img *ngIf="details()!.server_avatar"
                   [src]="details()!.server_avatar"
                   [alt]="details()!.server_name"
                   class="w-full h-full object-cover" />
              <span *ngIf="!details()!.server_avatar"
                    class="text-white text-2xl font-bold select-none">
                {{ serverInitials() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="pt-14 px-6 pb-6">

          <!-- Server name -->
          <h1 class="text-white text-xl font-bold leading-tight">{{ details()!.server_name }}</h1>

          <!-- Description -->
          <p *ngIf="details()!.server_description"
             class="text-gray-400 text-sm mt-1 line-clamp-2">
            {{ details()!.server_description }}
          </p>

          <!-- Stats row -->
          <div class="flex items-center gap-4 mt-3">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></span>
              <span class="text-gray-300 text-sm">{{ details()!.online_count }} онлайн</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0"></span>
              <span class="text-gray-300 text-sm">{{ details()!.member_count }} участников</span>
            </div>
          </div>

          <!-- Inviter line -->
          <div *ngIf="details()!.creator_name"
               class="flex items-center gap-2 mt-4 p-3 rounded-xl bg-black/20">
            <div class="w-7 h-7 rounded-full overflow-hidden bg-green-500 flex-shrink-0 flex items-center justify-center">
              <img *ngIf="details()!.creator_avatar"
                   [src]="details()!.creator_avatar"
                   class="w-full h-full object-cover" />
              <span *ngIf="!details()!.creator_avatar"
                    class="text-white text-xs font-semibold">
                {{ details()!.creator_name!.charAt(0).toUpperCase() }}
              </span>
            </div>
            <p class="text-gray-400 text-sm">
              <span class="text-white font-medium">{{ details()!.creator_name }}</span>
              приглашает вас присоединиться
            </p>
          </div>

          <!-- Divider -->
          <div class="border-t border-white/10 mt-5 mb-4"></div>

          <!-- CTA -->
          <div *ngIf="!joined()" class="flex flex-col gap-2">
            <button (click)="joinServer()"
                    [disabled]="joining()"
                    class="w-full py-3 rounded-xl bg-green-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition">
              {{ joining() ? 'Подключение...' : 'Принять приглашение' }}
            </button>
            <p class="text-center text-gray-500 text-xs">
              Присоединяясь, вы принимаете правила сервера.
            </p>
          </div>

          <!-- Success state -->
          <div *ngIf="joined()" class="flex flex-col items-center gap-3 animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
              </svg>
            </div>
            <p class="text-green-500 font-medium text-sm">Вы успешно присоединились!</p>
            <p class="text-gray-500 text-xs">Переход на сервер...</p>
          </div>

          <!-- Join error -->
          <p *ngIf="joinError()"
             class="mt-2 text-center text-red-400 text-sm">
            {{ joinError() }}
          </p>
        </div>
      </div>
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

  private token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.error.set('Неверный токен приглашения.');
      this.loading.set(false);
      return;
    }

    this.apiService.getInviteServerDetails(this.token).subscribe({
      next: (response: InviteDetails) => {
        this.details.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Ссылка недействительна или истёк срок её действия.');
        this.loading.set(false);
      },
    });
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

    this.apiService.postServerByInvite(this.token).subscribe({
      next: (res: any) => {
        this.joined.set(true);
        this.joining.set(false);
        setTimeout(() => {
          this.router.navigate([`/channels/${res.server_id}/${res.default_channel_id}`]);
        }, 1400);
      },
      error: () => {
        this.joinError.set('Не удалось присоединиться. Возможно, вы уже участник.');
        this.joining.set(false);
      },
    });
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }
}