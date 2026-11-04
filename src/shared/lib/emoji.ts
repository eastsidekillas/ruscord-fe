/**
 * The emoji picker's catalog (ruscord-core docs/adr/0037-reactions-pins.md):
 * public/emoji/data.json, made by scripts/gen-emoji.mjs from emojibase.
 */

/** [emoji, name in Russian, name in English, group, keywords, skin tones?] */
export type EmojiRow = [string, string, string, number, string, string[]?];

export interface EmojiCatalog {
  version: string;
  groups: { id: number; name: string }[];
  emoji: EmojiRow[];
}

/** Skin tones, light to dark; 0 is the default yellow. */
export const SKIN_TONES = ['✋', '✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿'];

/** The emoji with the chosen skin tone, if it has tones. */
export function withTone(row: EmojiRow, tone: number): string {
  return tone > 0 && row[5] ? row[5][tone - 1] : row[0];
}

/**
 * Emoji whose names or keywords contain every word of the query, in either
 * language; names that start with the query come first.
 */
export function searchEmoji(catalog: EmojiCatalog, query: string, limit = 80): EmojiRow[] {
  const words = query.toLocaleLowerCase('ru').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: { row: EmojiRow; rank: number }[] = [];
  for (const row of catalog.emoji) {
    const ru = row[1].toLocaleLowerCase('ru');
    const en = row[2].toLowerCase();
    const text = `${ru} ${en} ${row[4].toLocaleLowerCase('ru')}`;
    if (!words.every(w => text.includes(w))) continue;
    const rank = ru.startsWith(words[0]) || en.startsWith(words[0]) ? 0 : 1;
    hits.push({ row, rank });
  }
  return hits.sort((a, b) => a.rank - b.rank).slice(0, limit).map(h => h.row);
}
