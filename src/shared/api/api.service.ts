import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly base = environment.API_URL;

  constructor(private http: HttpClient) {}

  private url(path: string): string {
    return `${this.base}/${path}`;
  }

  // Пользователи
  searchUsers(name: string): Observable<any> {
    return this.http.get(this.url(`users/search/?name=${encodeURIComponent(name)}`));
  }

  getUserProfile(id: string): Observable<any> {
    return this.http.get(this.url(`users/${id}/profile/`));
  }

  getMyProfile(): Observable<any> {
    return this.http.get(this.url('users/me/profile/'));
  }

  updateMyProfile(formData: FormData): Observable<any> {
    return this.http.patch(this.url('users/me/profile/'), formData);
  }

  // Друзья
  getMyFriends(): Observable<any> {
    return this.http.get(this.url('users/me/relationships/'));
  }

  postFriendRequest(userId: string): Observable<any> {
    return this.http.post(this.url('users/me/friends/send/'), { to_user_id: userId });
  }

  getFriendRequests(): Observable<any> {
    return this.http.get(this.url('users/me/friends/requests/'));
  }

  postToFriendRequestAccept(requestId: string): Observable<any> {
    return this.http.post(this.url(`users/me/friends/${requestId}/respond/`), { action: 'accept' });
  }

  postToFriendRequestReject(requestId: string): Observable<any> {
    return this.http.post(this.url(`users/me/friends/${requestId}/respond/`), { action: 'reject' });
  }

  // Каналы
  getChannel(channelId: string): Observable<any> {
    return this.http.get(this.url(`channels/${channelId}/`));
  }

  postCreateChannel(to_user: string): Observable<any> {
    return this.http.post(this.url('channels/dm/'), { target_user_id: to_user });
  }

  getMessagesChannel(channelId: string): Observable<any> {
    return this.http.get(this.url(`channels/${channelId}/messages/`));
  }

  getLiveKitToken(channelId: string): Observable<any> {
    return this.http.get(this.url(`channels/${channelId}/livekit-token/`));
  }

  // Серверы
  postCreateServer(formData: FormData): Observable<any> {
    return this.http.post(this.url('servers/'), formData);
  }

  getMyServers(): Observable<any> {
    return this.http.get(this.url('servers/'));
  }

  getServerDetails(serverId: string): Observable<any> {
    return this.http.get(this.url(`servers/${serverId}/`));
  }

  getServerMembers(serverId: string): Observable<any> {
    return this.http.get(this.url(`servers/${serverId}/members/`));
  }

  getServerChannels(serverId: string): Observable<any> {
    return this.http.get(this.url(`servers/${serverId}/channels/`));
  }

  // Инвайты
  postInviteLinkServer(serverId: string, maxUses: number, expiresIn: number): Observable<any> {
    return this.http.post(this.url(`servers/invite/${serverId}/`), {
      max_uses: maxUses,
      expires_in: expiresIn,
    });
  }

  postServerByInvite(token: string): Observable<any> {
    return this.http.post(this.url(`invite/${token}/join`), {});
  }

  getInviteServerDetails(token: string): Observable<any> {
    return this.http.get(this.url(`invite/${token}/`));
  }

  // Пересылка
  getForwardTargets(): Observable<any> {
    return this.http.get(this.url('messages/forward-targets/'));
  }

  forwardMessage(messageId: string, targetChannelId: string): Observable<any> {
    return this.http.post(this.url(`messages/${messageId}/forward/`), {
      target_channel_id: targetChannelId,
    });
  }
}
