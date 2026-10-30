import { FullGuild, Perm } from '@shared/api';
import { settingsTabs } from './server-settings-modal';

const guild = (perms: bigint): FullGuild => ({
  id: 'g', name: 'G', owner_id: 'o', created_at: '', icon: null,
  roles: [], channels: [], member: null, permissions: perms.toString(), channel_permissions: {},
});

describe('settingsTabs', () => {
  const cases: { name: string; perms: bigint; tabs: string[] }[] = [
    { name: 'a plain member sees no settings', perms: Perm.ViewChannel | Perm.SendMessages, tabs: [] },
    { name: 'MANAGE_GUILD: overview', perms: Perm.ManageGuild, tabs: ['overview'] },
    { name: 'MANAGE_ROLES: roles and members (to give roles)', perms: Perm.ManageRoles, tabs: ['roles', 'members'] },
    { name: 'KICK_MEMBERS: members only', perms: Perm.KickMembers, tabs: ['members'] },
    { name: 'BAN_MEMBERS: members and bans', perms: Perm.BanMembers, tabs: ['members', 'bans'] },
    {
      name: 'administrator (the server sends every bit)',
      perms: Perm.Administrator | Perm.ManageGuild | Perm.ManageRoles | Perm.KickMembers | Perm.BanMembers,
      tabs: ['overview', 'roles', 'members', 'bans'],
    },
  ];
  for (const c of cases) {
    it(c.name, () => expect(settingsTabs(guild(c.perms)).map(t => t.id)).toEqual(c.tabs as never));
  }
  it('no guild, no tabs', () => expect(settingsTabs(null)).toEqual([]));
});
