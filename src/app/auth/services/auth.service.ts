import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = ky.create({
    prefixUrl: environment.API_URL,
    hooks: {
      beforeRequest: [
        (request) => {
          const csrfToken = getCookie('csrftoken'); // Получаем CSRF-токен из куков
          if (csrfToken) {
            request.headers.set('X-CSRFToken', csrfToken); // Устанавливаем заголовок с токеном
          }
        },
      ],
    },
  });

  login(email: string, password: string) {
    return this.api
      .post('token/', {
        json: { email, password },
        credentials: 'include',
      })
      .json()
      .then((data: any) => {
        // Сохраняем токены в localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);


        return data;
      });
  }

  refreshToken() {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) {
      throw new Error('No refresh token');
    }
    return this.api
      .post('token/refresh/', {
        json: { refresh: refresh_token },
      })
      .json()
      .then((data: any) => {
        // Обновляем access_token
        localStorage.setItem('access_token', data.access);
        return data;
      });
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }


  getToken() {
    return localStorage.getItem('access_token');
  }

  // Метод для получения профиля пользователя
  getProfile(): Promise<any> {
    return this.api.get('users/profile/').json(); // Возвращаем Promise с профилем
  }

}

// Функция для получения значения куки по имени
// @ts-ignore
function getCookie(name: string) {
  const cookieValue = `; ${document.cookie}`;
  const parts = cookieValue.split(`; ${name}=`);
  if (parts.length === 2) {
    // @ts-ignore
    return parts.pop().split(';').shift();
  }
}
