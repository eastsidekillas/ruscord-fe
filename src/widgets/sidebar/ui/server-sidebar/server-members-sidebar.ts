import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@shared/api/api.service';
import { Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';

export interface ServerMember {
  id: string;
  profile: {
    id: string;
    user: {
      id: string;
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
  imports: [CommonModule, StatusUi, AvatarUI],
  template:
    `
      <div class="bg-sidebar-surface-secondary border-l border-gray-700 h-full overflow-y-auto px-3 py-4">
        <h2 class="text-md font-semibold text-typo-secondary mb-2">Участники</h2>
        <div *ngIf="members && members.length > 0; else noMembers">
          <div *ngFor="let member of members" class="flex items-center space-x-2 py-2">
            <div class="relative w-10 h-10">
              <div class="w-full h-full rounded-full overflow-hidden">
                <AvatarUI [src]="member.profile.avatar" [name]="member.profile.name" />
              </div>
              <StatusUI [userId]="member.profile.user.id"></StatusUI>
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
            return this.apiService.getServerMembers(serverId);
          } else {
            return new Observable<ServerMember[]>();
          }
        }),
        takeUntil(this.ngUnsubscribe)
      ).subscribe({
        next: (members) => {
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
