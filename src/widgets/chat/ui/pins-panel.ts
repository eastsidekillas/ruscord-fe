import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, nameOf } from '@shared/api';
import { messageTime } from '@shared/lib/dates';
import { dismissOnOutside } from '@shared/lib/dismiss';
import { MarkupView, MentionContext } from '@shared/ui/markup-view';
import { LucideAngularModule, PinOff } from 'lucide-angular';

/** The pinned messages of a channel, last pinned first (ruscord-core ADR-0037). */
@Component({
  selector: 'PinsPanel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MarkupView, LucideAngularModule],
  host: { class: 'block' },
  template: `
    <section role="dialog" aria-label="Закреплённые сообщения"
             class="w-[420px] max-w-[calc(100vw-32px)] max-h-[70vh] flex flex-col rounded-ok-md bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <h2 class="m-0 px-4 py-3 text-[15px] font-semibold text-ok-text border-b border-ok-border">Закреплённые сообщения</h2>
      <div class="overflow-y-auto p-2 flex flex-col gap-1">
        <p *ngIf="pins === null" class="text-[13px] text-ok-muted p-2">Загрузка…</p>
        <p *ngIf="pins?.length === 0" class="text-[13px] text-ok-muted p-2">В этом канале ещё ничего не закрепили.</p>
        <article *ngFor="let m of pins ?? []; trackBy: byId" class="relative group rounded-lg p-2.5 bg-ok-sidebar">
          <div class="flex items-baseline gap-2 pr-8">
            <span class="text-[14px] font-semibold text-ok-text truncate">{{ name(m) }}</span>
            <time class="text-[12px] text-ok-muted shrink-0" [attr.datetime]="m.created_at">{{ when(m.created_at) }}</time>
          </div>
          <MarkupView *ngIf="m.content" class="mt-0.5 text-[14px] leading-5 text-ok-text" [text]="m.content" [ctx]="ctx" />
          <p *ngIf="m.attachments.length" class="m-0 mt-0.5 text-[12px] text-ok-muted">Файлов: {{ m.attachments.length }}</p>
          <button *ngIf="canPin" type="button" (click)="unpin.emit(m)" title="Открепить" [attr.aria-label]="'Открепить сообщение ' + name(m)"
                  class="absolute top-2 right-2 w-7 h-7 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="PinOff"></lucide-angular>
          </button>
        </article>
      </div>
    </section>
  `,
})
export class PinsPanel {
  /** null while loading. */
  @Input() pins: Message[] | null = null;
  @Input() ctx: MentionContext | null = null;
  @Input() canPin = false;
  /** Names authors as the channel shows them. */
  @Input() authorName: (m: Message) => string = m => nameOf(m.author);
  @Output() unpin = new EventEmitter<Message>();
  @Output() closed = new EventEmitter<void>();

  protected readonly PinOff = PinOff;
  protected byId = (_: number, m: Message) => m.id;

  constructor() {
    dismissOnOutside(() => true, () => this.closed.emit(), '[data-pins]');
  }

  protected name(m: Message): string {
    return this.authorName(m);
  }

  protected when(iso: string): string {
    return messageTime(new Date(iso), new Date());
  }
}
