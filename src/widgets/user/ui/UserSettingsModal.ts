import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, X } from 'lucide-angular';
import { AuthService } from '@entities/session/api/auth.service';
import { ModalService } from '@shared/model/modal.service';
import { AccountSettingsSectionComponent } from './sections/account-settings-section';
import { DevicesSectionComponent } from './sections/devices-section';
import { SecuritySectionComponent } from './sections/security-section';
import { SETTINGS_GROUPS, sectionFrom, SettingsSection } from './settings-sections';


/**
 * User settings over the whole window, by the mockups «Настройки: профиль»
 * and «Настройки: устройства и безопасность»: sections on the left, the
 * section on the right, Esc or the cross closes.
 */
@Component({
  selector: 'UserSettingsModal',
  standalone: true,
  imports: [LucideAngularModule, AccountSettingsSectionComponent, DevicesSectionComponent, SecuritySectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex flex-wrap overflow-y-auto bg-ok-bg text-ok-text text-[15px] leading-normal">
      <nav aria-label="Разделы настроек"
           class="flex-[1_1_280px] max-w-[320px] min-h-full box-border bg-ok-sidebar pt-12 pb-6 pl-8 pr-4 flex flex-col gap-0.5">
        @for (g of groups; track g.label) {
          <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-3 pb-2 pt-3 uppercase">{{ g.label }}</div>
          @for (s of g.items; track s.key) {
            <button type="button" (click)="section.set(s.key)" [attr.aria-current]="section() === s.key ? 'page' : null"
                    class="text-left px-3 py-2.5 rounded-ok-md"
                    [class]="section() === s.key ? 'bg-ok-accent text-ok-on-accent font-bold' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-1'">
              {{ s.label }}
            </button>
          }
        }
        <div class="h-px bg-ok-border my-3"></div>
        <button type="button" (click)="logout()" class="text-left px-3 py-2.5 rounded-ok-md text-ok-danger hover:bg-ok-surface-1">Выйти</button>
      </nav>

      <main class="flex-[999_1_560px] min-w-0 box-border px-10 py-12">
        <div class="flex items-start gap-3" [class]="wide() ? 'max-w-[1080px]' : 'max-w-[760px]'">
          <div class="flex-1 min-w-0">
            @switch (section()) {
              @case ('profile') { <AccountSettingsSection /> }
              @case ('login') {
                <div class="flex flex-col gap-10">
                  <DevicesSection />
                  <SecuritySection />
                </div>
              }
            }
          </div>
          <button type="button" (click)="modal.close()" aria-label="Закрыть настройки" title="Закрыть (Esc)"
                  class="w-10 h-10 shrink-0 rounded-[10px] border border-ok-border-control text-ok-muted hover:text-ok-text flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="X"></lucide-angular>
          </button>
        </div>
      </main>
    </div>
  `,
})
export class UserSettingsModal {
  protected readonly modal = inject(ModalService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly groups = SETTINGS_GROUPS;
  /** Opens on the section asked for (modal data: section), else the profile. */
  protected readonly section = signal<SettingsSection>(sectionFrom(this.modal.modalData()['section']));
  /** Voice and camera need room for the preview column. */
  protected readonly wide = computed(() => this.section() === 'voice' || this.section() === 'camera');
  protected readonly X = X;

  @HostListener('document:keydown.escape')
  onEscape() {
    this.modal.close();
  }

  protected logout(): void {
    this.modal.close();
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
