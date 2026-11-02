import { DMCall } from '@shared/api';
import { ringsAt } from './call-stage';

describe('ringsAt', () => {
  const call: DMCall = {
    id: 'c', channel_id: 'd', started_by: 'ann', started_at: '', ringing: ['bob'], ring_until: '2026-11-02T12:00:30Z', members: ['ann'],
  };
  const before = Date.parse('2026-11-02T12:00:10Z');

  it('rings for those called until ring_until', () => {
    expect(ringsAt(call, 'bob', before)).toBeTrue();
    expect(ringsAt(call, 'bob', Date.parse('2026-11-02T12:00:31Z'))).toBeFalse();
  });

  it('does not ring for the caller, others or without a call', () => {
    expect(ringsAt(call, 'ann', before)).toBeFalse();
    expect(ringsAt(call, undefined, before)).toBeFalse();
    expect(ringsAt(undefined, 'bob', before)).toBeFalse();
  });
});
