import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AuthService } from '@entities/session/api/auth.service';
import { VideoSource, VoiceService, cameraErrorText } from '@entities/voice';
import { VideoView } from '@widgets/voice/ui/video-view';
import { SettingsSplit } from '../settings-split';
import { selectedOr } from './voice-section';

/** Track.Source.Camera without importing livekit-client here (the enum value is the string 'camera'). */
const CAMERA = 'camera' as VideoSource;

const SELECT = 'h-10 w-full bg-ok-surface-1 border border-ok-border-control rounded-ok-md px-3 text-ok-text';
const BTN = 'h-10 w-full rounded-ok-md font-semibold bg-ok-accent text-ok-on-accent';

/**
 * «Камера»: the camera list and a mirrored «Как вас видят» preview. The
 * preview starts only on the button and releases the camera when it is
 * turned off or the section goes. In a call with the camera on it shows
 * the running track instead of opening the camera a second time.
 */
@Component({
  selector: 'CameraSection',
  standalone: true,
  imports: [SettingsSplit, VideoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <SettingsSplit data-settings-camera>
      <section aria-labelledby="camera-h" class="flex flex-col gap-5">
        <h1 id="camera-h" class="m-0 text-[20px] leading-7 font-semibold">Камера</h1>
        @if (voice.cameras().length) {
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-semibold text-ok-muted">Камера</span>
            <select [class]="select" (change)="pick($event)" data-camera>
              <option value="" [selected]="cameraId() === ''">По умолчанию</option>
              @for (d of voice.cameras(); track d.deviceId) {
                <option [value]="d.deviceId" [selected]="d.deviceId === cameraId()">{{ d.label || 'Камера' }}</option>
              }
            </select>
          </label>
        } @else {
          <p class="m-0 text-ok-muted">Камера не найдена</p>
        }
      </section>

      <div preview class="flex flex-col gap-3">
        <span class="text-[13px] font-semibold text-ok-muted">Как вас видят</span>
        <div data-camera-preview class="relative aspect-video rounded-ok-md overflow-hidden bg-ok-surface-2 flex items-center justify-center">
          @if (voice.cameraOn() && userId()) {
            <VideoView class="absolute inset-0 -scale-x-100" [source]="source" [userId]="userId()" label="Ваша камера" />
          } @else {
            <video #video class="absolute inset-0 w-full h-full object-contain -scale-x-100" autoplay playsinline muted
                   [class.hidden]="!stream()" aria-label="Предпросмотр камеры"></video>
            @if (!stream()) { <span class="text-[13px] text-ok-muted">Предпросмотр выключен</span> }
          }
        </div>
        @if (voice.cameraOn()) {
          <p class="m-0 text-[13px] text-ok-muted">Камера включена в звонке: вы видите ту же картинку, что и собеседники</p>
        } @else {
          <button type="button" data-camera-toggle [disabled]="!voice.cameras().length" (click)="toggle()"
                  [class]="btn + ' disabled:opacity-50'">{{ wanted() ? 'Выключить предпросмотр' : 'Включить предпросмотр' }}</button>
          @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
        }
      </div>
    </SettingsSplit>
  `,
})
export class CameraSectionComponent {
  protected readonly voice = inject(VoiceService);
  private readonly auth = inject(AuthService);

  protected readonly select = SELECT;
  protected readonly btn = BTN;
  protected readonly source = CAMERA;
  protected readonly userId = computed(() => this.auth.user()?.id ?? '');
  protected readonly cameraId = computed(() => selectedOr(this.voice.cameras(), this.voice.camera()));

  /** The user wants the preview on; true from the click, also while the browser still asks for access. */
  protected readonly wanted = signal(false);
  protected readonly stream = signal<MediaStream | null>(null);
  protected readonly error = signal('');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  /** Numbers the requests: only the newest may keep its stream. */
  private run = 0;

  constructor() {
    const onDeviceChange = () => void this.voice.refreshDevices();
    void this.voice.refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    inject(DestroyRef).onDestroy(() => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      this.wanted.set(false);
      this.halt();
    });

    effect(() => {
      const el = this.video()?.nativeElement;
      const s = this.stream();
      if (el && el.srcObject !== s) el.srcObject = s;
    });

    // A call with the camera on owns it: drop our preview.
    effect(() => {
      if (this.voice.cameraOn()) {
        untracked(() => {
          this.wanted.set(false);
          this.halt();
        });
      }
    });

    // Another saved camera restarts a running preview; a refreshed device list does not.
    let last: string | null = null;
    effect(() => {
      const now = this.voice.camera();
      const changed = last !== null && last !== now;
      last = now;
      if (changed && untracked(() => this.wanted() && !this.voice.cameraOn())) untracked(() => void this.begin());
    });
  }

  protected toggle(): void {
    if (this.wanted()) {
      this.wanted.set(false);
      this.halt();
    } else {
      this.wanted.set(true);
      void this.begin();
    }
  }

  /** Releases the camera and invalidates any request still pending. */
  private halt(): void {
    this.run++;
    this.stream()?.getTracks().forEach(t => t.stop());
    this.stream.set(null);
  }

  private async begin(): Promise<void> {
    this.halt();
    const mine = this.run;
    // Real ids in the list: a stale saved id means the default camera, as the select shows.
    // Id-less entries (before permission): the saved id is all we know.
    const list = this.voice.cameras();
    const id = list.some(d => d.deviceId) ? selectedOr(list, this.voice.camera()) : this.voice.camera();
    this.error.set('');
    let got: MediaStream;
    try {
      got = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: id } : true });
    } catch (err) {
      if (mine !== this.run) return;
      this.wanted.set(false);
      this.error.set(cameraErrorText(err));
      return;
    }
    if (mine !== this.run || !this.wanted()) {
      got.getTracks().forEach(t => t.stop());
      return;
    }
    this.stream.set(got);
    // Names appear once the browser grants access.
    void this.voice.refreshDevices();
  }

  protected pick(ev: Event): void {
    void this.voice.setDevice('videoinput', (ev.target as HTMLSelectElement).value);
  }
}
