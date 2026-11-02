import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@entities/session/api/auth.service';
import { GatewayService } from '@shared/api';
import { Dolobeb } from './dolobeb';

@Component({
  selector: 'ConnectionOverlay',
  standalone: true,
  imports: [CommonModule, Dolobeb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .overlay {
      position: fixed; inset: 0; z-index: 9998;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ok-bg);
      transition: opacity .35s ease, visibility .35s ease;
    }
    .overlay.hidden { opacity: 0; visibility: hidden; pointer-events: none; }

    .inner {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      animation: co-in .4s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes co-in {
      from { opacity: 0; transform: translateY(12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

  `,
  template: `
    <div class="overlay" [class.hidden]="!visible()">
      <div class="inner">
        <Dolobeb [state]="stopped() ? 'error' : 'loading'" [size]="96" />
        <div style="text-align:center;display:flex;flex-direction:column;gap:6px">
          <span style="color:var(--color-ok-text);font-size:18px;font-weight:600">
            {{ stopped() ? 'Соединение закрыто' : 'Нет соединения' }}
          </span>
          <span style="color:var(--color-ok-muted);font-size:13px">
            {{ stopped() ? 'Открыто слишком много вкладок или версия устарела. Обновите страницу.' : 'Переподключение к серверу...' }}
          </span>
        </div>
      </div>
    </div>
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
