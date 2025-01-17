import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from "../../services/auth.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  templateUrl: './auth-form.component.html',
  styleUrls: ['./auth-form.component.css']
})
export class AuthFormComponent implements OnInit {
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
      username: ['', this.isLoginMode ? [] : [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['']
    });

    if (!this.isLoginMode) {
      this.authForm.get('confirmPassword')?.setValidators([Validators.required, this.passwordsMatchValidator()]);
    }
  }

  // Валидация на совпадение паролей
  passwordsMatchValidator() {
    return (control: any): { [s: string]: boolean } | null => {
      if (!this.isLoginMode && this.authForm.get('password')?.value !== control.value) {
        return { 'passwordMismatch': true };
      }
      return null;
    };
  }

  // Переключение между режимами
  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
    this.initForm();  // Переинициализировать форму после переключения

    console.log('Switched Mode:', this.isLoginMode ? 'Login' : 'Register');
    this.logFormState(); // Логируем состояние формы после переключения
  }

  logFormState() {
    console.log('Form Status:', this.authForm.status);
    console.log('Form Values:', this.authForm.value);
    console.log('Form Errors:', this.authForm.errors);
    ['username', 'email', 'password', 'confirmPassword'].forEach(field => {
      const control = this.authForm.get(field);
      console.log(`${field} Errors:`, control?.errors);
      console.log(`${field} Value:`, control?.value);
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
      this.authService.login(email, password).then(
        () => {
          this.successMessage = 'Успешный вход!';
          setTimeout(() => {
            this.router.navigate(['/main']);
          }, 1000);
        },
        () => {
          this.errorMessage = 'Ошибка входа. Проверьте данные.';
        }
      );
    } else {
      // Логика для регистрации
      const username = this.authForm.value.username;
      const confirmPassword = this.authForm.value.confirmPassword;

      if (password !== confirmPassword) {
        this.errorMessage = 'Пароли не совпадают';
        return;
      }

      this.authService.register(username, email, password).then(
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
