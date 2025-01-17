import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-navigation-profile-modal',
  templateUrl: './navigation-profile-modal.component.html',
  styleUrls: ['./navigation-profile-modal.component.css']
})
export class NavigationProfileModalComponent {
  @Input() isVisible: boolean = false; // Состояние видимости модального окна
  @Input() user: any = {}; // Данные пользователя для редактирования
  @Output() onClose = new EventEmitter<void>(); // Событие для уведомления родителя о закрытии окна
  @Output() onSave = new EventEmitter<any>(); // Событие для уведомления родителя о сохранении данных

  // Флаги для редактирования каждого поля
  isEditingEmail: boolean = false;
  isEditingPhone: boolean = false;
  isEditingBio: boolean = false;

  // Закрыть модальное окно
  close(): void {
    this.onClose.emit();
  }

  // Переключение режима редактирования
  toggleEdit(field: string): void {
    if (field === 'email') this.isEditingEmail = !this.isEditingEmail;
    if (field === 'phone') this.isEditingPhone = !this.isEditingPhone;
    if (field === 'bio') this.isEditingBio = !this.isEditingBio;
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.user.avatar = reader.result as string; // Предварительный просмотр
        this.onSave.emit(this.user); // Отправляем обновленные данные аватара
      };

      reader.readAsDataURL(file);
    }
  }


  // Сохранение изменений
  saveEdit(field: string): void {
    this.toggleEdit(field); // Закрываем редактирование для этого поля
    this.user = { ...this.user }; // Обновляем объект пользователя, чтобы передать его обратно в родительский компонент
    this.onSave.emit(this.user); // Отправляем обновленные данные в родительский компонент
  }

  // Отмена изменений
  cancelEdit(field: string): void {
    this.toggleEdit(field); // Закрыть редактирование для этого поля
    // Восстановление старых значений данных можно выполнить, если это необходимо
  }
}
