import {Component, OnInit} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.css'
})
export class ChatHeaderComponent implements OnInit{
  friend: any[] = [];
  currentUser: any; // Текущий пользователь

  constructor(private apiService: ApiService, private router: Router) {
  }

  ngOnInit(): void {
    // Получение текущего пользователя
    this.apiService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadFriend();
      },
      error: (err) => {
        console.error('Ошибка получения профиля:', err);
      },
    });
  }

  loadFriend(): void {
    this.apiService.getFriends().subscribe({
      next: (friends) => {
        // Обрабатываем список друзей
        this.friend = friends.map((friend: {
          sender: { id: any; username: any; avatar: any; };
          receiver: { id: any; username: any; avatar: any; };
        }) => {
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

}
