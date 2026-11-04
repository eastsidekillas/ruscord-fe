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
import { ChatItem, ChatMessage, ReactionToggle } from './chat-item';
import { PendingItem, PendingMessage } from './pending-item';
import { dayLabel, sameDay } from '@shared/lib/dates';
import { MentionContext } from '@shared/ui/markup-view';

/** Scrolled to the bottom within this many pixels counts as "at the bottom". */
const STICK_PX = 80;

@Component({
  selector: 'ChatMessages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatItem, PendingItem],
  template: `
    <div #box class="h-full overflow-y-auto px-4 py-6 flex flex-col gap-1" (scroll)="onScroll()">
      <div class="mt-auto"></div>
      <div *ngIf="loadingOlder" class="text-center text-[12px] text-ok-muted">Загрузка…</div>
      <div *ngIf="reachedStart && items.length" class="text-center text-[12px] text-ok-muted pb-2">Начало переписки</div>
      <p *ngIf="notice" class="text-center text-[13px] text-ok-muted">{{ notice }}</p>
      <ng-container *ngFor="let it of items; let i = index; trackBy: byId">
      <div *ngIf="dayAt(i) as day" role="separator" class="flex items-center gap-3 py-3 px-2 text-[12px] text-ok-muted">
        <span class="flex-1 h-px bg-ok-border"></span>{{ day }}<span class="flex-1 h-px bg-ok-border"></span>
      </div>
      <ChatItem [item]="it" [canReply]="canReply" [ctx]="ctx" [editing]="it.message.id === editingId"
                (replyClicked)="replyTo.emit($event)"
                (editClicked)="edit.emit($event)"
                (saveEdit)="saveEdit.emit($event)"
                (cancelEdit)="cancelEdit.emit()"
                (deleteClicked)="remove.emit($event)"
                (authorClicked)="author.emit($event)"
                (react)="react.emit($event)"
                (pin)="pin.emit($event)" />
      </ng-container>
      <PendingItem *ngFor="let p of pending; trackBy: byNonce" [item]="p" [ctx]="ctx" (retry)="retry.emit($event)" (discard)="discard.emit($event)" />
    </div>
  `,
})
export class ChatMessages implements AfterViewChecked {
  @Input() items: ChatMessage[] = [];
  @Input() loadingOlder = false;
  @Input() reachedStart = false;
  @Input() canReply = true;
  @Input() notice: string | null = null;
  /** Who and what mentions in the messages are. */
  @Input() ctx: MentionContext | null = null;
  /** The message being edited in place. */
  @Input() editingId: string | null = null;
  /** Sent by the user and not confirmed yet, shown after the rest. */
  @Input() pending: PendingMessage[] = [];
  @Output() replyTo = new EventEmitter<ChatMessage>();
  @Output() edit = new EventEmitter<ChatMessage>();
  @Output() saveEdit = new EventEmitter<{ item: ChatMessage; text: string }>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() retry = new EventEmitter<string>();
  @Output() discard = new EventEmitter<string>();
  @Output() remove = new EventEmitter<ChatMessage>();
  @Output() author = new EventEmitter<string>();
  @Output() react = new EventEmitter<ReactionToggle>();
  @Output() pin = new EventEmitter<{ item: ChatMessage; on: boolean }>();
  /** Scrolled to the top: time to load older messages. */
  @Output() top = new EventEmitter<void>();
  @ViewChild('box') box!: ElementRef<HTMLElement>;

  private stick = true;
  private lastHeight = 0;
  private lastFirst: string | null = null;

  protected byId = (_: number, it: ChatMessage) => it.message.id;
  protected byNonce = (_: number, p: PendingMessage) => p.nonce;

  /** The day heading before message i: where the local date changes. */
  protected dayAt(i: number): string | null {
    const cur = this.items[i]?.message.created_at;
    const prev = this.items[i - 1]?.message.created_at;
    if (!cur || (prev && sameDay(new Date(prev), new Date(cur)))) return null;
    return dayLabel(new Date(cur), new Date());
  }

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

