export type HotkeyAction =
  | 'switch'
  | 'prev' | 'next'
  | 'prevUnread' | 'nextUnread'
  | 'back' | 'forward'
  | 'mute' | 'deafen'
  | 'markRead';

export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * The app's shortcuts, as in Discord. Letters go by the physical key
 * (code), so they work in the Russian layout too; Cmd stands for Ctrl
 * on a Mac.
 */
export function hotkeyFor(e: KeyLike): HotkeyAction | null {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyK') return 'switch';
  if (mod && e.shiftKey && !e.altKey && e.code === 'KeyM') return 'mute';
  if (mod && e.shiftKey && !e.altKey && e.code === 'KeyD') return 'deafen';
  if (mod && e.altKey && !e.shiftKey && e.key === 'ArrowLeft') return 'back';
  if (mod && e.altKey && !e.shiftKey && e.key === 'ArrowRight') return 'forward';
  if (e.altKey && !mod && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    const up = e.key === 'ArrowUp';
    return e.shiftKey ? (up ? 'prevUnread' : 'nextUnread') : (up ? 'prev' : 'next');
  }
  if (e.key === 'Escape' && !mod && !e.altKey && !e.shiftKey) return 'markRead';
  return null;
}

/**
 * The channel one step away in display order, wrapping around; with
 * `want`, the nearest one that passes it (an unread one). Null when there
 * is nowhere to go.
 */
export function neighbour(ids: readonly string[], current: string | null, dir: 1 | -1, want?: (id: string) => boolean): string | null {
  if (!ids.length) return null;
  const at = current ? ids.indexOf(current) : -1;
  const start = at < 0 ? (dir === 1 ? -1 : 0) : at;
  for (let step = 1; step <= ids.length; step++) {
    const id = ids[(start + dir * step + ids.length * 2) % ids.length];
    if (id === current) return null;
    if (!want || want(id)) return id;
  }
  return null;
}

/** Whether keystrokes on this target are text input (a field, a select, an editable block). */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
    || target.contentEditable === 'true';
}

/** Whether this key press opens the microphone in push-to-talk. */
export function startsTalk(
  e: { code: string; repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  c: { key: string; required: boolean; typing: boolean; modalOpen: boolean },
): boolean {
  // Ctrl, Cmd and Alt combinations belong to the app's shortcuts (Ctrl+K and the like).
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return c.required && !e.repeat && !c.typing && !c.modalOpen && e.code === c.key;
}

/** Whether this key release closes it; deliberately blind to focus and modals. */
export function endsTalk(e: { code: string }, key: string): boolean {
  return e.code === key;
}
