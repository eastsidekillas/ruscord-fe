import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicCheck, ProcessingMode, AudioFlags, VoiceService, DeviceKind, talkKeyAllowed, talkKeyLabel } from '@entities/voice';
import { Dolobeb, DolobebState } from '@shared/ui/dolobeb';
import { SettingsSplit } from '../settings-split';

/** The face of the check: idle until it runs, then listening, speaking above the level threshold. */
export function checkFace(running: boolean, level: number): DolobebState {
  if (!running) return 'idle';
  return level > 0.08 ? 'speaking' : 'listening';
}

/** The id when the list still has that device, else '' (the system default). */
export function selectedOr(list: readonly { deviceId: string }[], id: string): string {
  return list.some(d => d.deviceId === id) ? id : '';
}

const MODES: readonly { key: ProcessingMode; label: string; hint: string }[] = [
  { key: 'suppress', label: 'Шумоподавление', hint: 'Браузер убирает фоновый шум и эхо. Подходит почти всем.' },
  { key: 'clean', label: 'Чистый звук', hint: 'Звук без обработки: подойдёт хорошему микрофону и наушникам.' },
  { key: 'custom', label: 'Свои настройки', hint: 'Включите только то, что нужно.' },
];

const CUSTOM_FLAGS: readonly { key: keyof AudioFlags; label: string }[] = [
  { key: 'noiseSuppression', label: 'Шумоподавление' },
  { key: 'echoCancellation', label: 'Эхоподавление' },
  { key: 'autoGainControl', label: 'Автогромкость' },
];

const SELECT = 'h-10 w-full bg-ok-surface-1 border border-ok-border-control rounded-ok-md px-3 text-ok-text';
const BTN = 'h-10 w-full rounded-ok-md font-semibold disabled:opacity-50';

/** «Голос»: devices, volume, audio processing, push-to-talk and the live «Как вас слышно» check. */
@Component({
  selector: 'VoiceSection',
  standalone: true,
  imports: [SettingsSplit, Dolobeb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <SettingsSplit data-settings-voice>
      <section aria-labelledby="voice-h" class="flex flex-col gap-5">
        <h1 id="voice-h" class="m-0 text-[20px] leading-7 font-semibold">Голос</h1>

        <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-semibold text-ok-muted">Микрофон</span>
            <select [class]="select" (change)="pick('audioinput', $event)" data-input>
              <option value="" [selected]="inputId() === ''">По умолчанию</option>
              @for (d of voice.inputs(); track d.deviceId) {
                <option [value]="d.deviceId" [selected]="d.deviceId === inputId()">{{ d.label || 'Микрофон' }}</option>
              }
            </select>
          </label>
          @if (voice.outputs().length) {
            <label class="flex flex-col gap-1.5">
              <span class="text-[13px] font-semibold text-ok-muted">Динамики</span>
              <select [class]="select" (change)="pick('audiooutput', $event)" data-output>
                <option value="" [selected]="outputId() === ''">По умолчанию</option>
                @for (d of voice.outputs(); track d.deviceId) {
                  <option [value]="d.deviceId" [selected]="d.deviceId === outputId()">{{ d.label || 'Динамики' }}</option>
                }
              </select>
            </label>
          } @else {
            <p class="m-0 self-end text-[13px] text-ok-muted">Этот браузер не даёт выбрать динамики.</p>
          }
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-semibold text-ok-muted">Громкость собеседников: {{ volumePercent() }}%</span>
          <input type="range" min="0" max="100" step="1" data-volume class="w-full accent-ok-accent"
                 [value]="volumePercent()" (input)="setVolume($event)" />
        </label>

        <div class="flex flex-col gap-2">
          <span class="text-[13px] font-semibold text-ok-muted">Обработка звука</span>
          <div role="group" aria-label="Обработка звука" class="grid grid-cols-3 gap-1 p-1 bg-ok-surface-1 rounded-ok-lg">
            @for (m of modes; track m.key) {
              <button type="button" [attr.data-processing]="m.key" [attr.aria-pressed]="voice.prefs().mode === m.key"
                      (click)="voice.updatePrefs({ mode: m.key })"
                      class="min-h-9 px-2 rounded-ok-md text-[13px] font-semibold"
                      [class]="voice.prefs().mode === m.key ? 'bg-ok-accent text-ok-on-accent' : 'text-ok-muted hover:text-ok-text'">
                {{ m.label }}
              </button>
            }
          </div>
          <p class="m-0 text-[13px] text-ok-muted">{{ modeHint() }}</p>
          @if (voice.prefs().mode === 'custom') {
            <div class="flex flex-col gap-1">
              @for (f of customFlags; track f.key) {
                <label class="flex items-center gap-2.5 min-h-9">
                  <input type="checkbox" role="switch" data-custom class="w-4 h-4 accent-ok-accent"
                         [checked]="voice.prefs().custom[f.key]" (change)="setFlag(f.key, $event)" />
                  <span>{{ f.label }}</span>
                </label>
              }
            </div>
          }
        </div>

        <div class="flex flex-col gap-2">
          <label class="flex items-start gap-3">
            <span class="flex-1">
              <span class="block font-semibold">Режим рации</span>
              <span class="block text-[13px] text-ok-muted">Микрофон работает, пока удерживаете клавишу. В браузере только при открытой вкладке.</span>
            </span>
            <input type="checkbox" role="switch" data-talk-toggle class="w-5 h-5 mt-0.5 accent-ok-accent"
                   [checked]="voice.prefs().talkMode" (change)="voice.updatePrefs({ talkMode: $any($event.target).checked })" />
          </label>
          @if (voice.prefs().talkMode) {
            <div class="flex items-center gap-3">
              <span class="text-[13px] text-ok-muted">Клавиша</span>
              <button type="button" data-talk-key (click)="capturing.set(true)" (keydown)="capture($event)" (blur)="capturing.set(false)"
                      class="h-10 min-w-24 px-4 rounded-ok-md border border-ok-border-control font-semibold"
                      [class]="capturing() ? 'bg-ok-surface-2 text-ok-text' : 'bg-ok-surface-1 text-ok-text'">
                {{ capturing() ? 'Нажмите клавишу…' : keyLabel() }}
              </button>
            </div>
            @if (keyHint()) { <p role="status" class="m-0 text-[13px] text-ok-warning">{{ keyHint() }}</p> }
          }
        </div>
      </section>

      <div preview class="flex flex-col items-center gap-3 text-center">
        <span class="self-start text-[13px] font-semibold text-ok-muted">Как вас слышно</span>
        <Dolobeb [state]="face()" [size]="96" [audioLevel]="mic.level()" />
        <div class="w-full h-2 rounded-full bg-ok-surface-2 overflow-hidden" [attr.data-mic-level]="mic.level()">
          <div class="h-full bg-ok-accent" [style.width.%]="mic.level() * 100"></div>
        </div>
        <p class="m-0 text-[13px] text-ok-muted">Скажите что-нибудь: долобеб откроет рот в такт вашему голосу</p>
        <button type="button" data-mic-check [disabled]="voice.connected()" (click)="toggleCheck()"
                [class]="btn + ' bg-ok-accent text-ok-on-accent'">{{ mic.running() ? 'Остановить' : 'Слышать себя' }}</button>
        <button type="button" data-speaker-check (click)="mic.playTone(outputId())"
                [class]="btn + ' bg-ok-surface-2 text-ok-text'">Проверить динамики</button>
        @if (voice.connected()) {
          <p class="m-0 text-[13px] text-ok-warning">Завершите звонок, чтобы проверить микрофон</p>
        } @else if (mic.error()) {
          <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ mic.error() }}</p>
        } @else {
          <p class="m-0 text-[13px] text-ok-muted">Без наушников может появиться эхо</p>
        }
      </div>
    </SettingsSplit>
  `,
})
export class VoiceSectionComponent {
  protected readonly voice = inject(VoiceService);
  protected readonly mic = inject(MicCheck);

  protected readonly select = SELECT;
  protected readonly btn = BTN;
  protected readonly modes = MODES;
  protected readonly customFlags = CUSTOM_FLAGS;

  protected readonly inputId = computed(() => selectedOr(this.voice.inputs(), this.voice.input()));
  protected readonly outputId = computed(() => selectedOr(this.voice.outputs(), this.voice.output()));
  protected readonly volumePercent = computed(() => Math.round(this.voice.prefs().volume * 100));
  protected readonly modeHint = computed(() => MODES.find(m => m.key === this.voice.prefs().mode)?.hint ?? '');
  protected readonly face = computed(() => checkFace(this.mic.running(), this.mic.level()));
  protected readonly keyLabel = computed(() => talkKeyLabel(this.voice.prefs().talkKey));

  protected readonly capturing = signal(false);
  protected readonly keyHint = signal('');

  constructor() {
    const onDeviceChange = () => void this.voice.refreshDevices();
    void this.voice.refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    inject(DestroyRef).onDestroy(() => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      this.mic.stop();
    });

    // A call owns the microphone: end the check when one starts.
    effect(() => {
      if (this.voice.connected() && untracked(() => this.mic.running())) this.mic.stop();
    });

    // Names appear once the browser grants access: refresh after the first run.
    let refreshed = false;
    effect(() => {
      if (this.mic.running() && !refreshed) {
        refreshed = true;
        void untracked(() => this.voice.refreshDevices());
      }
    });

    // A device or mode change restarts a running check right away.
    const settings = computed(() => JSON.stringify([this.voice.input(), this.voice.output(), this.voice.flags()]));
    let last: string | null = null;
    effect(() => {
      const now = settings();
      const changed = last !== null && last !== now;
      last = now;
      if (changed && untracked(() => this.mic.running())) untracked(() => this.begin());
    });
  }

  protected toggleCheck(): void {
    if (this.mic.running()) this.mic.stop();
    else this.begin();
  }

  private begin(): void {
    void this.mic.start({ input: this.voice.input(), output: this.voice.output(), flags: this.voice.flags() });
  }

  protected pick(kind: DeviceKind, ev: Event): void {
    void this.voice.setDevice(kind, (ev.target as HTMLSelectElement).value);
  }

  protected setVolume(ev: Event): void {
    void this.voice.updatePrefs({ volume: Number((ev.target as HTMLInputElement).value) / 100 });
  }

  protected setFlag(key: keyof AudioFlags, ev: Event): void {
    const custom = { ...this.voice.prefs().custom, [key]: (ev.target as HTMLInputElement).checked };
    void this.voice.updatePrefs({ custom });
  }

  /** While capturing, the key never reaches the rest of the page (Esc would close the settings). */
  protected capture(ev: KeyboardEvent): void {
    if (!this.capturing()) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (!talkKeyAllowed(ev.code)) {
      this.keyHint.set('Эту клавишу назначить нельзя: выберите другую');
      return;
    }
    this.keyHint.set('');
    this.capturing.set(false);
    void this.voice.updatePrefs({ talkKey: ev.code });
  }
}
