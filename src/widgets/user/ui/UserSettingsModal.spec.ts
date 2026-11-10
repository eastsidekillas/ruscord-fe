import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { UserSettingsModal } from './UserSettingsModal';
import { AccountSettingsSectionComponent } from './sections/account-settings-section';
import { profileProviders, profileUser } from './sections/account-settings-section.spec';

describe('UserSettingsModal: unsaved profile changes', () => {
  let env: ReturnType<typeof profileProviders>;
  let fixture: ComponentFixture<UserSettingsModal>;
  let modal: ModalService;
  let router: { navigate: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const dialog = () => el().querySelector('[data-unsaved-dialog]') as HTMLElement | null;
  const button = (root: ParentNode, text: string) =>
    [...root.querySelectorAll('button')].find(b => b.textContent!.trim() === text) as HTMLButtonElement;
  const press = (root: ParentNode, text: string) => {
    button(root, text).click();
    fixture.detectChanges();
  };
  const escape = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  };
  const change = () => {
    (el().querySelector('[data-mood=angry]') as HTMLElement).click();
    fixture.detectChanges();
  };
  const current = () => el().querySelector('nav [aria-current=page]')!.textContent!.trim();
  const isOpen = () => modal.modalType() === 'userSettings';

  beforeEach(() => {
    env = profileProviders(profileUser());
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({ providers: [...env.providers, { provide: Router, useValue: router }] });
    // Only the profile section is real: the others need devices and the API.
    TestBed.overrideComponent(UserSettingsModal, {
      set: { imports: [LucideAngularModule, AccountSettingsSectionComponent], schemas: [NO_ERRORS_SCHEMA] },
    });
    modal = TestBed.inject(ModalService);
    modal.open('userSettings');
    fixture = TestBed.createComponent(UserSettingsModal);
    fixture.detectChanges();
  });

  it('closes at once without changes', () => {
    escape();
    expect(dialog()).toBeNull();
    expect(isOpen()).toBeFalse();
  });

  it('asks on Esc and on the cross; «Остаться» and a second Esc keep the settings and the changes', () => {
    change();
    escape();
    expect(dialog()).not.toBeNull();
    expect(isOpen()).toBeTrue();
    press(dialog()!, 'Остаться');
    expect(dialog()).toBeNull();

    (el().querySelector('[aria-label="Закрыть настройки"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(dialog()).not.toBeNull();
    escape();
    expect(dialog()).toBeNull();
    expect(isOpen()).toBeTrue();
    expect(el().querySelector('[data-unsaved]')).not.toBeNull();
  });

  it('«Не сохранять» leaves without saving', () => {
    change();
    escape();
    press(dialog()!, 'Не сохранять');
    expect(isOpen()).toBeFalse();
    expect(env.api.updateMe).not.toHaveBeenCalled();
  });

  it('«Сохранить» saves and then leaves', async () => {
    change();
    escape();
    press(dialog()!, 'Сохранить');
    await fixture.whenStable();
    expect(env.api.updateMe).toHaveBeenCalledWith({ mood: { state: 'angry', text: '', expires_at: null } });
    expect(isOpen()).toBeFalse();
  });

  it('stays open with the changes when the save fails', async () => {
    env.api.updateMe.and.returnValue(throwError(() => ({ error: { message: 'Нет связи' } })));
    change();
    escape();
    press(dialog()!, 'Сохранить');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(isOpen()).toBeTrue();
    expect(dialog()).toBeNull();
    expect(el().querySelector('[data-unsaved]')).not.toBeNull();
  });

  it('asks before another section and goes there after the answer', () => {
    change();
    press(el().querySelector('nav')!, 'Голос');
    expect(dialog()).not.toBeNull();
    expect(current()).toBe('Профиль');
    press(dialog()!, 'Не сохранять');
    expect(current()).toBe('Голос');
    expect(isOpen()).toBeTrue();
  });

  it('asks before signing out', () => {
    change();
    press(el().querySelector('nav')!, 'Выйти');
    expect(dialog()).not.toBeNull();
    expect(env.auth.logout).not.toHaveBeenCalled();
    press(dialog()!, 'Не сохранять');
    expect(env.auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
