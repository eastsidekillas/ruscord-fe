import { Mood } from '@shared/api/models';
import { expiresAt, expiryLabel, liveMood, moodTitle, profileColorCss, sameMood } from './mood';

const mood = (expires_at: string | null, text = ''): Mood => ({ state: 'thinking', text, expires_at });

describe('liveMood', () => {
  const now = new Date('2026-11-10T12:00:00Z');

  it('is null without a mood', () => {
    expect(liveMood(null, now)).toBeNull();
    expect(liveMood(undefined, now)).toBeNull();
  });

  it('keeps a mood without an expiry and one that expires later', () => {
    expect(liveMood(mood(null), now)).toEqual(mood(null));
    expect(liveMood(mood('2026-11-10T12:00:01Z'), now)).not.toBeNull();
  });

  it('hides a mood at the moment it expires and after', () => {
    expect(liveMood(mood('2026-11-10T12:00:00Z'), now)).toBeNull();
    expect(liveMood(mood('2026-11-10T11:59:59Z'), now)).toBeNull();
  });
});

describe('expiresAt', () => {
  // Local time: the end of the day is the user's, not UTC's.
  const now = new Date(2026, 10, 10, 15, 30, 0, 0);

  it('adds the hours of the choice', () => {
    expect(expiresAt('hour', now)).toEqual(new Date(2026, 10, 10, 16, 30));
    expect(expiresAt('four', now)).toEqual(new Date(2026, 10, 10, 19, 30));
    expect(expiresAt('week', now)!.getTime() - now.getTime()).toBe(7 * 24 * 3600_000);
    expect(expiresAt('never', now)).toBeNull();
  });

  it('ends the day at 23:59:59.999 local time', () => {
    expect(expiresAt('today', now)).toEqual(new Date(2026, 10, 10, 23, 59, 59, 999));
    expect(expiresAt('today', new Date(2026, 10, 10, 23, 58, 59, 999))).toEqual(new Date(2026, 10, 10, 23, 59, 59, 999));
  });

  it('means the next day in the last minute of a day', () => {
    expect(expiresAt('today', new Date(2026, 10, 10, 23, 59, 30))).toEqual(new Date(2026, 10, 11, 23, 59, 59, 999));
    // The end of a month rolls over too.
    expect(expiresAt('today', new Date(2026, 10, 30, 23, 59, 30))).toEqual(new Date(2026, 11, 1, 23, 59, 59, 999));
  });
});

describe('expiryLabel and moodTitle', () => {
  const now = new Date(2026, 10, 10, 15, 30);

  it('shows the time today and the date on other days', () => {
    expect(expiryLabel(new Date(2026, 10, 10, 18, 5), now)).toBe('до 18:05');
    expect(expiryLabel(new Date(2026, 10, 12, 18, 5), now)).toMatch(/^до 12 ноября.*18:05$/);
  });

  it('joins the face, the text and the expiry', () => {
    expect(moodTitle(mood(null), now)).toBe('Думаю');
    expect(moodTitle(mood(null, 'над планом'), now)).toBe('Думаю: над планом');
    expect(moodTitle(mood(new Date(2026, 10, 10, 18, 5).toISOString(), 'над планом'), now)).toBe('Думаю: над планом · до 18:05');
  });
});

describe('sameMood', () => {
  it('compares the state, the text and the moment of expiry', () => {
    expect(sameMood(null, undefined)).toBeTrue();
    expect(sameMood(mood(null), null)).toBeFalse();
    expect(sameMood(mood(null, 'a'), mood(null, 'a'))).toBeTrue();
    expect(sameMood(mood(null, 'a'), mood(null, 'b'))).toBeFalse();
    expect(sameMood(mood(null), { ...mood(null), state: 'happy' })).toBeFalse();
    // The same moment written in two ways.
    expect(sameMood(mood('2026-11-10T12:00:00Z'), mood('2026-11-10T15:00:00+03:00'))).toBeTrue();
    expect(sameMood(mood('2026-11-10T12:00:00Z'), mood(null))).toBeFalse();
  });
});

describe('profileColorCss', () => {
  it('maps a token name to a theme variable, the default for anything else', () => {
    expect(profileColorCss('danger')).toBe('var(--color-ok-danger)');
    expect(profileColorCss('neutral')).toBe('var(--color-ok-avatar)');
    expect(profileColorCss(undefined)).toBe('var(--color-ok-accent)');
  });
});
