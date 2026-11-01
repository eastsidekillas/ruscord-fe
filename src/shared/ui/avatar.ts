import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * A picture or initials filling its box; the box sets the size and the
 * rounded square (Zvonilka avatars are squares, not circles).
 */
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
      <div class="w-full h-full flex items-center justify-center font-semibold select-none" [class]="tone()">
        {{ initials() }}
      </div>
    </ng-template>
  `,
})
export class AvatarUI {
  readonly src = input<string | null | undefined>(null);
  readonly name = input<string>('?');
  /** How many letters of the name to show without a picture. */
  readonly letters = input(1);
  /** Background and text of the initials. */
  readonly tone = input('bg-ok-avatar text-ok-text');
  protected readonly initials = computed(() => {
    const n = (this.name() || '?').trim() || '?';
    return n.charAt(0).toUpperCase() + n.slice(1, Math.max(1, this.letters())).toLowerCase();
  });
}
