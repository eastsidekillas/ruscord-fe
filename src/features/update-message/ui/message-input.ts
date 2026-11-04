import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { AtSign, LucideAngularModule, SendHorizonal, X } from 'lucide-angular';
import { MAX_MESSAGE } from '@shared/config/limits';
import { AvatarUI } from '@shared/ui/avatar';
import { roleColor } from '@shared/ui/markup-view';
import { MentionOption, MentionQuery, MentionTokens, insertMention, mentionQuery, toWire } from '@shared/lib/mention-text';

export interface SendPayload {
  /** As the server wants it: mentions are tokens (ruscord-core ADR-0035). */
  text: string;
  replyToId: string | null;
  /** The reply pings the author of the replied message. */
  replyMention: boolean;
}

/** What to suggest for @word or #word; empty when nothing fits. */
export type MentionSuggest = (trigger: '@' | '#', query: string) => MentionOption[];

/** Suggestions shown at once. */
const SUGGEST_MAX = 8;
/** The field grows with its text up to this height, then scrolls. */
const MAX_FIELD_PX = 240;

@Component({
  selector: 'MessageInput',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule, AvatarUI],
  host: { class: 'relative' },
  template: `
    <div *ngIf="options().length" role="listbox" id="mention-list" aria-label="Упоминания"
         class="absolute bottom-full left-6 right-6 mb-1 z-10 rounded-ok-md border border-ok-border bg-ok-surface-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1 flex flex-col">
      <div class="px-2 pt-1 pb-1.5 text-[12px] font-semibold tracking-[0.06em] text-ok-muted">{{ query()?.trigger === '#' ? 'КАНАЛЫ' : 'УПОМЯНУТЬ' }}</div>
      <button *ngFor="let o of options(); let i = index" type="button" role="option" [id]="'mention-' + i" [attr.aria-selected]="i === active()"
              class="flex items-center gap-2.5 h-9 px-2 rounded-lg text-left text-[14px]"
              [ngClass]="i === active() ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-text hover:bg-ok-surface-2'"
              (mousedown)="$event.preventDefault()" (click)="pick(o)" (mouseenter)="active.set(i)">
        <span *ngIf="o.kind === 'user'" class="w-6 h-6 rounded-md overflow-hidden shrink-0"><AvatarUI [src]="o.avatar ?? null" [name]="o.label" /></span>
        <span *ngIf="o.kind === 'role'" class="w-3 h-3 rounded-full shrink-0 ml-1.5 mr-1.5" [style.background]="roleColor(o.color ?? 0) ?? 'var(--color-ok-muted)'"></span>
        <span *ngIf="o.kind === 'channel'" class="w-6 text-center text-ok-muted shrink-0">#</span>
        <span *ngIf="o.kind === 'everyone'" class="w-6 text-center text-ok-muted shrink-0">&#64;</span>
        <span class="truncate font-medium">{{ o.label }}</span>
        <span *ngIf="o.hint" class="truncate text-[12px] text-ok-muted">{{ o.hint }}</span>
      </button>
    </div>

    <div *ngIf="replyTo" class="flex items-center gap-2 px-3 py-2 rounded-t-ok-md bg-ok-surface-2 text-[13px] text-ok-muted min-w-0">
      <span class="flex-1 truncate">Ответ <span class="font-semibold text-ok-text">{{ replyTo.authorName }}</span></span>
      <button type="button" (click)="replyMention = !replyMention" [attr.aria-pressed]="replyMention"
              class="h-7 px-2 rounded-lg flex items-center gap-1 font-semibold shrink-0 hover:bg-ok-surface-1"
              [ngClass]="replyMention ? 'text-ok-accent' : 'text-ok-muted'"
              [title]="replyMention ? 'Автор получит упоминание. Нажмите, чтобы выключить' : 'Автор не получит упоминание. Нажмите, чтобы включить'">
        <lucide-angular [img]="AtSign" class="w-3.5 h-3.5"></lucide-angular>{{ replyMention ? 'Вкл' : 'Выкл' }}
      </button>
      <button type="button" (click)="cancelReply.emit()" class="w-7 h-7 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 flex items-center justify-center shrink-0"
              title="Отменить ответ" aria-label="Отменить ответ">
        <lucide-angular [img]="X" class="w-3.5 h-3.5"></lucide-angular>
      </button>
    </div>

    <label class="flex items-end gap-2 min-h-12 pl-4 pr-1.5 py-1.5 border border-ok-border-control focus-within:border-ok-accent bg-ok-sidebar"
           [ngClass]="replyTo ? 'rounded-b-ok-md' : 'rounded-ok-md'" [class.opacity-60]="disabled">
      <span class="sr-only-ok">Сообщение</span>
      <textarea #field rows="1"
        class="flex-1 min-w-0 self-center resize-none bg-transparent text-[15px] leading-[22px] py-[7px] text-ok-text placeholder:text-ok-muted !outline-none"
        [maxlength]="max"
        [disabled]="disabled"
        [(ngModel)]="message"
        (input)="onInput()"
        (click)="suggest()"
        (blur)="closeSuggestions()"
        [placeholder]="disabled ? disabledText : placeholder"
        role="combobox" aria-autocomplete="list" [attr.aria-expanded]="options().length > 0" aria-controls="mention-list"
        [attr.aria-activedescendant]="options().length ? 'mention-' + active() : null"
        (keydown)="onKey($event)"
      ></textarea>
      <button type="button" (click)="handleSend()" [disabled]="disabled || !message.trim()" title="Отправить" aria-label="Отправить"
              class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-ok-accent hover:bg-ok-surface-1 disabled:text-ok-muted disabled:hover:bg-transparent">
        <lucide-angular class="w-[18px] h-[18px]" [img]="SendHorizonal"></lucide-angular>
      </button>
    </label>
    <div class="h-0 overflow-visible"><span class="sr-only-ok" aria-live="polite">{{ options().length ? options().length + ' вариантов, стрелки — выбрать, Enter — вставить' : '' }}</span></div>
  `,
})
export class MessageInput implements OnChanges {
  @Input() placeholder = 'Написать сообщение...';
  @Input() disabled = false;
  @Input() disabledText = 'Вы не можете писать в этом канале';
  @Input() replyTo: ChatMessage | null = null;
  /** Suggestions for mentions; null turns them off. */
  @Input() mentions: MentionSuggest | null = null;
  @Output() cancelReply = new EventEmitter<void>();
  /** Fired on input; the page decides how often to tell the server. */
  @Output() typing = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<SendPayload>();
  @ViewChild('field') field?: ElementRef<HTMLTextAreaElement>;

  message = '';
  /** Pings the author of the replied message; on for every new reply. */
  protected replyMention = true;
  protected readonly max = MAX_MESSAGE;
  protected readonly query = signal<MentionQuery | null>(null);
  protected readonly options = signal<MentionOption[]>([]);
  protected readonly active = signal(0);
  /** Names inserted from the suggestions and the tokens they stand for. */
  private tokens: MentionTokens = new Map();

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['replyTo'] && this.replyTo) {
      this.replyMention = true;
      this.focus();
    }
  }

  handleSend(): void {
    const text = this.message.trim();
    if (!text || this.disabled) return;
    this.sendMessage.emit({ text: toWire(text, this.tokens), replyToId: this.replyTo?.message.id ?? null, replyMention: this.replyMention });
    this.message = '';
    this.tokens = new Map();
    this.closeSuggestions();
    setTimeout(() => this.resize());
  }

  protected onInput(): void {
    if (this.message.trim()) this.typing.emit();
    this.resize();
    this.suggest();
  }

  /** Enter sends, Shift+Enter breaks the line; with suggestions open the keys pick one. */
  protected onKey(e: KeyboardEvent): void {
    const opts = this.options();
    if (opts.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.active.set((this.active() + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length);
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        this.pick(opts[this.active()]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSuggestions();
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.handleSend();
    } else if (e.key === 'Escape' && this.replyTo) {
      this.cancelReply.emit();
    }
  }

  protected suggest(): void {
    const el = this.field?.nativeElement;
    const q = el && this.mentions ? mentionQuery(this.message, el.selectionStart) : null;
    const opts = q ? this.mentions!(q.trigger, q.query).slice(0, SUGGEST_MAX) : [];
    this.query.set(q);
    this.options.set(opts);
    if (this.active() >= opts.length) this.active.set(0);
  }

  protected pick(o: MentionOption): void {
    const el = this.field?.nativeElement;
    const q = this.query();
    if (!el || !q) return;
    const r = insertMention(this.message, q, el.selectionStart, o, this.tokens);
    this.message = r.text;
    el.value = r.text;
    el.setSelectionRange(r.caret, r.caret);
    el.focus();
    this.closeSuggestions();
    this.resize();
  }

  protected closeSuggestions(): void {
    this.query.set(null);
    this.options.set([]);
    this.active.set(0);
  }

  private resize(): void {
    const el = this.field?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_FIELD_PX) + 'px';
  }

  private focus(): void {
    setTimeout(() => this.field?.nativeElement.focus());
  }

  protected readonly roleColor = roleColor;
  protected readonly SendHorizonal = SendHorizonal;
  protected readonly AtSign = AtSign;
  protected readonly X = X;
}
