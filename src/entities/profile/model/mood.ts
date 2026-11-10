import { Mood, MoodState, ProfileColor } from '@shared/api/models';
import { sameDay } from '@shared/lib/dates';

/** Limit of the mood text in ruscord-core. */
export const MOOD_TEXT_MAX = 80;

/** The faces to pick from, in the order of the grid; labels speak for the user. */
export const MOOD_STATES: readonly { state: MoodState; label: string }[] = [
  { state: 'happy', label: 'Радуюсь' },
  { state: 'laughing', label: 'Смеюсь' },
  { state: 'thinking', label: 'Думаю' },
  { state: 'sleeping', label: 'Сплю' },
  { state: 'listening', label: 'Слушаю' },
  { state: 'surprised', label: 'Удивляюсь' },
  { state: 'confused', label: 'В растерянности' },
  { state: 'angry', label: 'Злюсь' },
];

/** Profile colours are theme token names; `css` is how this theme paints them. */
export const PROFILE_COLORS: readonly { color: ProfileColor; label: string; css: string }[] = [
  { color: 'accent', label: 'Голубой', css: 'var(--color-ok-accent)' },
  { color: 'success', label: 'Зелёный', css: 'var(--color-ok-success)' },
  { color: 'warning', label: 'Жёлтый', css: 'var(--color-ok-warning)' },
  { color: 'danger', label: 'Красный', css: 'var(--color-ok-danger)' },
  { color: 'neutral', label: 'Серый', css: 'var(--color-ok-avatar)' },
];

export const DEFAULT_PROFILE_COLOR: ProfileColor = 'accent';

/** The CSS colour of a profile colour; unknown or missing is the default. */
export function profileColorCss(color: ProfileColor | null | undefined): string {
  return (PROFILE_COLORS.find(c => c.color === color) ?? PROFILE_COLORS[0]).css;
}

export function moodLabel(state: MoodState): string {
  return MOOD_STATES.find(m => m.state === state)?.label ?? '';
}

/**
 * The mood others should see at `now`: null without one or once it has
 * expired. The server stops sending an expired mood, but a client that got
 * it earlier hides it itself (ruscord-core ADR-0046).
 */
export function liveMood(mood: Mood | null | undefined, now: Date): Mood | null {
  if (!mood) return null;
  if (mood.expires_at && new Date(mood.expires_at).getTime() <= now.getTime()) return null;
  return mood;
}

export type ExpiryChoice = 'hour' | 'four' | 'today' | 'week' | 'never';

export const EXPIRY_CHOICES: readonly { key: ExpiryChoice; label: string }[] = [
  { key: 'hour', label: '1 час' },
  { key: 'four', label: '4 часа' },
  { key: 'today', label: 'До конца дня' },
  { key: 'week', label: '7 дней' },
  { key: 'never', label: 'Не убирать' },
];

const HOUR = 3600_000;

/**
 * When a mood set at `now` goes away, in the user's own time zone; null
 * means it stays. «До конца дня» in the last minute of a day means the end
 * of the next one: a mood for a few seconds is not what was asked for.
 */
export function expiresAt(choice: ExpiryChoice, now: Date): Date | null {
  switch (choice) {
    case 'hour': return new Date(now.getTime() + HOUR);
    case 'four': return new Date(now.getTime() + 4 * HOUR);
    case 'week': return new Date(now.getTime() + 7 * 24 * HOUR);
    case 'today': {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      if (end.getTime() - now.getTime() < 60_000) end.setDate(end.getDate() + 1);
      return end;
    }
    case 'never': return null;
  }
}

const TIME = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const DAY_TIME = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** "до 18:30" today, "до 12 ноября в 18:30" on other days. */
export function expiryLabel(expires: Date, now: Date): string {
  return 'до ' + (sameDay(expires, now) ? TIME : DAY_TIME).format(expires);
}

/** One line for a tooltip: "Думаю: над планом · до 18:30". */
export function moodTitle(mood: Mood, now: Date): string {
  const what = moodLabel(mood.state) + (mood.text ? ': ' + mood.text : '');
  return mood.expires_at ? `${what} · ${expiryLabel(new Date(mood.expires_at), now)}` : what;
}

/** Whether two moods are the same for the server: state, text and the moment of expiry. */
export function sameMood(a: Mood | null | undefined, b: Mood | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  const at = (m: Mood) => (m.expires_at ? new Date(m.expires_at).getTime() : null);
  return a.state === b.state && a.text === b.text && at(a) === at(b);
}
