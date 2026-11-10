import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, X } from 'lucide-angular';
import { AuthService } from '@entities/session/api/auth.service';
import { ModalService } from '@shared/model/modal.service';
import { AccountSettingsSectionComponent } from './sections/account-settings-section';
import { CameraSectionComponent } from './sections/camera-section';
import { ConnectionSectionComponent } from './sections/connection-section';
import { DevicesSectionComponent } from './sections/devices-section';
import { SecuritySectionComponent } from './sections/security-section';
import { VoiceSectionComponent } from './sections/voice-section';
import { SETTINGS_GROUPS, sectionFrom, SettingsSection } from './settings-sections';


/**
 * User settings over the whole window: sections on the left (profile,
 * voice, camera, connection, sign-in and security), the section on the
 * right, Esc or the cross closes. Leaving the profile with unsaved changes
 * (closing, another section, signing out) asks what to do with them first.
 */
@Component({
  selector: 'UserSettingsModal',
  standalone: true,
  imports: [LucideAngularModule, AccountSettingsSectionComponent, DevicesSectionComponent, SecuritySectionComponent, VoiceSectionComponent, CameraSectionComponent, ConnectionSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex flex-wrap overflow-y-auto bg-ok-bg text-ok-text text-[15px] leading-normal">
      <nav aria-label="Разделы настроек"
           class="flex-[1_1_280px] max-w-[320px] min-h-full box-border bg-ok-sidebar pt-12 pb-6 pl-8 pr-4 flex flex-col gap-0.5">
        @for (g of groups; track g.label) {
          <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-3 pb-2 pt-3 uppercase">{{ g.label }}</div>
          @for (s of g.items; track s.key) {
            <button type="button" (click)="open(s.key)" [attr.aria-current]="section() === s.key ? 'page' : null"
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
              @case ('voice') { <VoiceSection /> }
              @case ('camera') { <CameraSection /> }
              @case ('connection') { <ConnectionSection /> }
              @case ('login') {
                <div class="flex flex-col gap-10">
                  <DevicesSection />
                  <SecuritySection />
                </div>
              }
            }
          </div>
          <button type="button" (click)="close()" aria-label="Закрыть настройки" title="Закрыть (Esc)"
                  class="w-10 h-10 shrink-0 rounded-[10px] border border-ok-border-control text-ok-muted hover:text-ok-text flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="X"></lucide-angular>
          </button>
        </div>
      </main>

      @if (pending()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" data-unsaved-dialog>
          <div role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-text"
               class="w-full max-w-[420px] rounded-ok-lg bg-ok-surface-1 p-6 flex flex-col gap-2">
            <h2 id="unsaved-title" class="m-0 text-[18px] leading-6 font-semibold">Сохранить изменения профиля?</h2>
            <p id="unsaved-text" class="m-0 text-ok-muted">Вы изменили профиль и не сохранили. Если уйти, правки пропадут.</p>
            <div class="mt-4 flex gap-2 flex-wrap justify-end">
              <button type="button" (click)="stay()" [disabled]="saving()"
                      class="h-10 px-4 rounded-[10px] font-semibold text-ok-muted hover:text-ok-text disabled:opacity-50">Остаться</button>
              <button type="button" (click)="leaveUnsaved()" [disabled]="saving()"
                      class="h-10 px-4 rounded-[10px] font-semibold bg-ok-surface-2 text-ok-text disabled:opacity-50">Не сохранять</button>
              <button type="button" (click)="saveAndLeave()" [disabled]="saving()"
                      class="h-10 px-4 rounded-[10px] font-semibold bg-ok-accent text-ok-on-accent disabled:opacity-50">Сохранить</button>
            </div>
          </div>
        </div>
      }
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
  /** Sections with a preview column need the room. */
  protected readonly wide = computed(() => this.section() !== 'login' && this.section() !== 'connection');
  protected readonly X = X;

  private readonly profile = viewChild(AccountSettingsSectionComponent);
  /** What the user was about to do when the unsaved changes stopped them. */
  protected readonly pending = signal<(() => void) | null>(null);
  protected readonly saving = signal(false);

  /** Runs `action` now, or asks first when the profile has unsaved changes. */
  private leaving(action: () => void): void {
    if (this.pending()) return;
    if (this.profile()?.hasChanges()) this.pending.set(action);
    else action();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    // Esc on the question answers «Остаться».
    if (this.pending()) this.stay();
    else this.close();
  }

  protected close(): void {
    this.leaving(() => this.modal.close());
  }

  protected open(section: SettingsSection): void {
    if (section !== this.section()) this.leaving(() => this.section.set(section));
  }

  protected logout(): void {
    this.leaving(() => {
      this.modal.close();
      this.auth.logout().subscribe(() => this.router.navigate(['/login']));
    });
  }

  protected stay(): void {
    if (!this.saving()) this.pending.set(null);
  }

  protected leaveUnsaved(): void {
    const action = this.pending();
    this.pending.set(null);
    this.profile()?.discardChanges();
    action?.();
  }

  /** Goes on only after the save worked; a failed one leaves the settings open with the changes. */
  protected async saveAndLeave(): Promise<void> {
    const action = this.pending();
    const profile = this.profile();
    if (!action || !profile || this.saving()) return;
    this.saving.set(true);
    const saved = await profile.saveChanges();
    this.saving.set(false);
    this.pending.set(null);
    if (saved) action();
  }
}
