import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';

@Component({
  selector: 'SidebarCreateServer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <button type="button" (click)="open()" aria-label="Добавить сервер" title="Добавить сервер"
            class="w-12 h-12 shrink-0 rounded-ok-md border border-dashed border-ok-border-control text-ok-muted hover:text-ok-text flex items-center justify-center">
      <lucide-angular class="w-5 h-5" [img]="Plus"></lucide-angular>
    </button>
  `,
})
export class SidebarCreateServer {
  private readonly modal = inject(ModalService);
  protected readonly Plus = Plus;

  open(): void {
    this.modal.open('createServer');
  }
}
