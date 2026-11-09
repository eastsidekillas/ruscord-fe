import { DEFAULT_VOICE_PREFS, flagsFor, loadVoicePrefs, saveVoicePrefs, talkKeyAllowed, talkKeyLabel } from './voice-prefs';

const KEY = 'ruscord.voice.prefs';
const NONE = { noiseSuppression: false, echoCancellation: false, autoGainControl: false };
const ALL = { noiseSuppression: true, echoCancellation: true, autoGainControl: true };

describe('voice prefs', () => {
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  describe('flagsFor', () => {
    it('suppress turns everything on', () => {
      expect(flagsFor({ mode: 'suppress', custom: NONE })).toEqual(ALL);
    });
    it('clean turns everything off', () => {
      expect(flagsFor({ mode: 'clean', custom: ALL })).toEqual(NONE);
    });
    it('custom returns the custom flags', () => {
      const custom = { noiseSuppression: true, echoCancellation: false, autoGainControl: true };
      expect(flagsFor({ mode: 'custom', custom })).toEqual(custom);
    });
  });

  describe('loadVoicePrefs', () => {
    it('gives defaults without a record', () => {
      expect(loadVoicePrefs()).toEqual(DEFAULT_VOICE_PREFS);
    });
    it('gives defaults for broken JSON', () => {
      localStorage.setItem(KEY, '{broken');
      expect(loadVoicePrefs()).toEqual(DEFAULT_VOICE_PREFS);
    });
    it('replaces invalid fields with defaults', () => {
      localStorage.setItem(KEY, '{"mode":"loud","volume":7,"talkKey":5}');
      const p = loadVoicePrefs();
      expect(p.mode).toBe('suppress');
      expect(p.volume).toBe(1);
      expect(p.talkKey).toBe('Backquote');
    });
    it('clamps negative volume to 0', () => {
      localStorage.setItem(KEY, '{"volume":-1}');
      expect(loadVoicePrefs().volume).toBe(0);
    });
    it('defaults a missing custom flag to true', () => {
      localStorage.setItem(KEY, '{"mode":"custom","custom":{"noiseSuppression":false}}');
      const p = loadVoicePrefs();
      expect(p.custom.echoCancellation).toBe(true);
      expect(p.custom.noiseSuppression).toBe(false);
    });
    it('round-trips saved prefs', () => {
      const p = { ...DEFAULT_VOICE_PREFS, mode: 'clean' as const, volume: 0.5, talkMode: true, talkKey: 'KeyV' };
      saveVoicePrefs(p);
      expect(loadVoicePrefs()).toEqual(p);
    });
    it('survives throwing storage', () => {
      spyOn(localStorage, 'getItem').and.throwError('blocked');
      spyOn(localStorage, 'setItem').and.throwError('blocked');
      expect(loadVoicePrefs()).toEqual(DEFAULT_VOICE_PREFS);
      expect(() => saveVoicePrefs(DEFAULT_VOICE_PREFS)).not.toThrow();
    });
  });

  describe('talkKeyAllowed', () => {
    it('rejects reserved keys', () => {
      for (const c of ['Escape', 'Tab', 'Enter', 'Space', '']) expect(talkKeyAllowed(c)).toBe(false);
    });
    it('rejects modifier keys', () => {
      for (const side of ['Left', 'Right']) {
        for (const m of ['Control', 'Alt', 'Meta', 'Shift']) expect(talkKeyAllowed(m + side)).toBe(false);
      }
    });
    it('falls back to the default for a stored forbidden key', () => {
      localStorage.setItem(KEY, '{"talkKey":"ControlLeft"}');
      expect(loadVoicePrefs().talkKey).toBe(DEFAULT_VOICE_PREFS.talkKey);
    });
    it('accepts a letter key', () => {
      expect(talkKeyAllowed('KeyV')).toBe(true);
    });
  });

  describe('talkKeyLabel', () => {
    it('labels keys', () => {
      expect(talkKeyLabel('Backquote')).toBe('Ё');
      expect(talkKeyLabel('KeyV')).toBe('V');
      expect(talkKeyLabel('Digit3')).toBe('3');
      expect(talkKeyLabel('F2')).toBe('F2');
      expect(talkKeyLabel('ArrowUp')).toBe('ArrowUp');
    });
  });
});
