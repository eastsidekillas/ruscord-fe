import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import { Subscription } from 'rxjs';
import {ApiService} from '@shared/api/api.service';

@Component({
  selector: 'ProfileViewModal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 flex items-center justify-center z-50"
      *ngIf="modalService.modalType$ | async as type"
    >

      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div
        class="relative bg-main-surface-primary text-white w-full max-w-sm p-6 rounded-2xl shadow-xl flex justify-center items-center min-h-[300px]"
        *ngIf="(modalService.modalType$ | async) === 'userProfile'"

      >
        <button
          (click)="modalService.close()"
          class="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          aria-label="Закрыть"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <ng-container *ngIf="isLoading; else profileContent">
          <div class="animate-spin rounded-full h-10 w-10  border-b-2 border-white"></div>
        </ng-container>

        <ng-template #profileContent>
          <div class="flex flex-col items-center text-center" *ngIf="user">
            <!-- Аватар или инициал -->
            <ng-container *ngIf="user.avatar; else initialAvatar">
              <img
                [src]="user.avatar"
                alt="Аватар"
                class="w-24 h-24 rounded-full border-4 border-main-surface-secondary mb-4 object-cover"
              />
            </ng-container>

            <ng-template #initialAvatar>
              <div
                class="w-24 h-24 rounded-full bg-gray-600 text-white flex items-center justify-center text-3xl font-semibold border-4 border-main-surface-secondary mb-4"
              >
                {{ user.name?.charAt(0).toUpperCase() }}
              </div>
            </ng-template>


            <h2 class="text-2xl font-semibold">{{ user.name }}</h2>
            <p class="text-sm text-gray-400">{{ user.global_name }}</p>

            <ng-container [ngSwitch]="user.status">
              <p *ngSwitchCase="'online'" class="mt-2 px-4 py-1 text-xs rounded-full bg-green-600/20 text-green-400">
                🟢 В сети
              </p>
              <p *ngSwitchCase="'idle'" class="mt-2 px-4 py-1 text-xs rounded-full bg-yellow-600/20 text-yellow-400">
                🌙 Не активен
              </p>
              <p *ngSwitchCase="'dnd'" class="mt-2 px-4 py-1 text-xs rounded-full bg-red-600/20 text-red-400">
                ⛔️ Не беспокоить
              </p>
              <p *ngSwitchCase="'offline'" class="mt-2 px-4 py-1 text-xs rounded-full bg-gray-600/20 text-gray-400">
                ⚫️ Не в сети
              </p>
            </ng-container>

            <h2 class="mt-4 text-xs text-gray-500" *ngIf="user.bio">Обо мне</h2>

            <p *ngIf="user.bio" class="mt-2 text-sm text-typo-secondary whitespace-pre-line">
              {{ user.bio }}
            </p>

            <p class="mt-4 text-xs text-gray-500">
              Участник с {{ user.created_at | date: 'dd.MM.yyyy' }}
            </p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
})
export class ProfileViewModal implements OnInit, OnDestroy {
  user: any = null;
  isLoading = true;
  private sub = new Subscription();

  constructor(
    public modalService: ModalService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.sub.add(
      this.modalService.modalData$.subscribe((data: any) => {
        console.log('[MODAL DATA]', data);
        const userId = data?.userId;
        if (userId) {
          console.log('[FETCHING PROFILE FOR]', userId);
          this.isLoading = true;
          this.api.getUserProfile(userId).subscribe({
            next: (profile) => {
              console.log('[PROFILE LOADED]', profile);
              this.user = profile;
              this.isLoading = false;
            },
            error: (err) => {
              console.error('[PROFILE ERROR]', err);
              this.user = null;
              this.isLoading = false;
            },
          });
        } else {
          console.warn('[NO USER ID IN MODAL DATA]');
        }
      })
    );
  }


  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
