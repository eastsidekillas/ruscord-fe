import { BlockNode, InlineNode, parseInline, parseMarkup, plainText } from './markup';

const U = '0190a3b4-1c2d-7e8f-9a0b-1c2d3e4f5a6b';
const R = '0190a3b4-1c2d-7e8f-9a0b-000000000001';
const text = (t: string): InlineNode => ({ t: 'text', text: t });
const line = (...children: InlineNode[]): BlockNode => ({ t: 'line', children });

describe('parseInline', () => {
  const cases: [string, string, InlineNode[]][] = [
    ['plain text', 'привет', [text('привет')]],
    ['bold', '**жирный**', [{ t: 'bold', children: [text('жирный')] }]],
    ['italic with *', 'a *курсив* b', [text('a '), { t: 'italic', children: [text('курсив')] }, text(' b')]],
    ['italic with _', '_курсив_', [{ t: 'italic', children: [text('курсив')] }]],
    ['underline', '__подчёркнутый__', [{ t: 'underline', children: [text('подчёркнутый')] }]],
    ['strike', '~~нет~~', [{ t: 'strike', children: [text('нет')] }]],
    ['spoiler', '||тайна||', [{ t: 'spoiler', children: [text('тайна')] }]],
    ['bold and italic', '***оба***', [{ t: 'bold', children: [{ t: 'italic', children: [text('оба')] }] }]],
    ['nested', '**a _b_**', [{ t: 'bold', children: [text('a '), { t: 'italic', children: [text('b')] }] }]],
    ['unclosed stays text', '**нет', [text('**нет')]],
    ['empty pair stays text', '****', [text('****')]],
    ['arithmetic is not italic', '2 * 3 * 4', [text('2 * 3 * 4')]],
    ['snake_case is not italic', 'snake_case_name', [text('snake_case_name')]],
    ['escaped', '\\*не курсив\\*', [text('*не курсив*')]],
    ['inline code', 'a `**код**` b', [text('a '), { t: 'code', text: '**код**' }, text(' b')]],
    ['double backticks', '``a ` b``', [{ t: 'code', text: 'a ` b' }]],
    ['mention in code is text', `\`<@${U}>\``, [{ t: 'code', text: `<@${U}>` }]],
    ['user', `эй <@${U}>!`, [text('эй '), { t: 'user', id: U }, text('!')]],
    ['role', `<@&${R}>`, [{ t: 'role', id: R }]],
    ['channel', `<#${U}>`, [{ t: 'channel', id: U }]],
    ['upper case id is text', `<@${U.toUpperCase()}>`, [text(`<@${U.toUpperCase()}>`)]],
    ['everyone', '@everyone и @here', [{ t: 'everyone', text: '@everyone' }, text(' и '), { t: 'everyone', text: '@here' }]],
    ['everyone as a word part', '@everyoneX', [text('@everyoneX')]],
    ['link', 'см. https://example.com/a?b=1.', [text('см. '), { t: 'link', url: 'https://example.com/a?b=1', label: null }, text('.')]],
    ['link in angle brackets', '<https://example.com>', [{ t: 'link', url: 'https://example.com', label: null }]],
    ['masked link', '[сайт](https://example.com)', [{ t: 'link', url: 'https://example.com', label: [text('сайт')] }]],
    ['no link inside a masked label', '[https://a.com](https://b.com)', [{ t: 'link', url: 'https://b.com', label: [text('https://a.com')] }]],
    ['javascript: is text', '[x](javascript:alert(1))', [text('[x](javascript:alert(1))')]],
    ['data: is text', 'data:text/html,<b>x</b>', [text('data:text/html,<b>x</b>')]],
    ['html is text', '<img src=x onerror=alert(1)>', [text('<img src=x onerror=alert(1)>')]],
  ];
  for (const [name, input, want] of cases) {
    it(name, () => expect(parseInline(input)).toEqual(want));
  }

  it('stops nesting deep emphasis instead of recursing without end', () => {
    const deep = '**'.repeat(40) + 'x' + '**'.repeat(40);
    expect(() => parseInline(deep)).not.toThrow();
  });
});

describe('parseMarkup', () => {
  it('keeps lines', () => {
    expect(parseMarkup('раз\n\nдва')).toEqual([line(text('раз')), line(), line(text('два'))]);
  });

  it('code blocks span lines, take a language and hide markup and mentions', () => {
    expect(parseMarkup(`до\n\`\`\`ts\nconst a = 1;\n**<@${U}>**\n\`\`\`\nпосле`)).toEqual([
      line(text('до')),
      { t: 'codeblock', lang: 'ts', text: `const a = 1;\n**<@${U}>**` },
      line(text('после')),
    ]);
    expect(parseMarkup('```просто код```')).toEqual([{ t: 'codeblock', lang: null, text: 'просто код' }]);
  });

  it('inline code does not span lines, like the server', () => {
    expect(parseMarkup(`\`a\n<@${U}>\``)).toEqual([line(text('`a')), line({ t: 'user', id: U }, text('`'))]);
  });

  it('quotes: one line, several lines, the rest of the message', () => {
    expect(parseMarkup('> раз\n> два\nтри')).toEqual([{ t: 'quote', children: [line(text('раз')), line(text('два'))] }, line(text('три'))]);
    expect(parseMarkup('>>> раз\nдва')).toEqual([{ t: 'quote', children: [line(text('раз')), line(text('два'))] }]);
    expect(parseMarkup('>нет')).toEqual([line(text('>нет'))]);
  });

  it('headings, small text and lists', () => {
    expect(parseMarkup('# Заголовок\n### Мелкий\n#нет')).toEqual([
      { t: 'heading', level: 1, children: [text('Заголовок')] },
      { t: 'heading', level: 3, children: [text('Мелкий')] },
      line(text('#нет')),
    ]);
    expect(parseMarkup('-# сноска')).toEqual([{ t: 'subtext', children: [text('сноска')] }]);
    expect(parseMarkup('- а\n* б\n1. раз\n2. два')).toEqual([
      { t: 'list', ordered: false, start: 1, items: [[text('а')], [text('б')]] },
      { t: 'list', ordered: true, start: 1, items: [[text('раз')], [text('два')]] },
    ]);
  });
});

describe('plainText', () => {
  it('drops markup and shows mentions by name on one line', () => {
    const names = { user: () => ({ name: 'Аня' }), role: () => null, channel: () => ({ name: 'общий' }) };
    expect(plainText(`**привет** <@${U}>\n> в <#${U}>\n\`\`\`\nкод\n\`\`\``, names)).toBe('привет @Аня в #общий код');
    expect(plainText(`<@&${R}>`, null)).toBe('@удалённая-роль');
  });
});
