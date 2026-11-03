import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { VoiceService } from '@entities/voice';
import type { Route, StreamStats } from '@entities/voice';

const ROUTES: Record<Route, string> = { udp: 'UDP напрямую', tcp: 'TCP (UDP не прошёл)', relay: 'через TURN' };
const LIMITS: Record<string, string> = { bandwidth: 'не хватает сети', cpu: 'не хватает процессора', other: 'другое' };

/** One stream in words: «1280×720 · 30 к/с · 1800 кбит/с · VP8». */
export function describe(s: StreamStats | null | undefined): string {
  if (!s) return '—';
  const parts = [
    s.width && s.height ? `${s.width}×${s.height}` : null,
    s.fps !== undefined ? `${Math.round(s.fps)} к/с` : null,
    s.kbps !== undefined ? `${s.kbps} кбит/с` : null,
    s.codec ?? null,
    s.bufferMs !== undefined ? `буфер ${s.bufferMs} мс` : null,
    s.limit ? `ограничено: ${LIMITS[s.limit] ?? s.limit}` : null,
  ];
  return parts.filter(Boolean).join(' · ') || '—';
}

/**
 * «Статистика соединения»: what we send and receive, why quality drops and
 * how far each person's sound lags their camera. Refreshes while shown.
 */
@Component({
  selector: 'VoiceStats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-voice-stats': '' },
  template: `
    @if (voice.stats(); as s) {
      <dl class="m-0 flex flex-col gap-1.5 text-[12px] leading-4">
        <div><dt class="text-ok-muted">Соединение</dt>
          <dd class="m-0">{{ s.connection.route ? routes[s.connection.route] : '—' }}{{ s.connection.rttMs !== undefined ? ' · задержка ' + s.connection.rttMs + ' мс' : '' }}</dd></div>
        @if (s.camera) { <div><dt class="text-ok-muted">Ваша камера</dt><dd class="m-0">{{ describe(s.camera) }}</dd></div> }
        @if (s.screen) { <div><dt class="text-ok-muted">Ваш экран</dt><dd class="m-0" data-stats-screen-sent>{{ describe(s.screen) }}</dd></div> }
        @for (p of s.peers; track p.userId) {
          <div class="pt-1 border-t border-ok-border">
            <dt class="font-semibold">{{ p.name }}</dt>
            <dd class="m-0">Звук: {{ describe(p.audio) }}</dd>
            @if (p.camera) { <dd class="m-0">Камера: {{ describe(p.camera) }}</dd> }
            @if (p.screen) { <dd class="m-0">Экран: {{ describe(p.screen) }}</dd> }
            @if (p.avOffsetMs !== undefined) {
              <dd class="m-0" data-stats-av-offset>Звук {{ p.avOffsetMs >= 0 ? 'отстаёт от' : 'опережает' }} камеры на {{ abs(p.avOffsetMs) }} мс</dd>
            }
          </div>
        }
      </dl>
    } @else {
      <p class="m-0 text-[12px] text-ok-muted">Собираю статистику…</p>
    }
  `,
})
export class VoiceStats {
  protected readonly voice = inject(VoiceService);
  protected readonly routes = ROUTES;
  protected readonly describe = describe;
  protected readonly abs = Math.abs;
  private readonly connected = computed(() => this.voice.status() === 'connected');

  constructor() {
    effect(onCleanup => {
      this.voice.watchStats(this.connected());
      onCleanup(() => this.voice.watchStats(false));
    });
  }
}
