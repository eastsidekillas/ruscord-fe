import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatusStoreService } from '@shared/model/status-store.service';
import { Observable } from 'rxjs';

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
              'text-red-400': status === 'dnd',
              'text-gray-400': status === 'offline'
            }">
        {{ getStatusText(status) }}
      </span>
    </div>
  `,
})
export class StatusUIText implements OnInit {
  @Input() userId!: number; // Здесь должен быть number, как в UserStatusStoreService
  status: 'online' | 'idle' | 'dnd' | 'offline' = 'offline';

  constructor(private userStatusStore: UserStatusStoreService) {}

  ngOnInit(): void {
    this.userStatusStore.getStatus$(this.userId).subscribe(status => {
      this.status = status;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'online': return 'В сети';
      case 'idle': return 'Не активен';
      case 'dnd': return 'Занят';
      case 'offline': return 'Не в сети';
      default: return 'Неизвестно';
    }
  }
}
