import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Mood } from '@shared/api/models';
import { Dolobeb } from '@shared/ui/dolobeb';
import { MinuteClock } from '../model/clock';
import { liveMood, moodTitle } from '../model/mood';

/**
 * A user's mood in a list: a small dolobeb with the phrase and the expiry
 * in the tooltip. Draws nothing without a mood or after it expired.
 */
@Component({
  selector: 'MoodFace',
  standalone: true,
  imports: [Dolobeb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (live(); as m) {
      <span class="inline-flex" data-mood-face [attr.data-mood-state]="m.state" [title]="title()">
        <Dolobeb [state]="m.state" [size]="size()" [animate]="false" [label]="title()" />
      </span>
    }
  `,
})
export class MoodFace {
  readonly mood = input<Mood | null | undefined>(null);
  readonly size = input(18);

  private readonly clock = inject(MinuteClock);
  protected readonly live = computed(() => liveMood(this.mood(), this.clock.now()));
  protected readonly title = computed(() => {
    const m = this.live();
    return m ? moodTitle(m, this.clock.now()) : '';
  });
}
