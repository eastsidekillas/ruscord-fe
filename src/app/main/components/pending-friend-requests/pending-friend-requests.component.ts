import { Component, OnInit } from '@angular/core';
import { FriendService } from "../../../core/services/friend.service";

@Component({
  selector: 'app-pending-friend-requests',
  templateUrl: './pending-friend-requests.component.html',
  styleUrls: ['./pending-friend-requests.component.css']
})
export class PendingFriendRequestsComponent implements OnInit {
  pendingRequests: any[] = [];  // Список ожидающих заявок

  constructor(private friendService: FriendService) { }

  ngOnInit() {
    // Получаем список ожидающих заявок при инициализации компонента
    this.getPendingRequests();
  }

  // Метод для получения списка ожидающих заявок
  getPendingRequests() {
    this.friendService.getPendingRequests().subscribe(
      (response: any[]) => {
        this.pendingRequests = response; // Присваиваем полученные заявки
      },
      (error) => {
        console.error('Ошибка при загрузке заявок:', error);
      }
    );
  }

  // Метод для принятия заявки
  acceptRequest(requestId: string) {
    const userId = localStorage.getItem('user_id');  // Получаем user_id из localStorage

    if (userId) {
      this.friendService.acceptRequest(userId, requestId).subscribe(
        () => {
          // Обновляем список заявок после принятия
          this.getPendingRequests();
        },
        (error) => {
          console.error('Ошибка при принятии заявки:', error);
        }
      );
    } else {
      console.error('User ID не найден в localStorage');
    }
  }

  // Метод для отклонения заявки
  rejectRequest(requestId: string) {
    this.friendService.rejectRequest(requestId).subscribe(
      () => {
        // Обновляем список заявок после отклонения
        this.getPendingRequests();
      },
      (error) => {
        console.error('Ошибка при отклонении заявки:', error);
      }
    );
  }
}
