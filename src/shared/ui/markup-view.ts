import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlockNode, parseMarkup } from '@shared/lib/markup';
import { ModalService } from '@shared/model/modal.service';

/** What a message's mentions are shown as; the page knows who and what they are. */
export interface MentionContext {
  user(id: string): { name: string } | null;
  role(id: string): { name: string; color: number } | null;
  /** `link` null: the channel is known but cannot be opened from here. */
  channel(id: string): { name: string; link: string[] | null } | null;
}

/** The colour of a role as CSS; 0 is "no colour". */
export function roleColor(color: number): string | null {
  return color ? '#' + color.toString(16).padStart(6, '0') : null;
}

const MENTION = 'rounded px-0.5 font-medium bg-ok-accent/15 text-ok-accent hover:bg-ok-accent/30 cursor-pointer';

/**
 * The text of a message with its markup (ruscord-core ADR-0035). Built from
 * parsed nodes by the template only: the text never reaches innerHTML.
 */
@Component({
  selector: 'MarkupView',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block break-words' },
  styles: `
    .spoiler:not([data-open]) { background: var(--color-ok-avatar); color: transparent; cursor: pointer; }
    .spoiler:not([data-open]) * { visibility: hidden; }
  `,
  template: `
    <ng-template #inline let-nodes>
      @for (n of nodes; track $index) {
        @switch (n.t) {
          @case ('text') {<ng-container>{{ n.text }}</ng-container>}
          @case ('bold') {<strong class="font-bold"><ng-container *ngTemplateOutlet="inline; context: { $implicit: n.children }" /></strong>}
          @case ('italic') {<em><ng-container *ngTemplateOutlet="inline; context: { $implicit: n.children }" /></em>}
          @case ('underline') {<span class="underline"><ng-container *ngTemplateOutlet="inline; context: { $implicit: n.children }" /></span>}
          @case ('strike') {<s><ng-container *ngTemplateOutlet="inline; context: { $implicit: n.children }" /></s>}
          @case ('spoiler') {<span class="spoiler rounded px-0.5" role="button" tabindex="0" aria-label="Спойлер, нажмите, чтобы показать"
                                   (click)="reveal($event)" (keydown.enter)="reveal($event)"><ng-container *ngTemplateOutlet="inline; context: { $implicit: n.children }" /></span>}
          @case ('code') {<code class="rounded px-1 py-px bg-ok-surface-2 font-mono text-[0.875em]">{{ n.text }}</code>}
          @case ('link') {<a class="text-ok-accent hover:underline" [href]="n.url" target="_blank" rel="noopener noreferrer nofollow"
                              [attr.title]="n.label ? n.url : null" (click)="n.label && masked($event, n.url)">@if (n.label) {<ng-container *ngTemplateOutlet="inline; context: { $implicit: n.label }" />} @else {<ng-container>{{ n.url }}</ng-container>}</a>}
          @case ('user') {<span [class]="mention" role="button" tabindex="0" (click)="user.emit(n.id)" (keydown.enter)="user.emit(n.id)">{{ '@' + (ctx?.user(n.id)?.name ?? 'неизвестный') }}</span>}
          @case ('role') {
            @if (ctx?.role(n.id); as r) {
              <span class="rounded px-0.5 font-medium" [style.color]="color(r.color)" [style.background]="tint(r.color)">{{ '@' + r.name }}</span>
            } @else {<span class="rounded px-0.5 font-medium bg-ok-surface-2 text-ok-muted">&#64;удалённая-роль</span>}
          }
          @case ('channel') {
            @if (ctx?.channel(n.id); as c) {
              @if (c.link) {<a [class]="mention" [routerLink]="c.link">{{ '#' + c.name }}</a>}
              @else {<span class="rounded px-0.5 font-medium bg-ok-surface-2 text-ok-text">{{ '#' + c.name }}</span>}
            } @else {<span class="rounded px-0.5 font-medium bg-ok-surface-2 text-ok-muted">#недоступный-канал</span>}
          }
          @case ('everyone') {<span class="rounded px-0.5 font-medium bg-ok-accent/15 text-ok-accent">{{ n.text }}</span>}
        }
      }
    </ng-template>

    <ng-template #blocks let-list>
      @for (b of list; track $index) {
        @switch (b.t) {
          @case ('line') {<div class="min-h-[22px] whitespace-pre-wrap"><ng-container *ngTemplateOutlet="inline; context: { $implicit: b.children }" /></div>}
          @case ('heading') {
            <div class="font-bold whitespace-pre-wrap" [class]="headingSize(b.level)"><ng-container *ngTemplateOutlet="inline; context: { $implicit: b.children }" /></div>
          }
          @case ('subtext') {<div class="text-[12px] leading-4 text-ok-muted whitespace-pre-wrap"><ng-container *ngTemplateOutlet="inline; context: { $implicit: b.children }" /></div>}
          @case ('quote') {<blockquote class="my-0.5 pl-3 border-l-4 border-ok-border-control"><ng-container *ngTemplateOutlet="blocks; context: { $implicit: b.children }" /></blockquote>}
          @case ('list') {
            @if (b.ordered) {
              <ol class="list-decimal pl-6" [attr.start]="b.start">@for (it of b.items; track $index) {<li><ng-container *ngTemplateOutlet="inline; context: { $implicit: it }" /></li>}</ol>
            } @else {
              <ul class="list-disc pl-6">@for (it of b.items; track $index) {<li><ng-container *ngTemplateOutlet="inline; context: { $implicit: it }" /></li>}</ul>
            }
          }
          @case ('codeblock') {
            <pre class="my-1 rounded-lg border border-ok-border bg-ok-sidebar p-2.5 text-[13px] leading-5 font-mono whitespace-pre-wrap overflow-x-auto" [attr.data-lang]="b.lang"><code>{{ b.text }}</code></pre>
          }
        }
      }
    </ng-template>

    <ng-container *ngTemplateOutlet="blocks; context: { $implicit: nodes }" />
  `,
})
export class MarkupView {
  @Input({ required: true }) set text(v: string) {
    if (v !== this.source) {
      this.source = v;
      this.nodes = parseMarkup(v);
    }
  }
  @Input() ctx: MentionContext | null = null;
  /** A user mention was clicked: open their profile. */
  @Output() user = new EventEmitter<string>();

  private readonly modal = inject(ModalService);
  protected nodes: BlockNode[] = [];
  private source = '';
  protected readonly mention = MENTION;

  protected headingSize(level: 1 | 2 | 3): string {
    return level === 1 ? 'text-[24px] leading-8 mt-2' : level === 2 ? 'text-[20px] leading-7 mt-2' : 'text-[16px] leading-6 mt-1';
  }

  protected color(c: number): string {
    return roleColor(c) ?? 'var(--color-ok-accent)';
  }

  protected tint(c: number): string {
    return `color-mix(in srgb, ${this.color(c)} 15%, transparent)`;
  }

  protected reveal(e: Event): void {
    (e.currentTarget as HTMLElement).setAttribute('data-open', '');
  }

  /** The text of a masked link may name another site, so the click asks first. */
  protected masked(e: Event, url: string): void {
    e.preventDefault();
    this.modal.open('link', { url });
  }
}
