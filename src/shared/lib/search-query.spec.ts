import { parseSearch, searchable } from './search-query';

describe('parseSearch', () => {
  it('splits text from filters in Russian and English', () => {
    expect(parseSearch('рыжая кошка от:bob в:#общий есть:картинка has:link упоминает:@ann')).toEqual({
      text: 'рыжая кошка', from: 'bob', in: 'общий', mentions: 'ann', has: ['image', 'link'], unknown: [],
    });
  });

  it('keeps unknown keys as text and reports unknown has values', () => {
    const p = parseSearch('время:10:30 есть:pdf');
    expect(p.text).toBe('время:10:30');
    expect(p.unknown).toEqual(['есть:pdf']);
  });

  it('needs text or a filter', () => {
    expect(searchable(parseSearch('  '))).toBeFalse();
    expect(searchable(parseSearch('в:общий'))).toBeFalse();
    expect(searchable(parseSearch('есть:файл'))).toBeTrue();
  });
});
