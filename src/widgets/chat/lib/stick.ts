/** Scrolled to the bottom within this many pixels counts as "at the bottom". */
export const STICK_PX = 80;

/** Where a scrollable box is: its offset, content height and visible height. */
export interface ScrollBox {
  top: number;
  height: number;
  client: number;
}

/**
 * Whether the list keeps following new messages after a scroll event.
 *
 * Near the bottom it does, unless the user is scrolling up: a wheel moves
 * the view a few pixels per event, and staying stuck within STICK_PX pulled
 * it back down at once, so it took several turns to leave the bottom. A
 * move up with the same content height is the user's; when the content
 * shrank (a message deleted) the browser moved the view, not the user.
 */
export function stickAfterScroll(prev: ScrollBox | null, cur: ScrollBox): boolean {
  const up = !!prev && cur.top < prev.top - 1 && cur.height === prev.height;
  return !up && cur.height - cur.top - cur.client < STICK_PX;
}

/**
 * What to do with the view after a render: keep the reader's place when
 * older messages were added above, follow the bottom when stuck and the
 * content grew, otherwise leave it alone.
 */
export function afterRender(
  stick: boolean, prependedOlder: boolean, prevHeight: number, height: number,
): 'keep-place' | 'to-bottom' | 'none' {
  if (prependedOlder && height > prevHeight && !stick) return 'keep-place';
  if (stick && height !== prevHeight) return 'to-bottom';
  return 'none';
}
