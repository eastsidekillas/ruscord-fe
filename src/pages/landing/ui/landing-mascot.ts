import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Dolobeb, DOLOBEB_LABELS, DolobebState } from '@shared/ui/dolobeb';

/** What dolobeb says about each mood in the gallery. */
const MOODS: Record<string, { state: DolobebState; line: string }> = {
  happy: { state: 'happy', line: 'Кто-то подсел в голос. Долобеб доволен.' },
  laughing: { state: 'laughing', line: 'В чате мемы. Долобеб не сдерживается.' },
  thinking: { state: 'thinking', line: 'Ищет то сообщение из прошлого вторника.' },
  surprised: { state: 'surprised', line: 'Пришло сорок человек со стрима разом.' },
  speaking: { state: 'speaking', line: 'Говорит. Зелёная рамка — это он.' },
  sleeping: { state: 'sleeping', line: 'Все разошлись. Долобеб ждёт до вечера.' },
};

/** The front page's dolobeb: hover, focus or tap a mood to see it. */
@Component({
  selector: 'LandingMascot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dolobeb],
  host: { class: 'block' },
  styles: `
    .mascot { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 40px; align-items: center;
              padding: 40px; border-radius: 28px; background: linear-gradient(135deg, rgba(127,178,229,.12), rgba(127,209,168,.06)), var(--color-ok-sidebar);
              border: 1px solid var(--color-ok-border); }
    .stage { display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
    .stage .say { min-height: 48px; font-size: 17px; font-weight: 700; max-width: 320px; }
    .moods { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .moods button { height: 40px; padding: 0 14px 0 6px; border-radius: 12px; border: 1px solid var(--color-ok-border); background: var(--color-ok-surface-1);
                    color: var(--color-ok-text); font: 700 14px inherit; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
    .moods button[aria-pressed='true'] { border-color: var(--color-ok-accent); background: var(--color-ok-surface-2); }
    .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-ok-muted); }
    h2 { margin: 10px 0 0; font-size: 40px; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; }
    p { margin: 0; }
    @media (max-width: 980px) { .mascot { grid-template-columns: minmax(0, 1fr); } }
    @media (max-width: 640px) { .mascot { padding: 24px; } h2 { font-size: 32px; } }
  `,
  template: `
    <div class="mascot">
      <div class="stage">
        <Dolobeb [state]="moodState()" [size]="200" [label]="moodLabel()" />
        <p class="say" aria-live="polite">{{ moodLine() }}</p>
      </div>
      <div>
        <div class="eyebrow">Талисман</div>
        <h2 id="dolobeb-title">Знакомься: долобеб</h2>
        <p style="margin-top:14px;font-size:17px;color:#B9BEC1">Он живёт в пустых каналах, радуется, когда кто-то подсел, и засыпает, когда все разошлись. Наведи — покажет настроение.</p>
        <div class="moods" role="group" aria-label="Настроения долобеба">
          <button type="button" [attr.aria-pressed]="mood() === 'happy'" (mouseenter)="mood.set('happy')" (focus)="mood.set('happy')" (click)="mood.set('happy')"><Dolobeb state="happy" [size]="28" [animate]="false" />Радуется</button>
          <button type="button" [attr.aria-pressed]="mood() === 'laughing'" (mouseenter)="mood.set('laughing')" (focus)="mood.set('laughing')" (click)="mood.set('laughing')"><Dolobeb state="laughing" [size]="28" [animate]="false" />Ржёт</button>
          <button type="button" [attr.aria-pressed]="mood() === 'thinking'" (mouseenter)="mood.set('thinking')" (focus)="mood.set('thinking')" (click)="mood.set('thinking')"><Dolobeb state="thinking" [size]="28" [animate]="false" />Думает</button>
          <button type="button" [attr.aria-pressed]="mood() === 'surprised'" (mouseenter)="mood.set('surprised')" (focus)="mood.set('surprised')" (click)="mood.set('surprised')"><Dolobeb state="surprised" [size]="28" [animate]="false" />Удивлён</button>
          <button type="button" [attr.aria-pressed]="mood() === 'speaking'" (mouseenter)="mood.set('speaking')" (focus)="mood.set('speaking')" (click)="mood.set('speaking')"><Dolobeb state="speaking" [size]="28" [animate]="false" />Говорит</button>
          <button type="button" [attr.aria-pressed]="mood() === 'sleeping'" (mouseenter)="mood.set('sleeping')" (focus)="mood.set('sleeping')" (click)="mood.set('sleeping')"><Dolobeb state="sleeping" [size]="28" [animate]="false" />Спит</button>
        </div>
      </div>
    </div>
  `,
})
export class LandingMascot {
  protected readonly mood = signal<keyof typeof MOODS>('happy');
  protected readonly moodState = computed(() => MOODS[this.mood()].state);
  protected readonly moodLine = computed(() => MOODS[this.mood()].line);
  protected readonly moodLabel = computed(() => DOLOBEB_LABELS[this.moodState()]);
}
