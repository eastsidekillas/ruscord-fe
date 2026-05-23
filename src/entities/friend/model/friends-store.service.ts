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
    // Poll both lists every 30s to pick up remote changes (friend accepted, new request)
    interval(30_000).subscribe(() => this.refresh());
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
