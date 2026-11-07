import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  AdminStats,
  Attachment,
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
  PublicUser,
  ReadState,
  Relationship,
  SearchParams,
  SearchResult,
  Role,
  Ban,
  Session,
  User,
  VoiceJoinInfo,
  VoiceState,
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

  // Voice (ruscord-core ADR-0025)
  joinVoice(channelId: string): Observable<VoiceJoinInfo> {
    return this.http.post<VoiceJoinInfo>(this.url(`channels/${encodeURIComponent(channelId)}/voice`), null);
  }

  /** Starts the call of a DM channel or answers it (ruscord-core ADR-0032). */
  joinCall(channelId: string): Observable<VoiceJoinInfo> {
    return this.http.post<VoiceJoinInfo>(this.url(`channels/${encodeURIComponent(channelId)}/call`), null);
  }

  /** Stops the ringing of a DM call for us. */
  declineCall(channelId: string): Observable<void> {
    return this.http.post<void>(this.url(`channels/${encodeURIComponent(channelId)}/call/decline`), null);
  }

  /** A moderator mutes or deafens someone in voice (MUTE_MEMBERS, DEAFEN_MEMBERS). */
  setServerVoice(guildId: string, userId: string, change: { mute?: boolean; deaf?: boolean }): Observable<VoiceState> {
    return this.http.patch<VoiceState>(this.url(`guilds/${encodeURIComponent(guildId)}/voice-states/${encodeURIComponent(userId)}`), change);
  }

  /** A moderator moves someone to another voice channel (ruscord-core ADR-0031). */
  moveVoice(guildId: string, userId: string, channelId: string): Observable<void> {
    return this.http.post<void>(this.url(`guilds/${encodeURIComponent(guildId)}/voice-states/${encodeURIComponent(userId)}/move`), { channel_id: channelId });
  }

  /** A moderator disconnects someone from voice (MOVE_MEMBERS). */
  disconnectVoice(guildId: string, userId: string): Observable<void> {
    return this.http.delete<void>(this.url(`guilds/${encodeURIComponent(guildId)}/voice-states/${encodeURIComponent(userId)}`));
  }

  setSelfVoice(channelId: string, selfMute: boolean, selfDeaf: boolean): Observable<VoiceState> {
    return this.http.patch<VoiceState>(this.url(`channels/${encodeURIComponent(channelId)}/voice`), {
      self_mute: selfMute,
      self_deaf: selfDeaf,
    });
  }

  // Sessions (ruscord-core ADR-0023)
  sessions(): Observable<Session[]> {
    return this.http.get<Session[]>(this.url('users/@me/sessions'));
  }

  revokeSession(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`users/@me/sessions/${encodeURIComponent(id)}`));
  }

  /** Signs out every other device; asks for the password. */
  revokeOtherSessions(password: string): Observable<{ revoked: number }> {
    return this.http.post<{ revoked: number }>(this.url('users/@me/sessions/revoke-others'), { password });
  }

  /** Other devices are signed out; this one stays. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(this.url('users/@me/password'), {
      current_password: currentPassword,
      new_password: newPassword,
    });
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

  /** A group of the user and 1 to 9 friends (docs/api.md, «Личные чаты»). */
  createGroup(recipients: string[]): Observable<DMChannel> {
    return this.http.post<DMChannel>(this.url('users/@me/channels'), { recipients });
  }

  /** An empty name resets it to the members' names. */
  renameGroup(channelId: string, name: string): Observable<DMChannel> {
    return this.http.patch<DMChannel>(this.url(`users/@me/channels/${channelId}`), { name: name || null });
  }

  leaveGroup(channelId: string): Observable<void> {
    return this.http.delete<void>(this.url(`users/@me/channels/${channelId}`));
  }

  addToGroup(channelId: string, userId: string): Observable<void> {
    return this.http.put<void>(this.url(`channels/${channelId}/recipients/${userId}`), {});
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

  /** Own nickname on a server; null or "" resets it (CHANGE_NICKNAME). */
  setNick(guildId: string, nick: string | null): Observable<void> {
    return this.http.patch<void>(this.url(`guilds/${guildId}/members/@me`), { nick });
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

  createChannel(guildId: string, body: { type: 0 | 2 | 4; name: string; topic?: string; parent_id?: string; user_limit?: number; rate_limit_per_user?: number }): Observable<GuildChannel> {
    return this.http.post<GuildChannel>(this.url(`guilds/${guildId}/channels`), body);
  }

  /** parent_id: null takes the channel out of its category. */
  updateChannel(channelId: string, patch: { name?: string; topic?: string; parent_id?: string | null; user_limit?: number; rate_limit_per_user?: number }): Observable<GuildChannel> {
    return this.http.patch<GuildChannel>(this.url(`channels/${channelId}`), patch);
  }

  deleteChannel(channelId: string): Observable<void> {
    return this.http.delete<void>(this.url(`channels/${channelId}`));
  }

  // Roles
  createRole(guildId: string, body: { name: string; permissions?: string; color?: number }): Observable<Role> {
    return this.http.post<Role>(this.url(`guilds/${guildId}/roles`), body);
  }

  updateRole(guildId: string, roleId: string, patch: { name?: string; permissions?: string; color?: number; position?: number; mentionable?: boolean }): Observable<Role> {
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

  /** Sets a channel permission overwrite for a role (type 1) or a member (type 2). */
  putOverwrite(channelId: string, targetId: string, body: { type: 1 | 2; allow: string; deny: string }): Observable<GuildChannel> {
    return this.http.put<GuildChannel>(this.url(`channels/${channelId}/permissions/${targetId}`), body);
  }

  deleteOverwrite(channelId: string, targetId: string): Observable<void> {
    return this.http.delete<void>(this.url(`channels/${channelId}/permissions/${targetId}`));
  }

  /** Every invite of the guild (MANAGE_GUILD). */
  guildInvites(guildId: string): Observable<Invite[]> {
    return this.http.get<Invite[]>(this.url(`guilds/${guildId}/invites`));
  }

  deleteInvite(code: string): Observable<void> {
    return this.http.delete<void>(this.url(`invites/${encodeURIComponent(code)}`));
  }

  invite(code: string): Observable<InvitePreview> {
    return this.http.get<InvitePreview>(this.url(`invites/${encodeURIComponent(code)}`));
  }

  acceptInvite(code: string): Observable<FullGuild> {
    return this.http.post<FullGuild>(this.url(`invites/${encodeURIComponent(code)}`), null);
  }

  // Messages
  /** Newest first; before/after are message ids. */
  messages(channelId: string, opts: { before?: string; after?: string; around?: string; limit?: number } = {}): Observable<Message[]> {
    let params = new HttpParams().set('limit', opts.limit ?? 50);
    if (opts.before) params = params.set('before', opts.before);
    if (opts.after) params = params.set('after', opts.after);
    if (opts.around) params = params.set('around', opts.around);
    return this.http.get<Message[]>(this.url(`channels/${channelId}/messages`), { params });
  }

  /** Uploads a file to send in the channel; the events carry the progress (ruscord-core ADR-0036). */
  uploadAttachment(channelId: string, file: File): Observable<HttpEvent<Attachment>> {
    return this.http.post<Attachment>(this.url(`channels/${channelId}/attachments`), file, {
      params: new HttpParams().set('filename', file.name),
      reportProgress: true,
      observe: 'events',
    });
  }

  sendMessage(
    channelId: string,
    body: { content: string; nonce: string; reply_to?: string; reply_mention?: boolean; attachments?: string[] },
  ): Observable<Message> {
    return this.http.post<Message>(this.url(`channels/${channelId}/messages`), body);
  }

  editMessage(channelId: string, messageId: string, content: string): Observable<Message> {
    return this.http.patch<Message>(this.url(`channels/${channelId}/messages/${messageId}`), { content });
  }

  deleteMessage(channelId: string, messageId: string): Observable<void> {
    return this.http.delete<void>(this.url(`channels/${channelId}/messages/${messageId}`));
  }

  // Search (ruscord-core ADR-0039): in a guild, or in one channel when guildId is null.
  search(guildId: string | null, channelId: string, q: SearchParams): Observable<SearchResult> {
    let params = new HttpParams().set('offset', q.offset ?? 0);
    if (q.text) params = params.set('q', q.text);
    for (const [k, v] of [['author_id', q.authorId], ['mentions', q.mentions], ['channel_id', q.channelId]] as const) {
      if (v) params = params.set(k, v);
    }
    for (const h of q.has ?? []) params = params.append('has', h);
    const path = guildId ? `guilds/${guildId}/messages/search` : `channels/${channelId}/messages/search`;
    return this.http.get<SearchResult>(this.url(path), { params });
  }

  // Owner statistics (ruscord-core ADR-0042)
  /** 404 for everyone not listed as admin. */
  adminStats(days: number): Observable<AdminStats> {
    return this.http.get<AdminStats>(this.url('admin/stats'), { params: { days } });
  }

  // Read states (ruscord-core ADR-0038)
  readStates(): Observable<ReadState[]> {
    return this.http.get<ReadState[]>(this.url('users/@me/read-states'));
  }

  ack(channelId: string, messageId: string): Observable<void> {
    return this.http.post<void>(this.url(`channels/${channelId}/messages/${messageId}/ack`), null);
  }

  ackGuild(guildId: string): Observable<void> {
    return this.http.post<void>(this.url(`guilds/${guildId}/ack`), null);
  }

  // Reactions and pins (ruscord-core ADR-0037)
  private reactionUrl(channelId: string, messageId: string, emoji?: string): string {
    const base = `channels/${channelId}/messages/${messageId}/reactions`;
    return this.url(emoji ? `${base}/${encodeURIComponent(emoji)}` : base);
  }

  react(channelId: string, messageId: string, emoji: string): Observable<void> {
    return this.http.put<void>(this.reactionUrl(channelId, messageId, emoji) + '/@me', null);
  }

  unreact(channelId: string, messageId: string, emoji: string): Observable<void> {
    return this.http.delete<void>(this.reactionUrl(channelId, messageId, emoji) + '/@me');
  }

  /** Who put emoji, earliest first. */
  reactors(channelId: string, messageId: string, emoji: string, limit = 25): Observable<PublicUser[]> {
    return this.http.get<PublicUser[]>(this.reactionUrl(channelId, messageId, emoji), { params: { limit } });
  }

  /** Moderation: everyone's emoji, or every reaction without one. */
  clearReactions(channelId: string, messageId: string, emoji?: string): Observable<void> {
    return this.http.delete<void>(this.reactionUrl(channelId, messageId, emoji));
  }

  pins(channelId: string): Observable<Message[]> {
    return this.http.get<Message[]>(this.url(`channels/${channelId}/pins`));
  }

  pin(channelId: string, messageId: string, on: boolean): Observable<void> {
    const url = this.url(`channels/${channelId}/pins/${messageId}`);
    return on ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }

  typing(channelId: string): Observable<void> {
    return this.http.post<void>(this.url(`channels/${channelId}/typing`), null);
  }
}
