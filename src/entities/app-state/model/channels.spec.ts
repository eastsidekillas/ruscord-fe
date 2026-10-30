import { FullGuild, GuildChannel } from '@shared/api/models';
import { channelGroups, firstTextChannel } from './channels';

const ch = (id: string, type: 0 | 2 | 4, position: number, parent_id?: string): GuildChannel => ({
  id, guild_id: 'g', type, name: id, position, parent_id: parent_id ?? null, permission_overwrites: [],
});
const guild = (channels: GuildChannel[]): FullGuild => ({
  id: 'g', name: 'g', owner_id: 'o', created_at: '', icon: null, roles: [], channels,
  member: null, permissions: '0', channel_permissions: {},
});

describe('channelGroups', () => {
  it('puts loose channels first, text before voice, categories by position', () => {
    const g = guild([
      ch('voice', 2, 0), ch('general', 0, 1), ch('cat2', 4, 2), ch('cat1', 4, 1),
      ch('in2', 0, 0, 'cat2'), ch('in1v', 2, 0, 'cat1'), ch('in1t', 0, 5, 'cat1'),
    ]);
    expect(channelGroups(g).map(gr => [gr.category?.id ?? '-', gr.channels.map(c => c.id)])).toEqual([
      ['-', ['general', 'voice']],
      ['cat1', ['in1t', 'in1v']],
      ['cat2', ['in2']],
    ]);
  });

  it('shows a channel of a hidden category without one', () => {
    expect(channelGroups(guild([ch('orphan', 0, 0, 'hidden')]))[0].channels.map(c => c.id)).toEqual(['orphan']);
  });

  it('opens a guild on its first text channel in display order', () => {
    expect(firstTextChannel(guild([ch('v', 2, 0), ch('c', 4, 0), ch('t2', 0, 0, 'c'), ch('t1', 0, 3)]))?.id).toBe('t1');
    expect(firstTextChannel(guild([ch('v', 2, 0)]))).toBeNull();
  });
});
