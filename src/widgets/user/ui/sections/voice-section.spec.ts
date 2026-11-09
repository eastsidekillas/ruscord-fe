import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MicCheck, VoiceService, VoicePrefs, DEFAULT_VOICE_PREFS, flagsFor } from '@entities/voice';
import { VoiceSectionComponent, checkFace, selectedOr } from './voice-section';

const dev = (deviceId: string, label = deviceId) => ({ deviceId, label, kind: 'audioinput' }) as MediaDeviceInfo;

class FakeVoice {
  inputs = signal<MediaDeviceInfo[]>([dev('mic1', 'Mic One'), dev('mic2', 'Mic Two')]);
  outputs = signal<MediaDeviceInfo[]>([dev('spk1', 'Speaker One')]);
  input = signal('mic1');
  output = signal('');
  connected = signal(false);
  prefs = signal<VoicePrefs>({ ...DEFAULT_VOICE_PREFS });
  flags = () => flagsFor(this.prefs());
  refreshDevices = jasmine.createSpy('refreshDevices').and.resolveTo();
  setDevice = jasmine.createSpy('setDevice').and.resolveTo();
  updatePrefs = jasmine.createSpy('updatePrefs').and.callFake(async (p: Partial<VoicePrefs>) => {
    this.prefs.update(v => ({ ...v, ...p }));
  });
}

class FakeMic {
  running = signal(false);
  level = signal(0);
  error = signal<string | null>(null);
  start = jasmine.createSpy('start').and.callFake(async () => this.running.set(true));
  stop = jasmine.createSpy('stop').and.callFake(() => this.running.set(false));
  playTone = jasmine.createSpy('playTone').and.resolveTo();
}

describe('checkFace', () => {
  it('is idle when not running, listening in silence, speaking above 0.08', () => {
    expect(checkFace(false, 0.9)).toBe('idle');
    expect(checkFace(true, 0)).toBe('listening');
    expect(checkFace(true, 0.08)).toBe('listening');
    expect(checkFace(true, 0.09)).toBe('speaking');
  });
});

describe('selectedOr', () => {
  it('returns the id when listed, else an empty string', () => {
    const list = [{ deviceId: 'a' }];
    expect(selectedOr(list, 'a')).toBe('a');
    expect(selectedOr(list, 'gone')).toBe('');
  });
});

describe('VoiceSectionComponent', () => {
  let voice: FakeVoice;
  let mic: FakeMic;

  function render() {
    TestBed.configureTestingModule({
      providers: [{ provide: VoiceService, useValue: voice }, { provide: MicCheck, useValue: mic }],
    });
    const fixture = TestBed.createComponent(VoiceSectionComponent);
    fixture.detectChanges();
    return fixture;
  }
  const q = (f: { nativeElement: HTMLElement }, sel: string) => f.nativeElement.querySelector(sel) as HTMLElement | null;

  beforeEach(() => {
    voice = new FakeVoice();
    mic = new FakeMic();
  });

  it('refreshes devices on open', () => {
    render();
    expect(voice.refreshDevices).toHaveBeenCalled();
  });

  it('disables the check during a call and says why', () => {
    voice.connected.set(true);
    const f = render();
    expect((q(f, '[data-mic-check]') as HTMLButtonElement).disabled).toBeTrue();
    expect(f.nativeElement.textContent).toContain('Завершите звонок, чтобы проверить микрофон');
  });

  it('stops a running check when a call starts', async () => {
    const f = render();
    mic.running.set(true);
    f.detectChanges();
    voice.connected.set(true);
    f.detectChanges();
    expect(mic.stop).toHaveBeenCalled();
  });

  it('stops the check on destroy', () => {
    const f = render();
    mic.stop.calls.reset();
    f.destroy();
    expect(mic.stop).toHaveBeenCalled();
  });

  it('restarts a running check with the new device', async () => {
    const f = render();
    mic.running.set(true);
    f.detectChanges();
    mic.start.calls.reset();
    voice.input.set('mic2');
    f.detectChanges();
    expect(mic.start).toHaveBeenCalledTimes(1);
    expect(mic.start.calls.mostRecent().args[0].input).toBe('mic2');
  });

  it('does not restart when only the volume changes', () => {
    const f = render();
    mic.running.set(true);
    f.detectChanges();
    mic.start.calls.reset();
    voice.prefs.update(p => ({ ...p, volume: 0.3 }));
    f.detectChanges();
    expect(mic.start).not.toHaveBeenCalled();
  });

  it('starts the check on click and publishes the level', () => {
    const f = render();
    (q(f, '[data-mic-check]') as HTMLButtonElement).click();
    expect(mic.start).toHaveBeenCalled();
    mic.level.set(0.5);
    f.detectChanges();
    expect(q(f, '[data-mic-level]')!.getAttribute('data-mic-level')).toBe('0.5');
  });

  it('shows three switches in custom mode', () => {
    voice.prefs.update(p => ({ ...p, mode: 'custom' }));
    expect(render().nativeElement.querySelectorAll('[data-custom]').length).toBe(3);
  });

  it('shows no switches in suppress mode', () => {
    expect(render().nativeElement.querySelectorAll('[data-custom]').length).toBe(0);
  });

  it('refuses Escape as the talk key, keeps it and does not let it bubble', () => {
    voice.prefs.update(p => ({ ...p, talkMode: true }));
    const f = render();
    const bubbled = jasmine.createSpy('bubbled');
    document.addEventListener('keydown', bubbled);
    (q(f, '[data-talk-key]') as HTMLButtonElement).click();
    f.detectChanges();
    q(f, '[data-talk-key]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));
    f.detectChanges();
    document.removeEventListener('keydown', bubbled);
    expect(voice.prefs().talkKey).toBe(DEFAULT_VOICE_PREFS.talkKey);
    expect(bubbled).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('Эту клавишу назначить нельзя');
  });

  it('assigns an allowed key', () => {
    voice.prefs.update(p => ({ ...p, talkMode: true }));
    const f = render();
    (q(f, '[data-talk-key]') as HTMLButtonElement).click();
    f.detectChanges();
    q(f, '[data-talk-key]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV', bubbles: true, cancelable: true }));
    expect(voice.updatePrefs).toHaveBeenCalledWith({ talkKey: 'KeyV' });
  });
});
