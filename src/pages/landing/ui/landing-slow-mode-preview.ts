import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Dolobeb } from '@shared/ui/dolobeb';

/** A channel with slow mode on, for the streamers' section of the front page. */
@Component({
  selector: 'LandingSlowModePreview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dolobeb],
  host: { class: 'block' },
  styles: `
    .raid { border-radius: 20px; background: var(--color-ok-surface-1); border: 1px solid var(--color-ok-border); padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .raid .line { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; }
    .raid .line .av { width: 30px; height: 30px; border-radius: 9px; flex: none; }
    .raid .line small { color: var(--color-ok-muted); }
    .raid .wait { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--color-ok-surface-2); font-size: 13px; color: #B9BEC1; }
    .raid .wait b { color: var(--color-ok-warning); }
    .raid .bar { height: 44px; border-radius: 12px; background: var(--color-ok-bg); border: 1px solid var(--color-ok-border); display: flex; align-items: center;
                 padding: 0 14px; color: var(--color-ok-muted); font-size: 14px; justify-content: space-between; }
  `,
  template: `
    <div class="raid" aria-hidden="true">
      <div class="line"><span class="av" style="background:#7FB2E5"></span><div><b>Шуня</b> <small>модератор</small><div>Добро пожаловать со стрима! Правила в #новости</div></div></div>
      <div class="line"><span class="av" style="background:#7FD1A8"></span><div><b>Лиса</b><div>а когда следующий стрим?</div></div></div>
      <div class="wait"><Dolobeb state="thinking" [size]="32" [animate]="false" /><span>Медленный режим: следующее сообщение через <b>0:24</b></span></div>
      <div class="bar"><span>Написать в #общий</span><span>🐢 30 с</span></div>
    </div>
  `,
})
export class LandingSlowModePreview {}
