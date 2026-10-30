// Permission bits of ruscord-core (internal/perm/perm.go). The client never
// computes permissions (ADR-0017): it only tests bits the server sent as
// decimal strings in `permissions` and `channel_permissions`.

export const Perm = {
  ViewChannel: 1n << 0n,
  SendMessages: 1n << 1n,
  ReadMessageHistory: 1n << 2n,
  AttachFiles: 1n << 3n,
  AddReactions: 1n << 4n,
  MentionEveryone: 1n << 5n,
  ManageMessages: 1n << 6n,
  Connect: 1n << 7n,
  Speak: 1n << 8n,
  Video: 1n << 9n,
  Stream: 1n << 10n,
  StreamHQ: 1n << 11n,
  UseVoiceActivity: 1n << 12n,
  MuteMembers: 1n << 13n,
  DeafenMembers: 1n << 14n,
  MoveMembers: 1n << 15n,
  CreateInvite: 1n << 16n,
  ChangeNickname: 1n << 17n,
  ManageNicknames: 1n << 18n,
  KickMembers: 1n << 19n,
  BanMembers: 1n << 20n,
  ManageChannels: 1n << 21n,
  ManageRoles: 1n << 22n,
  ManageGuild: 1n << 23n,
  ViewAuditLog: 1n << 24n,
  Administrator: 1n << 25n,
} as const;

/** Reports whether the server-sent permission string has every bit of need. */
export function hasPerm(perms: string | null | undefined, need: bigint): boolean {
  if (!perms) return false;
  let p: bigint;
  try {
    p = BigInt(perms);
  } catch {
    return false;
  }
  return (p & need) === need;
}
