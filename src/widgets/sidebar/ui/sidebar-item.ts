import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';
import { AppStateStore } from '@entities/app-state';
import { DMChannel, nameOf } from '@shared/api';

interface Row {
  id: string;
  name: string;
  avatar: string | null;
  /** The other person of a 1:1 DM, for the status dot. */
  userId: string | null;
  members: number;
}

/** The user's DMs and groups, newest first. */
@Component({
  selector: 'SidebarItem',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgForOf, NgIf, RouterLink, RouterLinkActive, StatusUi, AvatarUI],
  template: `
    <div class="flex flex-col space-y-2">
      <a *ngFor="let row of rows(); trackBy: byId"
         [routerLink]="['/channels/me', row.id]" routerLinkActive="bg-main-surface-secondary"
         class="flex items-center space-x-3 py-3 px-3 rounded-md hover:bg-main-surface-secondary">
        <div class="relative w-10 h-10 shrink-0">
          <div class="w-full h-full rounded-full overflow-hidden">
            <AvatarUI [src]="row.avatar" [name]="row.name" />
          </div>
          <StatusUI *ngIf="row.userId" [userId]="row.userId"></StatusUI>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-gray-300 text-sm truncate">{{ row.name }}</span>
          <span *ngIf="!row.userId" class="text-xs text-typo-secondary">{{ row.members }} участников</span>
        </div>
      </a>
      <p *ngIf="store.loaded() && !rows().length" class="text-sm text-typo-secondary">
        Здесь появятся ваши переписки. Начните её из списка друзей.
      </p>
    </div>
  `,
})
export class SidebarItem {
  protected readonly store = inject(AppStateStore);

  protected readonly rows = computed<Row[]>(() => this.store.dms().map(dm => this.row(dm)));

  protected byId = (_: number, r: Row) => r.id;

  private row(dm: DMChannel): Row {
    if (dm.type === 1) {
      const other = this.store.dmPartner(dm);
      return { id: dm.id, name: nameOf(other), avatar: other?.avatar ?? null, userId: other?.id ?? null, members: 2 };
    }
    const me = this.store.me()?.id;
    const others = dm.recipients.filter(r => r.id !== me).map(r => nameOf(this.store.user(r)));
    return { id: dm.id, name: dm.name || others.join(', ') || 'Группа', avatar: null, userId: null, members: dm.recipients.length };
  }
}
