import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '@entities/session/api/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import {NgIf} from '@angular/common';
import { errorText } from '@shared/api';

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
                Не больше 32 символов
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
                От 2 до 32 символов: латиница, цифры, «_» и «.»
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
                Пароль должен быть не менее 8 символов
              </div>
            </div>



            <button
              type="submit"
              [disabled]="busy"
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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  busy = false;

  // Rules match ruscord-core (docs/api.md); the server checks them anyway.
  initForm() {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: [''],
      username: [''],
      password: [''],
    });
    this.applyMode();
  }

  /** Switching keeps what was typed and only changes the rules. */
  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
    this.applyMode();
  }

  private applyMode() {
    this.errorMessage = '';
    const set = (name: string, v: ValidatorFn[]) => {
      const c = this.authForm.get(name)!;
      c.setValidators(v);
      c.updateValueAndValidity();
    };
    set('name', this.isLoginMode ? [] : [Validators.maxLength(32)]);
    set('username', this.isLoginMode ? [] : [Validators.required, Validators.pattern(/^(?!.*\.\.)[a-zA-Z0-9_.]{2,32}$/)]);
    set('password', this.isLoginMode ? [Validators.required] : [Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
  }

  onSubmit() {
    if (this.authForm.invalid || this.busy) {
      this.authForm.markAllAsTouched();
      return;
    }
    const { email, password, username, name } = this.authForm.value;
    const request = this.isLoginMode
      ? this.authService.login(email, password)
      : this.authService.register({ email, password, username, display_name: (name || '').trim() || username });
    this.busy = true;
    this.errorMessage = '';
    request.subscribe({
      next: () => {
        this.busy = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Only paths inside the app.
        this.router.navigateByUrl(returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/channels/me');
      },
      error: err => {
        this.busy = false;
        this.errorMessage = errorText(err, this.isLoginMode ? 'Ошибка входа. Проверьте данные.' : 'Ошибка регистрации. Попробуйте снова.');
      },
    });
  }
}
