import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { EmojiService } from '@shared/model/emoji.service';
import { EmojiRow, SKIN_TONES, searchEmoji, withTone } from '@shared/lib/emoji';
import { dismissOnOutside } from '@shared/lib/dismiss';

/**
 * Picks one Unicode emoji (ruscord-core ADR-0037): search in Russian or
 * English, one group at a time, recent ones first, a skin tone. Esc or a
 * press outside closes it.
 */
@Component({
  selector: 'EmojiPicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="dialog" aria-label="Выбор эмодзи"
         class="w-[352px] max-w-[calc(100vw-32px)] h-[400px] flex flex-col rounded-ok-md bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden">
      <div class="p-2 flex gap-2 items-center border-b border-ok-border">
        <input #search type="search" placeholder="Найти эмодзи" aria-label="Найти эмодзи" [value]="query()"
               (input)="query.set(search.value)" (keydown.enter)="pickFirst()"
               class="flex-1 min-w-0 h-9 box-border rounded-lg border border-ok-border-control bg-ok-sidebar text-ok-text px-3 text-[14px] !outline-none focus:border-ok-accent placeholder:text-ok-muted" />
        <button type="button" (click)="nextTone()" class="w-9 h-9 rounded-lg text-[20px] hover:bg-ok-surface-2 shrink-0"
                [title]="'Тон кожи (нажмите, чтобы сменить)'" aria-label="Сменить тон кожи">{{ tones[emoji.tone()] }}</button>
      </div>
      @if (!query().trim()) {
        <div role="tablist" aria-label="Группы" class="flex gap-0.5 px-2 py-1 border-b border-ok-border">
          @for (g of groups(); track g.id) {
            <button type="button" role="tab" [attr.aria-selected]="group() === g.id" [title]="g.name" [attr.aria-label]="g.name"
                    class="flex-1 h-8 rounded-lg text-[18px]" [class]="group() === g.id ? 'bg-ok-surface-2' : 'hover:bg-ok-surface-2'"
                    (click)="group.set(g.id)">{{ g.icon }}</button>
          }
        </div>
      }
      <div class="flex-1 overflow-y-auto p-2">
        @if (emoji.failed()) {
          <p class="text-[13px] text-ok-danger p-2">Не удалось загрузить эмодзи. <button type="button" class="underline" (click)="emoji.load()">Повторить</button></p>
        } @else if (!emoji.catalog()) {
          <p class="text-[13px] text-ok-muted p-2">Загрузка…</p>
        } @else if (query().trim()) {
          @if (found().length) {
            <div class="grid grid-cols-8 gap-0.5">
              @for (r of found(); track r[0]) {
                <button type="button" class="h-10 rounded-lg text-[24px] hover:bg-ok-surface-2" [title]="r[1]" [attr.aria-label]="r[1]" (click)="pick(r)">{{ shown(r) }}</button>
              }
            </div>
          } @else {
            <p class="text-[13px] text-ok-muted p-2">Ничего не нашлось</p>
          }
        } @else {
          @if (emoji.recent().length) {
            <h3 class="text-[12px] font-semibold tracking-[0.06em] text-ok-muted px-1 pb-1">НЕДАВНИЕ</h3>
            <div class="grid grid-cols-8 gap-0.5 pb-2">
              @for (e of emoji.recent(); track e) {
                <button type="button" class="h-10 rounded-lg text-[24px] hover:bg-ok-surface-2" [attr.aria-label]="e" (click)="picked.emit(e); emoji.used(e)">{{ e }}</button>
              }
            </div>
          }
          <h3 class="text-[12px] font-semibold tracking-[0.06em] text-ok-muted px-1 pb-1">{{ groupName().toUpperCase() }}</h3>
          <div class="grid grid-cols-8 gap-0.5">
            @for (r of inGroup(); track r[0]) {
              <button type="button" class="h-10 rounded-lg text-[24px] hover:bg-ok-surface-2" [title]="r[1]" [attr.aria-label]="r[1]" (click)="pick(r)">{{ shown(r) }}</button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class EmojiPicker implements AfterViewInit {
  @Output() picked = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('search') private search?: ElementRef<HTMLInputElement>;

  protected readonly emoji = inject(EmojiService);
  protected readonly tones = SKIN_TONES;
  protected readonly query = signal('');
  protected readonly group = signal(0);

  protected readonly groups = computed(() => {
    const c = this.emoji.catalog();
    if (!c) return [];
    return c.groups.map(g => ({ ...g, icon: c.emoji.find(e => e[3] === g.id)?.[0] ?? '' }));
  });
  protected readonly groupName = computed(() => this.groups().find(g => g.id === this.group())?.name ?? '');
  protected readonly inGroup = computed(() => this.emoji.catalog()?.emoji.filter(e => e[3] === this.group()) ?? []);
  protected readonly found = computed(() => {
    const c = this.emoji.catalog();
    return c ? searchEmoji(c, this.query()) : [];
  });

  constructor() {
    this.emoji.load();
    dismissOnOutside(() => true, () => this.closed.emit(), '[data-emoji-open]');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.search?.nativeElement.focus());
  }

  protected shown(r: EmojiRow): string {
    return withTone(r, this.emoji.tone());
  }

  protected pick(r: EmojiRow): void {
    const e = this.shown(r);
    this.emoji.used(e);
    this.picked.emit(e);
  }

  protected pickFirst(): void {
    const r = this.found()[0];
    if (r) this.pick(r);
  }

  protected nextTone(): void {
    this.emoji.setTone((this.emoji.tone() + 1) % SKIN_TONES.length);
  }
}
