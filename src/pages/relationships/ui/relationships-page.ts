import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@shared/api/api.service';
import { FormsModule } from '@angular/forms';
import { FriendsHeader } from '@widgets/friends/ui/friends-header';
import { InputComponent } from '@shared/ui/input';
import { NotificationService } from '@shared/model/notification.service';
import { FriendPending } from '@widgets/friends/ui/friends-pending';
import { AvatarUI } from '@shared/ui/avatar';
import { FriendsStoreService } from '@entities/friend';

@Component({
  selector: 'RelationshipsPage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FriendsHeader, InputComponent, FriendPending, AvatarUI],
  template: `
    <FriendsHeader
      [pendingCount]="store.pendingCount()"
      (filterChanged)="onFilterChanged($event)"
    />

    <div *ngIf="filter === 'all'">
      <div class="flex flex-col space-y-2 px-6 pt-6">
        <h2 class="text-xl font-semibold text-typo-secondary">Добавить в друзья</h2>
        <span class="text-sm text-typo-secondary">Вы можете добавить друга по имени пользователя</span>
      </div>

      <div class="h-24 flex items-center px-6 relative">
        <app-input class="w-full"
                   [placeholder]="'Найти друзей'"
                   [(ngModel)]="username"
                   (keyup.enter)="searchFriends()"
                   (input)="onUsernameChange()">
        </app-input>
        <div class="absolute right-10">
          <svg class="w-5 h-5 text-typo-secondary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
          </svg>
        </div>
      </div>

      <div class="overflow-y-auto space-y-3 px-6 mb-4">
        <div class="flex items-center space-x-3 py-3 px-3 justify-between rounded-md bg-main-surface-secondary"
             *ngFor="let data of foundUsers">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full overflow-hidden">
              <AvatarUI [src]="data.avatar" [name]="data.name" />
            </div>
            <span class="text-sm text-gray-300">{{ data.name }}</span>
          </div>

          <button *ngIf="!addedUsers.has(data.user.id)"
                  class="text-sm text-white px-3 py-2 rounded-2xl bg-green-500 transition duration-300"
                  (click)="sendFriendRequest(data.user.id)">
            Добавить
          </button>
          <span *ngIf="addedUsers.has(data.user.id)" class="text-typo-secondary text-sm">Уже добавлен</span>
        </div>

        <p *ngIf="foundUsers.length === 0 && username" class="text-center text-typo-secondary mt-4">
          Пользователи не найдены
        </p>
      </div>
    </div>

    <div *ngIf="filter === 'waiting'">
      <FriendPending />
    </div>
  `
})
export class RelationshipsPage {
  protected readonly store = inject(FriendsStoreService);
  private readonly apiService = inject(ApiService);
  private readonly notification = inject(NotificationService);

  username = '';
  foundUsers: any[] = [];
  readonly addedUsers = new Set<string>();
  filter: 'all' | 'waiting' | 'online' = 'all';

  private typingTimeout: any;

  searchFriends() {
    this.apiService.searchUsers(this.username).subscribe({
      next: (users: any) => { this.foundUsers = users; },
      error: (err) => console.error('Ошибка при поиске пользователей:', err),
    });
  }

  sendFriendRequest(userId: string) {
    this.apiService.postFriendRequest(userId).subscribe({
      next: () => {
        this.notification.show('Запрос на дружбу отправлен!', 'success');
        this.addedUsers.add(userId);
      },
      error: () => this.notification.show('Упс, какая-то ошибка сервера.', 'error'),
    });
  }

  onUsernameChange() {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.searchFriends(), 500);
  }

  onFilterChanged(newFilter: 'all' | 'waiting' | 'online') {
    this.filter = newFilter;
  }
}
