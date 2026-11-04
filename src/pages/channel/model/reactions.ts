import { Message, ReactionEvent } from '@shared/api';

/** Gateway events about reactions (ruscord-core ADR-0037). */
export const REACTION_EVENTS = [
  'MESSAGE_REACTION_ADD',
  'MESSAGE_REACTION_REMOVE',
  'MESSAGE_REACTION_REMOVE_EMOJI',
  'MESSAGE_REACTION_REMOVE_ALL',
] as const;
export type ReactionEventType = (typeof REACTION_EVENTS)[number];

/**
 * Applies a reaction event, or the viewer's own click shown before the
 * server answers, to a message. The viewer's own event after their click
 * changes nothing: `me` already says so.
 */
export function applyReaction(m: Message, t: ReactionEventType, d: ReactionEvent, me: string | null | undefined): Message {
  const list = m.reactions ?? [];
  const mine = !!me && d.user_id === me;
  const i = list.findIndex(r => r.emoji === d.emoji);
  switch (t) {
    case 'MESSAGE_REACTION_ADD': {
      if (!d.emoji) return m;
      if (i < 0) return { ...m, reactions: [...list, { emoji: d.emoji, count: 1, me: mine }] };
      if (mine && list[i].me) return m;
      return { ...m, reactions: list.map((r, j) => (j === i ? { ...r, count: r.count + 1, me: r.me || mine } : r)) };
    }
    case 'MESSAGE_REACTION_REMOVE': {
      if (i < 0 || (mine && !list[i].me)) return m;
      const count = list[i].count - 1;
      return {
        ...m,
        reactions: count > 0 ? list.map((r, j) => (j === i ? { ...r, count, me: mine ? false : r.me } : r)) : list.filter((_, j) => j !== i),
      };
    }
    case 'MESSAGE_REACTION_REMOVE_EMOJI':
      return i < 0 ? m : { ...m, reactions: list.filter((_, j) => j !== i) };
    case 'MESSAGE_REACTION_REMOVE_ALL':
      return { ...m, reactions: [] };
  }
}
