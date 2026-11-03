import { DOCUMENT, DestroyRef, ElementRef, inject } from '@angular/core';

/**
 * Closes a popup of the calling component (a menu, a list) when the user
 * presses outside the component's element or hits Escape. Call it in the
 * constructor (it injects).
 */
export function dismissOnOutside(isOpen: () => boolean, close: () => void): void {
  const host = inject(ElementRef<HTMLElement>).nativeElement;
  const doc = inject(DOCUMENT);
  // Capture: a press that another handler stops still closes the popup.
  const press = (ev: Event) => {
    if (isOpen() && !host.contains(ev.target as Node)) close();
  };
  const key = (ev: KeyboardEvent) => {
    if (isOpen() && ev.key === 'Escape') close();
  };
  doc.addEventListener('pointerdown', press, true);
  doc.addEventListener('keydown', key);
  inject(DestroyRef).onDestroy(() => {
    doc.removeEventListener('pointerdown', press, true);
    doc.removeEventListener('keydown', key);
  });
}
