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
}

export interface DMChannel {
  id: Snowflake;
  type: 1 | 3;
  name?: string | null;
  owner_id?: Snowflake | null;
  created_at: string;
  recipients: PublicUser[];
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

export interface Message {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  author: PublicUser | null;
  content: string;
  nonce?: string;
  reply_to?: Snowflake;
  mention_everyone: boolean;
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

/** Display name of a user, falling back to the username. */
export function nameOf(u: PublicUser | null | undefined): string {
  return u?.display_name || u?.username || 'Пользователь';
}
