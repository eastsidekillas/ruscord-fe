import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from '../../environment/environment';
import {catchError, from, Observable, throwError} from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private api = ky.create({
    prefixUrl: environment.API_URL,
  });

  constructor() {}

  // Поиск пользователей
  searchUsers(name: string): Observable<any> {
    return from(this.api.get(`users/search/?name=${name}`, {credentials: 'include'}).json());
  }

  // Вернет профиль пользователя
  getUserProfile(id: number): Observable<any> {
    return from(this.api.get(`users/${id}/profile/`, {credentials: 'include'}).json());
  }


  // Вернет друзей пользователя
  getMyFriends(): Observable<any> {
    return from(this.api.get('users/me/relationships/',
      {
        credentials: 'include'
      }).json());
  }


  // Отправит запрос на добавление в друзья
  postFriendRequest(userId: number): Observable<any> {
    return from(this.api.post(`users/me/friends/send/`,
      {
        json: { to_user_id: userId },
        credentials: 'include'
      }).json());
  }


  // Вернет список ожидающих заявок
  getFriendRequests(): Observable<any> {
    return from(this.api.get('users/me/friends/requests/',
      {
        credentials: 'include'
      }).json());
  }

  // Отправит запрос accept
  postToFriendRequestAccept(requestId: number): Observable<any> {
    return from(this.api.post(`users/me/friends/${requestId}/respond/`,
      {
        json: { action: 'accept' },
        credentials: 'include'
      }).json());
  }

  // Отправит запрос reject
  postToFriendRequestReject(requestId: number): Observable<any> {
    return from(this.api.post(`users/me/friends/${requestId}/respond/`,
      {
        json: { action: 'reject' },
        credentials: 'include'
      }).json());
  }




  // **Работа с каналами **
  getChannel(channelId: string): Observable<any> {
    return from(this.api.get(`channels/${channelId}/`, { credentials: 'include' }).json());
  }

  postCreateChannel(to_user: number): Observable<any> {
    return from(this.api.post('channels/dm/', { json: { target_user_id: to_user }, credentials: 'include' }).json());
  }

  getMessagesChannel(channelId: string): Observable<any> {
    return from(this.api.get(`channels/${channelId}/messages/`, { credentials: 'include' }).json());
  }

  // **Работа с серверами **

  postCreateServer(formData: FormData): Observable<any> {
    return from(this.api.post('servers/', { body: formData, credentials: 'include' }).json());
  }

  getMyServers(): Observable<any> {
    return from(this.api.get('servers/', { credentials: 'include' }).json());
  }

  getServerChannels(serverId: string): Observable<any> {
    return from(this.api.get(`servers/${serverId}/channels/`, { credentials: 'include' }).json());
  }

  // **Работа с инвайтами серверов **

  postInviteLinkServer(serverId: string, maxUses: number, expiresIn: number): Observable<any> {
    return from(this.api.post(`servers/invite/${serverId}/`, {
      json: {
        max_uses: maxUses,
        expires_in: expiresIn,
      },
      credentials: 'include' }).json());
  }

  postServerByInvite(token: string): Observable<any> {
    return from(this.api.post(`invite/${token}/join`, { credentials: 'include' }).json());
  }

  getInviteServerDetails(token: string): Observable<any> {
    return from(this.api.get(`invite/${token}/`, {
      credentials: 'include' }).json());
  }



  getLivekitToken(channelUuid: string): Observable<any> {
    return from(this.api.get(`livekit/token/${channelUuid}/`).json()).pipe(
      catchError((error) => {
        console.error('Ошибка при получении токена:', error);
        return throwError(error);
      })
    );
  }
}
