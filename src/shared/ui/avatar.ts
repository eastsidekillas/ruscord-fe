import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'AvatarUI',
  standalone: true,
  imports: [NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full h-full' },
  template: `
    <img *ngIf="src(); else initial"
         [src]="src()!" [alt]="name()"
         class="w-full h-full object-cover" />
    <ng-template #initial>
      <div class="w-full h-full flex items-center justify-center text-white font-semibold bg-gray-600 select-none">
        {{ firstLetter() }}
      </div>
    </ng-template>
  `,
})
export class AvatarUI {
  readonly src = input<string | null | undefined>(null);
  readonly name = input<string>('?');
  protected readonly firstLetter = computed(() => (this.name() || '?').charAt(0).toUpperCase());
}
