import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { dismissOnOutside } from './dismiss';

@Component({ selector: 'Popup', standalone: true, template: `<button type="button">inside</button>` })
class Popup {
  readonly open = signal(true);
  constructor() {
    dismissOnOutside(this.open, () => this.open.set(false));
  }
}

@Component({ selector: 'TogglePopup', standalone: true, template: `<span>popup</span>` })
class TogglePopup {
  readonly open = signal(true);
  constructor() {
    dismissOnOutside(this.open, () => this.open.set(false), '[data-toggle]');
  }
}

describe('dismissOnOutside', () => {
  const press = (target: EventTarget) => target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

  it('closes on a press outside and on Escape, not on a press inside', () => {
    const f = TestBed.createComponent(Popup);
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    press(el.querySelector('button')!);
    expect(f.componentInstance.open()).toBeTrue();
    press(document.body);
    expect(f.componentInstance.open()).toBeFalse();

    f.componentInstance.open.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(f.componentInstance.open()).toBeFalse();
    el.remove();
  });

  it('leaves a press on its toggle button to the button', () => {
    const f = TestBed.createComponent(TogglePopup);
    const toggle = document.createElement('button');
    toggle.setAttribute('data-toggle', '');
    toggle.innerHTML = '<span>icon</span>';
    document.body.append(f.nativeElement, toggle);
    press(toggle.querySelector('span')!);
    expect(f.componentInstance.open()).toBeTrue();
    press(document.body);
    expect(f.componentInstance.open()).toBeFalse();
    toggle.remove();
    (f.nativeElement as HTMLElement).remove();
  });
});
