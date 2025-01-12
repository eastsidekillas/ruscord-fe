import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-navigation-profile-modal',
  templateUrl: './navigation-profile-modal.component.html',
  styleUrls: ['./navigation-profile-modal.component.css']
})
export class NavigationProfileModalComponent {
  @Input() isVisible: boolean = false; // Получаем состояние видимости
  @Input() user: any = {}; // Получаем данные пользователя
  @Output() onClose = new EventEmitter<void>(); // Событие для уведомления родителя

  close() {
    this.onClose.emit(); // Уведомляем родительский компонент
  }
}
