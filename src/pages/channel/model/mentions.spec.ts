import { FullGuild, Member, Message, PublicUser } from '@shared/api';
import { MentionWorld, mentionContext, mentionOptions, mentionsMe } from './mentions';

const user = (id: string, display_name: string): PublicUser => ({ id, username: id, display_name, avatar: null });
const member = (u: PublicUser, nick: string | null = null): Member => ({ guild_id: 'g', user_id: u.id, nick, roles: [], joined_at: '', user: u });
const ann = user('ann', 'Аня'), bob = user('bob', 'Боб');

const guild = {
  id: 'g', name: 'сервер', owner_id: 'ann',
  roles: [
    { id: 'g', guild_id: 'g', name: '@everyone', position: 0, permissions: '0', color: 0, mentionable: false },
    { id: 'r1', guild_id: 'g', name: 'игроки', position: 1, permissions: '0', color: 0xff0000, mentionable: true },
    { id: 'r2', guild_id: 'g', name: 'админы', position: 2, permissions: '0', color: 0, mentionable: false },
  ],
  channels: [
    { id: 'c1', guild_id: 'g', name: 'общий', type: 0, position: 0 },
    { id: 'c2', guild_id: 'g', name: 'Голос', type: 2, position: 1 },
  ],
  member: null, permissions: '0', channel_permissions: {},
} as unknown as FullGuild;

const world = (g: FullGuild | null): MentionWorld => ({
  guild: g,
  members: g ? [member(ann, 'Анюта'), member(bob)] : [],
  people: g ? [] : [ann, bob],
  channel: id => (g && id === 'c1' ? { guild: g, channel: g.channels[0] } : null),
  live: u => u ?? null,
});

describe('mentions on the channel page', () => {
  it('names members by nick, roles by name, channels with a link', () => {
    const ctx = mentionContext(world(guild));
    expect(ctx.user('ann')).toEqual({ name: 'Анюта' });
    expect(ctx.user('eve')).toBeNull();
    expect(ctx.role('r1')).toEqual({ name: 'игроки', color: 0xff0000 });
    expect(ctx.role('g')).toBeNull();
    expect(ctx.channel('c1')).toEqual({ name: 'общий', link: ['/channels', 'g', 'c1'] });
  });

  it('suggests people by nick or username, then roles the user may ping', () => {
    const labels = (pingAll: boolean, q: string) => mentionOptions(world(guild), pingAll, '@', q).map(o => o.label);
    expect(labels(false, '')).toEqual(['Анюта', 'Боб', 'игроки']);
    expect(labels(true, '')).toEqual(['Анюта', 'Боб', 'админы', 'игроки', '@everyone', '@here']);
    expect(labels(false, 'bo')).toEqual(['Боб']);
    expect(labels(true, 'he')).toEqual(['@here']);
    const anya = mentionOptions(world(guild), false, '@', 'ан')[0];
    expect([anya.display, anya.token]).toEqual(['@Анюта', '<@ann>']);
  });

  it('suggests text channels for # and nothing for roles in a DM', () => {
    expect(mentionOptions(world(guild), false, '#', '').map(o => o.token)).toEqual(['<#c1>']);
    expect(mentionOptions(world(null), true, '@', '').map(o => o.label)).toEqual(['Аня', 'Боб']);
    expect(mentionOptions(world(null), true, '#', '')).toEqual([]);
  });

  it('highlights messages that ping the viewer, not their own', () => {
    const msg = (p: Partial<Message>): Message => ({ id: 'm', channel_id: 'c1', author: bob, content: '', mention_everyone: false, mentions: [], mention_roles: [], attachments: [], created_at: '', ...p });
    expect(mentionsMe(msg({ mentions: ['ann'] }), 'ann', [])).toBeTrue();
    expect(mentionsMe(msg({ mention_roles: ['r1'] }), 'ann', ['r1'])).toBeTrue();
    expect(mentionsMe(msg({ mention_everyone: true }), 'ann', [])).toBeTrue();
    expect(mentionsMe(msg({ mentions: ['bob'] }), 'ann', [])).toBeFalse();
    expect(mentionsMe(msg({ author: ann, mentions: ['ann'] }), 'ann', [])).toBeFalse();
  });
});
