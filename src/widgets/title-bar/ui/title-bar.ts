import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule, Search } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NavHistory } from '@shared/model/nav-history.service';

/**
 * The strip above the columns: back and forward through the places opened
 * in this tab, and the way into the quick switcher.
 */
@Component({
  selector: 'TitleBar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  host: { class: 'h-10 shrink-0 flex items-center gap-1 px-3 max-sm:hidden' },
  template: `
    <button type="button" (click)="history.back()" [disabled]="!history.canBack()" title="Назад (Ctrl Alt ←)" aria-label="Назад"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 disabled:opacity-40 disabled:hover:bg-transparent">
      <lucide-angular class="w-4 h-4" [img]="ChevronLeft" aria-hidden="true"></lucide-angular>
    </button>
    <button type="button" (click)="history.forward()" [disabled]="!history.canForward()" title="Вперёд (Ctrl Alt →)" aria-label="Вперёд"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 disabled:opacity-40 disabled:hover:bg-transparent">
      <lucide-angular class="w-4 h-4" [img]="ChevronRight" aria-hidden="true"></lucide-angular>
    </button>
    <span class="flex-1"></span>
    <button type="button" (click)="modal.open('quickSwitch')" aria-keyshortcuts="Control+K" data-quick-switch-open
            class="w-[420px] max-w-[50vw] h-7 flex items-center gap-2 px-2.5 rounded-lg bg-ok-surface-1 text-ok-muted text-[13px] hover:text-ok-text">
      <lucide-angular class="w-3.5 h-3.5" [img]="Search" aria-hidden="true"></lucide-angular>
      <span class="flex-1 text-left truncate">Место, канал или человек</span>
      <kbd class="px-1.5 rounded-md bg-ok-surface-2 text-ok-muted text-[11px] font-semibold font-[inherit]">Ctrl K</kbd>
    </button>
    <span class="flex-1"></span>
    <span class="w-[60px]"></span>
  `,
})
export class TitleBar {
  protected readonly history = inject(NavHistory);
  protected readonly modal = inject(ModalService);
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly ChevronRight = ChevronRight;
  protected readonly Search = Search;
}
