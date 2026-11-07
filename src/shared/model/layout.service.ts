import { Injectable, signal } from '@angular/core';
import { CHANNELS_COLUMN, ColumnSpec, MEMBERS_COLUMN, clampWidth, loadWidth, saveWidth } from '@shared/lib/column-width';

const MEMBERS_OPEN_KEY = 'pm.col.members.open';

/**
 * The user's choices about the frame: column widths and whether the right
 * column shows. Kept in this browser only; a blocked storage just forgets.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly channelsWidth = signal(loadWidth(CHANNELS_COLUMN));
  readonly membersWidth = signal(loadWidth(MEMBERS_COLUMN));
  readonly membersOpen = signal(readFlag(MEMBERS_OPEN_KEY, true));

  /** While dragging: the column follows, nothing is stored yet. */
  preview(spec: ColumnSpec, width: number): void {
    this.widthOf(spec).set(clampWidth(spec, width));
  }

  /** The drag or key press is over: keep the width. */
  commit(spec: ColumnSpec, width: number): void {
    this.preview(spec, width);
    saveWidth(spec, this.widthOf(spec)());
  }

  reset(spec: ColumnSpec): void {
    this.commit(spec, spec.initial);
  }

  toggleMembers(): void {
    const open = !this.membersOpen();
    this.membersOpen.set(open);
    writeFlag(MEMBERS_OPEN_KEY, open);
  }

  widthOf(spec: ColumnSpec) {
    return spec.key === MEMBERS_COLUMN.key ? this.membersWidth : this.channelsWidth;
  }
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // Not kept; the choice holds until the tab closes.
  }
}
