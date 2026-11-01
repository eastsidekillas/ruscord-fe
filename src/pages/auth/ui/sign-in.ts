import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '@entities/session/api/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import {NgIf} from '@angular/common';
import { errorText } from '@shared/api';
import { APP_MARK, WORDMARK } from '@shared/config/brand';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf
  ],
  host: { class: 'block' },
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-ok-bg text-ok-text text-[15px]">
      <div class="flex items-center gap-3 text-2xl font-semibold tracking-[-0.02em]">
        <img [src]="mark" alt="" class="w-9 h-9" />{{ wordmark }}
      </div>

      <form [formGroup]="authForm" (ngSubmit)="onSubmit()" novalidate
            class="w-full max-w-[400px] rounded-ok-lg bg-ok-surface-1 border border-ok-border p-10 flex flex-col gap-5">
        <div class="flex flex-col gap-1.5">
          <h1 class="text-[32px] leading-10 font-semibold tracking-[-0.02em]">{{ isLoginMode ? 'С возвращением' : 'Создать аккаунт' }}</h1>
          <p *ngIf="isLoginMode" class="text-ok-muted">Войдите, чтобы зайти к своим.</p>
        </div>

        <div *ngIf="errorMessage() as err" role="alert" class="rounded-ok-md bg-ok-surface-2 px-3.5 py-3 text-[13px] leading-[18px] text-ok-danger">{{ err }}</div>

        <div class="flex flex-col gap-1.5">
          <label for="email" class="text-[13px] font-medium text-ok-muted">Email</label>
          <input id="email" formControlName="email" type="email" autocomplete="email"
                 class="ok-input" [class.ok-invalid]="bad('email')" [attr.aria-invalid]="bad('email')" aria-describedby="email-err" />
          <span *ngIf="bad('email')" id="email-err" class="text-[13px] text-ok-danger">Некорректный email</span>
        </div>

        <div *ngIf="!isLoginMode" class="flex flex-col gap-1.5">
          <label for="username" class="text-[13px] font-medium text-ok-muted">Имя пользователя</label>
          <input id="username" formControlName="username" type="text" autocomplete="username"
                 class="ok-input" [class.ok-invalid]="bad('username')" [attr.aria-invalid]="bad('username')" aria-describedby="username-err" />
          <span *ngIf="bad('username')" id="username-err" class="text-[13px] text-ok-danger">От 2 до 32 символов: латиница, цифры, _ и .</span>
        </div>

        <div *ngIf="!isLoginMode" class="flex flex-col gap-1.5">
          <label for="name" class="text-[13px] font-medium text-ok-muted">Как вас показывать <span class="font-normal">(необязательно)</span></label>
          <input id="name" formControlName="name" type="text" autocomplete="nickname"
                 class="ok-input" [class.ok-invalid]="bad('name')" [attr.aria-invalid]="bad('name')" aria-describedby="name-err" />
          <span *ngIf="bad('name')" id="name-err" class="text-[13px] text-ok-danger">Не длиннее 32 символов</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="password" class="text-[13px] font-medium text-ok-muted">Пароль</label>
          <input id="password" formControlName="password" type="password" [attr.autocomplete]="isLoginMode ? 'current-password' : 'new-password'"
                 class="ok-input" [class.ok-invalid]="bad('password')" [attr.aria-invalid]="bad('password')" aria-describedby="password-err" />
          <span *ngIf="bad('password')" id="password-err" class="text-[13px] text-ok-danger">{{ passwordError() }}</span>
        </div>

        <button type="submit" [disabled]="busy()"
                class="h-12 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-60">
          {{ isLoginMode ? 'Войти' : 'Зарегистрироваться' }}
        </button>

        <p class="text-[13px] text-ok-muted text-center">
          {{ isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
          <a href="#" (click)="$event.preventDefault(); onSwitchMode()" class="text-ok-accent underline">{{ isLoginMode ? 'Зарегистрироваться' : 'Войти' }}</a>
        </p>
      </form>
    </div>
  `,
  styles: `
    .ok-input {
      height: 48px; box-sizing: border-box; border-radius: 12px; padding: 0 16px;
      border: 1px solid var(--color-ok-border-control); background: var(--color-ok-sidebar); color: var(--color-ok-text);
    }
    .ok-input.ok-invalid { border-color: var(--color-ok-danger); }
  `,
})
export class SignIn implements OnInit {
  authForm!: FormGroup;
  isLoginMode = true;
  /** Signals: the page sits under OnPush parents, plain fields would not redraw it. */
  protected readonly errorMessage = signal('');
  protected readonly wordmark = WORDMARK;
  protected readonly mark = APP_MARK;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  protected readonly busy = signal(false);

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
    this.errorMessage.set('');
    const set = (name: string, v: ValidatorFn[]) => {
      const c = this.authForm.get(name)!;
      c.setValidators(v);
      c.updateValueAndValidity();
    };
    set('name', this.isLoginMode ? [] : [Validators.maxLength(32)]);
    set('username', this.isLoginMode ? [] : [Validators.required, Validators.pattern(/^(?!.*\.\.)[a-zA-Z0-9_.]{2,32}$/)]);
    set('password', this.isLoginMode ? [Validators.required] : [Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
  }

  /** A field the user touched that does not pass. */
  protected bad(name: string): boolean {
    const c = this.authForm.get(name);
    return !!c && c.invalid && c.touched;
  }

  /** The password rule that fails, as the server words it. */
  protected passwordError(): string {
    const c = this.authForm.get('password')!;
    if (c.hasError('required')) return 'Введите пароль';
    if (c.hasError('minlength')) return 'Не короче 8 символов';
    return 'Не длиннее 128 символов';
  }

  onSubmit() {
    if (this.authForm.invalid || this.busy()) {
      this.authForm.markAllAsTouched();
      return;
    }
    const { email, password, username, name } = this.authForm.value;
    const request = this.isLoginMode
      ? this.authService.login(email, password)
      : this.authService.register({ email, password, username, display_name: (name || '').trim() || username });
    this.busy.set(true);
    this.errorMessage.set('');
    request.subscribe({
      next: () => {
        this.busy.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Only paths inside the app.
        this.router.navigateByUrl(returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/channels/me');
      },
      error: err => {
        this.busy.set(false);
        this.errorMessage.set(errorText(err, this.isLoginMode ? 'Ошибка входа. Проверьте данные.' : 'Ошибка регистрации. Попробуйте снова.'));
      },
    });
  }
}
