import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AvatarUI } from '@shared/ui/avatar';
import { apiError } from '@shared/api';
import { MarkupView, MentionContext } from '@shared/ui/markup-view';

/**
 * A message the user sent that the server has not confirmed yet. It keeps
 * its nonce, so "retry" cannot create a second copy (ruscord-core ADR-0015).
 */
export interface PendingMessage {
  nonce: string;
  content: string;
  replyToId: string | null;
  /** The reply pings the author of the replied message. */
  replyMention: boolean;
  authorName: string;
  authorAvatar: string | null;
  /** Why sending failed; null while it is on its way. */
  error: string | null;
}

/** Why a message did not go, as the end of «Не отправлено — …». */
export function failReason(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 0) return 'нет связи';
  const text = apiError(err)?.message;
  if (!text) return 'ошибка, попробуйте ещё раз';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

@Component({
  selector: 'PendingItem',
  standalone: true,
  imports: [NgIf, AvatarUI, MarkupView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-[10px] p-2', '[attr.data-pending]': 'item.error ? "failed" : "sending"' },
  template: `
    <div class="flex items-start gap-3">
      <span class="w-10 h-10 rounded-[10px] overflow-hidden shrink-0"><AvatarUI [src]="item.authorAvatar" [name]="item.authorName" /></span>
      <div class="min-w-0 flex-1">
        <div class="text-[15px] font-semibold text-ok-text">{{ item.authorName }}</div>
        <MarkupView class="mt-0.5 text-[15px] leading-[22px] text-ok-muted" [text]="item.content" [ctx]="ctx" />
        <div *ngIf="item.error" role="alert" class="mt-1 flex items-center gap-2 flex-wrap text-[13px] text-ok-danger">
          Не отправлено — {{ item.error }}
          <button type="button" class="h-7 px-2.5 rounded-lg bg-ok-surface-2 text-ok-text text-[12px] font-semibold hover:bg-ok-border"
                  (click)="retry.emit(item.nonce)">Повторить</button>
          <button type="button" class="h-7 px-2.5 rounded-lg text-ok-muted text-[12px] font-semibold hover:bg-ok-surface-2 hover:text-ok-text"
                  (click)="discard.emit(item.nonce)">Не отправлять</button>
        </div>
      </div>
    </div>
  `,
})
export class PendingItem {
  @Input({ required: true }) item!: PendingMessage;
  @Input() ctx: MentionContext | null = null;
  @Output() retry = new EventEmitter<string>();
  @Output() discard = new EventEmitter<string>();
}
