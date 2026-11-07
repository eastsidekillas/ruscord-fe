import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Hash, LucideAngularModule, MessageCircle, Users, Volume2 } from 'lucide-angular';
import { AppStateStore, channelGroups } from '@entities/app-state';
import { ReadStateStore } from '@entities/read-states';
import { ModalService } from '@shared/model/modal.service';
import { nameOf } from '@shared/api';
import { SwitchItem, moveSelection, rankSwitch } from '../lib/rank';

/** Ctrl K: go anywhere by typing a few letters of its name. */
@Component({
  selector: 'QuickSwitchModal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  host: { '(document:keydown.escape)': 'modal.close()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[rgba(15,17,18,0.72)]" (click)="modal.close()">
      <section role="dialog" aria-modal="true" aria-label="Быстрый переход" (click)="$event.stopPropagation()" data-quick-switch
               class="w-full max-w-[560px] rounded-ok-lg bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-4 flex flex-col gap-3 text-ok-text">
        <label for="qs-input" class="sr-only-ok">Куда перейти</label>
        <input #field id="qs-input" type="text" autocomplete="off" spellcheck="false"
               role="combobox" aria-controls="qs-list" aria-expanded="true" [attr.aria-activedescendant]="results().length ? 'qs-' + selected() : null"
               placeholder="Куда перейти? # канал, @ человек, * место" [value]="query()"
               (input)="type($any($event.target).value)" (keydown)="key($event)"
               class="h-12 w-full box-border rounded-ok-md bg-ok-bg border border-ok-border-control px-4 text-[16px] text-ok-text !outline-none focus:border-ok-accent placeholder:text-ok-muted" />
        <ul id="qs-list" role="listbox" aria-label="Результаты" class="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto">
          <li *ngFor="let it of results(); let i = index; trackBy: byKey" [id]="'qs-' + i" role="option" [attr.aria-selected]="i === selected()"
              (click)="open(it)" (mousemove)="selected.set(i)"
              class="flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer" [class.bg-ok-surface-2]="i === selected()">
            <span class="w-5 h-5 shrink-0 flex items-center justify-center text-ok-muted">
              <lucide-angular *ngIf="icon(it) as ic; else letter" class="w-4 h-4" [img]="ic" aria-hidden="true"></lucide-angular>
              <ng-template #letter><span class="w-5 h-5 rounded-md bg-ok-surface-2 text-[10px] font-bold flex items-center justify-center">{{ it.label.slice(0, 1) }}</span></ng-template>
            </span>
            <span class="truncate" [ngClass]="it.unread ? 'font-bold text-ok-text' : 'text-ok-text'">{{ it.label }}</span>
            <span *ngIf="it.hint" class="text-[12px] text-ok-muted truncate">{{ it.hint }}</span>
            <span class="flex-1"></span>
            <span *ngIf="it.mentions" class="min-w-5 h-5 px-1.5 rounded-full bg-ok-danger text-ok-on-danger text-[11px] font-bold flex items-center justify-center">{{ it.mentions > 99 ? '99+' : it.mentions }}</span>
          </li>
          <li *ngIf="!results().length" class="px-3 py-6 text-center text-[13px] text-ok-muted">Ничего не нашлось. Долобеб тоже искал.</li>
        </ul>
        <p class="m-0 text-[12px] text-ok-muted">↑↓ — выбрать, Enter — открыть, Esc — закрыть</p>
      </section>
    </div>
  `,
})
export class QuickSwitchModal implements AfterViewInit {
  protected readonly modal = inject(ModalService);
  private readonly store = inject(AppStateStore);
  private readonly reads = inject(ReadStateStore);
  private readonly router = inject(Router);
  @ViewChild('field') private field?: ElementRef<HTMLInputElement>;

  protected readonly query = signal('');
  protected readonly selected = signal(0);

  private readonly items = computed<SwitchItem[]>(() => {
    const out: SwitchItem[] = [];
    const state = (id: string) => ({ unread: this.reads.unread(id), mentions: this.reads.unread(id) ? this.reads.get(id)?.mentions ?? 0 : 0 });
    for (const d of this.store.dms()) {
      const group = d.type === 3;
      out.push({ kind: group ? 'group' : 'dm', id: d.id, label: group ? this.store.groupTitle(d) : nameOf(this.store.dmPartner(d)),
                 hint: '', route: ['/channels/me', d.id], ...state(d.id) });
    }
    for (const g of this.store.guilds()) {
      const sum = this.reads.guildSummary()[g.id];
      out.push({ kind: 'guild', id: g.id, label: g.name, hint: '', route: ['/channels', g.id], unread: !!sum?.unread, mentions: sum?.mentions ?? 0 });
      for (const group of channelGroups(g)) {
        for (const c of group.channels) {
          if (c.type !== 0 && c.type !== 2) continue;
          out.push({ kind: c.type === 0 ? 'text' : 'voice', id: c.id, label: c.name ?? '', hint: g.name,
                     route: ['/channels', g.id, c.id], ...(c.type === 0 ? state(c.id) : { unread: false, mentions: 0 }) });
        }
      }
    }
    return out;
  });

  protected readonly results = computed(() => rankSwitch(this.items(), this.query()));

  ngAfterViewInit(): void {
    this.field?.nativeElement.focus();
  }

  protected type(value: string): void {
    this.query.set(value);
    this.selected.set(0);
  }

  protected key(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const it = this.results()[this.selected()];
      if (it) this.open(it);
      return;
    }
    const next = moveSelection(this.selected(), this.results().length, ev.key);
    if (next === null) return;
    ev.preventDefault();
    this.selected.set(next);
    document.getElementById('qs-' + next)?.scrollIntoView({ block: 'nearest' });
  }

  protected open(it: SwitchItem): void {
    this.modal.close();
    void this.router.navigate(it.route);
  }

  protected icon(it: SwitchItem) {
    switch (it.kind) {
      case 'text': return Hash;
      case 'voice': return Volume2;
      case 'dm': return MessageCircle;
      case 'group': return Users;
      default: return null;
    }
  }

  protected byKey = (_: number, it: SwitchItem) => it.kind + it.id;
}
