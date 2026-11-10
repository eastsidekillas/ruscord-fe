import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PublicUser, nameOf } from '@shared/api';
import { AvatarUI } from '@shared/ui/avatar';
import { Dolobeb } from '@shared/ui/dolobeb';
import { StatusUIText } from '@entities/user-status';
import { MinuteClock } from '../model/clock';
import { expiryLabel, liveMood, moodLabel, profileColorCss } from '../model/mood';

/**
 * A user's profile as everyone sees it: a cover in the profile colour, the
 * avatar, the mood (dolobeb's face and the phrase in a bubble), the names,
 * the status and «О себе». The profile window and the preview in the
 * settings are this same component. Buttons go in as content.
 */
@Component({
  selector: 'ProfileCard',
  standalone: true,
  imports: [AvatarUI, Dolobeb, StatusUIText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="rounded-ok-lg overflow-hidden bg-ok-surface-1 text-ok-text text-left" data-profile-card
             [attr.data-profile-color]="user().profile_color ?? 'accent'">
      <div class="h-20" [style.background]="cover()"></div>
      <div class="px-4 pb-4 flex flex-col">
        <div class="flex items-end gap-3 -mt-10">
          <span class="block w-20 h-20 shrink-0 rounded-ok-lg overflow-hidden border-4 border-ok-surface-1 bg-ok-surface-1 text-[28px]">
            <AvatarUI [src]="user().avatar" [name]="name()" />
          </span>
          @if (mood(); as m) {
            <div class="flex items-end gap-1.5 min-w-0 pb-1" data-profile-mood [attr.data-mood-state]="m.state">
              <Dolobeb [state]="m.state" [size]="40" [label]="moodName()" />
              @if (m.text) {
                <span class="min-w-0 mb-2 rounded-ok-md rounded-bl-none bg-ok-surface-2 px-3 py-1.5 text-[13px] leading-[18px] break-words"
                      data-profile-mood-text>{{ m.text }}</span>
              }
            </div>
          }
        </div>
        <h2 class="m-0 mt-3 text-[20px] leading-7 font-semibold break-words">{{ name() }}</h2>
        <p class="m-0 text-[13px] text-ok-muted break-words">{{ user().username }}</p>
        @if (statusOf(); as id) {
          <div class="mt-1"><StatusUIText [userId]="id" /></div>
        }
        @if (mood(); as m) {
          <p class="m-0 mt-1 text-[12px] text-ok-muted">
            {{ moodName() }}@if (expiry(); as e) { · {{ e }} }
          </p>
        }
        @if (bio()) {
          <h3 class="m-0 mt-4 text-[12px] font-semibold tracking-[0.1em] text-ok-muted">О СЕБЕ</h3>
          <p class="m-0 mt-1 text-[14px] leading-[20px] whitespace-pre-line break-words">{{ bio() }}</p>
        }
        <ng-content />
      </div>
    </article>
  `,
})
export class ProfileCard {
  readonly user = input.required<PublicUser>();
  readonly bio = input('');
  /** Whose live status to show; none when empty. */
  readonly statusOf = input<string | null>(null);

  private readonly clock = inject(MinuteClock);
  protected readonly name = computed(() => nameOf(this.user()));
  protected readonly cover = computed(() => profileColorCss(this.user().profile_color));
  protected readonly mood = computed(() => liveMood(this.user().mood, this.clock.now()));
  protected readonly moodName = computed(() => {
    const m = this.mood();
    return m ? moodLabel(m.state) : '';
  });
  protected readonly expiry = computed(() => {
    const at = this.mood()?.expires_at;
    return at ? expiryLabel(new Date(at), this.clock.now()) : null;
  });
}
