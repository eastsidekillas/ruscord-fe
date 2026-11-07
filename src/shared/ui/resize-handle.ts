import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ColumnSpec, widthAfterDrag, widthAfterKey } from '@shared/lib/column-width';
import { LayoutService } from '@shared/model/layout.service';

/**
 * The edge of a resizable column: drag it, or focus it and use the arrows,
 * Home and End. A double click returns the default width.
 */
@Component({
  selector: 'ResizeHandle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    tabindex: '0',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'layout.widthOf(spec())()',
    '[attr.aria-valuemin]': 'spec().min',
    '[attr.aria-valuemax]': 'spec().max',
    '[class]': 'edge() === "right" ? "pm-handle -right-[3px]" : "pm-handle -left-[3px]"',
    '(pointerdown)': 'start($event)',
    '(keydown)': 'key($event)',
    '(dblclick)': 'layout.reset(spec())',
  },
  styles: `
    :host.pm-handle { position: absolute; top: 0; bottom: 0; width: 6px; z-index: 20; cursor: col-resize;
                      display: flex; align-items: center; justify-content: center; touch-action: none; }
    :host span { width: 2px; height: 36px; border-radius: 1px; background: transparent; transition: background .15s; }
    :host(:hover) span, :host(:focus-visible) span { background: var(--color-ok-border-control); }
    :host(:focus-visible) { outline: none; }
    :host(:focus-visible) span { background: var(--color-ok-accent); height: 100%; }
  `,
  template: `<span aria-hidden="true"></span>`,
})
export class ResizeHandle {
  readonly spec = input.required<ColumnSpec>();
  /** Which edge of its column the handle sits on. */
  readonly edge = input<'right' | 'left'>('right');
  readonly label = input('Ширина колонки');

  protected readonly layout = inject(LayoutService);

  protected start(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    ev.preventDefault();
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture?.(ev.pointerId);
    const spec = this.spec();
    const begin = this.layout.widthOf(spec)();
    const x0 = ev.clientX;
    let last = begin;
    const move = (e: PointerEvent) => {
      last = widthAfterDrag(spec, begin, e.clientX - x0, this.edge());
      this.layout.preview(spec, last);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      document.body.style.cursor = '';
      this.layout.commit(spec, last);
    };
    document.body.style.cursor = 'col-resize';
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  protected key(ev: KeyboardEvent): void {
    const spec = this.spec();
    const next = widthAfterKey(spec, this.layout.widthOf(spec)(), ev.key, this.edge());
    if (next == null) return;
    ev.preventDefault();
    this.layout.commit(spec, next);
  }
}
