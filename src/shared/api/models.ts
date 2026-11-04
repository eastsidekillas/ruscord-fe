// Shapes of the ruscord-core API (docs/api.md in ruscord-core).

export type Snowflake = string; // UUID

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
/** What the user can choose; others see `invisible` as `offline`. */
export type ChosenStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export interface PublicUser {
  id: Snowflake;
  username: string;
  display_name: string;
  /** Path `/cdn/...` or null. */
  avatar: string | null;
  /** A deleted account: shown as "Удалённый пользователь". */
  deleted?: boolean;
}

export interface User extends PublicUser {
  email: string;
  created_at: string;
  status: ChosenStatus;
  bio: string;
}

export interface Profile {
  user: PublicUser;
  bio: string;
}

export interface Guild {
  id: Snowflake;
  name: string;
  owner_id: Snowflake;
  created_at: string;
  icon: string | null;
}

export interface Role {
  id: Snowflake;
  guild_id: Snowflake;
  name: string;
  position: number;
  permissions: string;
  color: number;
  /** Anyone may ping it; otherwise only with MENTION_EVERYONE (ruscord-core ADR-0035). */
  mentionable: boolean;
}

export interface Overwrite {
  type: 1 | 2;
  id: Snowflake;
  allow: string;
  deny: string;
}

export const ChannelType = {
  Text: 0,
  DM: 1,
  Voice: 2,
  GroupDM: 3,
  Category: 4,
} as const;
export type GuildChannelType = 0 | 2 | 4;

export interface GuildChannel {
  id: Snowflake;
  guild_id: Snowflake;
  type: GuildChannelType;
  name: string;
  topic?: string;
  parent_id?: Snowflake | null;
  position: number;
  user_limit?: number;
  bitrate?: number;
  permission_overwrites: Overwrite[];
}

export interface Member {
  guild_id: Snowflake;
  user_id: Snowflake;
  nick: string | null;
  roles: Snowflake[];
  joined_at: string;
  user?: PublicUser;
  status?: UserStatus;
}

export interface FullGuild extends Guild {
  roles: Role[];
  channels: GuildChannel[];
  member: Member | null;
  permissions: string;
  channel_permissions: Record<Snowflake, string>;
  /** Who is in the voice channels the user can see (ruscord-core ADR-0025). */
  voice_states?: VoiceState[];
}

/** Someone in a voice channel; channel_id null in an event means they left. */
export interface VoiceState {
  user_id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake | null;
  self_mute: boolean;
  self_deaf: boolean;
  /** Muted and deafened by a moderator (ruscord-core ADR-0026). */
  mute?: boolean;
  deaf?: boolean;
  user?: PublicUser;
}

/** What POST /channels/{id}/voice answers: how to enter the LiveKit room. */
export interface VoiceJoinInfo {
  /** LiveKit address; empty means this site under /livekit. */
  url: string;
  token: string;
  room: string;
  sources: ('microphone' | 'camera' | 'screen_share' | 'screen_share_audio')[];
  push_to_talk: boolean;
  /** The screen may be shared above 720p (STREAM_HQ); older cores leave it out. */
  high_quality?: boolean;
  /** The DM call joined (ruscord-core ADR-0032); absent for voice channels. */
  call?: DMCall;
}

/** A call going on in a DM channel (ruscord-core ADR-0032). */
export interface DMCall {
  id: Snowflake;
  channel_id: Snowflake;
  started_by: Snowflake;
  started_at: string;
  /** Being called until ring_until; clients stop ringing then by themselves. */
  ringing: Snowflake[];
  ring_until: string;
  /** Connected now, in the order they came. */
  members: Snowflake[];
}

export interface DMChannel {
  id: Snowflake;
  type: 1 | 3;
  name?: string | null;
  owner_id?: Snowflake | null;
  created_at: string;
  recipients: PublicUser[];
  /** The call going on there, if any. */
  call?: DMCall;
}

export const RelType = {
  Friend: 1,
  Blocked: 2,
  Incoming: 3,
  Outgoing: 4,
} as const;
export type RelTypeValue = (typeof RelType)[keyof typeof RelType];

export interface Relationship {
  id: Snowflake;
  type: RelTypeValue;
  since: string;
  user?: PublicUser;
}

/** A file of a message; `url` is a signed link that lives a day or more. */
export interface Attachment {
  id: Snowflake;
  filename: string;
  size: number;
  /** Sniffed by the server; pictures come with their size. */
  content_type: string;
  width?: number;
  height?: number;
  url?: string;
}

/** A page of search results, newest first (ruscord-core ADR-0039). */
export interface SearchResult {
  /** At most 5025: "more than five thousand". */
  total_results: number;
  messages: Message[];
}

export interface SearchParams {
  text?: string;
  authorId?: string;
  mentions?: string;
  channelId?: string;
  has?: ('file' | 'image' | 'video' | 'link')[];
  offset?: number;
}

/** How far the user has read a channel (ruscord-core ADR-0038). */
export interface ReadState {
  channel_id: Snowflake;
  /** null: never opened. */
  last_read_id: Snowflake | null;
  /** null: no messages. */
  last_message_id: Snowflake | null;
  /** Unread messages that ping the user, among the newest 100 unread. */
  mention_count: number;
}

/** One emoji under a message. */
export interface Reaction {
  emoji: string;
  count: number;
  /** The reader put it. */
  me: boolean;
}

/** MESSAGE_REACTION_*: emoji is absent when all went, user_id when one person's changed. */
export interface ReactionEvent {
  channel_id: Snowflake;
  guild_id?: Snowflake;
  message_id: Snowflake;
  emoji?: string;
  user_id?: Snowflake;
}

export interface Message {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  author: PublicUser | null;
  content: string;
  nonce?: string;
  reply_to?: Snowflake;
  mention_everyone: boolean;
  /** Users and roles the message pings, checked by the server (ruscord-core ADR-0035). */
  mentions: Snowflake[];
  mention_roles: Snowflake[];
  /** Files of the message (ruscord-core ADR-0036). */
  attachments: Attachment[];
  /** As the reader sees them; null in events, where the client keeps its own (ADR-0037). */
  reactions: Reaction[] | null;
  pinned_at?: string;
  created_at: string;
  edited_at?: string;
}

export interface Invite {
  code: string;
  guild_id: Snowflake;
  channel_id: Snowflake;
  inviter_id: Snowflake | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

export interface InvitePreview {
  code: string;
  guild: { id: Snowflake; name: string; icon?: string | null };
  channel: { id: Snowflake; name: string; type: GuildChannelType };
  inviter?: PublicUser;
  member_count: number;
  expires_at: string | null;
}

export interface Ban {
  user_id: Snowflake;
  user: PublicUser;
  reason: string;
  moderator_id: Snowflake | null;
  created_at: string;
}

export interface PresenceUpdate {
  user_id: Snowflake;
  status: UserStatus;
  guild_id?: Snowflake;
}

export interface TypingStart {
  channel_id: Snowflake;
  guild_id?: Snowflake;
  user_id: Snowflake;
  timestamp: string;
}

export interface Ready {
  v: number;
  session_id: string;
  user: User;
  guilds: FullGuild[];
  dms: DMChannel[];
  relationships: Relationship[];
  presences: PresenceUpdate[];
}

/** Error body of every failed request. */
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

/** Reads the API error out of an HttpErrorResponse-like value. */
export function apiError(err: unknown): ApiError | null {
  const body = (err as { error?: unknown } | null)?.error;
  if (body && typeof body === 'object' && typeof (body as ApiError).code === 'string') {
    return body as ApiError;
  }
  return null;
}

/** A human message for a failed request: the server's, or the fallback. */
export function errorText(err: unknown, fallback: string): string {
  const e = apiError(err);
  if (!e) return fallback;
  const fields = e.fields ? Object.values(e.fields).filter(Boolean) : [];
  return fields.length ? fields.join('. ') : e.message || fallback;
}

/** A signed-in device of the current user (ruscord-core ADR-0023). */
export interface Session {
  id: Snowflake;
  /** The User-Agent at sign-in; deviceLabel() makes it readable. */
  device: string;
  /** Where the session was last used from (or signed in). */
  ip: string | null;
  created_at: string;
  last_used_at: string;
  current: boolean;
}

/** "Chrome, Windows" from a User-Agent; an unknown one is shown as is. */
export function deviceLabel(ua: string): string {
  if (!ua) return 'Неизвестное устройство';
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /YaBrowser\//.test(ua) ? 'Яндекс Браузер' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : null;
  const os =
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : null;
  if (!browser && !os) return ua.length > 60 ? ua.slice(0, 60) + '…' : ua;
  return [browser, os].filter(Boolean).join(', ');
}

/** Display name of a user, falling back to the username. */
export function nameOf(u: PublicUser | null | undefined): string {
  return u?.display_name || u?.username || 'Пользователь';
}
