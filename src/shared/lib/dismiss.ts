import { DOCUMENT, DestroyRef, ElementRef, inject } from '@angular/core';

/**
 * Closes a popup of the calling component (a menu, a list) when the user
 * presses outside the component's element or hits Escape. Call it in the
 * constructor (it injects). Presses on elements matching `toggle` (the
 * button that opens the popup) are left to that button, so that pressing
 * it again closes the popup instead of reopening it.
 */
export function dismissOnOutside(isOpen: () => boolean, close: () => void, toggle?: string): void {
  const host = inject(ElementRef<HTMLElement>).nativeElement;
  const doc = inject(DOCUMENT);
  // Capture: a press that another handler stops still closes the popup.
  const press = (ev: Event) => {
    const t = ev.target as Element | null;
    if (isOpen() && !host.contains(t) && !(toggle && t?.closest?.(toggle))) close();
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
