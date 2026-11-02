import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, untracked, viewChild } from '@angular/core';
import { VoiceService, VideoSource } from '@entities/voice';

/**
 * A user's camera or shared screen in a video element. It attaches again
 * when the video starts or stops (the lists of who films and who shares
 * change) and detaches when it goes. The element is muted: sound plays with
 * the room's audio.
 */
@Component({
  selector: 'VideoView',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<video #video class="w-full h-full" [class]="fit()" autoplay playsinline muted [attr.aria-label]="label()"></video>`,
})
export class VideoView {
  readonly source = input.required<VideoSource>();
  readonly userId = input.required<string>();
  readonly label = input('');
  /** Screens fit whole; cameras fill their tile. */
  readonly fit = input<'object-contain' | 'object-cover'>('object-contain');
  private readonly voice = inject(VoiceService);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private cleanup: () => void = () => undefined;

  constructor() {
    effect(() => {
      const source = this.source();
      const id = this.userId();
      const el = this.video().nativeElement;
      this.voice.sharers(); // a new or stopped video: attach again
      this.voice.filming();
      untracked(() => {
        this.cleanup();
        this.cleanup = this.voice.showVideo(source, id, el);
      });
    });
    inject(DestroyRef).onDestroy(() => this.cleanup());
  }
}
