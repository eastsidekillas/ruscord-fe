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
      username: ['', Validators.required],
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
      if (this.authForm.get('password')?.value !== control.value) {
        return { 'passwordMismatch': true };
      }
      return null;
    };
  }

  // Переключение между режимами
  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
    if (this.isLoginMode) {
      this.authForm.get('confirmPassword')?.clearValidators();
    } else {
      this.authForm.get('confirmPassword')?.setValidators([Validators.required, this.passwordsMatchValidator()]);
    }
    this.authForm.get('confirmPassword')?.updateValueAndValidity();
  }


  onSubmit() {
    if (this.authForm.invalid) {
      return;
    }
    const username = this.authForm.value.username;
    const email = this.authForm.value.email;
    const password = this.authForm.value.password;

    if (this.isLoginMode) {
      this.authService.login(email, password).then(
        () => this.router.navigate(['main']),
        (error) => this.errorMessage = 'Ошибка входа. Проверьте данные!'
      );
    } else {
      // Логика регистрации
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
            this.isLoginMode = true
          }, 1000);
        },
        (error) => {
          this.errorMessage = 'Ошибка регистрации. Попробуйте снова.';
        }
      );
    }
  }
}
