import { MentionNames, MentionOption, insertMention, mentionQuery, toDisplay, toWire } from './mention-text';

const A = '0190a3b4-1c2d-7e8f-9a0b-00000000000a';
const B = '0190a3b4-1c2d-7e8f-9a0b-00000000000b';
const R = '0190a3b4-1c2d-7e8f-9a0b-0000000000ff';

const names: MentionNames = {
  user: id => (id === A ? { name: 'Аня' } : id === B ? { name: 'Аня' } : null),
  role: id => (id === R ? { name: 'игроки' } : null),
  channel: () => null,
};

describe('mentionQuery', () => {
  const cases: [string, string, ReturnType<typeof mentionQuery>][] = [
    ['at the start', '@ан', { trigger: '@', query: 'ан', start: 0 }],
    ['after a space', 'привет #об', { trigger: '#', query: 'об', start: 7 }],
    ['just the trigger', 'эй @', { trigger: '@', query: '', start: 3 }],
    ['inside a word is not a mention', 'mail@host', null],
    ['after a finished word', '@аня привет', null],
  ];
  for (const [name, text, want] of cases) {
    it(name, () => expect(mentionQuery(text, text.length)).toEqual(want));
  }
});

describe('insert, send and edit', () => {
  const anya: MentionOption = { kind: 'user', id: A, label: 'Аня', hint: 'anya', display: '@Аня', token: `<@${A}>` };

  it('inserts the name and sends the token', () => {
    const tokens = new Map<string, string>();
    const q = mentionQuery('привет @ан', 10)!;
    const r = insertMention('привет @ан', q, 10, anya, tokens);
    expect(r).toEqual({ text: 'привет @Аня ', caret: 12 });
    expect(toWire(r.text + 'и @Аняныч', tokens)).toBe(`привет <@${A}> и @Аняныч`);
  });

  it('longer names win over their prefixes', () => {
    const tokens = new Map([['@Аня', `<@${A}>`], ['@Аня Б', `<@${B}>`]]);
    expect(toWire('@Аня Б и @Аня', tokens)).toBe(`<@${B}> и <@${A}>`);
  });

  it('shows tokens as names and keeps a token whose name is taken', () => {
    const { text, tokens } = toDisplay(`<@${A}> <@${B}> <@&${R}> <@${'0190a3b4-1c2d-7e8f-9a0b-000000000999'}>`, names);
    expect(text).toBe(`@Аня <@${B}> @игроки <@0190a3b4-1c2d-7e8f-9a0b-000000000999>`);
    expect(toWire(text, tokens)).toBe(`<@${A}> <@${B}> <@&${R}> <@0190a3b4-1c2d-7e8f-9a0b-000000000999>`);
  });
});
