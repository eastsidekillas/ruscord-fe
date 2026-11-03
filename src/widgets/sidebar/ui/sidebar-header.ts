import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { DropdownMenuItem } from '@shared/ui/dropdown-menu';
import { dismissOnOutside } from '@shared/lib/dismiss';

/** Actions that read as dangerous in the server menu. */
const DANGER = new Set(['leaveServer', 'deleteServer']);

/** The server's name at the top of the channel list; it opens the server menu. */
@Component({
  selector: 'SidebarHeader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  host: { class: 'block relative' },
  template: `
    <button type="button" (click)="open.set(!open())" [disabled]="!items.length"
            aria-label="Меню настроек" [attr.aria-expanded]="open()"
            class="w-full h-14 flex items-center gap-2 px-4 border-b border-ok-border text-[15px] font-semibold text-ok-text text-left hover:bg-ok-surface-1 disabled:hover:bg-transparent">
      <span class="flex-1 truncate">{{ serverName || 'Сервер' }}</span>
      <lucide-angular *ngIf="items.length" class="w-4 h-4 text-ok-muted transition-transform" [class.rotate-180]="open()" [img]="ChevronDown"></lucide-angular>
    </button>
    <nav *ngIf="open()" role="menu" [attr.aria-label]="'Меню сервера «' + serverName + '»'"
         class="absolute left-2 right-2 top-[60px] z-50 rounded-2xl bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-2 flex flex-col gap-0.5">
      <ng-container *ngFor="let item of items; let i = index">
        <div *ngIf="danger(item) && i > 0" class="h-px bg-ok-border my-1"></div>
        <button type="button" role="menuitem" (click)="pick(item)"
                class="text-left px-3 py-2.5 rounded-lg text-[15px] hover:bg-ok-surface-2"
                [ngClass]="danger(item) ? 'text-ok-danger' : i === 0 && item.action === 'invite' ? 'text-ok-accent font-semibold' : 'text-ok-text'">
          {{ item.label }}
        </button>
      </ng-container>
    </nav>
  `,
})
export class SidebarHeader {
  @Input() serverName: string | null = null;
  @Input() items: DropdownMenuItem[] = [];
  @Output() menuAction = new EventEmitter<string>();

  protected readonly open = signal(false);
  protected readonly ChevronDown = ChevronDown;

  protected danger(item: DropdownMenuItem): boolean {
    return DANGER.has(item.action);
  }

  protected pick(item: DropdownMenuItem): void {
    this.open.set(false);
    this.menuAction.emit(item.action);
  }

  constructor() {
    dismissOnOutside(this.open, () => this.open.set(false));
  }
}
