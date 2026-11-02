import { TestBed } from '@angular/core/testing';
import { Dolobeb, DOLOBEB_STATES, DolobebState } from './dolobeb';

function render(state: DolobebState, size: number | 'sm' | 'md' | 'lg' = 96, label: string | null = null) {
  const fixture = TestBed.createComponent(Dolobeb);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('size', size);
  fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Dolobeb', () => {
  it('draws the same body and both eyes in every state', () => {
    for (const state of DOLOBEB_STATES) {
      const el = render(state);
      expect(el.getAttribute('data-state')).withContext(state).toBe(state);
      expect(el.querySelectorAll('.body').length).withContext(state).toBe(1);
      expect(el.querySelectorAll('ellipse.white, circle.white').length).withContext(state).toBe(2);
    }
  });

  it('shows the two front teeth only with an open mouth', () => {
    expect(render('idle').querySelectorAll('rect.white').length).toBe(2);
    expect(render('laughing').querySelectorAll('rect.white').length).toBe(2);
    expect(render('surprised').querySelectorAll('rect.white').length).toBe(0);
    expect(render('angry').querySelectorAll('rect.white').length).toBe(0);
  });

  it('hides outer marks below 48px', () => {
    expect(render('happy', 96).querySelectorAll('.mark').length).toBe(3);
    expect(render('happy', 'sm').querySelectorAll('.mark').length).toBe(0);
    expect(render('error', 32).querySelector('.danger')).toBeNull();
  });

  it('uses no class that Tailwind turns into a utility (outline drew boxes)', () => {
    for (const state of DOLOBEB_STATES) {
      const el = render(state);
      expect(el.querySelectorAll('.outline, .border, .ring, .shadow').length).withContext(state).toBe(0);
    }
  });

  it('never recolours the body for error', () => {
    const el = render('error');
    expect(el.querySelector('.body')!.classList).not.toContain('danger');
    expect(el.querySelectorAll('.danger').length).toBe(1);
  });

  it('is decorative without a label, an image with one', () => {
    const plain = render('idle').querySelector('svg')!;
    expect(plain.getAttribute('aria-hidden')).toBe('true');
    expect(plain.getAttribute('role')).toBeNull();
    const named = render('loading', 96, 'Загрузка').querySelector('svg')!;
    expect(named.getAttribute('role')).toBe('img');
    expect(named.getAttribute('aria-label')).toBe('Загрузка');
  });

  it('sizes the host from presets and numbers', () => {
    expect(render('idle', 'lg').style.width).toBe('96px');
    expect(render('idle', 24).style.height).toBe('24px');
  });
});
