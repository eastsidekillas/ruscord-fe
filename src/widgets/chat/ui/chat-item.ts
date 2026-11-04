import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { messageTime } from '@shared/lib/dates';
import { AvatarUI } from '@shared/ui/avatar';
import { CornerUpRight, Download, FileText, LucideAngularModule, Pencil, Pin, PinOff, Reply, SmilePlus, Trash2 } from 'lucide-angular';
import { EmojiPicker } from '@shared/ui/emoji-picker';
import { Attachment, Message } from '@shared/api';
import { attachmentKind, fileSize, fitBox } from '@shared/lib/files';
import { MAX_MESSAGE } from '@shared/config/limits';
import { MarkupView, MentionContext } from '@shared/ui/markup-view';
import { MentionTokens, toDisplay, toWire } from '@shared/lib/mention-text';

/** A message ready to show: the author resolved to the newest profile. */
export interface ChatMessage {
  message: Message;
  authorId: string | null;
  authorName: string;
  authorAvatar: string | null;
  /** The message it answers, if loaded; `missing` when it is not. */
  reply: { authorName: string; content: string } | 'missing' | null;
  canEdit: boolean;
  canDelete: boolean;
  /** Pings the viewer: by name, by one of their roles or @everyone. */
  mentioned: boolean;
  /** May put a new emoji (ADD_REACTIONS); joining one there needs only to see it, except in a DM. */
  canReact: boolean;
  /** May join a reaction already there. */
  canJoin: boolean;
  canPin: boolean;
}

/** A click on a reaction or in the picker: put (on) or take away the viewer's emoji. */
export interface ReactionToggle {
  item: ChatMessage;
  emoji: string;
  on: boolean;
}

const NO_NAMES = { user: () => null, role: () => null, channel: () => null };

@Component({
  selector: 'ChatItem',
  standalone: true,
  imports: [CommonModule, AvatarUI, LucideAngularModule, MarkupView, EmojiPicker],
  styles: `
    :host(.highlighted) { animation: ok-found 2.5s ease-out; }
    @keyframes ok-found { from { background: color-mix(in srgb, var(--color-ok-accent) 28%, transparent); } }
    :host(.mentioned) {
      background: color-mix(in srgb, var(--color-ok-warning) 9%, transparent);
      box-shadow: inset 2px 0 0 var(--color-ok-warning);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block relative group rounded-[10px] p-2 hover:bg-ok-surface-2 [&:not(.editing)]:focus-within:bg-ok-surface-2',
    '[class.editing]': 'editing',
    '[class.mentioned]': 'item.mentioned',
    '[attr.data-mentioned]': 'item.mentioned || null',
    '[attr.data-message-id]': 'item.message.id',
    '[class.highlighted]': 'highlight',
    '[attr.data-highlight]': 'highlight || null',
  },
  template: `
    <div *ngIf="item.reply" class="flex items-center gap-1.5 pl-[52px] pb-1 text-[13px] text-ok-muted min-w-0">
      <lucide-angular class="w-3.5 h-3.5 shrink-0" [img]="CornerUpRight"></lucide-angular>
      <ng-container *ngIf="item.reply !== 'missing'; else missing">
        <span class="font-semibold text-ok-text shrink-0">{{ item.reply.authorName }}</span>
        <span class="truncate">{{ item.reply.content }}</span>
      </ng-container>
      <ng-template #missing><span class="italic">Исходное сообщение не загружено или удалено</span></ng-template>
    </div>

    <div class="flex items-start gap-3">
      <button type="button" class="w-10 h-10 rounded-[10px] overflow-hidden shrink-0" [attr.aria-label]="'Профиль: ' + item.authorName"
              (click)="item.authorId && authorClicked.emit(item.authorId)">
        <AvatarUI [src]="item.authorAvatar" [name]="item.authorName" />
      </button>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-[15px] font-semibold text-ok-text">{{ item.authorName }}</span>
          <time class="text-[12px] text-ok-muted" [attr.datetime]="item.message.created_at">{{ when(item.message.created_at) }}</time>
          <span *ngIf="item.message.edited_at" class="text-[12px] text-ok-muted">(изменено)</span>
          <span *ngIf="item.message.pinned_at" class="text-[12px] text-ok-muted inline-flex items-center gap-0.5" title="Закреплено">
            <lucide-angular class="w-3 h-3" [img]="Pin" aria-hidden="true"></lucide-angular><span class="sr-only-ok">Закреплено</span>
          </span>
        </div>
        <MarkupView *ngIf="!editing && item.message.content" class="mt-0.5 text-[15px] leading-[22px] text-ok-text" [text]="item.message.content" [ctx]="ctx"
                    (user)="authorClicked.emit($event)" />
        <div *ngIf="item.message.attachments.length" class="mt-1 flex flex-col gap-1.5 items-start" aria-label="Вложения" role="group">
          <ng-container *ngFor="let a of item.message.attachments; trackBy: byAttachment">
            <ng-container [ngSwitch]="kind(a)">
              <a *ngSwitchCase="'image'" [href]="a.url" target="_blank" rel="noopener noreferrer" class="block max-w-full rounded-lg overflow-hidden bg-ok-surface-2"
                 [title]="a.filename">
                <img [src]="a.url" [alt]="a.filename" loading="lazy" class="block max-w-full h-auto object-contain"
                     [attr.width]="box(a).width" [attr.height]="box(a).height" [style.width.px]="box(a).width" />
              </a>
              <video *ngSwitchCase="'video'" [src]="a.url" controls preload="metadata" class="block max-w-[min(100%,480px)] max-h-[360px] rounded-lg bg-black"
                     [attr.aria-label]="a.filename"></video>
              <a *ngSwitchDefault [href]="a.url" [attr.download]="a.filename" rel="noopener noreferrer"
                 class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ok-border bg-ok-sidebar hover:bg-ok-surface-1 w-[min(100%,400px)] box-border">
                <lucide-angular class="w-7 h-7 shrink-0 text-ok-muted" [img]="FileText"></lucide-angular>
                <span class="flex-1 min-w-0 flex flex-col">
                  <span class="text-[14px] text-ok-accent truncate">{{ a.filename }}</span>
                  <span class="text-[12px] text-ok-muted">{{ size(a.size) }}</span>
                </span>
                <lucide-angular class="w-4 h-4 shrink-0 text-ok-muted" [img]="Download"></lucide-angular>
              </a>
            </ng-container>
          </ng-container>
        </div>
        <div *ngIf="item.message.reactions?.length" class="mt-1 flex flex-wrap gap-1 items-center" role="group" aria-label="Реакции">
          <button *ngFor="let r of item.message.reactions; trackBy: byEmoji" type="button"
                  class="h-7 px-2 rounded-lg border text-[15px] leading-none flex items-center gap-1.5 disabled:opacity-60"
                  [ngClass]="r.me ? 'border-ok-accent bg-ok-accent/15 text-ok-text' : 'border-ok-border bg-ok-surface-2 text-ok-text hover:border-ok-border-control'"
                  [attr.aria-pressed]="r.me" [attr.aria-label]="r.emoji + ': ' + r.count + (r.me ? ', ваша реакция' : '')"
                  [disabled]="!r.me && !item.canJoin" (click)="react.emit({ item, emoji: r.emoji, on: !r.me })">
            <span>{{ r.emoji }}</span><span class="text-[12px] font-semibold">{{ r.count }}</span>
          </button>
          <button *ngIf="item.canReact" type="button" title="Добавить реакцию" aria-label="Добавить реакцию" data-emoji-open (click)="openPicker($event)"
                  class="h-7 w-8 rounded-lg border border-transparent text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="SmilePlus"></lucide-angular>
          </button>
        </div>
        <ng-container *ngIf="editing">
          <label [for]="'edit-' + item.message.id" class="sr-only-ok">Изменить сообщение</label>
          <textarea #editField [id]="'edit-' + item.message.id" rows="1" [value]="draft" [attr.maxlength]="max"
                    class="mt-1 w-full box-border resize-none rounded-[10px] border border-ok-accent bg-ok-sidebar text-ok-text px-3.5 py-2.5 leading-[22px] !outline-none"
                    (input)="grow(editField)" (keydown)="onEditKey($event, editField.value)"></textarea>
          <div class="mt-1 text-[12px] text-ok-muted">Esc — отменить · Enter — сохранить · Shift+Enter — новая строка</div>
        </ng-container>
      </div>
    </div>

    <div *ngIf="!editing" role="toolbar" aria-label="Действия с сообщением"
         class="absolute right-3 -top-4 hidden group-hover:flex group-focus-within:flex gap-0.5 p-0.5 rounded-[10px] bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <button *ngIf="item.canReact" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center" title="Реакция" aria-label="Реакция"
              data-emoji-open (click)="openPicker($event)">
        <lucide-angular class="w-4 h-4" [img]="SmilePlus"></lucide-angular>
      </button>
      <button *ngIf="item.canPin" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center"
              [title]="item.message.pinned_at ? 'Открепить' : 'Закрепить'" [attr.aria-label]="item.message.pinned_at ? 'Открепить' : 'Закрепить'"
              (click)="pin.emit({ item, on: !item.message.pinned_at })">
        <lucide-angular class="w-4 h-4" [img]="item.message.pinned_at ? PinOff : Pin"></lucide-angular>
      </button>
      <button *ngIf="canReply" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center" title="Ответить" aria-label="Ответить"
              (click)="replyClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Reply"></lucide-angular>
      </button>
      <button *ngIf="item.canEdit" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center" title="Изменить" aria-label="Изменить"
              (click)="editClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Pencil"></lucide-angular>
      </button>
      <button *ngIf="item.canDelete" type="button" class="w-8 h-8 rounded-lg text-ok-danger hover:bg-ok-surface-2 flex items-center justify-center" title="Удалить" aria-label="Удалить"
              (click)="deleteClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Trash2"></lucide-angular>
      </button>
    </div>

    <!-- Fixed: the feed scrolls and would clip it. -->
    <EmojiPicker *ngIf="pickerAt() as at" class="fixed z-50" [style.top.px]="at.top" [style.left.px]="at.left"
                 (picked)="onPicked($event)" (closed)="pickerAt.set(null)" />
  `,
})
export class ChatItem {
  @Input({ required: true }) item!: ChatMessage;
  @Input() canReply = true;
  /** The message a search jumped to: it flashes once. */
  @Input() highlight = false;
  /** Who and what the mentions in the text are. */
  @Input() ctx: MentionContext | null = null;
  /** Shows the text as a field: Enter saves, Esc cancels. */
  @Input() set editing(on: boolean) {
    this.isEditing = on;
    if (on) {
      const shown = toDisplay(this.item.message.content, this.ctx ?? NO_NAMES);
      this.draft = shown.text;
      this.tokens = shown.tokens;
      setTimeout(() => {
        const el = this.editField?.nativeElement;
        if (!el) return;
        this.grow(el);
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }
  get editing(): boolean {
    return this.isEditing;
  }
  @Output() saveEdit = new EventEmitter<{ item: ChatMessage; text: string }>();
  @Output() cancelEdit = new EventEmitter<void>();
  @ViewChild('editField') private editField?: ElementRef<HTMLTextAreaElement>;
  private isEditing = false;
  /** The text being edited, mentions shown by name, and the tokens of those names. */
  protected draft = '';
  private tokens: MentionTokens = new Map();
  protected readonly max = MAX_MESSAGE;
  @Output() replyClicked = new EventEmitter<ChatMessage>();
  @Output() editClicked = new EventEmitter<ChatMessage>();
  @Output() deleteClicked = new EventEmitter<ChatMessage>();
  @Output() authorClicked = new EventEmitter<string>();
  @Output() react = new EventEmitter<ReactionToggle>();
  @Output() pin = new EventEmitter<{ item: ChatMessage; on: boolean }>();
  /** Where the emoji picker is open, or null. */
  protected readonly pickerAt = signal<{ top: number; left: number } | null>(null);

  protected readonly Reply = Reply;
  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly CornerUpRight = CornerUpRight;
  protected readonly FileText = FileText;
  protected readonly SmilePlus = SmilePlus;
  protected readonly Pin = Pin;
  protected readonly PinOff = PinOff;
  protected byEmoji = (_: number, r: { emoji: string }) => r.emoji;

  /** Opens the picker next to the button, inside the window. */
  protected openPicker(e: MouseEvent): void {
    if (this.pickerAt()) {
      this.pickerAt.set(null);
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 352, H = 400, gap = 6;
    const top = r.bottom + gap + H < window.innerHeight ? r.bottom + gap : Math.max(8, r.top - gap - H);
    const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
    this.pickerAt.set({ top, left });
  }

  protected onPicked(emoji: string): void {
    this.pickerAt.set(null);
    const r = this.item.message.reactions?.find(x => x.emoji === emoji);
    if (!r?.me) this.react.emit({ item: this.item, emoji, on: true });
  }
  protected readonly Download = Download;
  protected readonly kind = attachmentKind;
  protected byAttachment = (_: number, a: Attachment) => a.id;

  /** Pictures are shown at most 400×300, keeping their shape. */
  protected box(a: Attachment): { width: number; height: number } {
    return fitBox(a.width ?? 1, a.height ?? 1, 400, 300);
  }

  protected size(bytes: number): string {
    return fileSize(bytes);
  }

  protected onEditKey(e: KeyboardEvent, text: string): void {
    if (e.key === 'Escape') {
      this.cancelEdit.emit();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const t = text.trim();
      if (t) this.saveEdit.emit({ item: this.item, text: toWire(t, this.tokens) });
    }
  }

  /** The field grows with its text, as the composer does. */
  protected grow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px';
  }

  /** Time only for today, the date as well for older messages. */
  protected when(iso: string): string {
    return messageTime(new Date(iso), new Date());
  }
}

