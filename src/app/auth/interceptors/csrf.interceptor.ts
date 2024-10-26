import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Получение CSRF токена из куки
    const csrfToken = this.getCookie('csrftoken');

    // Если токен найден, добавляем его в заголовки запроса
    if (csrfToken) {
      const cloned = req.clone({
        headers: req.headers.set('X-CSRFToken', csrfToken)
      });
      return next.handle(cloned);
    } else {
      // Если токен не найден, просто передаем запрос без изменений
      return next.handle(req);
    }
  }

  // Метод для получения значения куки по имени
  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
  }
}
