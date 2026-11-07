import { HttpErrorResponse } from '@angular/common/http';
import { slowModeLabel, waitFromError, waitHint, waitLabel } from './slow-mode';

const error = (status: number, body: object) => new HttpErrorResponse({ status, error: body });

describe('slow mode', () => {
  it('labels choices and countdowns', () => {
    const labels: [number, string][] = [[0, 'Выкл.'], [5, '5 с'], [60, '1 мин'], [900, '15 мин'], [7200, '2 ч'], [21600, '6 ч']];
    for (const [s, want] of labels) expect(slowModeLabel(s)).withContext(String(s)).toBe(want);
    const waits: [number, string][] = [[-3, '0 с'], [0.2, '1 с'], [25, '25 с'], [59.5, '1:00'], [245, '4:05'], [3720, '1:02:00']];
    for (const [s, want] of waits) expect(waitLabel(s)).withContext(String(s)).toBe(want);
  });

  it('reads the wait from the errors that ask for one', () => {
    const now = 1_000_000;
    expect(waitFromError(error(429, { code: 'slow_mode', message: '', retry_after: 30 }), now)).toEqual({ kind: 'slow', until: now + 30_000 });
    expect(waitFromError(error(403, { code: 'account_too_new', message: '', retry_after: 240 }), now)).toEqual({ kind: 'new', until: now + 240_000 });
    expect(waitFromError(error(429, { code: 'rate_limited', message: '', retry_after: 3 }), now)).toBeNull();
    expect(waitFromError(error(403, { code: 'forbidden', message: '' }), now)).toBeNull();
    expect(waitFromError(new Error('нет связи'), now)).toBeNull();
  });

  it('says what the composer shows', () => {
    const now = 1_000_000;
    const cases: [string, Parameters<typeof waitHint>, string | null][] = [
      ['counting down slow mode', [{ kind: 'slow', until: now + 25_000 }, 30, false, now], 'Медленный режим: следующее сообщение через 25 с'],
      ['counting down a new account', [{ kind: 'new', until: now + 245_000 }, 0, false, now], 'Новые аккаунты могут писать на серверах через 4:05'],
      ['a slow channel, nothing to wait', [null, 30, false, now], 'Медленный режим: одно сообщение в 30 с'],
      ['the wait is over', [{ kind: 'slow', until: now - 1 }, 30, false, now], 'Медленный режим: одно сообщение в 30 с'],
      ['a moderator is not slowed', [null, 30, true, now], null],
      ['an ordinary channel', [null, 0, false, now], null],
    ];
    for (const [name, args, want] of cases) expect(waitHint(...args)).withContext(name).toBe(want);
  });
});
