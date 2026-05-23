import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@entities/session/api/auth.service';
import { ModalService } from '@shared/model/modal.service';

interface SettingsItem {
  key: string;
  label: string;
  icon: string;
}

interface SettingsGroup {
  title: string;
  items: SettingsItem[];
}

@Component({
  selector: 'SettingsSidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-56 lg:w-60 bg-sidebar-surface-primary h-full flex flex-col py-6 px-3 shrink-0">
      <div class="flex-1 overflow-y-auto space-y-5">
        <div *ngFor="let group of groups">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1">{{ group.title }}</p>
          <ul class="space-y-0.5">
            <li *ngFor="let item of group.items">
              <button
                (click)="selectItem(item.key)"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
                [class]="selected === item.key
                  ? 'bg-main-surface-secondary text-white font-medium'
                  : 'text-gray-400 hover:bg-main-surface-secondary hover:text-gray-200'"
              >
                <span class="w-4 h-4 shrink-0" [innerHTML]="item.icon"></span>
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-white/10">
        <button
          (click)="logout()"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Выйти
        </button>
      </div>
    </div>
  `
})
export class SettingsSidebar {
  @Output() itemSelected = new EventEmitter<string>();

  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);

  readonly groups: SettingsGroup[] = [
    {
      title: 'Настройки пользователя',
      items: [
        {
          key: 'account',
          label: 'Моя учётная запись',
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
        },
        {
          key: 'security',
          label: 'Безопасность',
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
        },
        {
          key: 'privacy',
          label: 'Приватность',
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
        },
      ],
    },
    {
      title: 'Настройки приложения',
      items: [
        {
          key: 'notifications',
          label: 'Уведомления',
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`,
        },
        {
          key: 'devices',
          label: 'Устройства',
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
        },
      ],
    },
  ];

  selected = 'account';

  selectItem(key: string) {
    this.selected = key;
    this.itemSelected.emit(key);
  }

  logout() {
    this.modalService.close();
    this.authService.logout();
  }
}
