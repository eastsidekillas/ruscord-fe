/** A column whose width the user drags; the width is kept per browser. */
export interface ColumnSpec {
  /** localStorage key. */
  key: string;
  min: number;
  max: number;
  initial: number;
}

/** The channel list: Discord's 240, room for a long server name. */
export const CHANNELS_COLUMN: ColumnSpec = { key: 'pm.col.channels', min: 200, max: 360, initial: 248 };
/** The right column of a channel: who is here now and the members. */
export const MEMBERS_COLUMN: ColumnSpec = { key: 'pm.col.members', min: 200, max: 360, initial: 248 };

/** One arrow key press on the handle. */
export const KEY_STEP = 16;

export function clampWidth(spec: ColumnSpec, width: number): number {
  if (!Number.isFinite(width)) return spec.initial;
  return Math.round(Math.min(spec.max, Math.max(spec.min, width)));
}

/** The stored width, or the initial one; storage may be missing or blocked. */
export function loadWidth(spec: ColumnSpec, storage: Pick<Storage, 'getItem'> | null = safeStorage()): number {
  try {
    const raw = storage?.getItem(spec.key);
    return raw == null ? spec.initial : clampWidth(spec, Number(raw));
  } catch {
    return spec.initial;
  }
}

export function saveWidth(spec: ColumnSpec, width: number, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(spec.key, String(clampWidth(spec, width)));
  } catch {
    // Private mode or a full quota: the width just is not kept.
  }
}

/**
 * The width after a key on the handle, or null for other keys. The handle
 * sits on the column's right edge (grow = ArrowRight) or left edge
 * (grow = ArrowLeft).
 */
export function widthAfterKey(spec: ColumnSpec, width: number, key: string, edge: 'right' | 'left'): number | null {
  const grow = edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
  const shrink = edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
  switch (key) {
    case grow: return clampWidth(spec, width + KEY_STEP);
    case shrink: return clampWidth(spec, width - KEY_STEP);
    case 'Home': return spec.min;
    case 'End': return spec.max;
    default: return null;
  }
}

/** The width while dragging: the pointer moved dx from where the drag began. */
export function widthAfterDrag(spec: ColumnSpec, start: number, dx: number, edge: 'right' | 'left'): number {
  return clampWidth(spec, edge === 'right' ? start + dx : start - dx);
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
