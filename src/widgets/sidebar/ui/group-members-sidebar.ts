import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';
import { StatusUi } from '@entities/user-status';
import { AppStateStore } from '@entities/app-state';
import { DMChannel, nameOf } from '@shared/api';
import { GROUP_MAX } from '@features/group/ui/group-modal';

interface Member {
  id: string;
  name: string;
  avatar: string | null;
  owner: boolean;
}

/** Who is in a group, its owner first, and the way out. */
@Component({
  selector: 'GroupMembersSidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, AvatarUI, StatusUi],
  host: { class: 'flex flex-col gap-0.5 bg-ok-sidebar px-2 py-4 box-border' },
  template: `
    <h2 class="m-0 px-2 pb-2 text-[12px] font-semibold tracking-[0.1em] text-ok-muted">УЧАСТНИКИ — {{ members().length }} ИЗ {{ max }}</h2>
    <div *ngFor="let m of members(); trackBy: byId" class="flex items-center gap-2.5 px-2 py-1.5">
      <span class="relative w-8 h-8 shrink-0">
        <span class="block w-full h-full rounded-lg overflow-hidden"><AvatarUI [src]="m.avatar" [name]="m.name" /></span>
        <StatusUI [userId]="m.id" />
      </span>
      <span class="flex-1 min-w-0 truncate text-[13px] font-medium">{{ m.name }}</span>
      <span *ngIf="m.owner" class="text-[12px] text-ok-muted">владелец</span>
    </div>
    <span class="flex-1"></span>
    <button type="button" class="h-10 rounded-[10px] bg-ok-surface-2 text-ok-danger font-semibold hover:bg-ok-border"
            (click)="leave.emit()">Выйти из группы</button>
  `,
})
export class GroupMembersSidebar {
  private readonly store = inject(AppStateStore);
  private readonly dm = signal<DMChannel | null>(null);
  @Input({ required: true }) set group(g: DMChannel) {
    this.dm.set(g);
  }
  @Output() leave = new EventEmitter<void>();
  protected readonly max = GROUP_MAX;

  protected readonly members = computed<Member[]>(() => {
    const g = this.dm();
    if (!g) return [];
    return g.recipients
      .map(r => {
        const u = this.store.user(r);
        return { id: r.id, name: nameOf(u), avatar: u.avatar ?? null, owner: r.id === g.owner_id };
      })
      .sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name, 'ru'));
  });

  protected byId = (_: number, m: Member) => m.id;
}
