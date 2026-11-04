import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';
import { StatusUi } from '@entities/user-status';
import { Hash, LucideAngularModule, Pencil, Phone, Pin } from 'lucide-angular';

@Component({
  selector: 'ChatHeader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvatarUI, LucideAngularModule, StatusUi],
  host: { class: 'block' },
  template: `
    <header class="h-14 flex items-center gap-2.5 px-6 border-b border-ok-border">
      <div class="flex items-center gap-2.5 min-w-0" [class.cursor-pointer]="!!userId" (click)="userId && profile.emit(userId)">
        <ng-container *ngIf="type !== 'channel'; else channelHeader">
          <span class="relative w-7 h-7 shrink-0">
            <span class="block w-full h-full rounded-lg overflow-hidden">
              <AvatarUI [src]="imageUrl" [name]="type === 'group' ? '' + members : name" [letters]="type === 'group' ? 2 : 1"
                        [tone]="type === 'group' ? 'bg-ok-surface-2 text-ok-text text-[12px]' : 'bg-ok-avatar text-ok-text'" />
            </span>
            <StatusUI *ngIf="userId" [userId]="userId" ring="ring-ok-surface-1" />
          </span>
          <h1 *ngIf="!renaming()" class="text-[15px] font-semibold text-ok-text truncate">{{ name }}</h1>
          <ng-container *ngIf="type === 'group'">
            <ng-container *ngIf="renaming(); else pencil">
              <label for="group-name" class="sr-only-ok">Название группы</label>
              <input #nameField id="group-name" type="text" [value]="title ?? ''" maxlength="100" placeholder="Без названия — имена участников"
                     class="h-9 w-72 max-w-full box-border rounded-lg border border-ok-accent bg-ok-sidebar text-ok-text px-3 text-[15px] !outline-none placeholder:text-ok-muted"
                     (keydown.enter)="saveName(nameField.value)" (keydown.escape)="renaming.set(false)" (blur)="renaming.set(false)" />
            </ng-container>
            <ng-template #pencil>
              <button type="button" class="w-8 h-8 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 inline-flex items-center justify-center shrink-0"
                      title="Переименовать группу" aria-label="Переименовать группу" (click)="startRename()">
                <lucide-angular class="w-3.5 h-3.5" [img]="Pencil"></lucide-angular>
              </button>
            </ng-template>
          </ng-container>
        </ng-container>
        <ng-template #channelHeader>
          <lucide-angular class="w-[18px] h-[18px] text-ok-muted shrink-0" [img]="Hash"></lucide-angular>
          <h1 class="text-[15px] font-semibold text-ok-text truncate">{{ name }}</h1>
          <span *ngIf="topic" class="text-[13px] text-ok-muted truncate border-l border-ok-border pl-3 ml-1">{{ topic }}</span>
        </ng-template>
      </div>
      <span class="flex-1"></span>
      <label *ngIf="showSearch" class="relative shrink-0 max-md:hidden" data-search>
        <span class="sr-only-ok">Поиск по сообщениям</span>
        <input #searchField type="search" placeholder="Поиск" [value]="searchText" maxlength="200"
               (keydown.enter)="search.emit(searchField.value)" (keydown.escape)="search.emit('')"
               class="h-8 w-[200px] focus:w-[280px] transition-[width] box-border rounded-lg border border-ok-border-control bg-ok-sidebar text-ok-text px-3 text-[13px] !outline-none focus:border-ok-accent placeholder:text-ok-muted" />
      </label>
      <button *ngIf="showPins" type="button" (click)="pins.emit()" title="Закреплённые сообщения" aria-label="Закреплённые сообщения"
              [attr.aria-pressed]="pinsOpen" data-pins
              class="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
              [ngClass]="pinsOpen ? 'text-ok-text bg-ok-surface-2' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-2'">
        <lucide-angular class="w-[18px] h-[18px]" [img]="Pin" aria-hidden="true"></lucide-angular>
      </button>
      <ng-container *ngIf="type !== 'channel'">
        <button *ngIf="canCall" type="button" (click)="call.emit()" data-call-start
                [title]="type === 'group' ? 'Позвонить группе' : 'Позвонить'" [attr.aria-label]="type === 'group' ? 'Позвонить группе' : 'Позвонить'"
                class="w-9 h-9 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 inline-flex items-center justify-center shrink-0">
          <lucide-angular class="w-[18px] h-[18px]" [img]="Phone" aria-hidden="true"></lucide-angular>
        </button>
        <button *ngIf="type === 'group'" type="button" class="h-9 px-3.5 rounded-lg bg-ok-surface-2 text-ok-text text-[13px] font-semibold hover:bg-ok-border shrink-0"
                (click)="addMembers.emit()">Добавить друзей</button>
      </ng-container>
    </header>
  `,
})
export class ChatHeader {
  @Input() name = '';
  @Input() type: 'channel' | 'dm' | 'group' = 'channel';
  @Input() imageUrl: string | null = null;
  @Input() topic: string | null = null;
  /** The other person of a 1:1 DM: the header opens their profile. */
  @Input() userId: string | null = null;
  @Output() profile = new EventEmitter<string>();
  /** A group: its own name (null when it shows the members' names) and size. */
  @Input() title: string | null = null;
  @Input() members = 0;
  /** A group's new name; empty resets it to the members' names. */
  @Output() rename = new EventEmitter<string>();
  @Output() addMembers = new EventEmitter<void>();
  /** A DM or group: the call button shows (not while in its call, not with a block). */
  @Input() canCall = false;
  @Output() call = new EventEmitter<void>();
  /** The search box (needs READ_MESSAGE_HISTORY); Enter searches, Esc closes. */
  @Input() showSearch = false;
  @Input() searchText = '';
  @Output() search = new EventEmitter<string>();
  /** The pinned messages button (needs READ_MESSAGE_HISTORY). */
  @Input() showPins = false;
  @Input() pinsOpen = false;
  @Output() pins = new EventEmitter<void>();
  @ViewChild('nameField') private nameField?: ElementRef<HTMLInputElement>;

  protected readonly renaming = signal(false);
  protected readonly Hash = Hash;
  protected readonly Pencil = Pencil;
  protected readonly Phone = Phone;
  protected readonly Pin = Pin;

  protected startRename(): void {
    this.renaming.set(true);
    setTimeout(() => this.nameField?.nativeElement.select());
  }

  protected saveName(value: string): void {
    this.renaming.set(false);
    if (value.trim() !== (this.title ?? '')) this.rename.emit(value.trim());
  }
}
