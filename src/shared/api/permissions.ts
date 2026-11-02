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

export interface PermGroup {
  title: string;
  perms: { bit: bigint; label: string }[];
}

/**
 * The role editor's permissions by group, in the order of the mockup.
 * Bits with no method in the API yet (attachments, reactions, the audit log,
 * other people's nicknames) are not shown; a role keeps them as they are.
 */
export const PermGroups: PermGroup[] = [
  {
    title: 'СЕРВЕР',
    perms: [
      { bit: Perm.Administrator, label: 'Администратор (все права, обходит запреты в каналах)' },
      { bit: Perm.ManageGuild, label: 'Управлять сервером' },
      { bit: Perm.ManageRoles, label: 'Управлять ролями' },
      { bit: Perm.ManageChannels, label: 'Управлять каналами' },
      { bit: Perm.KickMembers, label: 'Выгонять участников' },
      { bit: Perm.BanMembers, label: 'Банить участников' },
      { bit: Perm.CreateInvite, label: 'Создавать приглашения' },
      { bit: Perm.ChangeNickname, label: 'Менять свой ник' },
    ],
  },
  {
    title: 'ТЕКСТ',
    perms: [
      { bit: Perm.ViewChannel, label: 'Видеть каналы' },
      { bit: Perm.SendMessages, label: 'Отправлять сообщения' },
      { bit: Perm.ReadMessageHistory, label: 'Читать историю сообщений' },
      { bit: Perm.ManageMessages, label: 'Удалять чужие сообщения' },
      { bit: Perm.MentionEveryone, label: 'Упоминать @everyone и @here' },
    ],
  },
  {
    title: 'ГОЛОС',
    perms: [
      { bit: Perm.Connect, label: 'Подключаться к голосовым каналам' },
      { bit: Perm.Speak, label: 'Говорить' },
      { bit: Perm.Video, label: 'Включать камеру' },
      { bit: Perm.Stream, label: 'Демонстрировать экран' },
      { bit: Perm.StreamHQ, label: 'Демонстрация экрана выше 720p' },
      { bit: Perm.UseVoiceActivity, label: 'Активация по голосу (иначе — только по кнопке)' },
      { bit: Perm.MuteMembers, label: 'Отключать микрофон участникам' },
      { bit: Perm.DeafenMembers, label: 'Отключать звук участникам' },
      { bit: Perm.MoveMembers, label: 'Перемещать участников (отключать от канала)' },
    ],
  },
];

const label = (bit: bigint): { bit: bigint; label: string } =>
  PermGroups.flatMap(g => g.perms).find(p => p.bit === bit)!;

const TEXT_CHANNEL = [Perm.ViewChannel, Perm.SendMessages, Perm.ReadMessageHistory, Perm.ManageMessages, Perm.MentionEveryone, Perm.CreateInvite];
const VOICE_CHANNEL = [Perm.ViewChannel, Perm.Connect, Perm.Speak, Perm.Video, Perm.Stream, Perm.StreamHQ, Perm.UseVoiceActivity,
  Perm.MuteMembers, Perm.DeafenMembers, Perm.MoveMembers, Perm.CreateInvite];

/**
 * Permissions a channel overwrite can set, by channel type (0 text, 2 voice,
 * 4 category: both). ADMINISTRATOR cannot be set in a channel (the core
 * answers 422).
 */
export function channelPermLabels(type: 0 | 2 | 4): { bit: bigint; label: string }[] {
  const bits = type === 0 ? TEXT_CHANNEL : type === 2 ? VOICE_CHANNEL : [...new Set([...TEXT_CHANNEL, ...VOICE_CHANNEL])];
  return bits.map(label);
}
