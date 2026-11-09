import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DisconnectReason, Track } from 'livekit-client';
import { ApiService, GatewayService } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import {
  VoiceService, cameraErrorText, disconnectText, liveKitUrl, micAllowed, micWanted, screenPreset, shareErrorText, sourceAllowed,
} from './voice.service';
import { DEFAULT_VOICE_PREFS } from './voice-prefs';

describe('voice helpers', () => {
  it('connects to LiveKit on this site unless the core names another address', () => {
    expect(liveKitUrl({ url: '' }, { protocol: 'http:', host: 'localhost:8081' })).toBe('ws://localhost:8081/livekit');
    expect(liveKitUrl({ url: '' }, { protocol: 'https:', host: 'ruscord.example' })).toBe('wss://ruscord.example/livekit');
    expect(liveKitUrl({ url: 'wss://media.example' }, { protocol: 'https:', host: 'x' })).toBe('wss://media.example');
  });

  it('says why the voice connection ended, and nothing when you left', () => {
    expect(disconnectText(DisconnectReason.CLIENT_INITIATED)).toBeNull();
    expect(disconnectText(DisconnectReason.PARTICIPANT_REMOVED)).toContain('отключены');
    expect(disconnectText(DisconnectReason.DUPLICATE_IDENTITY)).toContain('другой вкладке');
    expect(disconnectText(undefined)).toContain('потеряно');
  });

  it('knows whether LiveKit lets us publish the microphone', () => {
    const src = (...s: Track.Source[]) => s.map(Track.sourceToProto);
    expect(micAllowed({ canPublish: true, canPublishSources: src(Track.Source.Microphone, Track.Source.Camera) })).toBeTrue();
    // A moderator's mute: the microphone is gone, the screen stays.
    expect(micAllowed({ canPublish: true, canPublishSources: src(Track.Source.Camera, Track.Source.ScreenShare) })).toBeFalse();
    expect(micAllowed({ canPublish: true, canPublishSources: [] })).toBeTrue();
    expect(micAllowed({ canPublish: false, canPublishSources: [] })).toBeFalse();
    expect(micAllowed(undefined)).toBeFalse();
  });

  it('knows whether LiveKit lets us share the screen', () => {
    const src = (...s: Track.Source[]) => s.map(Track.sourceToProto);
    expect(sourceAllowed({ canPublish: true, canPublishSources: src(Track.Source.Microphone, Track.Source.ScreenShare) }, Track.Source.ScreenShare)).toBeTrue();
    // STREAM taken away: microphone and camera stay, the screen goes.
    expect(sourceAllowed({ canPublish: true, canPublishSources: src(Track.Source.Microphone, Track.Source.Camera) }, Track.Source.ScreenShare)).toBeFalse();
    expect(sourceAllowed({ canPublish: false, canPublishSources: [] }, Track.Source.ScreenShare)).toBeFalse();
  });

  it('shares the screen at 720p, at 1080p with STREAM_HQ', () => {
    expect(screenPreset(false).height).toBe(720);
    expect(screenPreset(true).height).toBe(1080);
  });

  it('stays quiet when the user cancels the screen picker, explains the rest', () => {
    expect(shareErrorText({ name: 'NotAllowedError', message: 'Permission denied' })).toBeNull();
    expect(shareErrorText({ name: 'AbortError' })).toBeNull();
    expect(shareErrorText({ name: 'NotAllowedError', message: 'Permission denied by system' })).toContain('Система');
    expect(shareErrorText({ name: 'DeviceUnsupportedError' })).toContain('не умеет');
    expect(shareErrorText(new Error('boom'))).toBe('Не удалось начать показ экрана');
  });

  it('names why the camera did not start', () => {
    expect(cameraErrorText({ name: 'NotAllowedError' })).toContain('разрешите');
    expect(cameraErrorText({ name: 'NotFoundError' })).toBe('Камера не найдена');
    expect(cameraErrorText({ name: 'NotReadableError' })).toContain('занята');
    expect(cameraErrorText(new Error('boom'))).toBe('Не удалось включить камеру');
  });

  it('allows the camera only when LiveKit lists it', () => {
    expect(sourceAllowed({ canPublish: true, canPublishSources: [1] }, Track.Source.Camera)).toBeTrue();
    expect(sourceAllowed({ canPublish: true, canPublishSources: [2] }, Track.Source.Camera)).toBeFalse();
  });
});

describe('micWanted', () => {
  const open = { canSpeak: true, selfMute: false, selfDeaf: false, talkRequired: false, talkHeld: false };

  it('wants the microphone open unless something forbids it', () => {
    expect(micWanted(open)).toBeTrue();
    expect(micWanted({ ...open, talkRequired: true })).toBeFalse();
    expect(micWanted({ ...open, talkRequired: true, talkHeld: true })).toBeTrue();
    expect(micWanted({ ...open, talkRequired: true, talkHeld: true, selfMute: true })).toBeFalse();
    expect(micWanted({ ...open, talkRequired: true, talkHeld: true, selfDeaf: true })).toBeFalse();
    expect(micWanted({ ...open, canSpeak: false })).toBeFalse();
  });
});

describe('VoiceService voice prefs', () => {
  interface Internals {
    audio: Map<string, HTMLMediaElement>;
    room: unknown;
  }
  let service: VoiceService;
  let internals: Internals;

  beforeEach(() => {
    localStorage.removeItem('ruscord.voice.prefs');
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: GatewayService, useValue: { dispatches: new Subject() } },
        { provide: AuthService, useValue: { signedIn: signal(true), user: signal(null) } },
      ],
    });
    service = TestBed.inject(VoiceService);
    internals = service as unknown as Internals;
  });

  afterEach(() => localStorage.removeItem('ruscord.voice.prefs'));

  it('sets the volume on playing elements and saves it', async () => {
    const el = document.createElement('audio');
    internals.audio.set('a', el);
    await service.updatePrefs({ volume: 0.4 });
    expect(el.volume).toBe(0.4);
    expect(JSON.parse(localStorage.getItem('ruscord.voice.prefs') ?? '{}').volume).toBe(0.4);
  });

  function withMicTrack() {
    const restartTrack = jasmine.createSpy('restartTrack').and.resolveTo();
    internals.room = {
      disconnect: () => Promise.resolve(),
      options: { audioCaptureDefaults: {} },
      localParticipant: { getTrackPublication: () => ({ audioTrack: { restartTrack } }) },
    };
    return restartTrack;
  }

  it('restarts the microphone track with the new flags when the mode changes', async () => {
    const restartTrack = withMicTrack();
    await service.updatePrefs({ mode: 'clean' });
    expect(restartTrack).toHaveBeenCalledOnceWith({
      deviceId: undefined, noiseSuppression: false, echoCancellation: false, autoGainControl: false,
    });
  });

  it('uses the new flags for a microphone enabled after the mode changed', async () => {
    const used: unknown[] = [];
    const room = {
      disconnect: () => Promise.resolve(),
      options: { audioCaptureDefaults: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, deviceId: undefined } },
      localParticipant: {
        getTrackPublication: () => undefined,
        setMicrophoneEnabled: (on: boolean) => {
          if (on) used.push({ ...room.options.audioCaptureDefaults });
          return Promise.resolve();
        },
      },
    };
    internals.room = room;
    await service.updatePrefs({ mode: 'clean' });
    await service.updatePrefs({ talkMode: true });
    await service.holdTalk(true);
    expect(used).toEqual([{ noiseSuppression: false, echoCancellation: false, autoGainControl: false, deviceId: undefined }]);
  });

  it('does not restart the microphone track when only the volume changes', async () => {
    const restartTrack = withMicTrack();
    await service.updatePrefs({ volume: 0.5 });
    expect(restartTrack).not.toHaveBeenCalled();
    expect(service.prefs().mode).toBe(DEFAULT_VOICE_PREFS.mode);
  });
});
