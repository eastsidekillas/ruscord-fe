import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

let nextId = 0;

/**
 * A dialog of the design system: dimmed backdrop, a 440px card with a title
 * and an optional line under it. Esc and a click outside close it.
 */
@Component({
  selector: 'ModalFrame',
  standalone: true,
  imports: [NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,17,18,0.72)]" (click)="closed.emit()">
      <section role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" (click)="$event.stopPropagation()"
               class="w-full max-w-[440px] box-border rounded-ok-lg bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-6 flex flex-col gap-4 text-ok-text text-[15px]">
        <div class="flex flex-col gap-1">
          <h2 [id]="titleId" class="m-0 text-[20px] leading-7 font-semibold">{{ title }}</h2>
          <p *ngIf="subtitle" class="m-0 text-[13px] text-ok-muted">{{ subtitle }}</p>
        </div>
        <ng-content />
      </section>
    </div>
  `,
})
export class ModalFrame {
  @Input({ required: true }) title = '';
  @Input() subtitle: string | null = null;
  @Output() closed = new EventEmitter<void>();
  protected readonly titleId = `modal-title-${++nextId}`;
}
