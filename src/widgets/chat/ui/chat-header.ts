import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';

@Component({
  selector: 'ChatHeader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvatarUI],
  template: `
    <div class="h-16 flex items-center justify-between px-6 shadow-xl">
      <div class="flex items-center space-x-3 min-w-0" [class.cursor-pointer]="!!userId" (click)="userId && profile.emit(userId)">
        <ng-container *ngIf="type !== 'channel'; else channelHeader">
          <div class="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <AvatarUI [src]="imageUrl" [name]="name" />
          </div>
          <h3 class="text-lg font-semibold text-gray-300 truncate">{{ name }}</h3>
        </ng-container>
        <ng-template #channelHeader>
          <h3 class="text-lg font-semibold text-gray-300 flex items-center min-w-0">
            <svg class="w-5 h-5 mr-2 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/>
            </svg>
            <span class="truncate">{{ name }}</span>
          </h3>
          <span *ngIf="topic" class="text-sm text-typo-secondary truncate border-l border-gray-600 pl-3">{{ topic }}</span>
        </ng-template>
      </div>
    </div>
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
}
