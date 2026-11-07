import { Injectable, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { TabHistory } from '@shared/lib/tab-history';

/** Back and forward through the places opened in this tab. */
@Injectable({ providedIn: 'root' })
export class NavHistory {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly tab = new TabHistory();

  readonly canBack = signal(false);
  readonly canForward = signal(false);

  constructor() {
    let start: NavigationStart | null = null;
    let replace = false;
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) {
        start = ev;
        replace = !!this.router.currentNavigation()?.extras.replaceUrl;
      }
      if (!(ev instanceof NavigationEnd) || !start || start.id !== ev.id) return;
      if (start.navigationTrigger === 'popstate') {
        this.tab.pop(start.restoredState?.navigationId, ev.id);
      } else if (replace) {
        this.tab.replace(ev.id);
      } else {
        this.tab.push(ev.id);
      }
      this.canBack.set(this.tab.canBack);
      this.canForward.set(this.tab.canForward);
    });
  }

  back(): void {
    if (this.canBack()) this.location.back();
  }

  forward(): void {
    if (this.canForward()) this.location.forward();
  }
}
