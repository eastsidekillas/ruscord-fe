import { FullGuild, Member, PublicUser, nameOf } from '@shared/api';
import { MentionContext } from '@shared/ui/markup-view';
import { MentionOption } from '@shared/lib/mention-text';

/** What the channel page knows that mentions are resolved against. */
export interface MentionWorld {
  /** The guild of the channel; null in a DM. */
  guild: FullGuild | null;
  /** Members of that guild as loaded so far. */
  members: Member[];
  /** People of a DM, or anyone else the page knows (authors, friends). */
  people: PublicUser[];
  /** A guild channel anywhere in the user's guilds. */
  channel(id: string): { guild: FullGuild; channel: { id: string; name: string } } | null;
  /** The newest copy of a user's profile. */
  live(u: PublicUser | null | undefined): PublicUser | null;
}

/** How a member is called on this guild: their nick, else their name. */
function memberName(w: MentionWorld, m: Member): string {
  return m.nick || nameOf(w.live(m.user ?? null));
}

export function mentionContext(w: MentionWorld): MentionContext {
  const members = new Map(w.members.map(m => [m.user_id, m]));
  const people = new Map(w.people.map(p => [p.id, p]));
  return {
    user: id => {
      const m = members.get(id);
      if (m) return { name: memberName(w, m) };
      const p = people.get(id);
      return p ? { name: nameOf(w.live(p)) } : null;
    },
    role: id => {
      const r = w.guild?.roles.find(x => x.id === id && x.id !== w.guild!.id);
      return r ? { name: r.name, color: r.color } : null;
    },
    channel: id => {
      const c = w.channel(id);
      return c ? { name: c.channel.name, link: ['/channels', c.guild.id, c.channel.id] } : null;
    },
  };
}

const fits = (query: string, ...names: (string | null | undefined)[]) =>
  names.some(n => !!n && n.toLocaleLowerCase('ru').includes(query));

/**
 * What @query or #query may mention here, best matches first: people of the
 * channel, roles the user may ping (mentionable ones, or all with
 * MENTION_EVERYONE) and @everyone/@here; # gives the guild's text channels.
 */
export function mentionOptions(w: MentionWorld, pingAll: boolean, trigger: '@' | '#', query: string): MentionOption[] {
  const q = query.toLocaleLowerCase('ru');
  const starts = (o: MentionOption) => (o.label.toLocaleLowerCase('ru').startsWith(q) ? 0 : 1);
  const byFit = (a: MentionOption, b: MentionOption) => starts(a) - starts(b) || a.label.localeCompare(b.label, 'ru');
  if (trigger === '#') {
    if (!w.guild) return [];
    return w.guild.channels
      .filter(c => c.type === 0 && fits(q, c.name))
      .map(c => ({ kind: 'channel' as const, id: c.id, label: c.name, hint: null, display: '#' + c.name, token: `<#${c.id}>` }))
      .sort(byFit);
  }
  const people: MentionOption[] = (w.guild ? w.members.map(m => ({ id: m.user_id, name: memberName(w, m), user: w.live(m.user ?? null) })) : w.people.map(p => ({ id: p.id, name: nameOf(w.live(p)), user: w.live(p) })))
    .filter(p => fits(q, p.name, p.user?.username))
    .map(p => ({ kind: 'user' as const, id: p.id, label: p.name, hint: p.user?.username ?? null, display: '@' + p.name, token: `<@${p.id}>`, avatar: p.user?.avatar ?? null }));
  const roles: MentionOption[] = (w.guild?.roles ?? [])
    .filter(r => r.id !== w.guild!.id && (r.mentionable || pingAll) && fits(q, r.name))
    .map(r => ({ kind: 'role' as const, id: r.id, label: r.name, hint: 'роль', display: '@' + r.name, token: `<@&${r.id}>`, color: r.color }));
  const everyone: MentionOption[] = !w.guild || !pingAll ? [] : (['everyone', 'here'] as const)
    .filter(k => k.startsWith(q))
    .map(k => ({ kind: 'everyone' as const, id: k, label: '@' + k, hint: k === 'here' ? 'все в сети' : 'все участники', display: '@' + k, token: '@' + k }));
  return [...people.sort(byFit), ...roles.sort(byFit), ...everyone];
}

/** Lives with the read states now; kept here for the page. */
export { mentionsMe } from '@shared/lib/messages';
