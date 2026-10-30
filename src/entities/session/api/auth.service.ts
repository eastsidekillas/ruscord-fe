import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { User } from '@shared/api/models';

/**
 * The signed-in user. Tokens live in HttpOnly cookies (ruscord-core
 * ADR-0009); the client only knows whether a session works by asking.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.API_URL;

  private readonly current = signal<User | null>(null);
  /** The signed-in user, kept fresh by the gateway (READY, USER_UPDATE). */
  readonly user = this.current.asReadonly();
  readonly signedIn = computed(() => this.current() !== null);

  private loading$: Observable<User | null> | null = null;
  private loaded = false;

  /** Loads the user once; later calls return what is known. */
  ensureLoaded(): Observable<User | null> {
    if (this.loaded) return of(this.current());
    if (!this.loading$) {
      this.loading$ = this.http.get<User>(`${this.base}/users/@me`).pipe(
        catchError(() => of(null)),
        tap(u => {
          this.current.set(u);
          this.loaded = true;
        }),
        finalize(() => (this.loading$ = null)),
        shareReplay(1),
      );
    }
    return this.loading$;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.base}/auth/login`, { email, password }).pipe(tap(u => this.signIn(u)));
  }

  /** Registration signs in at once (the server sets the cookies). */
  register(body: { email: string; username: string; display_name: string; password: string }): Observable<User> {
    return this.http.post<User>(`${this.base}/auth/register`, body).pipe(tap(u => this.signIn(u)));
  }

  /** Rotates the refresh token; fails with 401 when the session is over. */
  refresh(): Observable<void> {
    return this.http.post<User>(`${this.base}/auth/refresh`, null).pipe(map(() => undefined));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/logout`, null).pipe(
      catchError(() => of(undefined)),
      tap(() => this.forget()),
    );
  }

  /** Replaces the known user (USER_UPDATE, READY, settings). */
  setUser(u: User): void {
    if (this.current()) this.current.set(u);
  }

  /** The session ended (refresh failed, sign-in session revoked). */
  forget(): void {
    this.current.set(null);
    this.loaded = true;
  }

  private signIn(u: User): void {
    this.current.set(u);
    this.loaded = true;
  }
}
