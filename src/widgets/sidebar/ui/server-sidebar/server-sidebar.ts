import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarCreateServer } from '../sidebar-create-server';
import { AvatarUI } from '@shared/ui/avatar';
import { AppStateStore } from '@entities/app-state';
import { ReadStateStore } from '@entities/read-states';
import { APP_MARK } from '@shared/config/brand';

/** The rail of servers: home (direct messages), the servers, a new one. */
@Component({
  selector: 'ServerSidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SidebarCreateServer, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-[72px] shrink-0 flex flex-col items-center gap-2 pt-1 pb-3 bg-ok-bg overflow-y-auto max-sm:hidden' },
  template: `
    <span class="relative shrink-0">
      <span *ngIf="home.isActive" class="ok-pill ok-pill-active" aria-hidden="true"></span>
      <a [routerLink]="['/channels/me']" routerLinkActive #home="routerLinkActive" [attr.aria-current]="home.isActive ? 'page' : null" title="Личные сообщения"
         [attr.aria-label]="'Личные сообщения' + (dms().unread ? ', непрочитанных: ' + dms().unread : '')"
         class="ok-rail-item bg-ok-surface-1 hover:bg-ok-surface-2">
        <img [src]="mark" alt="" class="w-7 h-7" />
      </a>
      <span *ngIf="dms().unread" class="ok-badge" aria-hidden="true">{{ count(dms().unread) }}</span>
    </span>
    <div class="w-8 h-px bg-ok-border shrink-0"></div>
    <span *ngFor="let server of store.guilds(); trackBy: byId" class="relative shrink-0" [attr.data-unread]="guilds()[server.id]?.unread || null">
      <span *ngIf="guilds()[server.id]?.unread || rla.isActive" class="ok-pill" [class.ok-pill-active]="rla.isActive" aria-hidden="true"></span>
      <a [routerLink]="['/channels', server.id]" routerLinkActive #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null"
         [attr.aria-label]="server.name + label(server.id)" [title]="server.name"
         class="ok-rail-item overflow-hidden text-[15px]">
        <AvatarUI [src]="server.icon" [name]="server.name" [letters]="2"
                  [tone]="rla.isActive ? 'bg-ok-accent text-ok-on-accent' : 'bg-ok-surface-2 text-ok-text'" />
      </a>
      <span *ngIf="guilds()[server.id]?.mentions as n" class="ok-badge" aria-hidden="true">{{ count(n) }}</span>
    </span>
    <SidebarCreateServer />
  `,
  styles: `
    .ok-rail-item {
      width: 48px; height: 48px; flex-shrink: 0; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    /* Something unread: a short pill at the rail's edge; the open place: a tall one. */
    .ok-pill { position: absolute; left: -12px; top: 50%; width: 4px; height: 8px; margin-top: -4px;
               border-radius: 0 4px 4px 0; background: var(--color-ok-text); transition: height .15s, margin-top .15s; }
    .ok-pill-active { height: 32px; margin-top: -16px; }
    /* Mentions: a count at the corner. */
    .ok-badge { position: absolute; right: -4px; bottom: -4px; min-width: 20px; height: 20px; padding: 0 5px;
                border-radius: 10px; border: 3px solid var(--color-ok-bg); box-sizing: content-box;
                background: var(--color-ok-danger); color: var(--color-ok-on-danger);
                font-size: 11px; font-weight: 700; line-height: 20px; text-align: center; }
  `,
})
export class ServerSidebar {
  protected readonly store = inject(AppStateStore);
  private readonly reads = inject(ReadStateStore);
  protected readonly guilds = this.reads.guildSummary;
  protected readonly dms = this.reads.dmSummary;

  protected count(n: number): string {
    return n > 99 ? '99+' : String(n);
  }

  protected label(guildId: string): string {
    const s = this.guilds()[guildId];
    if (!s?.unread) return '';
    return s.mentions ? `, упоминаний: ${this.count(s.mentions)}` : ', есть непрочитанное';
  }
  protected readonly mark = APP_MARK;
  protected byId = (_: number, g: { id: string }) => g.id;
}
