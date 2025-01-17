import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from '../../../environment/environment';
import { AuthService } from '../../auth/services/auth.service';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FriendService  {
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

  // Получить профиль текущего пользователя
  getPendingRequests(): Observable<any> {
    return from(this.api.get('friends/pending_requests/').json());
  }

  // Отправить запрос на добавление в друзья
  acceptRequest(pk: string, requestId: string): Observable<any> {
    return from(this.api.post(`friends/${pk}/accept_request/${requestId}/`).json());
  }

  // Получить список друзей
  rejectRequest(requestId: string): Observable<any> {
    return from(this.api.get(`friends/reject_request/${requestId}/`).json());
  }
}
