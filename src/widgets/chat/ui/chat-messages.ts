import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatItem, ChatMessage } from './chat-item';

/** Scrolled to the bottom within this many pixels counts as "at the bottom". */
const STICK_PX = 80;

@Component({
  selector: 'ChatMessages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatItem],
  template: `
    <div #box class="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-main-surface-secondary"
         (scroll)="onScroll()">
      <div *ngIf="loadingOlder" class="text-center text-xs text-typo-secondary">Загрузка…</div>
      <div *ngIf="reachedStart && items.length" class="text-center text-xs text-typo-secondary pb-2">Начало переписки</div>
      <p *ngIf="notice" class="text-center text-sm text-typo-secondary">{{ notice }}</p>
      <ChatItem *ngFor="let it of items; trackBy: byId" [item]="it" [canReply]="canReply"
                (replyClicked)="replyTo.emit($event)"
                (editClicked)="edit.emit($event)"
                (deleteClicked)="remove.emit($event)"
                (authorClicked)="author.emit($event)" />
    </div>
  `,
})
export class ChatMessages implements AfterViewChecked {
  @Input() items: ChatMessage[] = [];
  @Input() loadingOlder = false;
  @Input() reachedStart = false;
  @Input() canReply = true;
  @Input() notice: string | null = null;
  @Output() replyTo = new EventEmitter<ChatMessage>();
  @Output() edit = new EventEmitter<ChatMessage>();
  @Output() remove = new EventEmitter<ChatMessage>();
  @Output() author = new EventEmitter<string>();
  /** Scrolled to the top: time to load older messages. */
  @Output() top = new EventEmitter<void>();
  @ViewChild('box') box!: ElementRef<HTMLElement>;

  private stick = true;
  private lastHeight = 0;
  private lastFirst: string | null = null;

  protected byId = (_: number, it: ChatMessage) => it.message.id;

  /** Keeps the view at the bottom for new messages, and in place when older ones are prepended. */
  ngAfterViewChecked(): void {
    const el = this.box?.nativeElement;
    if (!el) return;
    const first = this.items[0]?.message.id ?? null;
    if (first !== this.lastFirst && this.lastFirst !== null && el.scrollHeight > this.lastHeight && !this.stick) {
      el.scrollTop += el.scrollHeight - this.lastHeight;
    } else if (this.stick) {
      el.scrollTop = el.scrollHeight;
    }
    this.lastFirst = first;
    this.lastHeight = el.scrollHeight;
  }

  /** Jumps to the newest message (after sending). */
  scrollToBottom(): void {
    this.stick = true;
    const el = this.box?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  protected onScroll(): void {
    const el = this.box.nativeElement;
    this.stick = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
    if (el.scrollTop < 40) this.top.emit();
  }
}
