import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { StatusSocketService } from '@entities/gateway/api/status-socket';// Укажите правильный путь к сервису
import { Subscription } from 'rxjs';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'StatusUIText',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-1">
      <span class="text-xs text-gray-300"
            [ngClass]="{
      'text-green-400': status === 'online',
      'text-yellow-400': status === 'idle',
      'text-red-400': status === 'busy',
      'text-gray-400': status === 'offline'
    }">
        {{ getStatusText(status) }}
      </span>
    </div>
  `,
})
export class StatusUIText implements OnInit, OnDestroy {
  @Input() userId!: string;
  status: string = 'offline';
  private socketSubscription!: Subscription;

  constructor(private statusSocketService: StatusSocketService) {}

  ngOnInit(): void {
    this.socketSubscription = this.statusSocketService.getMessage().subscribe((data) => {
      if (data && data.userId === this.userId && data.op === 'STATUS_UPDATE') {
        this.status = data.status || 'offline';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    this.statusSocketService.disconnect();
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'online': return 'В сети';
      case 'idle': return 'Не активен';
      case 'busy': return 'Занят';
      case 'offline': return 'Не в сети';
      default: return 'Неизвестно';
    }
  }
}
