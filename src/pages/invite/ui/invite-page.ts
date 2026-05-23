import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@shared/api/api.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-invite-page',
  standalone: true,
  imports: [CommonModule],
  template:
    `
      <div class="flex flex-col items-center justify-center min-h-screen bg-main-surface-primary">
        <div class="w-full max-w-md bg-main-surface-secondary shadow-lg rounded-lg p-8">

          <div class="flex items-center justify-center mb-4">
            <img *ngIf="serverAvatar" [src]="serverAvatar" alt="Server Avatar" class="w-16 h-16 rounded-full shadow-lg" />
          </div>
          <!-- Заголовок -->
          <h2 class="text-xl font-bold text-center text-white mb-1">{{ serverName }}</h2>

          <h2 class="text-sm text-center text-white">20 участников</h2>

          <!-- Кнопка присоединения -->
          <div *ngIf="serverName && !loading" class="flex justify-center mt-4">
            <button (click)="joinServer()" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-gray-400 transition">
              Принять приглашение
            </button>
          </div>

          <!-- Сообщение об ошибке -->
          <div *ngIf="errorMessage" class="text-red-500 mt-4 p-3 bg-red-900 rounded-xl shadow-lg">
            {{ errorMessage }}
          </div>

          <!-- Сообщение о успешном присоединении -->
          <div *ngIf="successMessage" class="text-green-500 mt-4 p-3 bg-green-900 rounded-xl shadow-lg">
            {{ successMessage }}
          </div>
        </div>
      </div>

    `
})
export class InvitePage implements OnInit {
  loading = true;
  errorMessage: string = '';
  successMessage: string = '';
  token: string | null = null;
  serverAvatar: string | null = null;
  serverName: string | null = null;
  memberCount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Получаем токен из параметров URL
    this.token = this.route.snapshot.paramMap.get('token');

    if (this.token) {
      // Получаем информацию о сервере, используя токен
      this.apiService.getInviteServerDetails(this.token).subscribe({
        next: (response) => {
          this.serverName = response.server_name;
          this.serverAvatar = response.server_avatar;
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Ошибка при получении данных инвайта.';
          this.loading = false;
        }
      });
    } else {
      this.errorMessage = 'Неверный токен приглашения.';
      this.loading = false;
    }
  }

  joinServer() {
    if (this.token) {
      this.apiService.postServerByInvite(this.token).subscribe({
        next: (res: any) => {
          this.successMessage = `Вы успешно присоединились к серверу!`;
          setTimeout(() => {
            const serverId = res.server_id;
            const channelId = res.default_channel_id;
            this.router.navigate([`/channels/${serverId}/${channelId}`]);
          }, 1500);
        },
        error: () => {
          this.errorMessage = 'Ошибка при присоединении к серверу.';
        }
      });
    }
  }
}
