import { expiresText } from './invite-page';

describe('invite page', () => {
  it('says until when an invite works, in local time', () => {
    expect(expiresText(new Date(2026, 10, 2, 21, 51))).toBe('2 ноября, 21:51');
  });
});
