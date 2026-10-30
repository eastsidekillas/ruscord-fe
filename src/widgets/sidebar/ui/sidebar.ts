import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarItem } from './sidebar-item';
import { SidebarHeader } from '@widgets/sidebar/ui/sidebar-header';
import { ServerChannelsItems } from '@widgets/sidebar/ui/server-sidebar/server-channels-items';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { DropdownMenuItem } from '@shared/ui/dropdown-menu';
import { ApiService, Perm, errorText, hasPerm } from '@shared/api';
import { AppStateStore } from '@entities/app-state';

@Component({
  selector: 'Sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, SidebarItem, SidebarHeader, ServerChannelsItems],
  template: `
    <div class="flex flex-col h-full">
      <SidebarHeader
        [serverName]="guild()?.name ?? null"
        [isServerRoute]="isServerRoute"
        [items]="menu()"
        (menuAction)="handleMenuAction($event)"
      />

      <ng-container *ngIf="!isServerRoute">
        <div class="overflow-y-auto space-y-3 mb-4 px-4">
          <a [routerLink]="['/channels/me']" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="bg-green-500"
             class="flex items-center space-x-3 py-3 px-3 rounded-md bg-main-surface-secondary hover:bg-green-500">
            <svg class="w-6 h-6 mr-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                 viewBox="0 0 24 24">
              <path fill-rule="evenodd"
                    d="M12 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.5 8a4 4 0 0 0-4 4 2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-3Zm6.82-3.096a5.51 5.51 0 0 0-2.797-6.293 3.5 3.5 0 1 1 2.796 6.292ZM19.5 18h.5a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-1.1a5.503 5.503 0 0 1-.471.762A5.998 5.998 0 0 1 19.5 18ZM4 7.5a3.5 3.5 0 0 1 5.477-2.889 5.5 5.5 0 0 0-2.796 6.293A3.501 3.501 0 0 1 4 7.5ZM7.1 12H6a4 4 0 0 0-4 4 2 2 0 0 0 2 2h.5a5.998 5.998 0 0 1 3.071-5.238A5.505 5.505 0 0 1 7.1 12Z"
                    clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-gray-300">Друзья</span>
          </a>
        </div>
        <div class="flex-1 overflow-y-auto space-y-3 px-4 pb-28">
          <h3 class="text-lg font-medium text-typo-secondary mb-4">Личные сообщения</h3>
          <SidebarItem></SidebarItem>
        </div>
      </ng-container>

      <ng-container *ngIf="isServerRoute && guild() as g">
        <ServerChannelsItems class="flex-1 min-h-0 pb-28" [guild]="g"></ServerChannelsItems>
      </ng-container>
    </div>
  `,
})
export class Sidebar {
  @Input() set serverId(id: string | null) { this.id.set(id); }
  @Input() isServerRoute = false;

  private readonly id = signal<string | null>(null);
  private readonly store = inject(AppStateStore);
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly guild = computed(() => this.store.guild(this.id()));

  /** Only what the user may do (rights come from the server, ADR-0017). */
  protected readonly menu = computed<DropdownMenuItem[]>(() => {
    const g = this.guild();
    if (!g) return [];
    const me = this.store.me()?.id;
    const items: DropdownMenuItem[] = [];
    if (Object.values(g.channel_permissions).some(p => hasPerm(p, Perm.CreateInvite))) {
      items.push({ label: 'Пригласить участников', action: 'invite' });
    }
    if (hasPerm(g.permissions, Perm.ManageGuild)) items.push({ label: 'Настройки сервера', action: 'editServer' });
    if (g.owner_id === me) {
      items.push({ label: 'Удалить сервер', action: 'deleteServer' });
    } else {
      items.push({ label: 'Покинуть сервер', action: 'leaveServer' });
    }
    return items;
  });

  handleMenuAction(action: string) {
    const g = this.guild();
    if (!g) return;
    switch (action) {
      case 'invite':
        this.modal.open('invite', { serverId: g.id, channelId: this.currentChannelId() });
        break;
      case 'editServer':
        this.modal.open('editServer', { serverId: g.id });
        break;
      case 'leaveServer':
        if (confirm(`Покинуть сервер «${g.name}»?`)) {
          this.api.leaveGuild(g.id).subscribe({
            next: () => this.router.navigate(['/channels/me']),
            error: err => this.notify.show(errorText(err, 'Не удалось покинуть сервер'), 'error'),
          });
        }
        break;
      case 'deleteServer':
        if (confirm(`Удалить сервер «${g.name}» со всеми каналами и сообщениями? Это нельзя отменить.`)) {
          this.api.deleteGuild(g.id).subscribe({
            next: () => this.router.navigate(['/channels/me']),
            error: err => this.notify.show(errorText(err, 'Не удалось удалить сервер'), 'error'),
          });
        }
        break;
    }
  }

  private currentChannelId(): string | null {
    const parts = this.router.url.split('?')[0].split('/');
    return parts.length >= 4 ? parts[3] : null;
  }
}
