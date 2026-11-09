export type SettingsSection = 'profile' | 'login' | 'voice' | 'camera' | 'connection';

/** The settings menu: captions and the sections under them. */
export const SETTINGS_GROUPS: readonly { label: string; items: readonly { key: SettingsSection; label: string }[] }[] = [
  { label: 'АККАУНТ', items: [
    { key: 'profile', label: 'Профиль' },
    { key: 'login', label: 'Вход и сеансы' },
  ] },
  { label: 'ЗВОНКИ', items: [
    { key: 'voice', label: 'Голос' },
    { key: 'camera', label: 'Камера' },
    { key: 'connection', label: 'Соединение' },
  ] },
];

/** The section named by modal data, or the profile when it is missing or unknown. */
export function sectionFrom(value: unknown): SettingsSection {
  return SETTINGS_GROUPS.some(g => g.items.some(i => i.key === value)) ? (value as SettingsSection) : 'profile';
}
