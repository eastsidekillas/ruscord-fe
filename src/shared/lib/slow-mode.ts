import { apiError } from '@shared/api';

/** Slow mode choices, as in Discord (ruscord-core ADR-0043): seconds, 0 is off. */
export const SLOW_MODES = [0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600];

/** "Выкл.", "30 с", "5 мин", "2 ч". */
export function slowModeLabel(secs: number): string {
  if (secs <= 0) return 'Выкл.';
  if (secs < 60) return `${secs} с`;
  if (secs < 3600) return `${Math.round(secs / 60)} мин`;
  return `${Math.round(secs / 3600)} ч`;
}

/** A countdown: "25 с", "4:05", "1:02:00". */
export function waitLabel(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  if (s < 60) return `${s} с`;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Why sending waits: slow mode of a channel, or an account too new for servers. */
export type WaitKind = 'slow' | 'new';

export interface Wait {
  kind: WaitKind;
  /** When sending may go again, ms since the epoch. */
  until: number;
}

/** The wait an error of sending asks for, or null for any other error. */
export function waitFromError(err: unknown, now = Date.now()): Wait | null {
  const e = apiError(err);
  if (!e?.retry_after || e.retry_after <= 0) return null;
  if (e.code === 'slow_mode') return { kind: 'slow', until: now + e.retry_after * 1000 };
  if (e.code === 'account_too_new') return { kind: 'new', until: now + e.retry_after * 1000 };
  return null;
}

/** What the composer says about waiting, or null when there is nothing to say. */
export function waitHint(wait: Wait | null, slowSecs: number, exempt: boolean, now = Date.now()): string | null {
  if (wait && wait.until > now) {
    const left = waitLabel((wait.until - now) / 1000);
    return wait.kind === 'new'
      ? `Новые аккаунты могут писать на серверах через ${left}`
      : `Медленный режим: следующее сообщение через ${left}`;
  }
  if (slowSecs > 0 && !exempt) return `Медленный режим: одно сообщение в ${slowModeLabel(slowSecs)}`;
  return null;
}
