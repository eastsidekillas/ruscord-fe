import { Message } from '@shared/api';

/** The message pings the viewer: by name, by a role they have or @everyone; never their own. */
export function mentionsMe(m: Message, me: string | null | undefined, myRoles: string[]): boolean {
  if (!me || m.author?.id === me) return false;
  return m.mention_everyone || (m.mentions ?? []).includes(me) || (m.mention_roles ?? []).some(r => myRoles.includes(r));
}
