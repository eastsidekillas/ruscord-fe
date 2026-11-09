import { TestBed } from '@angular/core/testing';
import { MicCheck, levelOf, micErrorText } from './mic-check';

const FLAGS = { noiseSuppression: true, echoCancellation: true, autoGainControl: true };

describe('levelOf', () => {
  it('is 0 for silence', () => {
    expect(levelOf(new Float32Array(64))).toBe(0);
  });
  it('is 1 for full scale', () => {
    expect(levelOf(new Float32Array(64).fill(1))).toBe(1);
  });
  it('scales RMS by four', () => {
    expect(levelOf(new Float32Array(64).fill(0.1))).toBeCloseTo(0.4, 5);
  });
});

describe('micErrorText', () => {
  const named = (name: string) => Object.assign(new Error(name), { name });
  it('asks to allow access', () => {
    expect(micErrorText(named('NotAllowedError'))).toContain('разрешите');
  });
  it('says the device is not found', () => {
    expect(micErrorText(named('NotFoundError'))).toContain('не найден');
  });
  it('says the device is busy', () => {
    expect(micErrorText(named('NotReadableError'))).toContain('занят');
  });
  it('has a fallback', () => {
    expect(micErrorText('x').length).toBeGreaterThan(0);
  });
});

describe('MicCheck', () => {
  let ctx: AudioContext;
  let gum: jasmine.Spy;
  let made: MediaStream[];
  let check: MicCheck;

  function makeStream(): MediaStream {
    const s = ctx.createMediaStreamDestination().stream;
    s.getTracks().forEach(t => spyOn(t, 'stop').and.callThrough());
    made.push(s);
    return s;
  }

  beforeEach(() => {
    ctx = new AudioContext();
    made = [];
    gum = spyOn(navigator.mediaDevices, 'getUserMedia').and.callFake(async () => makeStream());
    check = TestBed.inject(MicCheck);
  });

  afterEach(() => {
    check.stop();
    void ctx.close();
  });

  it('requests the chosen device with the flags and starts running', async () => {
    await check.start({ input: 'a', output: '', flags: FLAGS });
    expect(gum).toHaveBeenCalledWith({ audio: { deviceId: 'a', ...FLAGS } });
    expect(check.running()).toBeTrue();
    expect(check.error()).toBeNull();
  });

  it('uses no deviceId for an empty input', async () => {
    await check.start({ input: '', output: '', flags: FLAGS });
    expect(gum.calls.mostRecent().args[0].audio.deviceId).toBeUndefined();
  });

  it('stop stops every track and resets state', async () => {
    await check.start({ input: 'a', output: '', flags: FLAGS });
    check.stop();
    for (const t of made[0].getTracks()) expect(t.stop).toHaveBeenCalled();
    expect(check.running()).toBeFalse();
    expect(check.level()).toBe(0);
  });

  it('drops a stale start that finishes after stop and a newer start', async () => {
    let release!: (s: MediaStream) => void;
    gum.and.callFake(() => (gum.calls.count() === 1
      ? new Promise<MediaStream>(r => (release = r))
      : Promise.resolve(makeStream())));
    const first = check.start({ input: 'a', output: '', flags: FLAGS });
    check.stop();
    const second = check.start({ input: 'b', output: '', flags: FLAGS });
    await second;
    const late = makeStream();
    release(late);
    await first;
    for (const t of late.getTracks()) expect(t.stop).toHaveBeenCalled();
    expect(check.running()).toBeTrue();
  });

  it('reports a denied access', async () => {
    gum.and.rejectWith(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    await check.start({ input: 'a', output: '', flags: FLAGS });
    expect(check.error()).toContain('разрешите');
    expect(check.running()).toBeFalse();
  });

  it('start while running stops the previous tracks', async () => {
    await check.start({ input: 'a', output: '', flags: FLAGS });
    await check.start({ input: 'b', output: '', flags: FLAGS });
    for (const t of made[0].getTracks()) expect(t.stop).toHaveBeenCalled();
    expect(check.running()).toBeTrue();
  });

  describe('output routing', () => {
    const proto = HTMLMediaElement.prototype as unknown as { setSinkId?: unknown };
    const original = Object.getOwnPropertyDescriptor(proto, 'setSinkId');

    function stub(impl: unknown): jasmine.Spy | undefined {
      Object.defineProperty(proto, 'setSinkId', { value: impl, configurable: true, writable: true });
      return impl as jasmine.Spy | undefined;
    }

    afterEach(() => {
      if (original) Object.defineProperty(proto, 'setSinkId', original);
      else delete proto.setSinkId;
    });

    it('routes the monitor to the chosen output', async () => {
      const sink = stub(jasmine.createSpy('setSinkId').and.resolveTo())!;
      await check.start({ input: 'a', output: 'x', flags: FLAGS });
      expect(sink).toHaveBeenCalledWith('x');
      expect(check.running()).toBeTrue();
    });

    it('routes the tone to the chosen output', async () => {
      const sink = stub(jasmine.createSpy('setSinkId').and.resolveTo())!;
      await check.playTone('x');
      expect(sink).toHaveBeenCalledWith('x');
    });

    it('does not call setSinkId for the default output', async () => {
      const sink = stub(jasmine.createSpy('setSinkId').and.resolveTo())!;
      await check.start({ input: 'a', output: '', flags: FLAGS });
      expect(sink).not.toHaveBeenCalled();
    });

    it('works when setSinkId is missing', async () => {
      stub(undefined);
      await check.start({ input: 'a', output: 'x', flags: FLAGS });
      expect(check.running()).toBeTrue();
      await expectAsync(check.playTone('x')).toBeResolved();
    });

    it('keeps running when setSinkId rejects', async () => {
      stub(jasmine.createSpy('setSinkId').and.rejectWith(new Error('denied')));
      await check.start({ input: 'a', output: 'x', flags: FLAGS });
      expect(check.running()).toBeTrue();
      expect(check.error()).toBeNull();
      await expectAsync(check.playTone('x')).toBeResolved();
    });
  });

  it('plays a tone and cleans up', async () => {
    await expectAsync(check.playTone('')).toBeResolved();
  });
});
