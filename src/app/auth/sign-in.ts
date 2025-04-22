import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from '@shared/api/auth.service';
import { Router } from '@angular/router';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf
  ],
  template:
    `
      <div class="flex flex-col items-center justify-center min-h-screen bg-main-surface-primary">

        <div class="w-full max-w-md bg-main-surface-secondary shadow-lg rounded-lg p-8">


          <h2 class="text-2xl font-bold text-center text-white mb-4">
            {{ isLoginMode ? 'Авторизация' : 'Регистрация' }}
          </h2>

          <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="space-y-4">

            <!-- Поле для username (только при регистрации) -->

            <div>
              <label for="email" class="block mb-2 text-sm font-medium text-white">Email</label>
              <input
                id="email"
                formControlName="email"
                type="email"
                class="w-full px-3 py-2 bg-main-surface-primary text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <div *ngIf="authForm.get('email')?.invalid && authForm.get('email')?.touched"
                   class="text-red-500 text-sm mt-2">
                Введите корректный email
              </div>
            </div>

            <div *ngIf="!isLoginMode">
              <label for="name" class="block mb-2 text-sm font-medium text-white">Отображаемое имя</label>
              <input
                id="name"
                formControlName="name"
                type="text"
                class="w-full px-3 py-2 bg-main-surface-primary text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <div *ngIf="authForm.get('name')?.invalid && authForm.get('name')?.touched"
                   class="text-red-500 text-sm mt-2">
                Отображаемое имя обязательно
              </div>
            </div>


            <div *ngIf="!isLoginMode">
              <label for="username" class="block mb-2 text-sm font-medium text-white">Имя пользователя</label>
              <input
                id="username"
                formControlName="username"
                type="text"
                class="w-full px-3 py-2 bg-main-surface-primary text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <div *ngIf="authForm.get('username')?.invalid && authForm.get('username')?.touched"
                   class="text-red-500 text-sm mt-2">
                Имя пользователя обязательно
              </div>
            </div>



            <div>
              <label for="password" class="block mb-2 text-sm font-medium text-white">Пароль</label>
              <input
                id="password"
                formControlName="password"
                type="password"
                class="w-full px-3 py-2 bg-main-surface-primary text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Введите ваш пароль"
                required
              />
              <div *ngIf="authForm.get('password')?.hasError('required') && authForm.get('password')?.touched"
                   class="text-red-500 text-sm mt-2">
                Пароль обязателен
              </div>
              <div *ngIf="authForm.get('password')?.hasError('minlength') && authForm.get('password')?.touched"
                   class="text-red-500 text-sm mt-2">
                Пароль должен быть не менее 6 символов
              </div>
            </div>



            <button
              type="submit"
              class="text-white bg-green-500 disabled:bg-gray-600 hover:bg-gray-600 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center transition"
            >
              {{ isLoginMode ? 'Войти' : 'Зарегистрироваться' }}
            </button>

            <!-- Сообщения об ошибке или успехе -->
            <div *ngIf="successMessage" class="text-green-500 text-sm text-center mt-4">
              {{ successMessage }}
            </div>
            <div *ngIf="errorMessage" class="text-red-500 text-sm text-center mt-4">
              {{ errorMessage }}
            </div>
          </form>

          <p class="text-sm text-center mt-4 text-white">
            {{ isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
            <a (click)="onSwitchMode()" class="text-green-500 cursor-pointer">
              {{ isLoginMode ? 'Зарегистрироваться' : 'Войти' }}
            </a>
          </p>
        </div>
      </div>


    `
})
export class SignIn implements OnInit {
  authForm!: FormGroup;
  isLoginMode = true;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.initForm();
  }

  // Инициализация формы
  initForm() {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', this.isLoginMode ? [] : [Validators.required]],
      username: ['', this.isLoginMode ? [] : [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // Переключение между режимами
  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
    this.initForm();  // Переинициализировать форму после переключения
    this.logFormState(); // Логируем состояние формы после переключения
  }

  logFormState() {
    ['username', 'email', 'password', 'name'].forEach(field => {
      const control = this.authForm.get(field);
    });
  }

  onSubmit() {
    this.logFormState(); // Логируем состояние формы

    if (this.authForm.invalid) {
      return;
    }

    const email = this.authForm.value.email;
    const password = this.authForm.value.password;

    if (this.isLoginMode) {
      // Логика для логина
      this.authService.login(email, password).subscribe(
        () => {
          this.successMessage = 'Успешный вход!';
          setTimeout(() => {
            this.router.navigate(['/channels/me/']);
          }, 1000);
        },
        () => {
          this.errorMessage = 'Ошибка входа. Проверьте данные.';
        }
      );
    } else {
      // Логика для регистрации
      const username = this.authForm.value.username;
      const name = this.authForm.value.name;

      this.authService.register(username, email, password, name).subscribe(
        () => {
          this.successMessage = 'Вы успешно зарегистрированы!';
          setTimeout(() => {
            this.router.navigate(['login']);
          }, 1000);
        },
        () => {
          this.errorMessage = 'Ошибка регистрации. Попробуйте снова.';
        }
      );
    }
  }
}
