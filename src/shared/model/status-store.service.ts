import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StatusSocketService } from '@entities/gateway/api/status-socket';

@Injectable({
  providedIn: 'root'
})
export class UserStatusStoreService {
  private statusMap = new Map<number, BehaviorSubject<'online' | 'idle' | 'dnd' | 'offline'>>();

  constructor(private socketService: StatusSocketService) {
    this.socketService.getMessage().subscribe(data => {
      if (data.op === 'STATUS_UPDATE' && data.userId) {
        const status = data.status as 'online' | 'idle' | 'dnd' | 'offline';
        this.setStatus(data.userId, status);
      }
    });
  }

  setStatus(userId: number, status: 'online' | 'idle' | 'dnd' | 'offline') {
    if (!this.statusMap.has(userId)) {
      this.statusMap.set(userId, new BehaviorSubject(status));
    } else {
      this.statusMap.get(userId)!.next(status);
    }
  }

  getStatus$(userId: number): Observable<'online' | 'idle' | 'dnd' | 'offline'> {
    if (!this.statusMap.has(userId)) {
      this.statusMap.set(userId, new BehaviorSubject<'online' | 'idle' | 'dnd' | 'offline'>('offline'));
    }
    return this.statusMap.get(userId)!.asObservable();
  }
}
