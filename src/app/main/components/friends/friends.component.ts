import { Component } from '@angular/core';
import {ApiService} from "../../../core/services/api.service";

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent {
  username: string = '';
  foundUsers: any[] = [];
  filteredUsers: any[] = [];
  filter: 'all' | 'waiting' | 'online' = 'all';

  constructor(private apiService: ApiService) {
  }

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
  sendFriendRequest(userId: number) {
    this.apiService.sendFriendRequest(userId).subscribe(
      () => {
        alert('Запрос на дружбу отправлен'); // Уведомление о том, что запрос был отправлен
      },
      (error: any) => {
        // Обработка ошибок при отправке запроса на дружбу
        if (error.error && error.error.detail) {
          alert(error.error.detail); // Показать сообщение об ошибке
        } else {
          console.error('Ошибка при отправке запроса на дружбу:', error);
          alert('Произошла ошибка при отправке запроса на дружбу.'); // Общее сообщение об ошибке
        }
      }
    );
  }

  // Обработчик изменения фильтра
  onFilterChanged(newFilter: 'all' | 'waiting' | 'online') {
    this.filter = newFilter;
  }

}
