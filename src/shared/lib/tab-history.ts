/**
 * The router's navigations in this tab, as the browser keeps them: a list of
 * entries and where we are in it. The browser does not tell a page whether
 * back or forward lead anywhere, so the app keeps its own copy to grey out
 * the buttons. An entry is known by the router navigation ids that opened
 * it: the first one, and those of later visits by back or forward, since
 * the browser's saved state may carry either.
 */
export class TabHistory {
  private entries: number[][] = [];
  private at = -1;

  get canBack(): boolean {
    return this.at > 0;
  }

  get canForward(): boolean {
    return this.at >= 0 && this.at < this.entries.length - 1;
  }

  /** A new page: whatever was ahead is gone, as in the browser. */
  push(id: number): void {
    this.entries = [...this.entries.slice(0, this.at + 1), [id]];
    this.at = this.entries.length - 1;
  }

  /** replaceUrl: the current entry becomes this one. */
  replace(id: number): void {
    if (this.at < 0) return this.push(id);
    this.entries[this.at] = [id];
  }

  /**
   * Back or forward in the browser restored the entry first opened by
   * navigation `restored`. An id we never saw (a reload lost our copy)
   * starts the list over from here.
   */
  pop(restored: number | undefined, current: number): void {
    let i = this.entries.length - 1;
    while (i >= 0 && (restored === undefined || !this.entries[i].includes(restored))) i--;
    if (i < 0) {
      this.entries = [[current]];
      this.at = 0;
      return;
    }
    this.entries[i] = [...this.entries[i], current];
    this.at = i;
  }
}
