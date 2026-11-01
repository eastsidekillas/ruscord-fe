import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarCreateServer } from '../sidebar-create-server';
import { AvatarUI } from '@shared/ui/avatar';
import { AppStateStore } from '@entities/app-state';
import { APP_MARK } from '@shared/config/brand';

/** The rail of servers: home (direct messages), the servers, a new one. */
@Component({
  selector: 'ServerSidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SidebarCreateServer, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-[72px] shrink-0 flex flex-col items-center gap-2 py-3 bg-ok-bg overflow-y-auto max-sm:hidden' },
  template: `
    <a [routerLink]="['/channels/me']" routerLinkActive="ok-active" aria-label="Личные сообщения" title="Личные сообщения"
       class="ok-rail-item bg-ok-surface-1 hover:bg-ok-surface-2">
      <img [src]="mark" alt="" class="w-7 h-7" />
    </a>
    <div class="w-8 h-px bg-ok-border shrink-0"></div>
    <a *ngFor="let server of store.guilds(); trackBy: byId"
       [routerLink]="['/channels', server.id]" routerLinkActive="ok-active" #rla="routerLinkActive"
       [attr.aria-label]="server.name" [title]="server.name"
       class="ok-rail-item overflow-hidden text-[15px]">
      <AvatarUI [src]="server.icon" [name]="server.name" [letters]="2"
                [tone]="rla.isActive ? 'bg-ok-accent text-ok-on-accent' : 'bg-ok-surface-2 text-ok-text'" />
    </a>
    <SidebarCreateServer />
  `,
  styles: `
    .ok-rail-item {
      width: 48px; height: 48px; flex-shrink: 0; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .ok-active { box-shadow: 0 0 0 2px var(--color-ok-bg), 0 0 0 4px var(--color-ok-text); }
  `,
})
export class ServerSidebar {
  protected readonly store = inject(AppStateStore);
  protected readonly mark = APP_MARK;
  protected byId = (_: number, g: { id: string }) => g.id;
}
