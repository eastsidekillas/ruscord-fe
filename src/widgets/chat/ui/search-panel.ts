import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, nameOf } from '@shared/api';
import { messageTime } from '@shared/lib/dates';
import { dismissOnOutside } from '@shared/lib/dismiss';
import { MarkupView, MentionContext } from '@shared/ui/markup-view';

/** Search results, newest first; a click jumps to the message (ruscord-core ADR-0039). */
@Component({
  selector: 'SearchPanel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MarkupView],
  host: { class: 'block' },
  template: `
    <section role="dialog" aria-label="Результаты поиска"
             class="w-[440px] max-w-[calc(100vw-32px)] max-h-[75vh] flex flex-col rounded-ok-md bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <header class="px-4 py-3 border-b border-ok-border">
        <h2 class="m-0 text-[15px] font-semibold text-ok-text">{{ title() }}</h2>
        <p class="m-0 mt-0.5 text-[12px] text-ok-muted">Фильтры: от:ник, в:канал, есть:файл | картинка | видео | ссылка, упоминает:ник</p>
      </header>
      <div class="overflow-y-auto p-2 flex flex-col gap-1" aria-live="polite">
        <p *ngIf="error" role="alert" class="m-0 p-2 text-[13px] text-ok-danger">{{ error }}</p>
        <p *ngIf="!error && messages === null" class="m-0 p-2 text-[13px] text-ok-muted">Ищем…</p>
        <p *ngIf="!error && messages?.length === 0" class="m-0 p-2 text-[13px] text-ok-muted">Ничего не нашлось.</p>
        <button *ngFor="let m of messages ?? []; trackBy: byId" type="button" (click)="open.emit(m)" data-search-result
                class="text-left rounded-lg p-2.5 bg-ok-sidebar hover:bg-ok-surface-2 focus:bg-ok-surface-2">
          <span class="flex items-baseline gap-2 min-w-0">
            <span class="text-[14px] font-semibold text-ok-text truncate">{{ authorName(m) }}</span>
            <span *ngIf="channelName(m) as c" class="text-[12px] text-ok-muted truncate">#{{ c }}</span>
            <time class="ml-auto text-[12px] text-ok-muted shrink-0" [attr.datetime]="m.created_at">{{ when(m.created_at) }}</time>
          </span>
          <MarkupView *ngIf="m.content" class="mt-0.5 text-[14px] leading-5 text-ok-text pointer-events-none" [text]="m.content" [ctx]="ctx" />
          <span *ngIf="m.attachments.length" class="block mt-0.5 text-[12px] text-ok-muted">Файлов: {{ m.attachments.length }}</span>
        </button>
        <button *ngIf="messages && messages.length < total" type="button" (click)="more.emit()"
                class="h-9 rounded-lg bg-ok-surface-2 text-ok-text text-[13px] font-semibold hover:bg-ok-border">Показать ещё</button>
      </div>
    </section>
  `,
})
export class SearchPanel {
  /** null while searching. */
  @Input() messages: Message[] | null = null;
  @Input() total = 0;
  @Input() error: string | null = null;
  @Input() ctx: MentionContext | null = null;
  @Input() authorName: (m: Message) => string = m => nameOf(m.author);
  /** The channel's name in a guild search; null in a DM. */
  @Input() channelName: (m: Message) => string | null = () => null;
  @Output() open = new EventEmitter<Message>();
  @Output() more = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected byId = (_: number, m: Message) => m.id;

  constructor() {
    dismissOnOutside(() => true, () => this.closed.emit(), '[data-search]');
  }

  protected title(): string {
    if (this.messages === null || this.error) return 'Поиск';
    const n = this.total;
    return n >= 5025 ? 'Найдено больше 5000' : `Найдено: ${n}`;
  }

  protected when(iso: string): string {
    return messageTime(new Date(iso), new Date());
  }
}
