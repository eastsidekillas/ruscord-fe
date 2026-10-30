import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  ChosenStatus,
  DMChannel,
  FullGuild,
  Guild,
  GuildChannel,
  Invite,
  InvitePreview,
  Member,
  Message,
  Profile,
  Relationship,
  Role,
  Ban,
  User,
} from './models';

/** REST client of ruscord-core; paths follow docs/api.md. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.API_URL;

  private url(path: string): string {
    return `${this.base}/${path}`;
  }

  // Account
  me(): Observable<User> {
    return this.http.get<User>(this.url('users/@me'));
  }

  updateMe(patch: { display_name?: string; bio?: string; status?: ChosenStatus }): Observable<User> {
    return this.http.patch<User>(this.url('users/@me'), patch);
  }

  /** Uploads a picture as is: the server checks and re-encodes it. */
  setAvatar(file: Blob): Observable<User> {
    return this.http.put<User>(this.url('users/@me/avatar'), file);
  }

  deleteAvatar(): Observable<User> {
    return this.http.delete<User>(this.url('users/@me/avatar'));
  }

  /** Deletes the account; the password is asked again (ruscord-core ADR-0021). */
  deleteMe(password: string): Observable<void> {
    return this.http.delete<void>(this.url('users/@me'), { body: { password } });
  }

  profile(userId: string): Observable<Profile> {
    return this.http.get<Profile>(this.url(`users/${encodeURIComponent(userId)}/profile`));
  }

  gatewayTicket(): Observable<{ ticket: string; expires_in: number }> {
    return this.http.post<{ ticket: string; expires_in: number }>(this.url('gateway/ticket'), null);
  }

  // Relationships
  relationships(): Observable<Relationship[]> {
    return this.http.get<Relationship[]>(this.url('users/@me/relationships'));
  }

  /** Friend request by exact username. */
  requestFriend(username: string): Observable<void> {
    return this.http.post<void>(this.url('users/@me/relationships'), { username });
  }

  /** Sends a request to the user, or accepts theirs. */
  acceptOrRequest(userId: string): Observable<void> {
    return this.http.put<void>(this.url(`users/@me/relationships/${userId}`), {});
  }

  block(userId: string): Observable<void> {
    return this.http.put<void>(this.url(`users/@me/relationships/${userId}`), { type: 2 });
  }

  /** Unfriends, cancels or declines a request, or unblocks. */
  removeRelationship(userId: string): Observable<void> {
    return this.http.delete<void>(this.url(`users/@me/relationships/${userId}`));
  }

  // Direct messages
  openDM(recipientId: string): Observable<DMChannel> {
    return this.http.post<DMChannel>(this.url('users/@me/channels'), { recipient_id: recipientId });
  }

  // Guilds
  createGuild(name: string): Observable<FullGuild> {
    return this.http.post<FullGuild>(this.url('guilds'), { name });
  }

  updateGuild(guildId: string, patch: { name?: string }): Observable<Guild> {
    return this.http.patch<Guild>(this.url(`guilds/${guildId}`), patch);
  }

  setGuildIcon(guildId: string, file: Blob): Observable<Guild> {
    return this.http.put<Guild>(this.url(`guilds/${guildId}/icon`), file);
  }

  deleteGuildIcon(guildId: string): Observable<Guild> {
    return this.http.delete<Guild>(this.url(`guilds/${guildId}/icon`));
  }

  leaveGuild(guildId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${guildId}/members/@me`));
  }

  deleteGuild(guildId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${guildId}`));
  }

  /** One page of members ordered by user id (up to 1000). */
  members(guildId: string, after?: string): Observable<Member[]> {
    let params = new HttpParams().set('limit', 1000);
    if (after) params = params.set('after', after);
    return this.http.get<Member[]>(this.url(`guilds/${guildId}/members`), { params });
  }

  createChannel(guildId: string, body: { type: 0 | 2 | 4; name: string; topic?: string; parent_id?: string }): Observable<GuildChannel> {
    return this.http.post<GuildChannel>(this.url(`guilds/${guildId}/channels`), body);
  }

  /** parent_id: null takes the channel out of its category. */
  updateChannel(channelId: string, patch: { name?: string; topic?: string; parent_id?: string | null }): Observable<GuildChannel> {
    return this.http.patch<GuildChannel>(this.url(`channels/${channelId}`), patch);
  }

  deleteChannel(channelId: string): Observable<void> {
    return this.http.delete<void>(this.url(`channels/${channelId}`));
  }

  // Roles
  createRole(guildId: string, body: { name: string; permissions?: string; color?: number }): Observable<Role> {
    return this.http.post<Role>(this.url(`guilds/${guildId}/roles`), body);
  }

  updateRole(guildId: string, roleId: string, patch: { name?: string; permissions?: string; color?: number }): Observable<Role> {
    return this.http.patch<Role>(this.url(`guilds/${guildId}/roles/${roleId}`), patch);
  }

  deleteRole(guildId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${guildId}/roles/${roleId}`));
  }

  setMemberRole(guildId: string, userId: string, roleId: string, on: boolean): Observable<void> {
    const url = this.url(`guilds/${guildId}/members/${userId}/roles/${roleId}`);
    return on ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }

  // Moderation
  kick(guildId: string, userId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${guildId}/members/${userId}`));
  }

  ban(guildId: string, userId: string, reason: string): Observable<void> {
    return this.http.put<void>(this.url(`guilds/${guildId}/bans/${userId}`), { reason });
  }

  unban(guildId: string, userId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${guildId}/bans/${userId}`));
  }

  bans(guildId: string): Observable<Ban[]> {
    return this.http.get<Ban[]>(this.url(`guilds/${guildId}/bans`));
  }

  // Invites
  /** maxAge in seconds (0: never expires, at most a week); maxUses 0: unlimited. */
  createInvite(channelId: string, maxAge: number, maxUses: number): Observable<Invite> {
    return this.http.post<Invite>(this.url(`channels/${channelId}/invites`), { max_age: maxAge, max_uses: maxUses });
  }

  invite(code: string): Observable<InvitePreview> {
    return this.http.get<InvitePreview>(this.url(`invites/${encodeURIComponent(code)}`));
  }

  acceptInvite(code: string): Observable<FullGuild> {
    return this.http.post<FullGuild>(this.url(`invites/${encodeURIComponent(code)}`), null);
  }

  // Messages
  /** Newest first; before/after are message ids. */
  messages(channelId: string, opts: { before?: string; limit?: number } = {}): Observable<Message[]> {
    let params = new HttpParams().set('limit', opts.limit ?? 50);
    if (opts.before) params = params.set('before', opts.before);
    return this.http.get<Message[]>(this.url(`channels/${channelId}/messages`), { params });
  }

  sendMessage(channelId: string, body: { content: string; nonce: string; reply_to?: string }): Observable<Message> {
    return this.http.post<Message>(this.url(`channels/${channelId}/messages`), body);
  }

  editMessage(channelId: string, messageId: string, content: string): Observable<Message> {
    return this.http.patch<Message>(this.url(`channels/${channelId}/messages/${messageId}`), { content });
  }

  deleteMessage(channelId: string, messageId: string): Observable<void> {
    return this.http.delete<void>(this.url(`channels/${channelId}/messages/${messageId}`));
  }

  typing(channelId: string): Observable<void> {
    return this.http.post<void>(this.url(`channels/${channelId}/typing`), null);
  }
}
