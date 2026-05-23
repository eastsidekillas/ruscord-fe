import { Injectable, signal } from '@angular/core';
import { StatusSocketService } from '../api/status-socket';

export type StatusType = 'online' | 'idle' | 'dnd' | 'offline';

@Injectable({ providedIn: 'root' })
export class UserStatusStoreService {
  readonly statuses = signal<Record<string, StatusType>>({});

  constructor(private socketService: StatusSocketService) {
    this.socketService.getMessage().subscribe(data => {
      if (data.op === 'STATUS_UPDATE' && data.userId) {
        this.setStatus(data.userId, data.status as StatusType);
      }
    });
  }

  setStatus(userId: string, status: StatusType): void {
    this.statuses.update(prev => ({ ...prev, [userId]: status }));
  }
}
