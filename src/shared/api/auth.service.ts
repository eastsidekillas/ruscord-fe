import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from "@angular/router";
import {BehaviorSubject, catchError, EMPTY, Observable, of, tap, throwError} from 'rxjs';
import { environment } from '../../environment/environment';
import {CookieService} from 'ngx-cookie-service';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}



@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public currentUser: Observable<any> = this.currentUserSubject.asObservable();


  constructor(private http: HttpClient, private router: Router, private getCookiesService: CookieService) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();

    if (!this.currentUserSubject.value) {
      this.updateUserData(); // Загружаем пользователя с сервера при старте, если его нет в localStorage
    }
  }

  refreshToken(): Observable<void> {
    return this.http.post<void>(`${environment.API_URL}/auth/refreesh/`, {}, { withCredentials: true })
      .pipe(
        tap(() => console.log("Token refreshed")),
        catchError(() => {
          this.logout();
          return EMPTY;
        })
      );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.API_URL}/auth/login/`, { email, password }, { withCredentials: true })
      .pipe(
        tap(() => this.updateUserData()), // Обновляем данные пользователя после логина
        catchError(this.handleError)
      );
  }

  register(username: string, email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.API_URL}/auth/register/`, { username, email, password, name }, { withCredentials: true }).pipe(
      catchError(error => {
        console.error('Ошибка при регистрации:', error);
        return throwError(() => new Error(error.error?.message || 'Ошибка регистрации'));
      })
    );
  }

  private handleError(error: any): Observable<any> {
    throw error;
  }


  // Метод для обновления данных пользователя с сервера
  updateUserData(): void {
    this.checkAuth().subscribe();
  }

  // Метод для проверки авторизации на сервере
  checkAuth(): Observable<any> {
    return this.http.get<any>(`${environment.API_URL}/auth/check/`, { withCredentials: true }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
        return of(null);
      })
    );
  }



  logout(): void {
    this.getCookiesService.deleteAll()
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }


  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get userId(): string {
    return this.currentUserValue?.user_id || '';
  }

  get userAvatar(): string {
    return this.currentUserValue?.avatar || '';
  }

  get userName(): string {
    return this.currentUserValue?.name || 'Guest';
  }
}
