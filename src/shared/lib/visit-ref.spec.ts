import { REF_TTL_MS, isEntryPath, normalizeRef, rememberRef, storedRef } from './visit-ref';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe('visit ref', () => {
  it('normalizes tags like the core', () => {
    const cases: [string | null, string | null][] = [
      ['stream', 'stream'], [' Stream ', 'stream'], ['tg_post-2', 'tg_post-2'],
      ['', null], [null, null], ['стрим', null], ['a b', null], ['x'.repeat(33), null],
    ];
    for (const [input, want] of cases) expect(normalizeRef(input)).withContext(String(input)).toBe(want);
  });

  it('keeps the first tag for 30 days', () => {
    const s = memory();
    expect(rememberRef('?ref=stream', s, 1000)).toBe('stream');
    expect(rememberRef('?ref=friends', s, 2000)).toBe('stream');
    expect(rememberRef('', s, 3000)).toBe('stream');
    expect(storedRef(s, 1000 + REF_TTL_MS + 1)).toBeNull();
    expect(rememberRef('?ref=friends', s, 1000 + REF_TTL_MS + 1)).toBe('friends');
  });

  it('ignores what is not a tag and broken storage', () => {
    const s = memory();
    expect(rememberRef('?ref=<b>', s)).toBeNull();
    s.setItem('rc_ref', '{broken');
    expect(storedRef(s)).toBeNull();
    expect(rememberRef('?ref=stream', null)).toBe('stream');
  });

  it('counts only entry pages', () => {
    for (const [p, want] of [['/', true], ['/login', true], ['/invite/abc', true], ['/channels/me', false]] as const) {
      expect(isEntryPath(p)).withContext(p).toBe(want);
    }
  });
});
