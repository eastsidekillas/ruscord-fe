/**
 * Mentions while typing. The server wants <@id>, <@&id> and <#id>
 * (ruscord-core ADR-0035), people want to see @name: the composer shows
 * names and remembers which token each name it inserted stands for.
 */

/** Text shown in the field → the token sent for it. */
export type MentionTokens = Map<string, string>;

/** What a mention of the text in the field could be, for the suggestion list. */
export interface MentionOption {
  kind: 'user' | 'role' | 'channel' | 'everyone';
  id: string;
  /** Shown in the list. */
  label: string;
  /** Shown greyed after the label: the username, «роль», the category. */
  hint: string | null;
  /** Inserted into the field. */
  display: string;
  /** Sent for it. */
  token: string;
  avatar?: string | null;
  color?: number;
}

/** Names a mention may be shown as; a subset of the markup's MentionContext. */
export interface MentionNames {
  user(id: string): { name: string } | null;
  role(id: string): { name: string } | null;
  channel(id: string): { name: string } | null;
}

export interface MentionQuery {
  trigger: '@' | '#';
  query: string;
  /** Where the trigger character is. */
  start: number;
}

const QUERY = /(^|[\s(])([@#])([^\s@#<>]{0,32})$/u;
const AFTER = '(?![\\p{L}\\p{N}_])';
const TOKEN = /<(@&|@|#)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/g;

/** The @word or #word right before the caret, if the user is typing one. */
export function mentionQuery(text: string, caret: number): MentionQuery | null {
  const m = QUERY.exec(text.slice(0, caret));
  if (!m) return null;
  return { trigger: m[2] as '@' | '#', query: m[3], start: caret - m[3].length - 1 };
}

/** Puts option in place of the query and returns the new text and caret. */
export function insertMention(text: string, q: MentionQuery, caret: number, o: MentionOption, tokens: MentionTokens): { text: string; caret: number } {
  tokens.set(o.display, o.token);
  const before = text.slice(0, q.start) + o.display + ' ';
  return { text: before + text.slice(caret).replace(/^ /, ''), caret: before.length };
}

/** The text to send: every name the composer inserted becomes its token again. */
export function toWire(text: string, tokens: MentionTokens): string {
  const names = [...tokens.keys()].sort((a, b) => b.length - a.length);
  for (const name of names) {
    text = text.replace(new RegExp(escape(name) + AFTER, 'gu'), tokens.get(name)!);
  }
  return text;
}

/**
 * The text of a sent message as the composer shows it, for editing: tokens
 * become names. A name already taken by another token keeps its token, so
 * saving never turns one mention into another.
 */
export function toDisplay(content: string, names: MentionNames): { text: string; tokens: MentionTokens } {
  const tokens: MentionTokens = new Map();
  const text = content.replace(TOKEN, (token, kind: string, id: string) => {
    const found = kind === '@' ? names.user(id) : kind === '@&' ? names.role(id) : names.channel(id);
    if (!found) return token;
    const display = (kind === '#' ? '#' : '@') + found.name;
    const taken = tokens.get(display);
    if (taken && taken !== token) return token;
    tokens.set(display, token);
    return display;
  });
  return { text, tokens };
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
