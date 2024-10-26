import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { Friend } from '../interfaces/friends.interface';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private api = ky.create({
    prefixUrl: environment.API_URL,
    headers: this.getHeaders(),
  });

  constructor(private authService: AuthService) {}

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  private async refreshTokenIfNeeded(response: Response) {
    if (response.status === 401) {
      await this.authService.refreshToken();
      this.api = ky.create({
        prefixUrl: environment.API_URL,
        headers: this.getHeaders(),
      });
    }
  }

  getProfile(): Observable<any> {
    return from(this.api.get('users/profile/').json());
  }

  // Отправить запрос на добавление в друзья
  sendFriendRequest(userId: number): Observable<any> {
    return from(this.api.post(`friends/${userId}/send_request/`).json());
  }

  // Получить список друзей
  getFriends(): Observable<any> {
    return from(this.api.get('friends/').json());
  }

  // Поиск пользователей
  searchUsers(username: string): Observable<any> {
    return from(this.api.get(`users/search/?username=${username}`).json());
  }
}
