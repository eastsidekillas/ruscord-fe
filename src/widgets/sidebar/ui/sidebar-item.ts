import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';
import { AppStateStore } from '@entities/app-state';
import { DMChannel, nameOf } from '@shared/api';
import { members } from '@shared/lib/plural';

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
    <a *ngFor="let row of rows(); trackBy: byId"
       [routerLink]="['/channels/me', row.id]" routerLinkActive="!bg-ok-surface-2 !text-ok-text"
       class="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-ok-muted hover:bg-ok-surface-1 hover:text-ok-text">
      <span class="relative w-8 h-8 shrink-0">
        <span class="block w-full h-full rounded-lg overflow-hidden">
          <AvatarUI [src]="row.avatar" [name]="row.userId ? row.name : '' + row.members" [tone]="row.userId ? 'bg-ok-avatar text-ok-text' : 'bg-ok-surface-2 text-ok-text text-[12px]'" [letters]="row.userId ? 1 : 2" />
        </span>
        <StatusUI *ngIf="row.userId" [userId]="row.userId" />
      </span>
      <span class="flex flex-col min-w-0">
        <span class="truncate text-ok-text">{{ row.name }}</span>
        <span *ngIf="!row.userId" class="text-[12px]">{{ row.members }} {{ plural(row.members) }}</span>
      </span>
    </a>
    <p *ngIf="store.loaded() && !rows().length" class="text-[13px] text-ok-muted px-2.5">
      Здесь появятся ваши переписки. Начните её из списка друзей.
    </p>
  `,
})
export class SidebarItem {
  protected readonly store = inject(AppStateStore);

  protected readonly rows = computed<Row[]>(() => this.store.dms().map(dm => this.row(dm)));

  protected byId = (_: number, r: Row) => r.id;

  protected readonly plural = members;

  private row(dm: DMChannel): Row {
    if (dm.type === 1) {
      const other = this.store.dmPartner(dm);
      return { id: dm.id, name: nameOf(other), avatar: other?.avatar ?? null, userId: other?.id ?? null, members: 2 };
    }
    return { id: dm.id, name: this.store.groupTitle(dm), avatar: null, userId: null, members: dm.recipients.length };
  }
}
