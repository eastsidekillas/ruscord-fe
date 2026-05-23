import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import { SettingsSidebar } from '@widgets/user/ui/sidebar/settings-list-sidebar';
import { AccountSettingsSectionComponent } from '@widgets/user/ui/sections/account-settings-section';

@Component({
  selector: 'UserSettingsModal',
  standalone: true,
  imports: [CommonModule, SettingsSidebar, AccountSettingsSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex">

      <!-- Left navigation panel (covers left portion of screen) -->
      <div class="bg-[#1e1e1e] flex-none flex justify-end" style="width: clamp(200px, 28%, 320px)">
        <SettingsSidebar (itemSelected)="currentSection.set($event)" />
      </div>

      <!-- Right content panel (covers the rest) -->
      <div class="flex-1 bg-main-surface-secondary relative overflow-hidden">

        <!-- Scrollable content area -->
        <div class="h-full overflow-y-auto">
          <div class="px-10 pt-10 pb-24" style="max-width: 740px">

            <h2 class="text-xl font-bold text-white mb-1">{{ sectionLabel() }}</h2>
            <div class="border-b border-white/10 mb-6"></div>

            <ng-container [ngSwitch]="currentSection()">
              <AccountSettingsSection *ngSwitchCase="'account'" />
              <div *ngSwitchDefault class="flex flex-col items-center justify-center py-24 text-center">
                <div class="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
                  <svg class="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <p class="text-gray-300 font-semibold">Раздел в разработке</p>
                <p class="text-gray-500 text-sm mt-1">Скоро здесь появятся настройки</p>
              </div>
            </ng-container>

          </div>
        </div>

        <!-- Close button: absolute so it doesn't affect scroll area width -->
        <div class="absolute top-6 right-6 flex flex-col items-center z-10">
          <button
            (click)="modalService.close()"
            class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center
                   text-gray-400 hover:text-white hover:border-white/40 transition-colors"
            title="Закрыть (Esc)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <span class="text-[10px] text-gray-600 mt-1.5">ESC</span>
        </div>

      </div>
    </div>
  `,
})
export class UserSettingsModal {
  readonly modalService = inject(ModalService);
  readonly currentSection = signal('account');

  readonly sectionLabel = () => {
    switch (this.currentSection()) {
      case 'account':       return 'Моя учётная запись';
      case 'security':      return 'Безопасность';
      case 'privacy':       return 'Приватность';
      case 'notifications': return 'Уведомления';
      case 'devices':       return 'Устройства';
      default:              return 'Настройки';
    }
  };

  @HostListener('document:keydown.escape')
  onEscape() {
    this.modalService.close();
  }
}
