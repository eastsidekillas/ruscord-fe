/** One place the quick switcher can open. */
export interface SwitchItem {
  kind: 'guild' | 'text' | 'voice' | 'dm' | 'group';
  id: string;
  label: string;
  /** The server of a channel; shown and searched after the label. */
  hint: string;
  route: string[];
  unread: boolean;
  mentions: number;
}

/** How many results the list shows. */
export const SWITCH_LIMIT = 12;

/** A leading sign narrows the kind, as in Discord: # channels, @ people, * servers, ! voice. */
const SIGNS: Record<string, SwitchItem['kind'][]> = {
  '#': ['text'],
  '!': ['voice'],
  '@': ['dm', 'group'],
  '*': ['guild'],
};

export function fold(s: string): string {
  return s.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
}

/** 0 best; null when it does not match at all. */
function score(item: SwitchItem, q: string): number | null {
  const label = fold(item.label);
  if (label === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.split(/[\s\-_.]+/).some(w => w.startsWith(q))) return 2;
  if (label.includes(q)) return 3;
  if (fold(item.hint).includes(q)) return 4;
  return null;
}

/**
 * The results for what was typed. Without a query: unread places first
 * (mentions before plain unread), then the rest in the given order.
 * With one: better matches first, then mentions, then unread.
 */
export function rankSwitch(items: readonly SwitchItem[], query: string, limit = SWITCH_LIMIT): SwitchItem[] {
  let q = fold(query);
  let kinds: SwitchItem['kind'][] | null = null;
  if (q && SIGNS[q[0]]) {
    kinds = SIGNS[q[0]];
    q = q.slice(1).trim();
  }
  const pool = items
    .map((item, i) => ({ item, i, s: q ? score(item, q) : 0 }))
    .filter(x => x.s !== null && (!kinds || kinds.includes(x.item.kind)));
  pool.sort((a, b) =>
    (a.s! - b.s!)
    || (b.item.mentions - a.item.mentions)
    || (Number(b.item.unread) - Number(a.item.unread))
    || (a.i - b.i));
  return pool.slice(0, limit).map(x => x.item);
}

/** The next selected row for an arrow key, wrapping around. */
export function moveSelection(at: number, count: number, key: string): number | null {
  if (!count) return null;
  if (key === 'ArrowDown') return (at + 1) % count;
  if (key === 'ArrowUp') return (at - 1 + count) % count;
  return null;
}
