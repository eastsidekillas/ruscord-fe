import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navigaton-item-dm',
  templateUrl: './navigaton-item-dm.component.html',
  styleUrls: ['./navigaton-item-dm.component.css']
})
export class NavigatonItemDMComponent implements OnInit {
  friends: any[] = [];
  currentUser: any; // Текущий пользователь
  isLoading: boolean = false;

  constructor(private apiService: ApiService, private router: Router) {
  }

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
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Ошибка открытия канала:', err);
      },
    });
  }
}
