import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';
import { StatusUIText } from '@entities/user-status';
import { AppStateStore } from '@entities/app-state';
import { ApiService, Profile, errorText, nameOf } from '@shared/api';

@Component({
  selector: 'ProfileViewModal',
  standalone: true,
  imports: [CommonModule, AvatarUI, StatusUIText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50" (click)="modal.close()">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div class="relative bg-main-surface-primary text-white w-full max-w-sm p-6 rounded-2xl shadow-xl flex justify-center items-center min-h-[300px]"
           (click)="$event.stopPropagation()">
        <button (click)="modal.close()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition" aria-label="Закрыть">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div *ngIf="loading()" class="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        <p *ngIf="!loading() && !profile()" class="text-sm text-typo-secondary">Профиль недоступен.</p>

        <div *ngIf="!loading() && user() as u" class="flex flex-col items-center text-center w-full">
          <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-main-surface-secondary mb-4">
            <AvatarUI [src]="u.avatar" [name]="name()" />
          </div>
          <h2 class="text-2xl font-semibold">{{ name() }}</h2>
          <p class="text-sm text-gray-400">{{ u.username }}</p>
          <div class="mt-2"><StatusUIText [userId]="u.id" /></div>

          <ng-container *ngIf="profile()?.bio as bio">
            <h3 class="mt-4 text-xs text-gray-500">О себе</h3>
            <p class="mt-1 text-sm text-typo-secondary whitespace-pre-line break-words">{{ bio }}</p>
          </ng-container>

          <div *ngIf="!isMe()" class="mt-6 flex gap-2">
            <button class="text-sm text-white px-4 py-2 rounded-lg bg-green-500 hover:opacity-90" (click)="message(u.id)">Написать</button>
            <button *ngIf="canAdd()" class="text-sm text-gray-200 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20" (click)="addFriend(u.id)">Добавить в друзья</button>
          </div>
        </div>
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
  /** Name and avatar stay live (USER_PROFILE_UPDATE); bio is as loaded. */
  protected readonly user = computed(() => this.store.user(this.profile()?.user ?? null));
  protected readonly name = computed(() => nameOf(this.user()));
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
