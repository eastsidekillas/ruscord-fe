import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from '@shared/api/api.service';
import { interval } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FriendsStoreService {
  readonly friends = signal<any[]>([]);
  readonly pendingRequests = signal<any[]>([]);
  readonly pendingCount = computed(() => this.pendingRequests().length);

  constructor(private api: ApiService) {
    this.refresh();
    // Poll incoming requests every 30s to catch new ones in real time
    interval(30_000).subscribe(() => this.loadPendingRequests());
  }

  loadFriends(): void {
    this.api.getMyFriends().subscribe({
      next: (res) => this.friends.set(res),
      error: (err) => console.error('FriendsStore: loadFriends error', err),
    });
  }

  loadPendingRequests(): void {
    this.api.getFriendRequests().subscribe({
      next: (res) => this.pendingRequests.set(res.incoming ?? []),
      error: (err) => console.error('FriendsStore: loadPending error', err),
    });
  }

  refresh(): void {
    this.loadFriends();
    this.loadPendingRequests();
  }
}
