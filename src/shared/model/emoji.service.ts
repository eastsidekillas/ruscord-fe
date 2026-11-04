import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EmojiCatalog } from '@shared/lib/emoji';

const RECENT_KEY = 'ruscord.emoji.recent';
const TONE_KEY = 'ruscord.emoji.tone';
const RECENT_MAX = 24;

/** Browser storage may be off (private windows): then nothing is kept. */
function stored<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function store(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // not kept: fine
  }
}

/**
 * The emoji catalog, loaded the first time a picker opens (about 100 KB),
 * and what this browser remembers: recent emoji and the skin tone.
 */
@Injectable({ providedIn: 'root' })
export class EmojiService {
  private readonly http = inject(HttpClient);
  private loading = false;

  readonly catalog = signal<EmojiCatalog | null>(null);
  readonly failed = signal(false);
  readonly recent = signal<string[]>(stored<string[]>(RECENT_KEY, []).filter(e => typeof e === 'string'));
  readonly tone = signal<number>(Number(stored<number>(TONE_KEY, 0)) || 0);

  load(): void {
    if (this.catalog() || this.loading) return;
    this.loading = true;
    this.failed.set(false);
    this.http.get<EmojiCatalog>('emoji/data.json').subscribe({
      next: c => this.catalog.set(c),
      error: () => {
        this.loading = false;
        this.failed.set(true);
      },
    });
  }

  used(emoji: string): void {
    const next = [emoji, ...this.recent().filter(e => e !== emoji)].slice(0, RECENT_MAX);
    this.recent.set(next);
    store(RECENT_KEY, next);
  }

  setTone(tone: number): void {
    this.tone.set(tone);
    store(TONE_KEY, tone);
  }
}
