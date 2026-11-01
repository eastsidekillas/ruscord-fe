import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';

export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked';

const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'online', label: 'В сети' },
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Заявки' },
  { id: 'blocked', label: 'Заблокированные' },
];

/** A tab's label; the requests tab shows how many there are. */
export function tabLabel(id: FriendsTab, label: string, pending: number): string {
  if (id !== 'pending' || pending <= 0) return label;
  return `${label} · ${pending > 99 ? '99+' : pending}`;
}

/** Title and tabs of the friends page; the requests tab carries their count. */
@Component({
  selector: 'FriendsHeader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor],
  template: `
    <header class="min-h-14 flex items-center gap-1 flex-wrap px-6 py-2 border-b border-ok-border box-border">
      <h1 class="m-0 mr-3 text-[15px] font-semibold">Друзья</h1>
      <button *ngFor="let t of tabs" type="button"
              class="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
              [class]="active === t.id ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-2'"
              [attr.aria-current]="active === t.id ? 'page' : null"
              (click)="tabChange.emit(t.id)">{{ label(t.id, t.label, pendingCount) }}</button>
    </header>
  `,
})
export class FriendsHeader {
  @Input() active: FriendsTab = 'online';
  @Input() pendingCount = 0;
  @Output() tabChange = new EventEmitter<FriendsTab>();
  protected readonly tabs = TABS;

  protected readonly label = tabLabel;
}
