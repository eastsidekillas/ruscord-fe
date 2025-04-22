import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ApiService} from '@shared/api/api.service';

@Component({
  selector: 'FriendPending',
  standalone: true,
  imports: [CommonModule],
  template:
    `
      <div class="flex flex-col space-y-2 px-6 pt-6">
        <h2 class="text-xl font-semibold text-typo-secondary">Ожидание заявок в друзья</h2>
        <span class="text-sm text-typo-secondary">Здесь отображаются все заявки, которые вы получили</span>
      </div>



      <div class="overflow-y-auto space-y-3 px-6 p-6">
        <div class="flex items-center space-x-3 py-3 px-3 justify-between rounded-md bg-main-surface-secondary"
             *ngFor="let request of pendingRequests">

          <div class="flex items-center space-x-3"
               *ngIf="pendingRequests.length > 0">

            <img class="w-10 h-10 rounded-full"
                 [src]="request.from_user.avatar || 'avatars/default-avatar.png'"
                 alt="{{ request.from_user.name }}">


            <span class="text-sm text-gray-300">{{ request.from_user.name }}</span>
          </div>


          <div class="flex space-x-4">

            <button (click)="acceptRequest(request.id)" class="text-sm text-white p-3 py-3 rounded-2xl bg-green-500 transition duration-300">
              Принять
            </button>

            <button (click)="rejectRequest(request.id)" class="text-sm text-white p-3 py-3 rounded-2xl bg-red-500 transition duration-300">
              Отклонить
            </button>

          </div>


        </div>
      </div>


      <!-- Сообщение, если нет заявок -->
      <p *ngIf="pendingRequests.length === 0" class="text-center text-typo-secondary mt-4">
        У вас нет ожидающих заявок
      </p>

    `
})

export class FriendPending implements OnInit {

  pendingRequests: any[] = [];  // Список ожидающих заявок

  constructor(private friendService: ApiService) { }

  ngOnInit() {
    // Получаем список ожидающих заявок при инициализации компонента
    this.getPendingRequests();
  }

  // Метод для получения списка ожидающих заявок
  getPendingRequests() {
    this.friendService.getFriendRequests().subscribe(
      (response: any) => {
        this.pendingRequests = response.incoming; // Присваиваем полученные заявки
      },
      (error) => {
        console.error('Ошибка при загрузке заявок:', error);
      }
    );
  }

  // Метод для принятия заявки
  acceptRequest(requestId: number): void {
    this.friendService.postToFriendRequestAccept(requestId).subscribe(
      (response) => {
        console.log('Заявка принята', response);
        this.getPendingRequests();
      },
      (error) => {
        console.error('Ошибка при принятии заявки:', error);
      }
    );
  }

  // Метод для отклонения заявки
  rejectRequest(requestId: number) {
    this.friendService.postToFriendRequestReject(requestId).subscribe(
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
