import { FullGuild, GuildChannel, PublicUser, Ready, User } from '@shared/api/models';
import { AppState, emptyState, reduce, resolveUser } from './reduce';

const me: User = {
  id: 'me', username: 'me', display_name: 'Я', avatar: null,
  email: 'me@example.com', created_at: '', status: 'online', bio: '',
};
const bob: PublicUser = { id: 'bob', username: 'bob', display_name: 'Боб', avatar: null };
const cat: PublicUser = { id: 'cat', username: 'cat', display_name: 'Кот', avatar: null };

const text = (id: string, guild = 'g1'): GuildChannel => ({
  id, guild_id: guild, type: 0, name: id, position: 0, permission_overwrites: [],
});

const guild = (id: string): FullGuild => ({
  id, name: id, owner_id: 'me', created_at: '', icon: null,
  roles: [], channels: [text('general', id)],
  member: { guild_id: id, user_id: 'me', nick: null, roles: [], joined_at: '' },
  permissions: '3', channel_permissions: { general: '3' },
});

const ready: Ready = {
  v: 1, session_id: 's', user: me,
  guilds: [guild('g1')],
  dms: [{ id: 'dm1', type: 1, created_at: '', recipients: [me, bob] }],
  relationships: [{ id: 'bob', type: 1, since: '', user: bob }],
  presences: [{ user_id: 'bob', status: 'idle' }],
};

const start = (): AppState => reduce(emptyState, { t: 'READY', d: ready });

describe('reduce', () => {
  it('builds the state from READY', () => {
    const s = start();
    expect(s.me).toEqual(me);
    expect(s.guildOrder).toEqual(['g1']);
    expect(s.dms['dm1'].recipients.length).toBe(2);
    expect(s.relationships['bob'].type).toBe(1);
    expect(s.presences).toEqual({ bob: 'idle' });
  });

  it('a second READY replaces everything (new session after 4006)', () => {
    const s = reduce(reduce(start(), { t: 'GUILD_CREATE', d: guild('g2') }), {
      t: 'READY', d: { ...ready, guilds: [], dms: [], relationships: [], presences: [] },
    });
    expect(s.guildOrder).toEqual([]);
    expect(s.relationships).toEqual({});
    expect(s.presences).toEqual({});
  });

  // Each case starts from READY and applies one event.
  const cases: { name: string; t: string; d: unknown; check: (s: AppState) => void }[] = [
    {
      name: 'guild created is appended', t: 'GUILD_CREATE', d: guild('g2'),
      check: s => expect(s.guildOrder).toEqual(['g1', 'g2']),
    },
    {
      name: 'guild update keeps channels and permissions', t: 'GUILD_UPDATE',
      d: { id: 'g1', name: 'Новое', owner_id: 'me', created_at: '', icon: '/cdn/icons/x.png' },
      check: s => {
        expect(s.guilds['g1'].name).toBe('Новое');
        expect(s.guilds['g1'].icon).toBe('/cdn/icons/x.png');
        expect(s.guilds['g1'].channels.length).toBe(1);
        expect(s.guilds['g1'].channel_permissions).toEqual({ general: '3' });
      },
    },
    {
      name: 'guild deleted', t: 'GUILD_DELETE', d: { id: 'g1' },
      check: s => {
        expect(s.guilds['g1']).toBeUndefined();
        expect(s.guildOrder).toEqual([]);
      },
    },
    {
      name: 'channel created in a guild', t: 'CHANNEL_CREATE', d: text('news'),
      check: s => expect(s.guilds['g1'].channels.map(c => c.id)).toEqual(['general', 'news']),
    },
    {
      name: 'channel updated in place', t: 'CHANNEL_UPDATE', d: { ...text('general'), name: 'chat' },
      check: s => expect(s.guilds['g1'].channels.map(c => c.name)).toEqual(['chat']),
    },
    {
      name: 'channel hidden or deleted', t: 'CHANNEL_DELETE', d: { id: 'general', guild_id: 'g1' },
      check: s => expect(s.guilds['g1'].channels).toEqual([]),
    },
    {
      name: 'channel of an unknown guild is ignored', t: 'CHANNEL_CREATE', d: text('x', 'nope'),
      check: s => expect(s.guilds['nope']).toBeUndefined(),
    },
    {
      name: 'DM created', t: 'CHANNEL_CREATE', d: { id: 'dm2', type: 3, created_at: '', recipients: [me, bob, cat] },
      check: s => expect(s.dms['dm2'].recipients.length).toBe(3),
    },
    {
      name: 'DM left', t: 'CHANNEL_DELETE', d: { id: 'dm1' },
      check: s => expect(s.dms['dm1']).toBeUndefined(),
    },
    {
      name: 'recipient added replaces the DM', t: 'CHANNEL_RECIPIENT_ADD',
      d: { channel_id: 'dm1', user: cat, channel: { id: 'dm1', type: 3, created_at: '', recipients: [me, bob, cat] } },
      check: s => expect(s.dms['dm1'].recipients.map(r => r.id)).toEqual(['me', 'bob', 'cat']),
    },
    {
      name: 'permissions replaced as a whole', t: 'GUILD_PERMISSIONS_UPDATE',
      d: { guild_id: 'g1', permissions: '1', channel_permissions: {} },
      check: s => {
        expect(s.guilds['g1'].permissions).toBe('1');
        expect(s.guilds['g1'].channel_permissions).toEqual({});
      },
    },
    {
      name: 'roles replaced with the ordered list', t: 'GUILD_ROLE_CREATE',
      d: { guild_id: 'g1', role: { id: 'r' }, roles: [{ id: 'g1' }, { id: 'r' }] },
      check: s => expect(s.guilds['g1'].roles.map(r => r.id)).toEqual(['g1', 'r']),
    },
    {
      name: 'own member update', t: 'GUILD_MEMBER_UPDATE',
      d: { guild_id: 'g1', user_id: 'me', nick: 'ник', roles: ['r'], joined_at: '' },
      check: s => expect(s.guilds['g1'].member?.nick).toBe('ник'),
    },
    {
      name: 'someone else\'s member update does not touch mine', t: 'GUILD_MEMBER_UPDATE',
      d: { guild_id: 'g1', user_id: 'bob', nick: 'чужой', roles: [], joined_at: '' },
      check: s => expect(s.guilds['g1'].member?.nick).toBeNull(),
    },
    {
      name: 'new friend request with the user', t: 'RELATIONSHIP_ADD', d: { id: 'cat', type: 3, since: 't', user: cat },
      check: s => expect(s.relationships['cat'].user?.username).toBe('cat'),
    },
    {
      name: 'friend became blocked: ADD replaces', t: 'RELATIONSHIP_ADD', d: { id: 'bob', type: 2, since: 't' },
      check: s => {
        expect(s.relationships['bob'].type).toBe(2);
        expect(s.relationships['bob'].user?.username).toBe('bob'); // kept from before
      },
    },
    {
      name: 'remove of another type is stale', t: 'RELATIONSHIP_REMOVE', d: { id: 'bob', type: 3 },
      check: s => expect(s.relationships['bob']).toBeDefined(),
    },
    {
      name: 'unfriended', t: 'RELATIONSHIP_REMOVE', d: { id: 'bob', type: 1 },
      check: s => expect(s.relationships['bob']).toBeUndefined(),
    },
    {
      name: 'presence', t: 'PRESENCE_UPDATE', d: { user_id: 'cat', status: 'dnd' },
      check: s => expect(s.presences['cat']).toBe('dnd'),
    },
    {
      name: 'own account update', t: 'USER_UPDATE', d: { ...me, status: 'dnd', bio: 'о себе' },
      check: s => expect(s.me?.status).toBe('dnd'),
    },
    {
      name: 'someone else\'s USER_UPDATE is ignored', t: 'USER_UPDATE', d: { ...me, id: 'bob' },
      check: s => expect(s.me?.id).toBe('me'),
    },
    {
      name: 'profile update reaches friends and DMs', t: 'USER_PROFILE_UPDATE',
      d: { user: { ...bob, display_name: 'Борис', avatar: '/cdn/avatars/b.png' } },
      check: s => {
        expect(s.relationships['bob'].user?.display_name).toBe('Борис');
        expect(s.dms['dm1'].recipients[1].avatar).toBe('/cdn/avatars/b.png');
        expect(resolveUser(s, bob).display_name).toBe('Борис');
      },
    },
    {
      name: 'unknown event', t: 'SOMETHING_NEW', d: { id: 'x' },
      check: s => expect(s).toEqual(start()),
    },
    {
      name: 'malformed payload', t: 'GUILD_CREATE', d: null,
      check: s => expect(s).toEqual(start()),
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const before = start();
      const frozen = JSON.stringify(before);
      c.check(reduce(before, { t: c.t, d: c.d }));
      // The reducer never mutates the previous state (signals compare by reference).
      expect(JSON.stringify(before)).toBe(frozen);
    });
  }

  it('resolves yourself to the live account', () => {
    const s = reduce(start(), { t: 'USER_UPDATE', d: { ...me, display_name: 'Новое имя' } });
    expect(resolveUser(s, { ...bob, id: 'me' }).display_name).toBe('Новое имя');
  });
});
