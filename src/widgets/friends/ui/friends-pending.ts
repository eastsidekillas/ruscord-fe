import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@shared/api/api.service';
import { AvatarUI } from '@shared/ui/avatar';
import { FriendsStoreService } from '@entities/friend';

@Component({
  selector: 'FriendPending',
  standalone: true,
  imports: [CommonModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col space-y-2 px-6 pt-6">
      <h2 class="text-xl font-semibold text-typo-secondary">Ожидание заявок в друзья</h2>
      <span class="text-sm text-typo-secondary">Здесь отображаются все заявки, которые вы получили</span>
    </div>

    <div class="overflow-y-auto space-y-3 px-6 p-6">
      <div class="flex items-center space-x-3 py-3 px-3 justify-between rounded-md bg-main-surface-secondary"
           *ngFor="let request of store.pendingRequests()">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full overflow-hidden">
            <AvatarUI [src]="request.from_user.avatar" [name]="request.from_user.name" />
          </div>
          <span class="text-sm text-gray-300">{{ request.from_user.name }}</span>
        </div>

        <div class="flex space-x-4">
          <button (click)="acceptRequest(request.id)" class="text-sm text-white p-3 rounded-2xl bg-green-500 transition duration-300">
            Принять
          </button>
          <button (click)="rejectRequest(request.id)" class="text-sm text-white p-3 rounded-2xl bg-red-500 transition duration-300">
            Отклонить
          </button>
        </div>
      </div>
    </div>

    <p *ngIf="store.pendingRequests().length === 0" class="text-center text-typo-secondary mt-4">
      У вас нет ожидающих заявок
    </p>
  `
})
export class FriendPending implements OnInit {
  protected readonly store = inject(FriendsStoreService);
  private readonly api = inject(ApiService);

  ngOnInit() {
    // Refresh when tab is opened to get latest requests
    this.store.loadPendingRequests();
  }

  acceptRequest(requestId: string): void {
    this.api.postToFriendRequestAccept(requestId).subscribe({
      next: () => this.store.refresh(),
      error: (err) => console.error('Ошибка при принятии заявки:', err),
    });
  }

  rejectRequest(requestId: string) {
    this.api.postToFriendRequestReject(requestId).subscribe({
      next: () => this.store.loadPendingRequests(),
      error: (err) => console.error('Ошибка при отклонении заявки:', err),
    });
  }
}
