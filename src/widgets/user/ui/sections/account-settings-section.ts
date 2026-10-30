import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { Observable, concat, last } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, User, errorText } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import { NotificationService } from '@shared/model/notification.service';
import { ModalService } from '@shared/model/modal.service';
import { AvatarUI } from '@shared/ui/avatar';
import { LucideAngularModule, Upload } from 'lucide-angular';

/** Upload limit of ruscord-core. */
const MAX_UPLOAD = 8 << 20;

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
        <input #avatarInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" (change)="onAvatarChange($event)" />
        <p class="text-xs text-gray-500 -mt-4 mb-6">PNG, JPEG, WebP или GIF до 8 МиБ. Картинка обрежется до квадрата.</p>

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
                maxlength="32"
                placeholder="Ваше имя..."
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

        <!-- Account deletion (ruscord-core ADR-0021) -->
        <section class="mb-24">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Удаление учётной записи</h3>
          <div class="bg-sidebar-surface-primary rounded-lg px-4 py-3 text-sm">
            <p class="text-gray-400 mb-3">
              Учётная запись перестанет работать сразу на всех устройствах. Вы выйдете из серверов, групп и друзей;
              ваши сообщения останутся от «Удалённого пользователя». Владельцу серверов нужно сначала удалить их.
            </p>
            <button *ngIf="!deleting()" type="button" (click)="deleting.set(true)"
                    class="px-3 py-1.5 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/40">Удалить учётную запись</button>
            <form *ngIf="deleting()" class="flex flex-wrap items-center gap-2" (submit)="$event.preventDefault(); deleteAccount()">
              <input type="password" autocomplete="current-password" placeholder="Пароль"
                     [value]="deletePassword()" (input)="deletePassword.set(getInputValue($event))"
                     class="flex-1 min-w-48 bg-main-surface-secondary text-white rounded-md px-3 py-2 border border-transparent focus:outline-none focus:border-red-500" />
              <button type="submit" [disabled]="!deletePassword() || isSaving()"
                      class="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">Удалить навсегда</button>
              <button type="button" (click)="deleting.set(false); deletePassword.set(''); deleteError.set(null)"
                      class="px-3 py-2 text-gray-400 hover:text-white">Отмена</button>
              <p *ngIf="deleteError()" class="w-full text-red-400">{{ deleteError() }}</p>
            </form>
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
export class AccountSettingsSectionComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly name = signal('');
  readonly bio = signal('');
  readonly username = signal('');
  readonly email = signal('');
  readonly avatarPreview = signal<string | null>(null);
  readonly newAvatarFile = signal<File | null>(null);
  readonly avatarRemoved = signal(false);
  readonly deleting = signal(false);
  readonly deletePassword = signal('');
  readonly deleteError = signal<string | null>(null);

  private original: User | null = null;

  readonly hasChanges = computed(() =>
    this.name() !== (this.originalUser()?.display_name ?? '') ||
    this.bio() !== (this.originalUser()?.bio ?? '') ||
    this.newAvatarFile() !== null ||
    this.avatarRemoved()
  );
  private readonly originalUser = signal<User | null>(null);

  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  constructor() {
    const u = this.auth.user();
    if (u) this.apply(u);
  }

  private apply(u: User) {
    this.original = u;
    this.originalUser.set(u);
    this.username.set(u.username);
    this.email.set(u.email);
    this.name.set(u.display_name);
    this.bio.set(u.bio ?? '');
    this.avatarPreview.set(u.avatar);
    this.newAvatarFile.set(null);
    this.avatarRemoved.set(false);
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // the same file can be picked again
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      this.notifications.show('Файл больше 8 МиБ', 'error');
      return;
    }
    this.newAvatarFile.set(file);
    this.avatarRemoved.set(false);
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatarPreview.set(null);
    this.newAvatarFile.set(null);
    this.avatarRemoved.set(!!this.original?.avatar);
  }

  discardChanges() {
    if (this.original) this.apply(this.original);
  }

  /** Profile fields first, then the picture; each step returns the whole user. */
  saveChanges() {
    const o = this.original;
    if (!o) return;
    const steps: Observable<User>[] = [];
    const patch: { display_name?: string; bio?: string } = {};
    if (this.name().trim() !== o.display_name) patch.display_name = this.name().trim();
    if (this.bio().trim() !== (o.bio ?? '')) patch.bio = this.bio().trim();
    if (Object.keys(patch).length) steps.push(this.api.updateMe(patch));
    const file = this.newAvatarFile();
    if (file) steps.push(this.api.setAvatar(file));
    else if (this.avatarRemoved()) steps.push(this.api.deleteAvatar());
    if (!steps.length) {
      this.discardChanges();
      return;
    }
    this.isSaving.set(true);
    concat(...steps).pipe(last()).subscribe({
      next: u => {
        this.auth.setUser(u);
        this.apply(u);
        this.isSaving.set(false);
        this.notifications.show('Профиль обновлён', 'success');
      },
      error: err => {
        this.isSaving.set(false);
        this.notifications.show(errorText(err, 'Ошибка при сохранении'), 'error');
      },
    });
  }

  /** After deletion every session is gone: forget the user and go to sign-in. */
  deleteAccount() {
    this.isSaving.set(true);
    this.deleteError.set(null);
    this.api.deleteMe(this.deletePassword()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.modal.close();
        this.auth.forget();
        this.router.navigate(['/login']);
      },
      error: err => {
        this.isSaving.set(false);
        this.deleteError.set(errorText(err, 'Не удалось удалить учётную запись'));
      },
    });
  }

  protected readonly Upload = Upload;
}
