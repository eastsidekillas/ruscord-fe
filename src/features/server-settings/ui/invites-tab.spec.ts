import { expiresText, usesText } from './invites-tab';
import { ageText } from '@features/invite-server/ui/invite-creator';

describe('invite texts', () => {
  const now = new Date(2026, 10, 2, 14, 0);
  it('never expires', () => expect(expiresText(null, now)).toBe('бессрочно'));
  it('today', () => expect(expiresText(new Date(2026, 10, 2, 22, 30).toISOString(), now)).toBe('сегодня, 22:30'));
  it('tomorrow', () => expect(expiresText(new Date(2026, 10, 3, 9, 5).toISOString(), now)).toBe('завтра, 09:05'));
  it('later', () => expect(expiresText(new Date(2026, 10, 9, 10, 0).toISOString(), now)).toBe('9 нояб, 10:00'));
  it('uses without a limit', () => expect(usesText({ uses: 0, max_uses: 0 })).toBe('0'));
  it('uses with a limit', () => expect(usesText({ uses: 3, max_uses: 5 })).toBe('3 из 5'));
  it('a day reads as сутки', () => expect(ageText(86400)).toBe('Ссылка действует сутки'));
});
