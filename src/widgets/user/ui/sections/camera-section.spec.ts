import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@entities/session/api/auth.service';
import { VoiceService } from '@entities/voice';
import { CameraSectionComponent } from './camera-section';

const cam = (deviceId: string, label = deviceId) => ({ deviceId, label, kind: 'videoinput' }) as MediaDeviceInfo;

class FakeVoice {
  cameras = signal<MediaDeviceInfo[]>([cam('cam1', 'Cam One'), cam('cam2', 'Cam Two')]);
  camera = signal('cam1');
  cameraOn = signal(false);
  connected = signal(false);
  filming = signal(new Set<string>());
  sharers = signal(new Set<string>());
  refreshDevices = jasmine.createSpy('refreshDevices').and.resolveTo();
  showVideo = jasmine.createSpy('showVideo').and.returnValue(() => undefined);
  setDevice = jasmine.createSpy('setDevice').and.callFake(async (_k: string, id: string) => this.camera.set(id));
}

/** A stream whose single track is observable. */
function fakeStream() {
  const stop = jasmine.createSpy('stop');
  const stream = new MediaStream();
  spyOn(stream, 'getTracks').and.returnValue([{ stop } as unknown as MediaStreamTrack]);
  return { stream, stop };
}

describe('CameraSectionComponent', () => {
  let voice: FakeVoice;
  let gum: jasmine.Spy;

  function render() {
    TestBed.configureTestingModule({
      providers: [{ provide: VoiceService, useValue: voice }, { provide: AuthService, useValue: { user: signal({ id: 'me' }) } }],
    });
    const fixture = TestBed.createComponent(CameraSectionComponent);
    fixture.detectChanges();
    return fixture;
  }
  const q = (f: { nativeElement: HTMLElement }, sel: string) => f.nativeElement.querySelector(sel) as HTMLElement | null;
  const click = async (f: ReturnType<typeof render>, sel: string) => {
    q(f, sel)!.click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
  };

  beforeEach(() => {
    voice = new FakeVoice();
    gum = spyOn(navigator.mediaDevices, 'getUserMedia');
  });

  it('does not touch the camera on open', () => {
    render();
    expect(gum).not.toHaveBeenCalled();
  });

  it('shows a note instead of the select without cameras', () => {
    voice.cameras.set([]);
    const f = render();
    expect(q(f, '[data-camera]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Камера не найдена');
  });

  it('asks for the chosen camera on the button and stops the tracks on the second press', async () => {
    const { stream, stop } = fakeStream();
    gum.and.resolveTo(stream);
    const f = render();
    await click(f, '[data-camera-toggle]');
    expect(gum).toHaveBeenCalledOnceWith({ video: { deviceId: 'cam1' } });
    expect(stop).not.toHaveBeenCalled();
    await click(f, '[data-camera-toggle]');
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops the tracks when destroyed', async () => {
    const { stream, stop } = fakeStream();
    gum.and.resolveTo(stream);
    const f = render();
    await click(f, '[data-camera-toggle]');
    f.destroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops the tracks of a stream that arrives after the preview was turned off', async () => {
    const { stream, stop } = fakeStream();
    let resolve!: (s: MediaStream) => void;
    gum.and.returnValue(new Promise<MediaStream>(r => (resolve = r)));
    const f = render();
    q(f, '[data-camera-toggle]')!.click(); // asks
    f.detectChanges();
    q(f, '[data-camera-toggle]')!.click(); // gives up before the answer
    resolve(stream);
    await f.whenStable();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows the error text when access is denied', async () => {
    gum.and.rejectWith({ name: 'NotAllowedError' });
    const f = render();
    await click(f, '[data-camera-toggle]');
    expect(q(f, '[role=alert]')?.textContent).toContain('разрешите');
    expect(q(f, '[data-camera-toggle]')!.textContent).toContain('Включить');
  });

  it('restarts a running preview on another camera, the newest choice wins', async () => {
    const first = fakeStream();
    const second = fakeStream();
    const third = fakeStream();
    gum.and.returnValues(Promise.resolve(first.stream), Promise.resolve(second.stream), Promise.resolve(third.stream));
    const f = render();
    await click(f, '[data-camera-toggle]');
    voice.camera.set('cam2');
    f.detectChanges();
    expect(first.stop).toHaveBeenCalledTimes(1);
    voice.camera.set('cam1'); // changed again before the second answer lands
    f.detectChanges();
    await f.whenStable();
    expect(gum.calls.allArgs().map(a => a[0])).toEqual([
      { video: { deviceId: 'cam1' } }, { video: { deviceId: 'cam2' } }, { video: { deviceId: 'cam1' } },
    ]);
    expect(second.stop).toHaveBeenCalledTimes(1);
    expect(third.stop).not.toHaveBeenCalled();
  });

  it('does not restart the preview when the device list gains the saved id after access', async () => {
    const { stream } = fakeStream();
    voice.cameras.set([cam('', '')]); // before permission: devices without ids
    gum.and.resolveTo(stream);
    const f = render();
    await click(f, '[data-camera-toggle]');
    voice.cameras.set([cam('cam1', 'Cam One'), cam('cam2', 'Cam Two')]);
    f.detectChanges();
    await f.whenStable();
    expect(gum).toHaveBeenCalledOnceWith({ video: { deviceId: 'cam1' } });
  });

  it('asks for the default camera when the saved id is not in a list of real ids', async () => {
    voice.camera.set('gone');
    gum.and.resolveTo(fakeStream().stream);
    const f = render();
    await click(f, '[data-camera-toggle]');
    expect(gum).toHaveBeenCalledOnceWith({ video: true });
  });

  it('shows the running call track and makes no request of its own', () => {
    voice.cameraOn.set(true);
    const f = render();
    expect(f.nativeElement.querySelector('VideoView')).not.toBeNull();
    expect(q(f, '[data-camera-toggle]')).toBeNull();
    expect(gum).not.toHaveBeenCalled();
  });

  it('removes the devicechange listener on destroy', () => {
    const add = spyOn(navigator.mediaDevices, 'addEventListener').and.callThrough();
    const remove = spyOn(navigator.mediaDevices, 'removeEventListener').and.callThrough();
    const f = render();
    f.destroy();
    expect(remove).toHaveBeenCalledWith('devicechange', add.calls.mostRecent().args[1]);
  });
});
