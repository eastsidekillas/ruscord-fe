import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PublicUser } from '@shared/api';
import { MinuteClock } from '../model/clock';
import { MoodFace } from './mood-face';
import { ProfileCard } from './profile-card';

const NOW = new Date(2026, 10, 10, 15, 30);
const user = (extra: Partial<PublicUser> = {}): PublicUser => ({ id: 'u1', username: 'ann', display_name: 'Аня', avatar: null, ...extra });

describe('ProfileCard', () => {
  let now: ReturnType<typeof signal<Date>>;

  function render(u: PublicUser, bio = '') {
    TestBed.configureTestingModule({ providers: [{ provide: MinuteClock, useValue: { now } }] });
    const fixture = TestBed.createComponent(ProfileCard);
    fixture.componentRef.setInput('user', u);
    fixture.componentRef.setInput('bio', bio);
    fixture.detectChanges();
    return fixture;
  }
  const q = (f: { nativeElement: HTMLElement }, sel: string) => f.nativeElement.querySelector(sel) as HTMLElement | null;

  beforeEach(() => (now = signal(NOW)));

  it('shows the names, «о себе» and the default colour without a mood', () => {
    const f = render(user(), 'Люблю Go');
    expect(f.nativeElement.textContent).toContain('Аня');
    expect(f.nativeElement.textContent).toContain('ann');
    expect(f.nativeElement.textContent).toContain('Люблю Go');
    expect(q(f, '[data-profile-card]')!.getAttribute('data-profile-color')).toBe('accent');
    expect(q(f, '[data-profile-mood]')).toBeNull();
  });

  it('shows the mood: the face, the phrase and when it goes away', () => {
    const f = render(user({
      profile_color: 'danger',
      mood: { state: 'thinking', text: 'над планом', expires_at: new Date(2026, 10, 10, 18, 5).toISOString() },
    }));
    expect(q(f, '[data-profile-mood]')!.getAttribute('data-mood-state')).toBe('thinking');
    expect(q(f, '[data-profile-mood-text]')!.textContent).toContain('над планом');
    expect(f.nativeElement.textContent).toContain('до 18:05');
    expect(q(f, '[data-profile-card]')!.getAttribute('data-profile-color')).toBe('danger');
  });

  it('hides the mood when the clock passes its expiry, without new data', () => {
    const f = render(user({ mood: { state: 'happy', text: 'ура', expires_at: new Date(2026, 10, 10, 15, 31).toISOString() } }));
    expect(q(f, '[data-profile-mood]')).not.toBeNull();
    now.set(new Date(2026, 10, 10, 15, 31));
    f.detectChanges();
    expect(q(f, '[data-profile-mood]')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('ура');
  });
});

describe('MoodFace', () => {
  function render(mood: PublicUser['mood'] | null, at = NOW) {
    const now = signal(at);
    TestBed.configureTestingModule({ providers: [{ provide: MinuteClock, useValue: { now } }] });
    const fixture = TestBed.createComponent(MoodFace);
    fixture.componentRef.setInput('mood', mood);
    fixture.detectChanges();
    return { fixture, now };
  }
  const face = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('[data-mood-face]') as HTMLElement | null;

  it('draws nothing without a mood', () => {
    expect(face(render(null).fixture)).toBeNull();
  });

  it('shows the face with the phrase in the tooltip, and goes away on expiry', () => {
    const { fixture, now } = render({ state: 'sleeping', text: 'до утра', expires_at: new Date(2026, 10, 10, 16, 0).toISOString() });
    expect(face(fixture)!.getAttribute('data-mood-state')).toBe('sleeping');
    expect(face(fixture)!.title).toBe('Сплю: до утра · до 16:00');
    now.set(new Date(2026, 10, 10, 16, 0));
    fixture.detectChanges();
    expect(face(fixture)).toBeNull();
  });
});
