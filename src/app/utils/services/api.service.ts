import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from "../../../environments/environment";
import { AuthService } from './auth.service';
import {Friend} from "../interfaces/friends.interface";

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

  getProfile() {
    return this.api.get('users/profile/').json();
  }

  getFriends(): Promise<Friend[]> {
    return this.api.get('friendships/friends/').json();
  }

  sendFriendRequest(data: any) {
    return this.api.post('friendships/send_request/', { json: data }).json();
  }

  getDirectMessages(receiverId: number) {
    return this.api.get(`messages/?receiver=${receiverId}/`).json();
  }

  sendDirectMessage(messageData: any) {
    return this.api.post('messages/send_message/', { json: messageData }).json();
  }
}
