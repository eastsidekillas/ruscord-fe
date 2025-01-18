import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-navigaton-item-dm',
  templateUrl: './navigaton-item-dm.component.html',
  styleUrls: ['./navigaton-item-dm.component.css']
})
export class NavigatonItemDMComponent implements OnInit {
  friends: any[] = [];
  currentUser: any; // Текущий пользователь
  isLoading: boolean = false;
  unreadMessagesCount: { [key: string]: number } = {};  // Храним количество непрочитанных сообщений для каждого друга

  constructor(private apiService: ApiService, private router: Router, private socketService: SocketService) {}

  ngOnInit(): void {
    // Получаем информацию о текущем пользователе
    this.apiService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadFriends();
      },
      error: (err) => {
        console.error('Ошибка получения профиля:', err);
      },
    });

    // Подписываемся на количество непрочитанных сообщений
    this.socketService.getUnreadMessagesCount().subscribe((unreadCount: { [key: string]: number; }) => {
      this.unreadMessagesCount = unreadCount;  // Обновляем объект с количеством непрочитанных сообщений
    });
  }

  loadFriends(): void {
    // Запрашиваем список только принятых друзей
    this.apiService.getMyFriends().subscribe({
      next: (friends) => {
        this.friends = friends;
      },
      error: (err) => {
        console.error('Ошибка получения списка друзей:', err);
      },
    });
  }

  openChat(recipientId: number): void {
    this.isLoading = true;

    this.apiService.createOrGetChannel(recipientId).subscribe({
      next: (channel) => {
        this.isLoading = false;
        if (channel?.uuid) {
          // Переход с uuid в пути маршрута
          this.router.navigate([`channels/me/${channel.uuid}`]);
        } else {
          console.error('Ошибка: Канал не содержит UUID.');
        }

        // Отметим сообщения как прочитанные для этого друга
        this.socketService.markAsRead(recipientId.toString());
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Ошибка открытия канала:', err);
      },
    });
  }

  // Проверка на непрочитанные сообщения для конкретного друга
  getUnreadCount(friendId: string): number {
    return this.unreadMessagesCount[friendId] || 0;  // Возвращаем количество непрочитанных сообщений для конкретного друга
  }
}
