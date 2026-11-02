import { Perm } from '@shared/api';
import { triOf, withTri } from './channel-perms-tab';
import { channelTabs } from './channel-settings-modal';

describe('channel overwrite states', () => {
  const b = Perm.Stream;
  const cases: { name: string; allow: bigint; deny: bigint; want: string }[] = [
    { name: 'neither: default', allow: 0n, deny: 0n, want: 'inherit' },
    { name: 'allowed', allow: b, deny: 0n, want: 'allow' },
    { name: 'denied', allow: 0n, deny: b, want: 'deny' },
    { name: 'deny wins if both are set', allow: b, deny: b, want: 'deny' },
  ];
  for (const c of cases) it(c.name, () => expect(triOf(c.allow, c.deny, b)).toBe(c.want as never));

  it('moving a bit keeps the others', () => {
    const start = { allow: Perm.Speak | Perm.Stream, deny: Perm.Video };
    expect(withTri(start.allow, start.deny, Perm.Stream, 'deny')).toEqual({ allow: Perm.Speak, deny: Perm.Video | Perm.Stream });
    expect(withTri(start.allow, start.deny, Perm.Video, 'inherit')).toEqual({ allow: Perm.Speak | Perm.Stream, deny: 0n });
    expect(withTri(0n, 0n, Perm.Connect, 'allow')).toEqual({ allow: Perm.Connect, deny: 0n });
  });
});

describe('channelTabs', () => {
  const g = (p: bigint) => ({
    id: 'g', name: 'G', owner_id: 'o', created_at: '', icon: null, roles: [], channels: [], member: null,
    permissions: '0', channel_permissions: { c: p.toString() },
  });
  const ch = { id: 'c', guild_id: 'g', type: 2 as const, name: 'Комната', position: 0, permission_overwrites: [] };
  it('MANAGE_CHANNELS: overview', () => expect(channelTabs(g(Perm.ManageChannels), ch).map(t => t.id)).toEqual(['overview'] as never));
  it('MANAGE_ROLES: permissions', () => expect(channelTabs(g(Perm.ManageRoles), ch).map(t => t.id)).toEqual(['perms'] as never));
  it('neither: nothing', () => expect(channelTabs(g(Perm.ViewChannel), ch)).toEqual([]));
});
