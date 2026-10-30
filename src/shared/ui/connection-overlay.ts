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

@Component({
  selector: 'ConnectionOverlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .overlay {
      position: fixed; inset: 0; z-index: 9998;
      display: flex; align-items: center; justify-content: center;
      background: #212121;
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

    .dots { display: flex; gap: 6px; }
    .dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #01796F;
      animation: co-dot 1.2s ease-in-out infinite;
    }
    .dots span:nth-child(2) { animation-delay: .2s; }
    .dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes co-dot {
      0%, 80%, 100% { opacity: .25; transform: scale(.8); }
      40%           { opacity: 1;   transform: scale(1); }
    }
  `,
  template: `
    <div class="overlay" [class.hidden]="!visible()">
      <div class="inner">
        <img src="logo.png" alt="Ruscord" width="80" height="80" style="border-radius:20px">
        <div style="text-align:center;display:flex;flex-direction:column;gap:6px">
          <span style="color:#fff;font-family:Inter,sans-serif;font-size:18px;font-weight:700">
            {{ stopped() ? 'Соединение закрыто' : 'Нет соединения' }}
          </span>
          <span style="color:#b4b4b4;font-family:Inter,sans-serif;font-size:13px">
            {{ stopped() ? 'Открыто слишком много вкладок или версия устарела. Обновите страницу.' : 'Переподключение к серверу...' }}
          </span>
        </div>
        <div class="dots" *ngIf="!stopped()"><span></span><span></span><span></span></div>
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
