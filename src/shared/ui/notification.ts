import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { CircleAlert, CircleCheck, Info, LucideAngularModule, X } from 'lucide-angular';
import { NotificationService } from '@shared/model/notification.service';

/**
 * A toast by «Ошибки и состояния»: a card on surface-2 with an icon by type,
 * the message and an optional action link. It sits low, above the message
 * field, because the top belongs to the connection status. Errors are
 * alerts, the rest polite status messages.
 */
@Component({
  selector: 'Notification',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (s(); as n) {
      <div [attr.role]="n.type === 'error' ? 'alert' : 'status'"
           class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[min(420px,calc(100vw-32px))] flex items-start gap-3 px-4 py-3.5 rounded-[14px] bg-ok-surface-2 text-ok-text shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <lucide-angular class="w-[18px] h-[18px] shrink-0 mt-px" [img]="icon()" aria-hidden="true"
                        [ngClass]="n.type === 'error' ? 'text-ok-danger' : n.type === 'success' ? 'text-ok-success' : 'text-ok-accent'"></lucide-angular>
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          <span class="text-[13px] leading-[18px]" [class.text-ok-danger]="n.type === 'error'">{{ n.message }}</span>
          @if (n.action; as a) {
            <button type="button" (click)="a.run(); svc.hide()" class="self-start text-[13px] font-semibold text-ok-accent hover:underline">{{ a.label }}</button>
          }
        </div>
        <button type="button" (click)="svc.hide()" aria-label="Скрыть" class="text-ok-muted hover:text-ok-text">
          <lucide-angular class="w-4 h-4" [img]="X" aria-hidden="true"></lucide-angular>
        </button>
      </div>
    }
  `,
})
export class Notification {
  protected readonly svc = inject(NotificationService);
  protected readonly s = computed(() => (this.svc.state().visible ? this.svc.state() : null));
  protected readonly X = X;
  protected readonly icon = computed(() => {
    const t = this.svc.state().type;
    return t === 'error' ? CircleAlert : t === 'success' ? CircleCheck : Info;
  });
}
