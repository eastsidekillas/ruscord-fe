import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Volume2 } from 'lucide-angular';
import { FullGuild } from '@shared/api';
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
        <h4 *ngIf="group.category" class="text-[11px] font-semibold text-typo-secondary uppercase tracking-wider mb-1 px-2 truncate">
          {{ group.category.name }}
        </h4>
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
              <span class="text-sm truncate">{{ channel.name }}</span>
            </a>
            <!-- Voice arrives with step 6; until then the channel is shown, not joinable. -->
            <div *ngIf="channel.type === 2"
                 title="Голосовые каналы появятся в следующем обновлении"
                 class="flex items-center gap-2 py-1.5 px-2 rounded-md text-gray-500 cursor-not-allowed">
              <lucide-angular class="w-4 h-4 flex-shrink-0" [img]="Volume2"></lucide-angular>
              <span class="text-sm truncate">{{ channel.name }}</span>
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
}
