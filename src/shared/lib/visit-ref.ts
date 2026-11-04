/**
 * The tag of the link a visitor came by (`?ref=stream`), for the owner's
 * statistics (ruscord-core ADR-0042). It is kept for 30 days and sent once
 * with the sign-up; the first tagged link wins.
 */
export const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REF_KEY = 'rc_ref';
const REF_RE = /^[a-z0-9_-]{1,32}$/;

/** What the core stores: lower case, or null when it is not a tag. */
export function normalizeRef(s: string | null | undefined): string | null {
  const r = (s ?? '').trim().toLowerCase();
  return REF_RE.test(r) ? r : null;
}

/** The kind of storage the functions take; localStorage in the app. */
export type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The remembered tag, or null when none or expired. */
export function storedRef(store: KeyValue | null, now = Date.now()): string | null {
  try {
    const v = JSON.parse(store?.getItem(REF_KEY) ?? 'null') as { ref?: string; at?: number } | null;
    if (!v || typeof v.at !== 'number' || now - v.at > REF_TTL_MS) return null;
    return normalizeRef(v.ref);
  } catch {
    return null;
  }
}

/** Remembers the tag of search unless one is already kept; returns the tag in effect. */
export function rememberRef(search: string, store: KeyValue | null, now = Date.now()): string | null {
  const kept = storedRef(store, now);
  if (kept) return kept;
  const ref = normalizeRef(new URLSearchParams(search).get('ref'));
  if (ref) {
    try {
      store?.setItem(REF_KEY, JSON.stringify({ ref, at: now }));
    } catch {
      // Storage off (private mode): the tag still counts for this visit.
    }
  }
  return ref;
}

/** Pages a visitor enters by: only these count as a visit of the site. */
export function isEntryPath(path: string): boolean {
  return path === '/' || path === '/login' || path.startsWith('/invite/');
}

/** Browser storage that may be missing or throw. */
export function safeStorage(kind: 'local' | 'session'): KeyValue | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
