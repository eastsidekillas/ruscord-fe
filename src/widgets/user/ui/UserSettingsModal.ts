import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@shared/model/modal.service';
import {SettingsSidebar} from '@widgets/user/ui/sidebar/settings-list-sidebar';
import {AccountSettingsSectionComponent} from '@widgets/user/ui/sections/account-settings-section';

@Component({
  selector: 'UserSettingsModal',
  standalone: true,
  imports: [CommonModule, SettingsSidebar, AccountSettingsSectionComponent],
  template: `
    <div class="fixed inset-0 bg-sidebar-surface-primary bg-opacity-70 z-50 flex items-center justify-center">
      <div class="w-full h-full container text-white overflow-hidden relative rounded-lg flex">
        <!-- Sidebar -->
        <SettingsSidebar (itemSelected)="onSectionChange($event)" />

        <!-- Content -->
        <div class="flex-1 p-6 overflow-y-auto bg-main-surface-secondary">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Моя учётная запись</h2>
            <button (click)="modalService.close()" class="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
          </div>


          <div class="space-y-4 ">
            <ng-container [ngSwitch]="currentSection">
              <AccountSettingsSection *ngSwitchCase="'account'" />

              <p class="text-1xl" *ngSwitchCase="'devices'">В разработке</p>
              <p class="text-1xl" *ngSwitchCase="'security'">В разработке</p>
              <p class="text-1xl" *ngSwitchCase="'privacy'">В разработке</p>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserSettingsModal {
  modalService = inject(ModalService);
  currentSection: string = 'account';

  get currentSectionLabel() {
    switch (this.currentSection) {
      case 'devices': return 'Устройства';
      case 'security': return 'Безопасность';
      case 'privacy': return 'Приватность';
      default: return 'Моя учётная запись';
    }
  }

  onSectionChange(section: string) {
    this.currentSection = section;
  }
}
