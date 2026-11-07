import { FullGuild, Snowflake } from '@shared/api/models';

/** What is going on in a place right now, for the line under its name. */
export interface Pulse {
  typing: number;
  voice: number;
}

/**
 * People typing in any of the guild's channels (each counted once, the
 * caller excluded) and people in its voice channels.
 */
export function guildPulse(
  g: FullGuild,
  typing: Record<Snowflake, Record<Snowflake, number>>,
  now: number,
  me: Snowflake | undefined,
): Pulse {
  const who = new Set<Snowflake>();
  for (const c of g.channels) {
    for (const [user, until] of Object.entries(typing[c.id] ?? {})) {
      if (user !== me && until > now) who.add(user);
    }
  }
  const voice = (g.voice_states ?? []).filter(v => v.channel_id).length;
  return { typing: who.size, voice };
}

/** «2 пишут · 3 в голосе»; empty when nothing is going on. */
export function pulseText(p: Pulse): string {
  const parts: string[] = [];
  if (p.typing) parts.push(`${p.typing} ${p.typing === 1 ? 'пишет' : 'пишут'}`);
  if (p.voice) parts.push(`${p.voice} в голосе`);
  return parts.join(' · ');
}
