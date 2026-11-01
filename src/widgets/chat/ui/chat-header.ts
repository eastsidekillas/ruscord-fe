import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';
import { StatusUi } from '@entities/user-status';
import { Hash, LucideAngularModule } from 'lucide-angular';

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
              <AvatarUI [src]="imageUrl" [name]="name" [tone]="type === 'group' ? 'bg-ok-surface-2 text-ok-text' : 'bg-ok-avatar text-ok-text'" />
            </span>
            <StatusUI *ngIf="userId" [userId]="userId" ring="ring-ok-surface-1" />
          </span>
          <h1 class="text-[15px] font-semibold text-ok-text truncate">{{ name }}</h1>
        </ng-container>
        <ng-template #channelHeader>
          <lucide-angular class="w-[18px] h-[18px] text-ok-muted shrink-0" [img]="Hash"></lucide-angular>
          <h1 class="text-[15px] font-semibold text-ok-text truncate">{{ name }}</h1>
          <span *ngIf="topic" class="text-[13px] text-ok-muted truncate border-l border-ok-border pl-3 ml-1">{{ topic }}</span>
        </ng-template>
      </div>
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
  protected readonly Hash = Hash;
}
