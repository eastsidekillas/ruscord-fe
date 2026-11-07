import { FullGuild } from '@shared/api/models';
import { guildPulse, pulseText } from './pulse';

const guild = {
  id: 'g',
  channels: [{ id: 'a' }, { id: 'b' }],
  voice_states: [
    { user_id: 'u1', guild_id: 'g', channel_id: 'v', self_mute: false, self_deaf: false },
    { user_id: 'u2', guild_id: 'g', channel_id: null, self_mute: false, self_deaf: false },
  ],
} as unknown as FullGuild;

describe('guild pulse', () => {
  it('counts each typing person once, not me, not expired, not other guilds', () => {
    const typing = {
      a: { u1: 200, me: 200, old: 50 },
      b: { u1: 200, u3: 200 },
      elsewhere: { u4: 200 },
    };
    expect(guildPulse(guild, typing, 100, 'me')).toEqual({ typing: 2, voice: 1 });
  });

  it('reads as a short line', () => {
    const cases: [number, number, string][] = [
      [0, 0, ''],
      [1, 0, '1 пишет'],
      [3, 0, '3 пишут'],
      [0, 2, '2 в голосе'],
      [2, 5, '2 пишут · 5 в голосе'],
    ];
    for (const [typing, voice, want] of cases) expect(pulseText({ typing, voice })).withContext(want).toBe(want);
  });
});
