import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, untracked, viewChild } from '@angular/core';
import { VoiceService } from '@entities/voice';

/**
 * One shared screen in a video element. It attaches again when the screen's
 * track arrives (the list of sharers changes) and detaches when it goes.
 * The element is muted: the screen's sound plays with the room's audio.
 */
@Component({
  selector: 'ScreenView',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<video #video class="w-full h-full object-contain bg-ok-bg" autoplay playsinline muted [attr.aria-label]="label()"></video>`,
})
export class ScreenView {
  readonly userId = input.required<string>();
  readonly label = input('');
  private readonly voice = inject(VoiceService);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private cleanup: () => void = () => undefined;

  constructor() {
    effect(() => {
      const id = this.userId();
      const el = this.video().nativeElement;
      this.voice.sharers(); // a new or stopped screen: attach again
      untracked(() => {
        this.cleanup();
        this.cleanup = this.voice.showScreen(id, el);
      });
    });
    inject(DestroyRef).onDestroy(() => this.cleanup());
  }
}
