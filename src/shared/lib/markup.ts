/**
 * Markup of messages (ruscord-core ADR-0035): the server keeps the text as
 * typed and never sends HTML, so the client parses it here into nodes that
 * templates render. Nothing from a message ever reaches innerHTML.
 *
 * Code follows the same rules as ruscord-core (internal/message/mention.go):
 * blocks ``` may span lines, inline `code` and ``code`` may not, and
 * mentions inside code are text.
 */

export type InlineNode =
  | { t: 'text'; text: string }
  | { t: 'bold' | 'italic' | 'underline' | 'strike' | 'spoiler'; children: InlineNode[] }
  | { t: 'code'; text: string }
  /** `label` null: the link shows its address. */
  | { t: 'link'; url: string; label: InlineNode[] | null }
  | { t: 'user' | 'role' | 'channel'; id: string }
  | { t: 'everyone'; text: string };

export type BlockNode =
  | { t: 'line'; children: InlineNode[] }
  | { t: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { t: 'subtext'; children: InlineNode[] }
  | { t: 'quote'; children: BlockNode[] }
  | { t: 'list'; ordered: boolean; start: number; items: InlineNode[][] }
  | { t: 'codeblock'; lang: string | null; text: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FENCE = /```([\s\S]*?)```/g;
const LANG = /^([A-Za-z0-9_+#.-]{1,20})\n/;
/** Characters a backslash makes literal. */
const ESCAPABLE = new Set('\\*_~|`>[]()#-@<:.'.split(''));
/** Nesting deeper than this is shown as text: no message needs it. */
const MAX_DEPTH = 8;

/** Rules tried at each position; sticky (y) so they match only right there. */
const INLINE_RULES: { re: RegExp; node: (m: RegExpExecArray) => InlineNode; links?: boolean }[] = [
  { re: /``([^\n]+?)``/y, node: m => ({ t: 'code', text: m[1] }) },
  { re: /`([^`\n]+)`/y, node: m => ({ t: 'code', text: m[1] }) },
  { re: new RegExp(`<@&(${UUID})>`, 'y'), node: m => ({ t: 'role', id: m[1] }) },
  { re: new RegExp(`<@(${UUID})>`, 'y'), node: m => ({ t: 'user', id: m[1] }) },
  { re: new RegExp(`<#(${UUID})>`, 'y'), node: m => ({ t: 'channel', id: m[1] }) },
  { re: /@(everyone|here)\b/y, node: m => ({ t: 'everyone', text: m[0] }) },
  { re: /<(https?:\/\/[^\s>]+)>/y, node: m => ({ t: 'link', url: m[1], label: null }), links: true },
  { re: /https?:\/\/[^\s<]*[^\s<.,:;"')\]!?*_~|]/y, node: m => ({ t: 'link', url: m[0], label: null }), links: true },
];
/** A rule above can only start with one of these. */
const RULE_START = new Set('`<@h'.split(''));
const MASKED = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/y;
const PAIR_START = new Set('*_~|'.split(''));

const PAIRS: { open: string; t: 'bold' | 'italic' | 'underline' | 'strike' | 'spoiler' }[] = [
  { open: '**', t: 'bold' },
  { open: '__', t: 'underline' },
  { open: '~~', t: 'strike' },
  { open: '||', t: 'spoiler' },
  { open: '*', t: 'italic' },
  { open: '_', t: 'italic' },
];

const WORD = /[\p{L}\p{N}]/u;

/** Parses the text of a message into blocks. */
export function parseMarkup(text: string): BlockNode[] {
  const out: BlockNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FENCE)) {
    out.push(...parseLines(trimNewlines(text.slice(last, m.index), last > 0, true)));
    out.push(codeBlock(m[1]));
    last = m.index + m[0].length;
  }
  out.push(...parseLines(trimNewlines(text.slice(last), last > 0, false)));
  return out;
}

/** Drops the line break that only separates text from a code block. */
function trimNewlines(s: string, afterCode: boolean, beforeCode: boolean): string {
  if (afterCode && s.startsWith('\n')) s = s.slice(1);
  if (beforeCode && s.endsWith('\n')) s = s.slice(0, -1);
  return s;
}

function codeBlock(body: string): BlockNode {
  const lang = LANG.exec(body);
  if (lang) return { t: 'codeblock', lang: lang[1].toLowerCase(), text: body.slice(lang[0].length).replace(/\n$/, '') };
  return { t: 'codeblock', lang: null, text: body.replace(/^\n/, '').replace(/\n$/, '') };
}

function parseLines(text: string, inQuote = false): BlockNode[] {
  if (!text) return [];
  const lines = text.split('\n');
  const out: BlockNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inQuote && line.startsWith('>>> ')) {
      out.push({ t: 'quote', children: parseLines([line.slice(4), ...lines.slice(i + 1)].join('\n'), true) });
      break;
    }
    if (!inQuote && (line.startsWith('> ') || line === '>')) {
      const quoted: string[] = [];
      for (; i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>'); i++) quoted.push(lines[i].slice(2));
      i--;
      out.push({ t: 'quote', children: parseLines(quoted.join('\n'), true) });
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      out.push({ t: 'heading', level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2]) });
      continue;
    }
    if (line.startsWith('-# ') && line.length > 3) {
      out.push({ t: 'subtext', children: parseInline(line.slice(3)) });
      continue;
    }
    const item = listItem(line);
    if (item) {
      const list: BlockNode & { t: 'list' } = { t: 'list', ordered: item.ordered, start: item.n, items: [] };
      for (let it: ListItem | null = item; it && it.ordered === list.ordered; it = listItem(lines[++i] ?? '')) list.items.push(parseInline(it.text));
      i--;
      out.push(list);
      continue;
    }
    out.push({ t: 'line', children: parseInline(line) });
  }
  return out;
}

interface ListItem {
  ordered: boolean;
  n: number;
  text: string;
}

function listItem(line: string): ListItem | null {
  const bullet = /^[-*] (.+)$/.exec(line);
  if (bullet) return { ordered: false, n: 1, text: bullet[1] };
  const num = /^(\d{1,9})\. (.+)$/.exec(line);
  return num ? { ordered: true, n: Number(num[1]), text: num[2] } : null;
}

/** Parses one line of text: emphasis, code, links and mentions. */
export function parseInline(s: string, depth = 0, links = true): InlineNode[] {
  const out: InlineNode[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', text: buf });
    buf = '';
  };
  let i = 0;
  outer: while (i < s.length) {
    const c = s[i];
    if (c === '\\' && ESCAPABLE.has(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (RULE_START.has(c)) {
      for (const rule of INLINE_RULES) {
        if (rule.links && !links) continue;
        rule.re.lastIndex = i;
        const m = rule.re.exec(s);
        if (m) {
          flush();
          out.push(rule.node(m));
          i += m[0].length;
          continue outer;
        }
      }
    }
    if (links && c === '[') {
      MASKED.lastIndex = i;
      const m = MASKED.exec(s);
      if (m) {
        flush();
        out.push({ t: 'link', url: m[2], label: parseInline(m[1], depth + 1, false) });
        i += m[0].length;
        continue;
      }
    }
    if (depth < MAX_DEPTH && PAIR_START.has(c)) {
      for (const p of PAIRS) {
        const end = s.startsWith(p.open, i) ? closing(s, i, p.open) : -1;
        if (end > 0) {
          flush();
          out.push({ t: p.t, children: parseInline(s.slice(i + p.open.length, end), depth + 1, links) });
          i = end + p.open.length;
          continue outer;
        }
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

/**
 * Where the delimiter that opens at i closes, or -1. Content is never
 * empty; `*` needs content that does not start with a space (2 * 3 * 4),
 * `_` needs no letters around it (snake_case_name); with a run of the
 * same character the closing takes the last one (***both***).
 */
function closing(s: string, i: number, d: string): number {
  const from = i + d.length;
  if (d === '*' && (s[from] === ' ' || s[from] === '*')) return -1;
  if (d === '_' && WORD.test(s[i - 1] ?? '')) return -1;
  for (let j = s.indexOf(d, from + 1); j > 0; j = s.indexOf(d, j + 1)) {
    if (s[j - 1] === '\\') continue;
    while (d.length === 2 && s[j + 2] === d[0]) j++;
    if (d === '_' && WORD.test(s[j + 1] ?? '')) continue;
    if (d === '*' && s[j - 1] === ' ') continue;
    return j;
  }
  return -1;
}

/** Names mentions are shown with in plain text. */
export interface PlainNames {
  user(id: string): { name: string } | null;
  role(id: string): { name: string } | null;
  channel(id: string): { name: string } | null;
}

/**
 * The text of a message without markup, on one line, for previews such as
 * the message a reply answers: mentions become names.
 */
export function plainText(text: string, names: PlainNames | null): string {
  const inline = (nodes: InlineNode[]): string =>
    nodes
      .map(n => {
        switch (n.t) {
          case 'text':
          case 'code':
          case 'everyone':
            return n.text;
          case 'link':
            return n.label ? inline(n.label) : n.url;
          case 'user':
            return '@' + (names?.user(n.id)?.name ?? 'неизвестный');
          case 'role':
            return '@' + (names?.role(n.id)?.name ?? 'удалённая-роль');
          case 'channel':
            return '#' + (names?.channel(n.id)?.name ?? 'недоступный-канал');
          default:
            return inline(n.children);
        }
      })
      .join('');
  const block = (b: BlockNode): string => {
    switch (b.t) {
      case 'codeblock':
        return b.text;
      case 'quote':
        return b.children.map(block).join(' ');
      case 'list':
        return b.items.map(inline).join(' ');
      default:
        return inline(b.children);
    }
  };
  return parseMarkup(text).map(block).join(' ').replace(/\s+/g, ' ').trim();
}
