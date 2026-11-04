/**
 * The search box's little language (ruscord-core docs/adr/0039-search.md):
 * free text plus filters written as key:value, in Russian or English.
 *   кошка от:bob в:общий есть:картинка упоминает:ann
 */

export type SearchKey = 'from' | 'in' | 'has' | 'mentions';
export type HasValue = 'file' | 'image' | 'video' | 'link';

export interface ParsedSearch {
  text: string;
  from: string | null;
  in: string | null;
  mentions: string | null;
  has: HasValue[];
  /** Filters with a value nobody understands, to tell the user. */
  unknown: string[];
}

const KEYS: Record<string, SearchKey> = {
  от: 'from', from: 'from', в: 'in', in: 'in', есть: 'has', has: 'has', упоминает: 'mentions', mentions: 'mentions',
};
const HAS: Record<string, HasValue> = {
  файл: 'file', файлы: 'file', file: 'file', картинка: 'image', картинки: 'image', фото: 'image', image: 'image',
  видео: 'video', video: 'video', ссылка: 'link', ссылки: 'link', link: 'link',
};

export function parseSearch(input: string): ParsedSearch {
  const out: ParsedSearch = { text: '', from: null, in: null, mentions: null, has: [], unknown: [] };
  const words: string[] = [];
  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    const m = /^([\p{L}]+):(.+)$/u.exec(token);
    const key = m ? KEYS[m[1].toLocaleLowerCase('ru')] : undefined;
    if (!m || !key) {
      words.push(token);
      continue;
    }
    const value = m[2].replace(/^[@#]/, '');
    if (key === 'has') {
      const h = HAS[value.toLocaleLowerCase('ru')];
      if (h && !out.has.includes(h)) out.has.push(h);
      else if (!h) out.unknown.push(token);
    } else {
      out[key] = value;
    }
  }
  out.text = words.join(' ');
  return out;
}

/** Anything to search for: text or a filter. */
export function searchable(p: ParsedSearch): boolean {
  return !!p.text || !!p.from || !!p.mentions || p.has.length > 0;
}
