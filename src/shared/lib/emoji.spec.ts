import { EmojiCatalog, searchEmoji, withTone } from './emoji';

const catalog: EmojiCatalog = {
  version: 'test',
  groups: [{ id: 0, name: 'смайлики' }],
  emoji: [
    ['😀', 'широко улыбается', 'grinning face', 0, 'лицо радость улыбка smile'],
    ['👍', 'большой палец вверх', 'thumbs up', 1, 'нравится палец +1 like', ['👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿']],
    ['🙂', 'слегка улыбается', 'slightly smiling face', 0, 'улыбка smile'],
  ],
};

describe('emoji catalog', () => {
  it('finds by Russian or English names and keywords, names that start with the query first', () => {
    expect(searchEmoji(catalog, 'улыб').map(r => r[0])).toEqual(['😀', '🙂']);
    expect(searchEmoji(catalog, 'Слегка').map(r => r[0])).toEqual(['🙂']);
    expect(searchEmoji(catalog, 'thumbs').map(r => r[0])).toEqual(['👍']);
    expect(searchEmoji(catalog, 'нравится').map(r => r[0])).toEqual(['👍']);
    expect(searchEmoji(catalog, 'smile face').map(r => r[0])).toEqual(['😀', '🙂']);
    expect(searchEmoji(catalog, 'slightly smil').map(r => r[0])).toEqual(['🙂']);
    expect(searchEmoji(catalog, '  ')).toEqual([]);
  });

  it('puts on a skin tone only where there are tones', () => {
    expect(withTone(catalog.emoji[1], 3)).toBe('👍🏽');
    expect(withTone(catalog.emoji[0], 3)).toBe('😀');
    expect(withTone(catalog.emoji[1], 0)).toBe('👍');
  });
});
