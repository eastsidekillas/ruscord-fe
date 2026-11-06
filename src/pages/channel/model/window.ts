import { Message } from '@shared/api';

/** Inserts or replaces a message keeping id order (ids are UUIDv7: time order). */
export function upsertMessage(list: Message[], m: Message): Message[] {
  const i = list.findIndex(x => x.id === m.id);
  // Events carry no reactions (null): the ones shown stay.
  if (i >= 0) return list.map(x => (x.id === m.id ? { ...m, reactions: m.reactions ?? x.reactions } : x));
  const out = [...list];
  let at = out.length;
  while (at > 0 && out[at - 1].id > m.id) at--;
  out.splice(at, 0, m);
  return out;
}

export type MessageEventType = 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE';

/**
 * Applies a message event to the loaded window of history.
 *
 * An edit or a pin of a message that is not loaded changes nothing: put in
 * the window, an old message would become its first one, and the history
 * between it and the rest would never load (C1 of ruscord-core
 * docs/audit/2026-11-04.md). A new message joins only a window that reaches
 * the newest one; in the middle of history (after a jump from search) it is
 * brought in order when the window scrolls down to it.
 */
export function applyMessageEvent(list: Message[], t: MessageEventType, m: Message, atEnd: boolean): Message[] {
  switch (t) {
    case 'MESSAGE_DELETE':
      return list.some(x => x.id === m.id) ? list.filter(x => x.id !== m.id) : list;
    case 'MESSAGE_UPDATE':
      return list.some(x => x.id === m.id) ? upsertMessage(list, m) : list;
    case 'MESSAGE_CREATE':
      return atEnd || list.some(x => x.id === m.id) ? upsertMessage(list, m) : list;
  }
}
