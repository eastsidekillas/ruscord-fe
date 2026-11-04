import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { isEntryPath, rememberRef, safeStorage, storedRef } from '@shared/lib/visit-ref';

/**
 * Counts a visit of the site (ruscord-core `POST /visits`) once per tab,
 * when the tab opens on an entry page, and keeps the link tag for sign-up.
 * No cookies: the core only adds one to the day's number.
 */
@Injectable({ providedIn: 'root' })
export class VisitService {
  private readonly http = inject(HttpClient);

  /** Call once when the app starts. */
  start(location: Pick<Location, 'pathname' | 'search'> = window.location): void {
    const ref = rememberRef(location.search, safeStorage('local'));
    if (!isEntryPath(location.pathname)) return;
    const tab = safeStorage('session');
    try {
      if (tab?.getItem('rc_visit')) return;
      tab?.setItem('rc_visit', '1');
    } catch {
      // Without session storage a reload counts again; the core limits by address.
    }
    this.http.post(`${environment.API_URL}/visits`, { ref: ref ?? '' }).subscribe({ error: () => undefined });
  }

  /** The tag to send with the sign-up, if any. */
  ref(): string | undefined {
    return storedRef(safeStorage('local')) ?? undefined;
  }
}
