import { FullGuild, GuildChannel } from '@shared/api/models';

export interface ChannelGroup {
  category: GuildChannel | null;
  channels: GuildChannel[];
}

// Within a group text comes before voice, then by position, then by id: the
// same order for every client.
const order = (a: GuildChannel, b: GuildChannel) =>
  (a.type === 2 ? 1 : 0) - (b.type === 2 ? 1 : 0) || a.position - b.position || (a.id < b.id ? -1 : 1);

/** Channels grouped under their categories; channels without one come first. */
export function channelGroups(g: FullGuild): ChannelGroup[] {
  const cats = g.channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : 1));
  const inCat = (id: string | null) =>
    g.channels.filter(c => c.type !== 4 && (c.parent_id ?? null) === id).sort(order);
  // A channel whose category is hidden from the user is shown without one.
  const known = new Set(cats.map(c => c.id));
  const loose = g.channels
    .filter(c => c.type !== 4 && (!c.parent_id || !known.has(c.parent_id)))
    .sort(order);
  const groups: ChannelGroup[] = loose.length ? [{ category: null, channels: loose }] : [];
  for (const c of cats) groups.push({ category: c, channels: inCat(c.id) });
  return groups;
}

/** The first text channel in display order, where a guild opens. */
export function firstTextChannel(g: FullGuild): GuildChannel | null {
  for (const group of channelGroups(g)) {
    const ch = group.channels.find(c => c.type === 0);
    if (ch) return ch;
  }
  return null;
}
