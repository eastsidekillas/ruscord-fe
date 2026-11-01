import { HttpErrorResponse } from '@angular/common/http';
import { failReason } from './pending-item';

describe('pending message', () => {
  it('says there is no connection when the request never reached the server', () => {
    expect(failReason(new HttpErrorResponse({ status: 0 }))).toBe('нет связи');
  });

  it('uses the server text, lower-cased to follow the dash', () => {
    const err = new HttpErrorResponse({ status: 403, error: { code: 'missing_permissions', message: 'Нет прав' } });
    expect(failReason(err)).toBe('нет прав');
  });

  it('falls back for anything else', () => {
    expect(failReason(new Error('x'))).toBe('ошибка, попробуйте ещё раз');
  });
});
