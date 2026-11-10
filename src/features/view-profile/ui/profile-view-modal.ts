import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ProfileCard } from '@entities/profile';
import { AppStateStore } from '@entities/app-state';
import { ApiService, Profile, errorText } from '@shared/api';

@Component({
  selector: 'ProfileViewModal',
  standalone: true,
  imports: [ProfileCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50 p-4" (click)="modal.close()">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div class="relative w-full max-w-sm shadow-xl" (click)="$event.stopPropagation()">
        <button type="button" (click)="modal.close()" aria-label="Закрыть"
                class="absolute top-3 right-3 z-10 w-8 h-8 rounded-[10px] bg-ok-bg/60 text-ok-text flex items-center justify-center hover:bg-ok-bg">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        @if (loading()) {
          <div class="rounded-ok-lg bg-ok-surface-1 min-h-[240px] flex items-center justify-center">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-ok-text"></div>
          </div>
        } @else if (user(); as u) {
          <ProfileCard [user]="u" [bio]="profile()?.bio ?? ''" [statusOf]="u.deleted ? null : u.id">
            @if (!isMe() && !u.deleted) {
              <div class="mt-5 flex gap-2 flex-wrap">
                <button type="button" class="h-10 px-4 rounded-[10px] font-semibold bg-ok-accent text-ok-on-accent" (click)="message(u.id)">Написать</button>
                @if (canAdd()) {
                  <button type="button" class="h-10 px-4 rounded-[10px] font-semibold bg-ok-surface-2 text-ok-text" (click)="addFriend(u.id)">Добавить в друзья</button>
                }
              </div>
            }
          </ProfileCard>
        } @else {
          <div class="rounded-ok-lg bg-ok-surface-1 min-h-[240px] flex items-center justify-center">
            <p class="m-0 text-[14px] text-ok-muted">Профиль недоступен.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProfileViewModal {
  readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(false);
  /** Name, avatar, mood and colour stay live (USER_PROFILE_UPDATE); bio is as loaded. */
  protected readonly user = computed(() => this.store.user(this.profile()?.user ?? null));
  protected readonly isMe = computed(() => this.user()?.id === this.store.me()?.id);
  protected readonly canAdd = computed(() => {
    const u = this.user();
    return !!u && !this.store.relationship(u.id);
  });

  private sub?: Subscription;

  constructor() {
    effect(() => {
      const userId = this.modal.modalData()?.['userId'] as string | undefined;
      this.sub?.unsubscribe();
      this.profile.set(null);
      if (!userId) return;
      this.loading.set(true);
      this.sub = this.api.profile(userId).subscribe({
        next: p => { this.profile.set(p); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  protected message(userId: string): void {
    this.api.openDM(userId).subscribe({
      next: dm => {
        this.store.noteDM(dm);
        this.modal.close();
        this.router.navigate(['/channels/me', dm.id]);
      },
      error: err => this.notify.show(errorText(err, 'Не удалось открыть переписку'), 'error'),
    });
  }

  protected addFriend(userId: string): void {
    this.api.acceptOrRequest(userId).subscribe({
      next: () => this.notify.show('Запрос в друзья отправлен', 'success'),
      error: err => this.notify.show(errorText(err, 'Не удалось отправить запрос'), 'error'),
    });
  }
}
