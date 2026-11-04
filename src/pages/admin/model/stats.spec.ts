import { AdminStats } from '@shared/api';
import { barHeight, dayLabel, formatBytes, refViews, seriesViews } from './stats';

const report = (over: Partial<AdminStats> = {}): AdminStats => ({
  generated_at: '2026-11-05T10:00:00Z', zone: 'Europe/Moscow',
  days: ['2026-11-03', '2026-11-04', '2026-11-05'],
  now: {}, totals: {}, series: {}, refs: [], ...over,
});

describe('admin stats', () => {
  it('sums series and fills missing ones with zeros', () => {
    const v = seriesViews(report({ series: { visits: [3, 0, 7] } }));
    const visits = v.find(s => s.key === 'visits')!;
    expect([visits.total, visits.today, visits.max]).toEqual([10, 7, 7]);
    expect(v.find(s => s.key === 'messages')!.values).toEqual([0, 0, 0]);
  });

  it('keeps small bars visible and zero bars empty', () => {
    const cases: [number, number, number][] = [[0, 10, 0], [1, 1000, 2], [5, 10, 50], [10, 10, 100], [3, 0, 0]];
    for (const [v, max, want] of cases) expect(barHeight(v, max)).withContext(`${v}/${max}`).toBe(want);
  });

  it('orders link tags and computes conversion', () => {
    const v = refViews(report({ refs: [
      { ref: '', counts: { registrations: 2 } },
      { ref: 'stream', counts: { visits: 200, registrations: 31 } },
    ] }));
    expect(v.map(r => [r.label, r.conversion])).toEqual([['stream', 15.5], ['без метки', null]]);
  });

  it('formats days and bytes', () => {
    expect(dayLabel('2026-11-05')).toBe('5 нояб.');
    expect(formatBytes(512)).toBe('512 Б');
    expect(formatBytes(1536)).toBe('1,5 КБ');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 МБ');
  });
});
