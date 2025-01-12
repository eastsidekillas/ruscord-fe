import { Injectable } from '@angular/core';
import ky from 'ky';
import { environment } from "../../../environments/environment";
import {Router} from "@angular/router";

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

  constructor(private router: Router) {} // Инжектируем Router

  // Проверка токена перед запросом
  checkToken() {
    const token = localStorage.getItem('access_token');
    if (!token || this.isTokenExpired(token)) {
      this.logout();
      this.router.navigate(['/login']); // Перенаправление на страницу авторизации
    }
  }

  // Метод для проверки истечения срока действия токена
  private isTokenExpired(token: string): boolean {
    const decodedToken = this.decodeToken(token);
    const expirationTime = decodedToken.exp * 1000; // Преобразуем в миллисекунды
    return expirationTime < Date.now();
  }

  // Декодируем токен JWT
  private decodeToken(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  login(email: string, password: string) {
    return this.api
      .post('token/', {
        json: { email, password },
        credentials: 'include',
      })
      .json()
      .then(async (data: any) => {
        // Сохраняем токены в localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);

        // Ждем, пока токены будут сохранены, и только потом запрашиваем профиль
        try {
          const profileData = await this.getProfile();
          // Сохраняем user_id в localStorage
          localStorage.setItem('user_id', profileData.id);
          localStorage.setItem('username', profileData.username)
          return data;
        } catch (error) {
          console.error('Ошибка получения профиля:', error);
          throw error;
        }
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
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }


  getToken() {
    return localStorage.getItem('access_token');
  }

  getProfile(): Promise<any> {
    const token = this.getToken();  // Получаем токен из localStorage
    if (!token) {
      throw new Error('User is not authenticated');
    }

    return this.api
      .get('users/profile/', {
        headers: {
          'Authorization': `Bearer ${token}`, // Добавляем токен в заголовок
        },
      })
      .json(); // Возвращаем Promise с профилем
  }


  getCurrentUser() {
    const userId = localStorage.getItem('user_id');

    if (userId) {
      // объект пользователя с user_id
      return {
        id: userId,
        username: localStorage.getItem('username')
      };
    } else {
      return null;
    }
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
