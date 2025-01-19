import { Component } from '@angular/core';
import { ApiService } from "../../../core/services/api.service";

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent {
  username: string = '';
  foundUsers: any[] = [];
  addedUsers: Set<number> = new Set();
  filter: 'all' | 'waiting' | 'online' = 'all';

  private typingTimeout: any;

  // Переменная для управления показом уведомления
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

  constructor(private apiService: ApiService) {}

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
    this.apiService.sendFriendRequest(userId).subscribe(
      () => {
        // Уведомление
        this.showNotification = true;
        this.notificationMessage = 'Запрос на дружбу отправлен!';
        this.notificationType = 'success';

        // Скрыть пользователя из списка после добавления в друзья
        this.foundUsers = this.foundUsers.filter(u => u.id !== user.id); // Удаляем пользователя из списка найденных пользователей

        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
          this.showNotification = false;
        }, 3000);
      },
      (error: any) => {
        this.showNotification = true;
        this.notificationMessage = error.error?.detail || 'Произошла ошибка при отправке запроса на дружбу.';
        this.notificationType = 'error';

        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
          this.showNotification = false;
        }, 3000);
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
