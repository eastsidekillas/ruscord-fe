import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@shared/api/api.service';
import { AuthService } from '@entities/session/api/auth.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';
import {LucideAngularModule, Upload} from 'lucide-angular';

@Component({
  selector: 'AccountSettingsSection',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarUI, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-24">

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin"></div>
      </div>

      <ng-container *ngIf="!isLoading()">

        <!-- Profile card preview -->
        <div class="rounded-lg overflow-hidden mb-8 border border-white/5 shadow-lg">
          <!-- Banner -->
          <div class="h-20 bg-gradient-to-r from-green-800 via-emerald-700 to-teal-700 relative">

            <!-- Avatar (Кликабельный) -->
            <div class="absolute -bottom-9 left-5">
              <button
                type="button"
                (click)="avatarInput.click()"
                class="group relative block w-[72px] h-[72px] rounded-full border-[4px] border-main-surface-secondary bg-gray-700 overflow-hidden focus:outline-none"
                title="Изменить аватар"
              >
                <!-- Сам компонент аватара -->
                <AvatarUI [src]="avatarPreview()" [name]="name() || username()" />

                <!-- Эффект затемнения и иконка при наведении -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <lucide-angular class="w-5 h-5 text-white" [img]="Upload"></lucide-angular>
                </div>
              </button>
            </div>

          </div>
          <!-- Name row + Кнопка удаления -->
          <div class="bg-sidebar-surface-primary pt-12 px-5 pb-4 flex items-center justify-between gap-4">
            <div>
              <div class="text-white font-bold text-lg leading-tight">{{ name() || username() }}</div>
              <div class="text-gray-400 text-sm">{{ username() }}</div>
            </div>

            <!-- Кнопка удаления аватара (показывается, только если он установлен) -->
            <button
              *ngIf="avatarPreview()"
              type="button"
              (click)="removeAvatar()"
              class="px-2.5 py-1.5 text-xs bg-white/5 hover:bg-red-500/20 hover:text-red-300 rounded-md text-gray-400 transition-colors"
              title="Удалить текущий аватар"
            >
              Удалить аватар
            </button>
          </div>
        </div>

        <!-- Скрытый инпут для выбора файлов (теперь живет тут) -->
        <input #avatarInput type="file" accept="image/*" class="hidden" (change)="onAvatarChange($event)" />

        <!-- Account info -->
        <section class="mb-6">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Учётная запись</h3>
          <div class="bg-sidebar-surface-primary rounded-lg divide-y divide-white/5">
            <div class="px-4 py-3">
              <label class="block text-xs text-gray-500 mb-1">Имя пользователя</label>
              <p class="text-white text-sm">{{ username() }}</p>
            </div>
            <div class="px-4 py-3">
              <label class="block text-xs text-gray-500 mb-1">Электронная почта</label>
              <p class="text-white text-sm">{{ email() }}</p>
            </div>
          </div>
        </section>

        <!-- Profile editing -->
        <section class="mb-6">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Профиль</h3>
          <div class="space-y-4">

            <!-- Display name -->
            <div class="bg-sidebar-surface-primary rounded-lg px-4 py-3">
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Отображаемое имя
              </label>
              <input
                type="text"
                [value]="name()"
                (input)="name.set(getInputValue($event))"
                maxlength="64"
                placeholder="Ваше имя..."
                class="w-full bg-main-surface-secondary text-white text-sm rounded-md px-3 py-2.5
                   border border-transparent focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <!-- Global name -->
            <div class="bg-sidebar-surface-primary rounded-lg px-4 py-3">
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Глобальное имя
              </label>
              <input
                type="text"
                [value]="globalName()"
                (input)="globalName.set(getInputValue($event))"
                maxlength="64"
                placeholder="Псевдоним..."
                class="w-full bg-main-surface-secondary text-white text-sm rounded-md px-3 py-2.5
                   border border-transparent focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <!-- Bio -->
            <div class="bg-sidebar-surface-primary rounded-lg px-4 py-3">
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Обо мне
              </label>
              <textarea
                [value]="bio()"
                (input)="bio.set(getInputValue($event))"
                maxlength="190"
                rows="3"
                placeholder="Расскажи о себе..."
                class="w-full bg-main-surface-secondary text-white text-sm rounded-md px-3 py-2.5 resize-none
                   border border-transparent focus:outline-none focus:border-green-500 transition-colors"
              ></textarea>
              <p class="text-xs text-gray-600 mt-1 text-right">{{ bio().length }}/190</p>
            </div>

          </div>
        </section>

      </ng-container>
    </div>

    <!-- Sticky save bar -->
    <div
      *ngIf="hasChanges()"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
         bg-[#111] border border-white/10 rounded-xl
         px-5 py-3 shadow-2xl flex items-center gap-4 text-sm whitespace-nowrap"
    >
      <span class="text-gray-300">Есть несохранённые изменения</span>
      <button
        (click)="discardChanges()"
        class="text-gray-400 hover:text-white transition-colors px-2"
      >
        Сбросить
      </button>
      <button
        (click)="saveChanges()"
        [disabled]="isSaving()"
        class="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50
           disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
      >
        {{ isSaving() ? 'Сохранение...' : 'Сохранить' }}
      </button>
    </div>
  `,
})
export class AccountSettingsSectionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  readonly name = signal('');
  readonly globalName = signal('');
  readonly bio = signal('');
  readonly username = signal('');
  readonly email = signal('');
  readonly avatarPreview = signal<string | null>(null);
  readonly newAvatarFile = signal<File | null>(null);
  readonly avatarRemoved = signal(false);

  private originalName = '';
  private originalGlobalName = '';
  private originalBio = '';
  private originalAvatar: string | null = null;

  readonly hasChanges = computed(() =>
    this.name() !== this.originalName ||
    this.bio() !== this.originalBio ||
    this.globalName() !== this.originalGlobalName ||
    this.newAvatarFile() !== null ||
    this.avatarRemoved()
  );

  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    this.isLoading.set(true);
    this.api.getMyProfile().subscribe({
      next: (profile: any) => {
        this.applyProfile(profile);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback to auth cache
        const user = this.auth.currentUserValue;
        if (user) {
          this.username.set(user.username || '');
          this.email.set(user.email || '');
          this.name.set(user.name || '');
          this.avatarPreview.set(user.avatar || null);
          this.originalName = user.name || '';
          this.originalAvatar = user.avatar || null;
        }
        this.isLoading.set(false);
      },
    });
  }

  private applyProfile(profile: any) {
    const userName = profile.user?.username || '';
    const emailVal = profile.user?.email || '';
    this.username.set(userName);
    this.email.set(emailVal);
    this.name.set(profile.name || '');
    this.globalName.set(profile.global_name || '');
    this.bio.set(profile.bio || '');
    this.avatarPreview.set(profile.avatar || null);

    this.originalName = profile.name || '';
    this.originalGlobalName = profile.global_name || '';
    this.originalBio = profile.bio || '';
    this.originalAvatar = profile.avatar || null;

    this.newAvatarFile.set(null);
    this.avatarRemoved.set(false);
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.newAvatarFile.set(file);
    this.avatarRemoved.set(false);
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatarPreview.set(null);
    this.newAvatarFile.set(null);
    this.avatarRemoved.set(true);
  }

  discardChanges() {
    this.name.set(this.originalName);
    this.globalName.set(this.originalGlobalName);
    this.bio.set(this.originalBio);
    this.avatarPreview.set(this.originalAvatar);
    this.newAvatarFile.set(null);
    this.avatarRemoved.set(false);
  }

  saveChanges() {
    this.isSaving.set(true);
    const formData = new FormData();
    formData.append('name', this.name());
    formData.append('bio', this.bio());
    formData.append('global_name', this.globalName());
    if (this.newAvatarFile()) formData.append('avatar', this.newAvatarFile()!);
    if (this.avatarRemoved()) formData.append('remove_avatar', 'true');

    this.api.updateMyProfile(formData).subscribe({
      next: (profile: any) => {
        this.applyProfile(profile);
        this.isSaving.set(false);
        this.notifications.show('Профиль обновлён', 'success');
        // Sync auth cache
        const current = this.auth.currentUserValue;
        if (current) {
          localStorage.setItem('currentUser', JSON.stringify({
            ...current,
            name: profile.name,
            avatar: profile.avatar,
          }));
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.notifications.show('Ошибка при сохранении', 'error');
      },
    });
  }

  protected readonly Upload = Upload;
}
