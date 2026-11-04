#!/usr/bin/env node
// Writes public/emoji/data.json, the emoji picker's data (ruscord-core
// docs/adr/0037-reactions-pins.md), from emojibase-data (MIT,
// https://github.com/milesj/emojibase, packages/data): the same list the
// core accepts, with Russian and English names and keywords for search.
//
//   node scripts/gen-emoji.mjs path/to/emojibase/packages/data > public/emoji/data.json
//
// Each emoji is [emoji, name in Russian, name in English, group, keywords,
// skins?]: skins are the five skin tones from light to dark.
import { readFileSync } from 'node:fs';

const dir = process.argv[2];
const read = p => JSON.parse(readFileSync(`${dir}/${p}`, 'utf8'));
const ru = read('ru/compact.raw.json');
const en = new Map(read('en/compact.raw.json').map(e => [e.hexcode, e]));
const COMPONENT = 2;
const groups = read('ru/messages.raw.json').groups
  .filter(g => g.order !== COMPONENT)
  .map(g => ({ id: g.order, name: g.message }));
const emoji = ru
  .filter(e => e.group !== undefined && e.group !== COMPONENT)
  .sort((a, b) => a.order - b.order)
  .map(e => {
    const eng = en.get(e.hexcode);
    const words = [...new Set([...(e.tags ?? []), ...(eng?.tags ?? [])])].join(' ');
    const row = [e.unicode, e.label, eng?.label ?? '', e.group, words];
    if (e.skins) row.push(e.skins.map(s => s.unicode));
    return row;
  });
process.stdout.write(JSON.stringify({ version: read('package.json').version, groups, emoji }));
