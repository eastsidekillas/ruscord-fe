import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../core/services/api.service";
import { AuthService } from "../../../auth/services/auth.service";

@Component({
  selector: 'app-navigaton-sidebar',
  templateUrl: './navigaton-sidebar.component.html',
  styleUrls: ['./navigaton-sidebar.component.css']
})
export class NavigatonSidebarComponent implements OnInit {
  profile: any;
  originalProfile: any; // Для хранения исходных данных профиля
  isProfileModalVisible: boolean = false;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.apiService.getProfile().subscribe((data: any) => {
      this.profile = data;
      this.originalProfile = { ...data }; // Копируем исходные данные для сравнения
      localStorage.setItem('user_id', data.id);
    });
  }

  // Открытие модального окна
  openProfileModal(): void {
    this.isProfileModalVisible = true;
  }

  closeProfileModal() {
    this.isProfileModalVisible = false;
  }

  // Метод выхода из аккаунта
  logout() {
    this.authService.logout();
  }

  // Сохранение изменений профиля
  saveUserProfile(updatedUser: any) {
    console.log('Обновленные данные профиля:', updatedUser);

    const changes = this.getChangedFields(updatedUser);

    if (Object.keys(changes).length === 0) {
      console.log('Нет изменений в профиле');
      return;
    }

    const formData = new FormData();
    Object.keys(changes).forEach((key) => {
      if (key === 'avatar' && changes['avatar'].startsWith('data:image')) {
        const blob = this.dataURLtoBlob(changes['avatar']);
        formData.append(key, blob, 'avatar.png');
      } else {
        formData.append(key, changes[key]);
      }
    });

    this.apiService.updateProfile(formData).subscribe(
      (response) => {
        console.log('Профиль обновлен', response);
        this.profile = { ...this.profile, ...changes }; // Обновляем локальные данные
        this.isProfileModalVisible = false; // Закрываем модальное окно
      },
      (error) => {
        console.error('Ошибка при обновлении профиля', error);
      }
    );
  }


  dataURLtoBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uintArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mimeString });
  }


  // Метод для получения только измененных полей
  getChangedFields(updatedUser: any): { [key: string]: any } {
    const changes: { [key: string]: any } = {}; // Указываем тип объекта

    // Проверяем, какие поля изменены
    Object.keys(updatedUser).forEach((key) => {
      if (updatedUser[key] !== this.originalProfile[key]) {
        changes[key] = updatedUser[key]; // Добавляем только измененные поля
      }
    });

    return changes;
  }
}
