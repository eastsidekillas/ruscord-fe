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
import { settingsTabs } from '@features/server-settings/ui/server-settings-modal';
import { LucideAngularModule, Plus, Users } from 'lucide-angular';
import { SidebarFooter } from '@widgets/sidebar/ui/sidebar-footer';

@Component({
  selector: 'Sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, SidebarItem, SidebarHeader, ServerChannelsItems, SidebarFooter],
  host: { class: 'w-[248px] shrink-0 flex flex-col min-h-0 bg-ok-sidebar rounded-tl-ok-lg' },
  template: `
    <SidebarHeader *ngIf="isServerRoute"
      [serverName]="guild()?.name ?? null"
      [items]="menu()"
      (menuAction)="handleMenuAction($event)"
    />

    <div *ngIf="!isServerRoute" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 px-2 py-3">
      <a [routerLink]="['/channels/me']" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!bg-ok-surface-2 !text-ok-text"
         class="flex items-center gap-2.5 p-2.5 rounded-lg text-ok-muted font-semibold hover:bg-ok-surface-1 hover:text-ok-text">
        <lucide-angular class="w-[18px] h-[18px]" [img]="Users"></lucide-angular>
        Друзья
        <span *ngIf="incoming() as n" class="ml-auto min-w-5 h-5 px-1.5 rounded-md bg-ok-danger text-ok-on-accent text-[12px] flex items-center justify-center"
              [attr.aria-label]="n + ' входящих заявок'">{{ n }}</span>
      </a>
      <div class="flex items-center text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2.5 pt-4 pb-1.5">
        <h3 class="flex-1 m-0 text-[12px] font-semibold">ЛИЧНЫЕ СООБЩЕНИЯ</h3>
        <button type="button" class="inline-flex rounded hover:text-ok-text" title="Создать группу" aria-label="Создать группу"
                (click)="modal.open('group')">
          <lucide-angular class="w-4 h-4" [img]="Plus"></lucide-angular>
        </button>
      </div>
      <SidebarItem />
    </div>

    <ServerChannelsItems *ngIf="isServerRoute && guild() as g" class="flex-1 min-h-0" [guild]="g" />

    <SidebarFooter />
  `,
})
export class Sidebar {
  @Input() set serverId(id: string | null) { this.id.set(id); }
  @Input() isServerRoute = false;

  private readonly id = signal<string | null>(null);
  private readonly store = inject(AppStateStore);
  protected readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly guild = computed(() => this.store.guild(this.id()));
  protected readonly Users = Users;
  protected readonly Plus = Plus;
  /** Incoming friend requests (relationship type 3). */
  protected readonly incoming = computed(() => this.store.relationships().filter(r => r.type === 3).length);

  /** Only what the user may do (rights come from the server, ADR-0017). */
  protected readonly menu = computed<DropdownMenuItem[]>(() => {
    const g = this.guild();
    if (!g) return [];
    const me = this.store.me()?.id;
    const items: DropdownMenuItem[] = [];
    if (Object.values(g.channel_permissions).some(p => hasPerm(p, Perm.CreateInvite))) {
      items.push({ label: 'Пригласить участников', action: 'invite' });
    }
    if (hasPerm(g.permissions, Perm.ManageChannels)) items.push({ label: 'Создать канал', action: 'createChannel' });
    if (settingsTabs(g).length) items.push({ label: 'Настройки сервера', action: 'editServer' });
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
      case 'createChannel':
        this.modal.open('channel', { serverId: g.id });
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
