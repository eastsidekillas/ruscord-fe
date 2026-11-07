import { Role, Snowflake } from '@shared/api/models';

export interface MemberRow {
  user_id: Snowflake;
  name: string;
  roles: Snowflake[];
}

export interface MemberSection<R extends MemberRow> {
  /** A role id, or 'online' / 'offline' / 'all'. */
  key: string;
  title: string;
  rows: (R & { color: string | null })[];
  offline: boolean;
}

/** A role's colour as CSS; 0 means none. */
export function roleColor(color: number): string | null {
  return color ? `#${(color & 0xffffff).toString(16).padStart(6, '0')}` : null;
}

/**
 * The right column's list, as in Discord: people online grouped under their
 * highest role, the rest under «В сети», and «Не в сети» last. Roles carry
 * no "show separately" flag in the core yet, so every role with someone
 * online gets its group (docs/assumptions.md, A33). Without statuses (a big
 * guild) the same grouping goes over everyone.
 */
export function memberSections<R extends MemberRow>(
  rows: readonly R[],
  roles: readonly Role[],
  guildId: Snowflake,
  statusOf: ((userId: Snowflake) => string) | null,
): MemberSection<R>[] {
  const byId = new Map(roles.filter(r => r.id !== guildId).map(r => [r.id, r]));
  const top = (r: R): Role | null => {
    let best: Role | null = null;
    for (const id of r.roles) {
      const role = byId.get(id);
      if (role && (!best || role.position > best.position || (role.position === best.position && role.id < best.id))) best = role;
    }
    return best;
  };
  const colored = (r: R) => {
    let c: Role | null = null;
    for (const id of r.roles) {
      const role = byId.get(id);
      if (role?.color && (!c || role.position > c.position)) c = role;
    }
    return { ...r, color: c ? roleColor(c.color) : null };
  };
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ru');

  const online = statusOf ? rows.filter(r => statusOf(r.user_id) !== 'offline') : [...rows];
  const offline = statusOf ? rows.filter(r => statusOf(r.user_id) === 'offline') : [];

  const groups = new Map<string, { role: Role; rows: R[] }>();
  const plain: R[] = [];
  for (const r of online) {
    const role = top(r);
    if (!role) {
      plain.push(r);
      continue;
    }
    const g = groups.get(role.id) ?? { role, rows: [] };
    g.rows.push(r);
    groups.set(role.id, g);
  }

  const sections: MemberSection<R>[] = [...groups.values()]
    .sort((a, b) => b.role.position - a.role.position || (a.role.id < b.role.id ? -1 : 1))
    .map(g => ({ key: g.role.id, title: g.role.name.toUpperCase(), rows: g.rows.map(colored).sort(byName), offline: false }));
  if (plain.length) {
    sections.push({ key: statusOf ? 'online' : 'all', title: statusOf ? 'В СЕТИ' : 'УЧАСТНИКИ', rows: plain.map(colored).sort(byName), offline: false });
  }
  if (offline.length) {
    sections.push({ key: 'offline', title: 'НЕ В СЕТИ', rows: offline.map(colored).sort(byName), offline: true });
  }
  return sections;
}
