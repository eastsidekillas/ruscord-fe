import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { StatusSocketService } from '@entities/gateway/api/status-socket';// Укажите правильный путь к сервису
import { Subscription } from 'rxjs';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'StatusUI',
  standalone: true,
  imports: [CommonModule],
  template:
    `
      <span
        class="w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 transition-all duration-300"
        [ngClass]="{
        'bg-green-500': status === 'online',
        'bg-yellow-500': status === 'idle',
        'bg-gray-400': status === 'offline'
      }"></span>
    `
})
export class StatusUi implements OnInit, OnDestroy {
  @Input() userId!: number; // Ожидаем ID пользователя, чей статус нужно отображать
  status: string = 'offline'; // Начальный статус
  private socketSubscription!: Subscription;

  constructor(private statusSocketService: StatusSocketService) {}

  ngOnInit(): void {
    this.socketSubscription = this.statusSocketService.getMessage().subscribe((data) => {
      // Проверяем, что пришел статус для нужного userId
      if (data && data.userId === this.userId && data.op === 'STATUS_UPDATE') {
        this.status = data.status || 'offline';  // Устанавливаем статус
      }
    });
  }

  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    this.statusSocketService.disconnect();
  }
}
