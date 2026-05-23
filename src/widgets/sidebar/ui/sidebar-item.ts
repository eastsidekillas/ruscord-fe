import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgForOf } from '@angular/common';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';
import { FriendsStoreService } from '@entities/friend';
import { ApiService } from '@shared/api/api.service';

@Component({
  selector: 'SidebarItem',
  standalone: true,
  imports: [NgForOf, StatusUi, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col space-y-2">
      <button
        class="flex items-center space-x-3 py-3 px-3 rounded-md hover:bg-main-surface-secondary"
        *ngFor="let friend of store.friends()"
        (click)="openChat(friend.id)">

        <div class="relative w-10 h-10">
          <div class="w-full h-full rounded-full overflow-hidden">
            <AvatarUI [src]="friend.avatar" [name]="friend.name" />
          </div>
          <StatusUI [userId]="friend.user.id"></StatusUI>
        </div>

        <span class="text-gray-300 text-sm">{{ friend.name }}</span>
      </button>
    </div>
  `,
})
export class SidebarItem {
  protected readonly store = inject(FriendsStoreService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  openChat(friendId: string): void {
    this.api.postCreateChannel(friendId).subscribe({
      next: (channel) => {
        if (channel.id) {
          this.router.navigate([`channels/me/${channel.id}`]);
        }
      },
      error: (err) => console.error('Ошибка при открытии канала:', err),
    });
  }
}
