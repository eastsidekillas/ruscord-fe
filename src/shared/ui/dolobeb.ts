import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The states of dolobeb (ruscord-core ADR-0030, dolobeb emotion spec). */
export type DolobebState =
  | 'idle'
  | 'happy'
  | 'surprised'
  | 'angry'
  | 'laughing'
  | 'thinking'
  | 'confused'
  | 'error'
  | 'loading'
  | 'success'
  | 'sleeping'
  | 'listening'
  | 'speaking';

export const DOLOBEB_STATES: readonly DolobebState[] = [
  'idle', 'happy', 'surprised', 'angry', 'laughing', 'thinking', 'confused',
  'error', 'loading', 'success', 'sleeping', 'listening', 'speaking',
];

/** Localised names, used as the accessible label when one is not given. */
export const DOLOBEB_LABELS: Record<DolobebState, string> = {
  idle: 'Долобеб',
  happy: 'Долобеб радуется',
  surprised: 'Долобеб удивлён',
  angry: 'Долобеб злится',
  laughing: 'Долобеб смеётся',
  thinking: 'Долобеб задумался',
  confused: 'Долобеб растерян',
  error: 'Долобеб: ошибка',
  loading: 'Долобеб: загрузка',
  success: 'Долобеб: готово',
  sleeping: 'Долобеб спит',
  listening: 'Долобеб слушает',
  speaking: 'Долобеб говорит',
};

type Pupils = { b: [number, number, number, number]; s: [number, number, number] };

const PUPILS: Partial<Record<DolobebState, Pupils>> = {
  idle: { b: [74, 70, 14, 16], s: [172, 104, 11] },
  happy: { b: [78, 62, 14, 16], s: [172, 97, 11] },
  surprised: { b: [88, 78, 9, 10], s: [162, 106, 7] },
  angry: { b: [96, 86, 12, 13], s: [162, 112, 10] },
  thinking: { b: [96, 56, 13, 15], s: [180, 94, 10] },
  confused: { b: [60, 82, 13, 15], s: [180, 112, 10] },
  error: { b: [64, 88, 12, 13], s: [160, 96, 10] },
  loading: { b: [84, 90, 13, 14], s: [166, 116, 10] },
  success: { b: [74, 70, 14, 16], s: [172, 104, 11] },
  listening: { b: [74, 70, 14, 16], s: [172, 104, 11] },
  speaking: { b: [74, 70, 14, 16], s: [172, 104, 11] },
};

/** Open mouths (filled, teeth shown). Others are drawn as lines. */
const OPEN_MOUTH: Partial<Record<DolobebState, string>> = {
  idle: 'M68 150 Q140 168 206 136 Q196 204 136 206 Q82 206 68 150 Z',
  happy: 'M62 144 Q140 166 212 128 Q204 208 136 212 Q76 212 62 144 Z',
  success: 'M62 144 Q140 166 212 128 Q204 208 136 212 Q76 212 62 144 Z',
  laughing: 'M64 144 Q140 162 210 126 Q206 214 136 216 Q72 214 64 144 Z',
  speaking: 'M80 154 Q136 168 192 146 Q186 200 136 204 Q90 204 80 154 Z',
};

const TEETH_DY: Partial<Record<DolobebState, number>> = {
  idle: 0, happy: -2, success: -2, laughing: -4, speaking: 1,
};

const LINE_MOUTH: Partial<Record<DolobebState, string>> = {
  angry: 'M98 198 Q132 170 168 196',
  thinking: 'M110 188 Q140 194 166 176',
  confused: 'M100 190 Q118 180 132 188 Q148 196 166 182',
  error: 'M106 192 L120 184 L134 194 L148 184 L162 192',
  loading: 'M106 186 Q132 198 160 184',
  sleeping: 'M116 190 Q132 198 148 190',
  listening: 'M92 180 Q132 206 176 172',
};

const SIZES = { sm: 32, md: 48, lg: 96 } as const;

/**
 * Dolobeb, the placemood mark and mascot (ruscord-core ADR-0030), as one SVG
 * whose parts — pupils, brows, mouth, teeth, outer marks — change with
 * `state`. Body, eyes and the set of the mouth stay the same in every state.
 *
 * Colours come from the design-system tokens: body `accent`, whites and
 * teeth `text`, outline, pupils and mouth `bg`, the error marker `danger`.
 * Outer marks hide below 48px. Motion plays once per state change and is
 * off under prefers-reduced-motion.
 *
 * Decorative by default (`aria-hidden`); give `label`
 * when the picture is the only signal — and still show the state as text.
 */
@Component({
  selector: 'Dolobeb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dolobeb',
    '[style.width.px]': 'px()',
    '[style.height.px]': 'px()',
    '[attr.data-state]': 'state()',
    '[attr.data-animate]': 'animate() ? "" : null',
  },
  styles: `
    :host { display: inline-block; flex: none; line-height: 0; }
    svg { width: 100%; height: 100%; overflow: visible; }
    .body { fill: var(--color-ok-accent); }
    .ink { fill: var(--color-ok-bg); }
    .white { fill: var(--color-ok-text); }
    .line { fill: none; stroke: var(--color-ok-bg); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
    .outline { stroke: var(--color-ok-bg); stroke-width: 9; stroke-linejoin: round; }
    .mark { fill: none; stroke: var(--color-ok-accent); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
    .mark-fill { fill: var(--color-ok-accent); }
    .danger { fill: var(--color-ok-danger); }
    .head, .mouth { transform-box: fill-box; transform-origin: 50% 50%; }
    .mouth { transition: transform 120ms ease-out; }

    @media (prefers-reduced-motion: no-preference) {
      :host([data-animate]) .head { animation: var(--dolobeb-anim, none); }
      :host([data-animate][data-state='happy']) { --dolobeb-anim: dolobeb-bounce 480ms ease-out 1; }
      :host([data-animate][data-state='success']) { --dolobeb-anim: dolobeb-bounce 520ms ease-out 1; }
      :host([data-animate][data-state='surprised']) { --dolobeb-anim: dolobeb-pop 260ms ease-out 1; }
      :host([data-animate][data-state='laughing']) { --dolobeb-anim: dolobeb-laugh 640ms ease-in-out 1; }
      :host([data-animate][data-state='confused']) { --dolobeb-anim: dolobeb-tilt 320ms ease-out 1 forwards; }
      :host([data-animate][data-state='error']) { --dolobeb-anim: dolobeb-jolt 260ms ease-out 1; }
      :host([data-animate][data-state='sleeping']) { --dolobeb-anim: dolobeb-breathe 3.5s ease-in-out infinite; }
      :host([data-animate]) .dot { animation: dolobeb-dot 1050ms ease-in-out infinite; }
      :host([data-animate]) .dot:nth-child(2) { animation-delay: 175ms; }
      :host([data-animate]) .dot:nth-child(3) { animation-delay: 350ms; }
      :host([data-animate]) .pulse { animation: dolobeb-pulse 1.4s ease-in-out infinite; }
    }
    @keyframes dolobeb-bounce {
      0%, 100% { transform: translateY(0) scale(1, 1); }
      30% { transform: translateY(-3%) scale(.97, 1.03); }
      60% { transform: translateY(0) scale(1.03, .97); }
    }
    @keyframes dolobeb-pop { 0% { transform: scale(.96); } 100% { transform: scale(1); } }
    @keyframes dolobeb-laugh {
      0%, 100% { transform: rotate(0) translateY(0); }
      25% { transform: rotate(3deg) translateY(-2%); }
      50% { transform: rotate(0) translateY(0); }
      75% { transform: rotate(-2deg) translateY(-1.5%); }
    }
    @keyframes dolobeb-tilt { to { transform: rotate(-3deg); } }
    @keyframes dolobeb-jolt { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-1.2%); } 60% { transform: translateX(1%); } }
    @keyframes dolobeb-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.01); } }
    @keyframes dolobeb-dot { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
    @keyframes dolobeb-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
  `,
  template: `
    <svg viewBox="0 0 256 256" focusable="false"
         [attr.role]="decorative() ? null : 'img'"
         [attr.aria-hidden]="decorative() ? 'true' : null"
         [attr.aria-label]="decorative() ? null : ariaLabel()">
      <g class="head">
        <path class="body outline" d="M40 150 C38 95 85 62 140 64 C195 66 228 105 224 155 C220 205 180 236 128 234 C76 232 42 200 40 150 Z" />

        @if (openMouth(); as d) {
          <g class="mouth" [style.transform]="mouthScale()">
            <path class="ink outline" [attr.d]="d" />
            <rect class="white" x="100" [attr.y]="150 + teethDy()" width="25" height="31" rx="5"
                  [attr.transform]="'rotate(-3 114 ' + (164 + teethDy()) + ')'" />
            <rect class="white" x="129" [attr.y]="148 + teethDy()" width="24" height="29" rx="5"
                  [attr.transform]="'rotate(2 139 ' + (161 + teethDy()) + ')'" />
          </g>
        } @else if (state() === 'surprised') {
          <ellipse class="ink" cx="132" cy="184" rx="15" ry="19" />
        } @else if (lineMouth(); as d) {
          <path class="line" [attr.d]="d" />
        }

        <ellipse class="white outline" cx="84" cy="74" rx="50" [attr.ry]="state() === 'surprised' ? 42 : 41"
                 transform="rotate(-30 84 74)" />
        <circle class="white outline" cx="166" cy="104" r="30" />

        @if (pupils(); as p) {
          <ellipse class="ink" [attr.cx]="p.b[0]" [attr.cy]="p.b[1]" [attr.rx]="p.b[2]" [attr.ry]="p.b[3]" />
          <circle class="ink" [attr.cx]="p.s[0]" [attr.cy]="p.s[1]" [attr.r]="p.s[2]" />
        }

        @switch (state()) {
          @case ('angry') {
            <path class="line" d="M44 52 L120 90" />
            <path class="line" d="M144 94 L194 72" />
          }
          @case ('thinking') {
            <path class="line" d="M144 62 L188 54" />
          }
          @case ('laughing') {
            <path class="line" d="M58 86 Q84 56 112 78" />
            <path class="line" d="M150 110 Q166 92 182 110" />
          }
          @case ('sleeping') {
            <path class="line" d="M56 76 Q84 100 112 70" />
            <path class="line" d="M150 104 Q166 118 182 102" />
          }
        }
      </g>

      @if (showMarks()) {
        @switch (state()) {
          @case ('happy') {
            <path class="mark" d="M206 42 L216 22" />
            <path class="mark" d="M218 60 L238 50" />
            <path class="mark" d="M224 80 L246 80" />
          }
          @case ('surprised') {
            <path class="mark" d="M214 50 L230 34" />
          }
          @case ('laughing') {
            <path class="mark" d="M24 132 L14 150" />
            <path class="mark" d="M28 172 L18 190" />
            <path class="mark" d="M236 122 L246 140" />
          }
          @case ('error') {
            <rect class="danger" x="206" y="22" width="34" height="34" rx="9" />
            <path class="line" style="stroke-width: 6" d="M223 31 V41" />
            <circle class="ink" cx="223" cy="48" r="3.5" />
          }
          @case ('loading') {
            <g>
              <circle class="mark-fill dot" cx="198" cy="236" r="7" />
              <circle class="mark-fill dot" cx="218" cy="236" r="7" />
              <circle class="mark-fill dot" cx="238" cy="236" r="7" />
            </g>
          }
          @case ('success') {
            <path class="mark-fill" d="M210 18 Q214 36 232 40 Q214 44 210 62 Q206 44 188 40 Q206 36 210 18 Z" />
            <path class="mark-fill" d="M238 66 Q240 76 250 78 Q240 80 238 90 Q236 80 226 78 Q236 76 238 66 Z" />
          }
          @case ('sleeping') {
            <path class="mark" style="stroke-width: 7" d="M196 38 H218 L196 60 H218" />
            <path class="mark" style="stroke-width: 6" d="M228 14 H242 L228 28 H242" />
          }
          @case ('listening') {
            <path class="mark pulse" d="M234 128 Q246 150 234 172" />
          }
          @case ('speaking') {
            <path class="mark" d="M230 138 V172" />
            <path class="mark" d="M244 126 V184" />
          }
        }
      }
    </svg>
  `,
})
export class Dolobeb {
  readonly state = input<DolobebState>('idle');
  /** px, or sm 32 / md 48 / lg 96. */
  readonly size = input<number | keyof typeof SIZES>('md');
  /** Motion on state change; always off under prefers-reduced-motion. */
  readonly animate = input(true);
  /** 0..1, used only while speaking; smoothed by a short transition. */
  readonly audioLevel = input<number | null>(null);
  /** Accessible name; without it the picture is decorative. */
  readonly label = input<string | null>(null);
  readonly decorative = computed(() => !this.label());

  protected readonly px = computed(() => {
    const s = this.size();
    return typeof s === 'number' ? s : SIZES[s];
  });
  protected readonly showMarks = computed(() => this.px() >= 48);
  protected readonly ariaLabel = computed(() => this.label() || DOLOBEB_LABELS[this.state()]);
  protected readonly pupils = computed(() => PUPILS[this.state()] ?? null);
  protected readonly openMouth = computed(() => OPEN_MOUTH[this.state()] ?? null);
  protected readonly lineMouth = computed(() => LINE_MOUTH[this.state()] ?? null);
  protected readonly teethDy = computed(() => TEETH_DY[this.state()] ?? 0);
  protected readonly mouthScale = computed(() => {
    const level = this.audioLevel();
    if (this.state() !== 'speaking' || level == null) return null;
    const l = Math.min(1, Math.max(0, level));
    return `scaleY(${(0.75 + 0.4 * l).toFixed(3)})`;
  });
}
