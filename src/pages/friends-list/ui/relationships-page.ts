import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ApiService} from '@shared/api/api.service';
import {FormsModule} from '@angular/forms';
import {FriendsHeader} from '@widgets/friends/ui/friends-header';
import {InputComponent} from '@shared/ui/input';
import {NotificationService} from '@shared/model/notification.service';
import {FriendPending} from '@widgets/friends/ui/friends-pending';

@Component({
  selector: 'RelationshipsPage',
  standalone: true,
  imports: [CommonModule, FormsModule, FriendsHeader, InputComponent, FriendPending],
  template:
    `
      <FriendsHeader (filterChanged)="onFilterChanged($event)"></FriendsHeader>


      <!-- Показать контент, если фильтр 'all' -->
      <div *ngIf="filter === 'all'">

        <div class="flex flex-col space-y-2 px-6 pt-6">
          <h2 class="text-xl font-semibold text-typo-secondary">Добавить в друзья</h2>
          <span class="text-sm text-typo-secondary">Вы можете добавить друга по имени пользователя</span>
        </div>

        <!-- Поле ввода и кнопка поиска -->
        <div class="h-24 flex items-center px-6 relative">

          <app-input class="w-full"
                     [placeholder]="'Найти друзей'"
                     [(ngModel)]="username"
                     (keyup.enter)="searchFriends()"
                     (input)="onUsernameChange()">

          </app-input>

          <div class="absolute right-10 flex space-x-4">
            <svg class="w-5 h-5 text-typo-secondary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
        </div>


        <!-- Список найденных пользователей -->
        <div class="overflow-y-auto space-y-3 px-6 mb-4" >

          <div class="flex items-center space-x-3 py-3 px-3 justify-between rounded-md bg-main-surface-secondary"
               *ngFor="let data of foundUsers">

            <div class="flex items-center space-x-3" *ngIf="foundUsers.length > 0">
              <img class="w-10 h-10"
                   [src]="data.avatar || 'avatars/default-avatar.png'"
                   alt="{{ data.name }}">
              <span class="text-sm text-gray-300">{{ data.name }}</span>
            </div>

            <button class="text-sm text-white p-3 py-3 rounded-2xl bg-green-500 transition duration-300"
                    *ngIf="!isUserAdded(data.user.id)"
                    (click)="sendFriendRequest(data.user.id, data)">
              Добавить
            </button>

            <span *ngIf="isUserAdded(data.user.id)" class="text-typo-secondary text-sm">Уже добавлен</span>
          </div>

          <p *ngIf="foundUsers.length === 0 && username" class="text-center text-typo-secondary mt-4">
            Пользователи не найдены
          </p>
        </div>

      </div>

      <div *ngIf="filter === 'waiting'">
        <FriendPending></FriendPending>
      </div>
    `
})

export class RelationshipsPage {
  username: string = '';
  foundUsers: any[] = [];
  addedUsers: Set<number> = new Set();
  filter: 'all' | 'waiting' | 'online' = 'all';

  private typingTimeout: any;

  constructor(private apiService: ApiService, private notification: NotificationService) {}

  // Метод для поиска пользователей
  searchFriends() {
    this.apiService.searchUsers(this.username).subscribe(
      (users: any) => {
        this.foundUsers = users;
      },
      (error) => {
        console.error('Ошибка при поиске пользователей:', error);
      }
    );
  }

  // Метод для отправки запроса на дружбу
  sendFriendRequest(userId: number, user: any) {
    this.apiService.postFriendRequest(userId).subscribe(
      () => {
        // Уведомление
        this.notification.show('Запрос на дружбу отправлен!', 'success');
        this.foundUsers = this.foundUsers.filter(u => u.id !== user.id); // Удаляем пользователя из списка найденных пользователей
      },
      () => {
        this.notification.show('Упс, какая-то ошибка сервера.', 'error');
      }
    );
  }

  // Обработчик события ввода в поле
  onUsernameChange() {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.searchFriends(); // Запускаем поиск с небольшой задержкой
    }, 500); // Задержка 500 мс, чтобы избежать слишком частых запросов
  }

  // Метод для проверки, был ли пользователь уже добавлен
  isUserAdded(userId: number): boolean {
    return this.addedUsers.has(userId); // Проверяем, есть ли пользователь в списке добавленных
  }

  // Обработчик изменения фильтра
  onFilterChanged(newFilter: 'all' | 'waiting' | 'online') {
    this.filter = newFilter;
  }

}
