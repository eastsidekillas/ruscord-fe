import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '@shared/api/api.service';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';

interface Channel {
  id: string;
  name: string;
  channel_type: 'TEXT' | 'AUDIO';
}

@Component({
  selector: 'ServerChannelsItems',
  imports: [CommonModule, RouterLink],
  standalone: true,
  template: `
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <div>
        <h4 class="text-xs font-semibold text-typo-secondary uppercase mb-2">Текстовые каналы</h4>
        <div class="space-y-1">
          <a *ngFor="let channel of textChannels"
             [routerLink]="['/channels', serverId, channel.id]"
             class="flex items-center space-x-2 py-2 px-2 rounded-md hover:bg-main-surface-secondary text-gray-300 hover:text-white transition">
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                 fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/>
            </svg>
            <span class="text-sm">{{ channel.name }}</span>
          </a>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold text-typo-secondary uppercase mb-2">Голосовые каналы</h4>
        <div class="space-y-1">
          <a *ngFor="let channel of audioChannels"
             [routerLink]="['/channels', serverId, channel.id]"
             class="flex items-center space-x-2 py-2 px-2 rounded-md hover:bg-main-surface-secondary text-gray-300 hover:text-white transition">
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                 fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.5 8.43A4.985 4.985 0 0 1 17 12a4.984 4.984 0 0 1-1.43 3.5m2.794 2.864A8.972 8.972 0 0 0 21 12a8.972 8.972 0 0 0-2.636-6.364M12 6.135v11.73a1 1 0 0 1-1.64.768L6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l4.36-3.633a1 1 0 0 1 1.64.768Z"/>
            </svg>
            <span class="text-sm">{{ channel.name }}</span>
          </a>
        </div>
      </div>
    </div>
  `,

})
export class ServerChannelsItems implements OnInit {
  @Input() serverId: string | null = null;
  textChannels: Channel[] = [];
  audioChannels: Channel[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.serverId) {
      this.loadServerChannels(this.serverId);
    }
  }

  loadServerChannels(serverId: string): void {
    this.apiService.getServerChannels(serverId).subscribe({
      next: (channels) => {
        this.textChannels = channels.filter((channel: { channel_type: string; }) => channel.channel_type === 'TEXT');
        this.audioChannels = channels.filter((channel: { channel_type: string; }) => channel.channel_type === 'AUDIO');
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов сервера:', error);
      },
    });
  }
}
