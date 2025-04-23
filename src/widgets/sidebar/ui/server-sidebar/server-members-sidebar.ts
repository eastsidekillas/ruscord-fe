import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@shared/api/api.service';
import { Observable, Subject, switchMap, takeUntil } from 'rxjs';

export interface ServerMember {
  id: number; // ID участника сервера
  profile: {
    id: number; // ID профиля пользователя
    user: {
      id: number;
      email: string;
      username: string;
      is_active: boolean;
      is_staff: boolean;
      is_superuser: boolean;
      created_at: string;
    };
    name: string;
    avatar: string | null; // Может быть null
    bio: string;
    global_name: string | null;
    status: string; // "online", "offline" и т.д.
    created_at: string;
    updated_at: string;
  };
  joined_at: string;
}

@Component({
  selector: 'ServerMembersSidebar',
  standalone: true,
  imports: [CommonModule],
  template:
    `
      <div class="bg-sidebar-surface-secondary border-l border-gray-700 h-full overflow-y-auto px-3 py-4">
        <h2 class="text-md font-semibold text-typo-secondary mb-2">Участники</h2>
        <div *ngIf="members && members.length > 0; else noMembers">
          <div *ngFor="let member of members" class="flex items-center space-x-2 py-2">
            <div class="relative w-8 h-8 rounded-full overflow-hidden">
              <img *ngIf="member.profile.avatar" [src]="member.profile.avatar" alt="{{ member.profile.name }}" class="w-full h-full object-cover">
              <div *ngIf="!member.profile.avatar" class="w-full h-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">{{ member.profile.name.charAt(0).toUpperCase() }}</div>
              <span *ngIf="member.profile.status"
                    class="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-sidebar-surface-secondary"
                    [ngClass]="{
                'bg-green-500': member.profile.status === 'online',
                'bg-gray-400': member.profile.status === 'offline',
                'bg-yellow-500': member.profile.status === 'idle',
                'bg-red-500': member.profile.status === 'dnd'
              }">
        </span>
            </div>
            <span class="text-sm text-typo-primary">{{ member.profile.name }} ({{ member.profile.user.username }})</span>
          </div>
        </div>
        <ng-template #noMembers>
          <p class="text-sm text-typo-secondary">Нет участников на сервере.</p>
        </ng-template>
      </div>

    `
})
export class ServerMembersSidebar implements OnInit, OnDestroy {
  @Input() serverId: Observable<string | null> | undefined;
  members: ServerMember[] | null = null;
  private ngUnsubscribe = new Subject<void>();

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.serverId) {
      this.serverId.pipe(
        switchMap(serverId => {
          if (serverId && serverId !== 'me') {
            console.log('Загружаем участников для сервер ID:', serverId);
            return this.apiService.getServerMembers(serverId);
          } else {
            console.log('Нет нужды загружать участников, так как это DM или неверный serverId');
            return new Observable<ServerMember[]>();
          }
        }),
        takeUntil(this.ngUnsubscribe)
      ).subscribe({
        next: (members) => {
          console.log('Получены участники:', members);
          this.members = members;
        },
        error: (error) => {
          console.error('Ошибка загрузки участников сервера:', error);
          this.members = [];
        }
      });
    }
  }


  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
