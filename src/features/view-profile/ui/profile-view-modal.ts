import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import { ApiService } from '@shared/api/api.service';
import { AvatarUI } from '@shared/ui/avatar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ProfileViewModal',
  standalone: true,
  imports: [CommonModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div class="relative bg-main-surface-primary text-white w-full max-w-sm p-6 rounded-2xl shadow-xl flex justify-center items-center min-h-[300px]">
        <button
          (click)="modalService.close()"
          class="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          aria-label="Закрыть"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div *ngIf="isLoading()" class="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>

        <div *ngIf="!isLoading() && user()" class="flex flex-col items-center text-center">
          <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-main-surface-secondary mb-4">
            <AvatarUI [src]="user().avatar" [name]="user().name || '?'" />
          </div>

          <h2 class="text-2xl font-semibold">{{ user().name }}</h2>
          <p class="text-sm text-gray-400">{{ user().global_name }}</p>

          <ng-container [ngSwitch]="user().status">
            <p *ngSwitchCase="'online'" class="mt-2 px-4 py-1 text-xs rounded-full bg-green-600/20 text-green-400">🟢 В сети</p>
            <p *ngSwitchCase="'idle'" class="mt-2 px-4 py-1 text-xs rounded-full bg-yellow-600/20 text-yellow-400">🌙 Не активен</p>
            <p *ngSwitchCase="'dnd'" class="mt-2 px-4 py-1 text-xs rounded-full bg-red-600/20 text-red-400">⛔️ Не беспокоить</p>
            <p *ngSwitchCase="'offline'" class="mt-2 px-4 py-1 text-xs rounded-full bg-gray-600/20 text-gray-400">⚫️ Не в сети</p>
          </ng-container>

          <h2 class="mt-4 text-xs text-gray-500" *ngIf="user().bio">Обо мне</h2>
          <p *ngIf="user().bio" class="mt-2 text-sm text-typo-secondary whitespace-pre-line">{{ user().bio }}</p>

          <p class="mt-4 text-xs text-gray-500">
            Участник с {{ user().created_at | date: 'dd.MM.yyyy' }}
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ProfileViewModal {
  readonly user = signal<any>(null);
  readonly isLoading = signal(false);

  readonly modalService = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private profileSub?: Subscription;

  constructor() {
    effect(() => {
      const userId = this.modalService.modalData()?.['userId'];
      this.profileSub?.unsubscribe();
      if (userId) {
        this.isLoading.set(true);
        this.profileSub = this.api.getUserProfile(userId).subscribe({
          next: (profile) => { this.user.set(profile); this.isLoading.set(false); },
          error: () => { this.user.set(null); this.isLoading.set(false); },
        });
      }
    });
    this.destroyRef.onDestroy(() => this.profileSub?.unsubscribe());
  }
}
