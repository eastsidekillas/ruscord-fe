export type ProcessingMode = 'suppress' | 'clean' | 'custom';

export interface AudioFlags {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export interface VoicePrefs {
  mode: ProcessingMode;
  custom: AudioFlags;
  /** Playback volume of other participants, 0..1. */
  volume: number;
  /** Push-to-talk instead of an open microphone. */
  talkMode: boolean;
  /** KeyboardEvent.code of the push-to-talk key. */
  talkKey: string;
}

const PREFS_KEY = 'ruscord.voice.prefs';
const MODES: readonly ProcessingMode[] = ['suppress', 'clean', 'custom'];
const FLAG_NAMES: readonly (keyof AudioFlags)[] = ['noiseSuppression', 'echoCancellation', 'autoGainControl'];
const FORBIDDEN_KEYS = new Set(['Escape', 'Tab', 'Enter', 'Space', '']);

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  mode: 'suppress',
  custom: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
  volume: 1,
  talkMode: false,
  talkKey: 'Backquote',
};

/** The browser audio processing flags a mode stands for. */
export function flagsFor(p: Pick<VoicePrefs, 'mode' | 'custom'>): AudioFlags {
  if (p.mode === 'custom') return p.custom;
  const on = p.mode === 'suppress';
  return { noiseSuppression: on, echoCancellation: on, autoGainControl: on };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitize(raw: unknown): VoicePrefs {
  const d = DEFAULT_VOICE_PREFS;
  if (!isObject(raw)) return { ...d, custom: { ...d.custom } };
  const custom = { ...d.custom };
  if (isObject(raw['custom'])) {
    for (const name of FLAG_NAMES) {
      const v = raw['custom'][name];
      if (typeof v === 'boolean') custom[name] = v;
    }
  }
  const volume = typeof raw['volume'] === 'number' && Number.isFinite(raw['volume'])
    ? Math.min(1, Math.max(0, raw['volume']))
    : d.volume;
  return {
    mode: MODES.includes(raw['mode'] as ProcessingMode) ? (raw['mode'] as ProcessingMode) : d.mode,
    custom,
    volume,
    talkMode: typeof raw['talkMode'] === 'boolean' ? raw['talkMode'] : d.talkMode,
    talkKey: typeof raw['talkKey'] === 'string' && talkKeyAllowed(raw['talkKey']) ? raw['talkKey'] : d.talkKey,
  };
}

export function loadVoicePrefs(): VoicePrefs {
  try {
    const text = localStorage.getItem(PREFS_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return sanitize(null);
  }
}

export function saveVoicePrefs(p: VoicePrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // Private mode or blocked storage: the choice lasts until reload.
  }
}

/** Keys that must stay free: leaving, focus moves, submit and the space bar. */
export function talkKeyAllowed(code: string): boolean {
  return !FORBIDDEN_KEYS.has(code);
}

/** A short label for a KeyboardEvent.code. */
export function talkKeyLabel(code: string): string {
  if (code === 'Backquote') return 'Ё';
  const key = /^Key([A-Z])$/.exec(code) ?? /^Digit(\d)$/.exec(code);
  return key ? key[1] : code;
}
