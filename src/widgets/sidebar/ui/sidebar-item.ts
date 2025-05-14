import { Component, OnInit } from '@angular/core';
import { ApiService } from '@shared/api/api.service';
import { Router } from '@angular/router';
import { NgIf, NgForOf } from '@angular/common';
import {StatusUi} from '@shared/ui/status-ui';

@Component({
  selector: 'SidebarItem',
  standalone: true,
  imports: [NgIf, NgForOf, StatusUi],
  template: `
    <div class="flex flex-col space-y-2">
      <button
        class="flex items-center space-x-3 py-3 px-3 rounded-md hover:bg-main-surface-secondary"
        *ngFor="let friend of friends"
        (click)="openChat(friend.id)">

        <div class="relative w-10 h-10">
          <div class="w-full h-full rounded-full overflow-hidden">
            <img
              *ngIf="friend.avatar"
              class="w-full h-full object-cover"
              [src]="friend.avatar"
              [alt]="friend.name" />
            <div
              *ngIf="!friend.avatar"
              class="w-full h-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
              {{ friend.name.charAt(0).toUpperCase() }}
            </div>
          </div>

          <StatusUI [userId]="friend.user.id"></StatusUI>
        </div>




        <span class="text-gray-300 text-sm">{{ friend.name }}</span>

        <span
          class="top-0 right-0 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
          *ngIf="getUnreadCount(friend.id) > 0">
          {{ getUnreadCount(friend.id) }}
        </span>
      </button>
    </div>
  `,
})
export class SidebarItem implements OnInit {
  friends: any[] = [];
  unreadMessagesCount: { [key: string]: number } = {};
  isLoading = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadFriends();
  }

  loadFriends(): void {
    this.apiService.getMyFriends().subscribe({
      next: (response) => {
        this.friends = response;
      },
      error: (err) => {
        console.error('Ошибка загрузки друзей:', err);
      },
    });
  }

  openChat(friendId: number): void {
    this.isLoading = true;

    this.apiService.postCreateChannel(friendId).subscribe({
      next: (channel) => {
        this.isLoading = false;
        if (channel.id) {
          this.router.navigate([`channels/me/${channel.id}`]);
        } else {
          console.error('Ошибка: Канал не содержит UUID.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Ошибка при открытии канала:', err);
      },
    });
  }

  getUnreadCount(friendId: string): number {
    return this.unreadMessagesCount[friendId] || 0;
  }
}
