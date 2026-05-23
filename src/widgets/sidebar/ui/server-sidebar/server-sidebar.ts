import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarCreateServer } from '../sidebar-create-server';
import { ApiService } from '@shared/api/api.service';
import { AvatarUI } from '@shared/ui/avatar';

interface Server {
  id: string;
  name: string;
  channel_ids: string[];
  default_channel_id?: string;
  avatar?: string;
}

@Component({
  selector: 'ServerSidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarCreateServer, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/channels/me']"
       class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2 lg:mb-4 hover:bg-gray-500">
      <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
           fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd"
              d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
              clip-rule="evenodd"/>
      </svg>
    </a>

    <div class="w-10 border-b border-2 border-gray-600 mb-2 rounded-full lg:mb-4"></div>
    <SidebarCreateServer></SidebarCreateServer>

    <div class="space-y-2 lg:space-y-4 overflow-x-hidden flex-grow">
      <a *ngFor="let server of servers()"
         [routerLink]="['/channels', server.id, server.default_channel_id || 'general']"
         class="group relative w-12 h-12 bg-main-surface-secondary rounded-full flex items-center justify-center mb-2 lg:mb-4 hover:bg-gray-500 overflow-hidden">

        <AvatarUI [src]="server.avatar" [name]="server.name" />

        <span class="absolute left-full top-1/2 -translate-y-1/2 bg-green-500 text-white text-xs rounded-md py-0.5 px-2 ml-2 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
          {{ server.name }}
        </span>
      </a>
    </div>
  `,
})
export class ServerSidebar implements OnInit {
  protected readonly servers = signal<Server[]>([]);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadServers();
  }

  loadServers(): void {
    this.apiService.getMyServers().subscribe({
      next: (response) => {
        const list: Server[] = Array.isArray(response) ? response : (response?.results ?? []);
        this.servers.set(list);
      },
      error: (error) => {
        console.error('Ошибка загрузки серверов:', error);
      },
    });
  }
}
