import { SETTINGS_GROUPS, sectionFrom } from './settings-sections';

describe('settings sections', () => {
  it('lists the menu groups and labels', () => {
    expect(SETTINGS_GROUPS).toEqual([
      { label: 'АККАУНТ', items: [
        { key: 'profile', label: 'Профиль' },
        { key: 'login', label: 'Вход и сеансы' },
      ] },
      { label: 'ЗВОНКИ', items: [
        { key: 'voice', label: 'Голос' },
        { key: 'camera', label: 'Камера' },
        { key: 'connection', label: 'Соединение' },
      ] },
    ]);
  });

  it('accepts a known section', () => {
    expect(sectionFrom('voice')).toBe('voice');
  });

  it('falls back to the profile for unknown or missing values', () => {
    expect(sectionFrom('security')).toBe('profile');
    expect(sectionFrom(undefined)).toBe('profile');
  });
});
