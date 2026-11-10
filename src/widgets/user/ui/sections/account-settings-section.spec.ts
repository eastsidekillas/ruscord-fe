import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService, Mood, User } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import { AppStateStore } from '@entities/app-state';
import { MinuteClock } from '@entities/profile';
import { NotificationService } from '@shared/model/notification.service';
import { AccountSettingsSectionComponent, draftMood } from './account-settings-section';

const NOW = new Date(2026, 10, 10, 15, 30);

export function profileUser(extra: Partial<User> = {}): User {
  return {
    id: 'u1', username: 'ann', display_name: 'Аня', avatar: null, email: 'ann@example.com',
    created_at: '2026-01-01T00:00:00Z', status: 'online', bio: 'Привет', profile_color: 'accent', ...extra,
  };
}

/** What the section needs around it; `api.updateMe` answers with the patched user. */
export function profileProviders(user: User) {
  const current = signal(user);
  const api = {
    updateMe: jasmine.createSpy('updateMe').and.callFake((patch: Record<string, unknown>) => {
      const { mood, ...rest } = patch;
      const next = { ...current(), ...rest } as User;
      if ('mood' in patch) {
        if (mood) next.mood = mood as Mood;
        else delete next.mood;
      }
      return of(next);
    }),
    setAvatar: jasmine.createSpy('setAvatar'),
    deleteAvatar: jasmine.createSpy('deleteAvatar'),
  };
  const auth = { user: current, setUser: jasmine.createSpy('setUser').and.callFake((u: User) => current.set(u)), logout: jasmine.createSpy('logout').and.returnValue(of(null)) };
  const notify = { show: jasmine.createSpy('show') };
  return {
    api, auth, notify,
    providers: [
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: auth },
      { provide: NotificationService, useValue: notify },
      { provide: MinuteClock, useValue: { now: signal(NOW) } },
      { provide: AppStateStore, useValue: { status: () => 'online' } },
    ],
  };
}

describe('draftMood', () => {
  const saved: Mood = { state: 'happy', text: 'ура', expires_at: '2026-11-10T20:00:00.000Z' };

  it('is null without a face, whatever the text', () => {
    expect(draftMood(null, 'текст', 'hour', saved, NOW)).toBeNull();
  });

  it('keeps the saved expiry, or counts a new one from now', () => {
    expect(draftMood('happy', ' ура ', 'keep', saved, NOW)).toEqual(saved);
    expect(draftMood('angry', '', 'hour', saved, NOW)).toEqual({ state: 'angry', text: '', expires_at: new Date(2026, 10, 10, 16, 30).toISOString() });
    expect(draftMood('angry', '', 'never', saved, NOW)!.expires_at).toBeNull();
    expect(draftMood('angry', '', 'keep', null, NOW)!.expires_at).toBeNull();
  });
});

describe('AccountSettingsSectionComponent', () => {
  let env: ReturnType<typeof profileProviders>;
  let fixture: ComponentFixture<AccountSettingsSectionComponent>;

  function render(user: User) {
    env = profileProviders(user);
    TestBed.configureTestingModule({ providers: env.providers });
    fixture = TestBed.createComponent(AccountSettingsSectionComponent);
    fixture.detectChanges();
  }
  const el = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el().querySelector(sel) as HTMLElement | null;
  const click = (sel: string) => {
    q(sel)!.click();
    fixture.detectChanges();
  };
  const type = (sel: string, value: string) => {
    const input = q(sel) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const save = async () => {
    const ok = await fixture.componentInstance.saveChanges();
    fixture.detectChanges();
    return ok;
  };
  const patch = () => env.api.updateMe.calls.mostRecent().args[0];

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(NOW);
  });
  afterEach(() => jasmine.clock().uninstall());

  it('starts clean: no unsaved bar, no presence status in the form, the card shows the user', () => {
    render(profileUser());
    expect(q('[data-unsaved]')).toBeNull();
    expect(el().querySelector('input[name=status]')).toBeNull();
    expect(q('[data-profile-card]')!.textContent).toContain('Аня');
    expect((q('#p-mood-text') as HTMLInputElement).disabled).toBeTrue();
  });

  it('sets a mood: the card follows the form, the save sends the face and the trimmed phrase', async () => {
    render(profileUser());
    click('[data-mood=thinking]');
    type('#p-mood-text', '  над планом ');
    expect(q('[data-profile-mood]')!.getAttribute('data-mood-state')).toBe('thinking');
    expect(q('[data-profile-mood-text]')!.textContent).toContain('над планом');
    expect(q('[data-unsaved]')).not.toBeNull();

    expect(await save()).toBeTrue();
    expect(patch()).toEqual({ mood: { state: 'thinking', text: 'над планом', expires_at: null } });
    expect(q('[data-unsaved]')).toBeNull();
    expect(env.auth.setUser).toHaveBeenCalled();
  });

  it('counts the expiry from the moment of saving', async () => {
    render(profileUser());
    click('[data-mood=sleeping]');
    click('[data-expiry=hour]');
    jasmine.clock().mockDate(new Date(2026, 10, 10, 15, 40));
    await save();
    expect(patch().mood.expires_at).toBe(new Date(2026, 10, 10, 16, 40).toISOString());
  });

  it('takes the mood off when the chosen face is picked again', async () => {
    render(profileUser({ mood: { state: 'happy', text: 'ура', expires_at: null } }));
    expect(q('[data-mood=happy]')!.getAttribute('aria-checked')).toBe('true');
    click('[data-mood=happy]');
    expect(q('[data-profile-mood]')).toBeNull();
    await save();
    expect(patch()).toEqual({ mood: null });
  });

  it('leaves the mood out of the request when only «о себе» changed, so its expiry does not move', async () => {
    const expires_at = new Date(2026, 10, 10, 18, 0).toISOString();
    render(profileUser({ mood: { state: 'happy', text: 'ура', expires_at } }));
    expect(q('[data-expiry=keep]')!.getAttribute('aria-checked')).toBe('true');
    expect(q('[data-expiry=keep]')!.textContent).toContain('до 18:00');
    type('#p-bio', 'Новое о себе');
    await save();
    expect(patch()).toEqual({ bio: 'Новое о себе' });
  });

  it('sends the saved expiry when only the phrase changed', async () => {
    const expires_at = new Date(2026, 10, 10, 18, 0).toISOString();
    render(profileUser({ mood: { state: 'happy', text: 'ура', expires_at } }));
    type('#p-mood-text', 'ура!');
    await save();
    expect(patch()).toEqual({ mood: { state: 'happy', text: 'ура!', expires_at } });
  });

  it('treats a saved mood that has expired as none', () => {
    render(profileUser({ mood: { state: 'happy', text: 'ура', expires_at: new Date(2026, 10, 10, 15, 0).toISOString() } }));
    expect(q('[data-mood=happy]')!.getAttribute('aria-checked')).toBe('false');
    expect(q('[data-expiry=keep]')).toBeNull();
    expect(q('[data-unsaved]')).toBeNull();
  });

  it('sends the cover colour alone', async () => {
    render(profileUser());
    click('[data-color=danger]');
    expect(q('[data-profile-card]')!.getAttribute('data-profile-color')).toBe('danger');
    await save();
    expect(patch()).toEqual({ profile_color: 'danger' });
  });

  it('«Сбросить» brings the saved profile back', () => {
    render(profileUser());
    click('[data-mood=angry]');
    click('[data-color=warning]');
    type('#p-name', 'Другое имя');
    const reset = [...el().querySelectorAll('[data-unsaved] button')].find(b => b.textContent!.includes('Сбросить')) as HTMLElement;
    reset.click();
    fixture.detectChanges();
    expect(q('[data-unsaved]')).toBeNull();
    expect((q('#p-name') as HTMLInputElement).value).toBe('Аня');
    expect(q('[data-mood=angry]')!.getAttribute('aria-checked')).toBe('false');
    expect(q('[data-color=accent]')!.getAttribute('aria-checked')).toBe('true');
    expect(env.api.updateMe).not.toHaveBeenCalled();
  });

  it('keeps the changes and reports a failed save', async () => {
    render(profileUser());
    env.api.updateMe.and.returnValue(throwError(() => ({ error: { message: 'Нет связи' } })));
    click('[data-mood=angry]');
    expect(await save()).toBeFalse();
    expect(q('[data-unsaved]')).not.toBeNull();
    expect(env.notify.show).toHaveBeenCalledWith(jasmine.any(String), 'error');
  });
});
