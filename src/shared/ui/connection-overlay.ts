import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  effect,
  DestroyRef,
} from '@angular/core';
import { AuthService } from '@entities/session/api/auth.service';
import { GatewayService } from '@shared/api';
import { Dolobeb } from './dolobeb';

@Component({
  selector: 'ConnectionOverlay',
  standalone: true,
  imports: [Dolobeb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .overlay {
      position: fixed; inset: 0; z-index: 9998;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ok-bg);
    }
    .inner {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      animation: co-in .4s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes co-in {
      from { opacity: 0; transform: translateY(12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) { .inner { animation: none; } }
  `,
  template: `
    @if (visible()) {
      @if (stopped()) {
        <div class="overlay">
          <div class="inner" role="alert">
            <Dolobeb state="error" [size]="96" />
            <div class="flex flex-col gap-1.5 text-center max-w-[360px] px-4">
              <span class="text-[18px] font-semibold text-ok-danger">Соединение закрыто</span>
              <span class="text-[13px] text-ok-muted">Открыто слишком много вкладок или версия устарела. Обновите страницу.</span>
            </div>
          </div>
        </div>
      } @else {
        <div role="status" class="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-ok-surface-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] whitespace-nowrap">
          <span class="w-2.5 h-2.5 rounded-full bg-ok-warning"></span>
          <span>
            <span class="block text-[13px] font-semibold">Нет соединения</span>
            <span class="block text-[12px] text-ok-muted">Переподключение к серверу...</span>
          </span>
        </div>
      }
    }
  `,
})
export class ConnectionOverlay {
  private readonly gateway = inject(GatewayService);
  private readonly auth = inject(AuthService);

  protected readonly stopped = computed(() => this.gateway.status() === 'stopped' && this.auth.signedIn());
  /** Shown 2 s after the connection is lost, so short drops do not flash. */
  protected readonly visible = signal(false);
  private showTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const signedIn = this.auth.signedIn();
      const status = this.gateway.status();
      clearTimeout(this.showTimer);
      if (!signedIn || status === 'ready' || status === 'offline') {
        this.visible.set(false);
      } else if (status === 'stopped') {
        this.visible.set(true);
      } else {
        this.showTimer = setTimeout(() => this.visible.set(true), 2000);
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.showTimer));
  }
}
