import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Settings, Volume2 } from 'lucide-angular';
import { FullGuild, Perm, hasPerm } from '@shared/api';
import { ModalService } from '@shared/model/modal.service';
import { channelGroups } from '@entities/app-state';

@Component({
  selector: 'ServerChannelsItems',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-y-auto' },
  template: `
    <div class="px-2 py-3 space-y-4">
      <div *ngFor="let group of groups(); trackBy: byGroup">
        <div *ngIf="group.category as cat" class="flex items-center gap-1 mb-1 px-2 group/cat">
          <h4 class="flex-1 text-[11px] font-semibold text-typo-secondary uppercase tracking-wider truncate">{{ cat.name }}</h4>
          <ng-container *ngIf="canManage(cat.id)">
            <button type="button" (click)="create(cat.id)" title="Создать канал в категории"
                    class="text-typo-secondary hover:text-white opacity-0 group-hover/cat:opacity-100 text-sm leading-none">+</button>
            <button type="button" (click)="edit(cat.id)" title="Настройки категории"
                    class="text-typo-secondary hover:text-white opacity-0 group-hover/cat:opacity-100">
              <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
            </button>
          </ng-container>
        </div>
        <div class="space-y-0.5">
          <ng-container *ngFor="let channel of group.channels; trackBy: byId">
            <a *ngIf="channel.type === 0"
               [routerLink]="['/channels', guildId(), channel.id]"
               routerLinkActive="bg-main-surface-secondary text-white"
               class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-main-surface-secondary text-gray-300 hover:text-white transition group">
              <svg class="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-gray-200" fill="none"
                   stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/>
              </svg>
              <span class="text-sm truncate flex-1">{{ channel.name }}</span>
              <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала"
                      class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
                <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
              </button>
            </a>
            <!-- Voice arrives with step 6; until then the channel is shown, not joinable. -->
            <div *ngIf="channel.type === 2"
                 title="Голосовые каналы появятся в следующем обновлении"
                 class="flex items-center gap-2 py-1.5 px-2 rounded-md text-gray-500 group">
              <lucide-angular class="w-4 h-4 flex-shrink-0" [img]="Volume2"></lucide-angular>
              <span class="text-sm truncate flex-1 cursor-not-allowed">{{ channel.name }}</span>
              <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала"
                      class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
                <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
              </button>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
})
export class ServerChannelsItems {
  @Input({ required: true }) set guild(g: FullGuild) { this.current.set(g); }

  private readonly current = signal<FullGuild | null>(null);
  protected readonly guildId = computed(() => this.current()?.id);
  protected readonly groups = computed(() => {
    const g = this.current();
    return g ? channelGroups(g) : [];
  });

  protected byId = (_: number, c: { id: string }) => c.id;
  protected byGroup = (_: number, gr: { category: { id: string } | null }) => gr.category?.id ?? '-';
  protected readonly Volume2 = Volume2;
  protected readonly Settings = Settings;
  private readonly modal = inject(ModalService);

  /** MANAGE_CHANNELS in that channel, as the server computed it. */
  protected canManage(channelId: string): boolean {
    return hasPerm(this.current()?.channel_permissions[channelId], Perm.ManageChannels);
  }

  protected edit(channelId: string, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.modal.open('channel', { serverId: this.guildId(), channelId });
  }

  protected create(parentId: string): void {
    this.modal.open('channel', { serverId: this.guildId(), parentId });
  }
}
