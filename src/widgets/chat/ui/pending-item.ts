import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AvatarUI } from '@shared/ui/avatar';
import { apiError } from '@shared/api';
import { MarkupView, MentionContext } from '@shared/ui/markup-view';

/** A file of a message on its way: uploaded once it has an id. */
export interface PendingFile {
  file: File;
  /** The attachment id once uploaded (ruscord-core ADR-0036). */
  id: string | null;
  /** Share uploaded, 0 to 1. */
  progress: number;
}

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
  /** Files go up one by one before the message; a retry skips uploaded ones. */
  files: PendingFile[];
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
  imports: [NgIf, NgFor, AvatarUI, MarkupView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-[10px] p-2', '[attr.data-pending]': 'item.error ? "failed" : "sending"' },
  template: `
    <div class="flex items-start gap-3">
      <span class="w-10 h-10 rounded-[10px] overflow-hidden shrink-0"><AvatarUI [src]="item.authorAvatar" [name]="item.authorName" /></span>
      <div class="min-w-0 flex-1">
        <div class="text-[15px] font-semibold text-ok-text">{{ item.authorName }}</div>
        <MarkupView *ngIf="item.content" class="mt-0.5 text-[15px] leading-[22px] text-ok-muted" [text]="item.content" [ctx]="ctx" />
        <ul *ngIf="item.files.length" class="mt-1 flex flex-col gap-1 w-[min(100%,400px)]" aria-label="Файлы">
          <li *ngFor="let f of item.files" class="px-3 py-2 rounded-lg border border-ok-border bg-ok-sidebar text-[13px]">
            <div class="flex items-center gap-2">
              <span class="flex-1 truncate text-ok-text">{{ f.file.name }}</span>
              <span class="text-ok-muted shrink-0">{{ f.id ? 'загружен' : percent(f.progress) }}</span>
            </div>
            <div class="mt-1.5 h-1 rounded-full bg-ok-surface-2 overflow-hidden" role="progressbar" [attr.aria-valuenow]="f.id ? 100 : round(f.progress * 100)" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="'Загрузка ' + f.file.name">
              <div class="h-full bg-ok-accent transition-[width]" [style.width.%]="(f.id ? 1 : f.progress) * 100"></div>
            </div>
          </li>
        </ul>
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

  protected percent(p: number): string {
    return Math.round(p * 100) + ' %';
  }

  protected readonly round = Math.round;
}
