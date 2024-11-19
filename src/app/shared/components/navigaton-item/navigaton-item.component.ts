import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navigaton-item',
  templateUrl: './navigaton-item.component.html',
  styleUrls: ['./navigaton-item.component.css']
})
export class NavigatonItemComponent implements OnInit {
  friends: any[] = [];
  currentUser: any; // Текущий пользователь
  isLoading: boolean = false;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    // Получение текущего пользователя
    this.apiService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadFriends();
      },
      error: (err) => {
        console.error('Ошибка получения профиля:', err);
      },
    });
  }

  loadFriends(): void {
    this.apiService.getFriends().subscribe({
      next: (friends) => {
        // Обрабатываем список друзей
        this.friends = friends.map((friend: { sender: { id: any; username: any; avatar: any; }; receiver: { id: any; username: any; avatar: any; }; }) => {
          // Определяем друга как противоположную сторону
          const isSender = friend.sender.id !== this.currentUser.id;
          return {
            id: isSender ? friend.sender.id : friend.receiver.id,
            username: isSender ? friend.sender.username : friend.receiver.username,
            avatar: isSender ? friend.sender.avatar : friend.receiver.avatar,
          };
        });
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
          this.router.navigate(['/chat'], { queryParams: { uuid: channel.uuid } });
        } else {
          console.error('Ошибка: Канал не содержит UUID.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Ошибка открытия канала:', err);
      },
    });
  }
}
