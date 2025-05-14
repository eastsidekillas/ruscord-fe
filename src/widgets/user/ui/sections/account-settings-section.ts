import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';
import {InputComponent} from '@shared/ui/input';
import {TextareaComponent} from '@shared/ui/textarea';

@Component({
  selector: 'AccountSettingsSection',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TextareaComponent],
  template: `
    <div class="bg-sidebar-surface-primary p-6 rounded-xl shadow-lg space-y-4">
      <!-- Режим просмотра -->
      <div *ngIf="!isEditing">
        <div>
          <label class="block text-sm font-medium text-gray-300">Имя пользователя</label>
          <p class="mt-1 text-white">{{ username }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300">Имя</label>
          <p class="mt-1 text-white">{{ name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300">Глобальное имя</label>
          <p class="mt-1 text-white">{{ globalName }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300">Биография</label>
          <p class="mt-1 text-white">{{ bio }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300">Аватар</label>
          <div class="mt-1">
            <img *ngIf="avatar" [src]="avatar" alt="Avatar" class="w-16 h-16 rounded-full" />
            <p *ngIf="!avatar" class="text-gray-500">Аватар не загружен</p>
          </div>
        </div>

        <div class="text-right">
          <button (click)="isEditing = true" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md font-semibold">
            Редактировать профиль
          </button>
        </div>
      </div>

      <!-- Режим редактирования -->
      <div *ngIf="isEditing">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300">Имя пользователя</label>
          <app-input type="text" [(ngModel)]="username"></app-input>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300">Имя</label>
          <app-input type="text" [(ngModel)]="name"></app-input>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300">Глобальное имя</label>
          <app-input type="text" [(ngModel)]="globalName"></app-input>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300">Обо Мне</label>
          <app-textarea [(ngModel)]="bio"></app-textarea>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300">Аватар</label>
          <input type="file" (change)="onAvatarChange($event)" class="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white" />
        </div>

        <div class="text-right">
          <button (click)="saveChanges()" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-green-600 transition">
            Сохранить
          </button>
          <button (click)="isEditing = false" class="px-4 py-2 bg-green-500 text-sm rounded-xl text-white hover:bg-green-600 transition ml-2">
            Отменить
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AccountSettingsSectionComponent {
  isEditing = false; // Состояние редактирования
  username = 'Username'; // Данные пользователя
  name = 'Имя'; // Данные пользователя
  globalName = 'Глобальное имя'; // Данные пользователя
  bio = 'Описание профиля...'; // Данные пользователя
  avatar = 'https://via.placeholder.com/150'; // Данные аватара

  // Метод для сохранения изменений
  saveChanges() {
    // Здесь можно добавить логику для отправки изменений на сервер
    console.log('Сохранены изменения:', { username: this.username, name: this.name, globalName: this.globalName, bio: this.bio, avatar: this.avatar });

    // После сохранения изменений переключаемся в режим просмотра
    this.isEditing = false;
  }

  // Обработка изменения аватара
  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      // Здесь можно реализовать логику загрузки аватара (например, отправить файл на сервер)
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatar = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
}
