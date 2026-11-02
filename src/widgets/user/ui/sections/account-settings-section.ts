import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Observable, concat, last } from 'rxjs';
import { ApiService, ChosenStatus, User, errorText } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';

/** Upload limit of ruscord-core. */
const MAX_UPLOAD = 8 << 20;

const STATUSES: { value: ChosenStatus; label: string; dot: string; hint?: string }[] = [
  { value: 'online', label: 'В сети', dot: 'bg-ok-success' },
  { value: 'idle', label: 'Не на месте', dot: 'bg-ok-warning' },
  { value: 'dnd', label: 'Не беспокоить', dot: 'bg-ok-danger' },
  { value: 'invisible', label: 'Невидимка', dot: 'shadow-[inset_0_0_0_2px_var(--color-ok-muted)]', hint: '— другие видят «не в сети»' },
];

const FIELD = 'h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4';
const BTN = 'h-10 px-4 rounded-[10px] font-semibold disabled:opacity-50';

/** «Настройки: профиль»: picture, name, about me and status, saved together. */
@Component({
  selector: 'AccountSettingsSection',
  standalone: true,
  imports: [AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-8" (submit)="$event.preventDefault(); saveChanges()">
      <h1 class="m-0 text-[20px] leading-7 font-semibold">Профиль</h1>

      <section aria-label="Аватар" class="flex items-center gap-5 flex-wrap">
        <span class="block w-24 h-24 rounded-ok-lg overflow-hidden text-[32px]">
          <AvatarUI [src]="avatarPreview()" [name]="name() || username()" />
        </span>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2 flex-wrap">
            <button type="button" (click)="avatarInput.click()" class="${BTN} bg-ok-accent text-ok-on-accent">Загрузить аватар</button>
            @if (avatarPreview()) {
              <button type="button" (click)="removeAvatar()" class="${BTN} bg-ok-surface-2 text-ok-text">Удалить</button>
            }
          </div>
          <span class="text-[13px] text-ok-muted">PNG, JPEG, WebP или GIF, до 8 МиБ. Обрежем до квадрата.</span>
        </div>
        <input #avatarInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" (change)="onAvatarChange($event)" />
      </section>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div class="flex flex-col gap-1.5">
          <label for="p-name" class="text-[13px] font-medium text-ok-muted">Отображаемое имя</label>
          <input id="p-name" type="text" maxlength="32" [placeholder]="username()" [value]="name()" (input)="name.set(getInputValue($event))" class="${FIELD}" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="p-user" class="text-[13px] font-medium text-ok-muted">Имя пользователя</label>
          <input id="p-user" type="text" readonly [value]="username()" class="h-12 box-border rounded-ok-md border border-ok-border bg-ok-bg text-ok-muted px-4" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="p-bio" class="text-[13px] font-medium text-ok-muted">О себе</label>
        <textarea id="p-bio" rows="3" maxlength="190" [value]="bio()" (input)="bio.set(getInputValue($event))"
                  class="box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4 py-3 leading-[22px] resize-y"></textarea>
        <span class="self-end text-[12px] text-ok-muted">{{ bio().length }} / 190</span>
      </div>

      <fieldset class="border-0 m-0 p-0 flex flex-col gap-2">
        <legend class="text-[13px] font-medium text-ok-muted pb-2">Статус</legend>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          @for (c of statuses; track c.value) {
            <label class="flex items-center gap-2.5 px-3.5 py-3 rounded-ok-md cursor-pointer"
                   [class]="status() === c.value ? 'bg-ok-surface-2 shadow-[inset_0_0_0_2px_var(--color-ok-accent)]' : 'bg-ok-surface-1'">
              <input type="radio" name="status" class="accent-ok-accent" [value]="c.value" [checked]="status() === c.value" (change)="status.set(c.value)" />
              <span class="w-2.5 h-2.5 rounded-full shrink-0" [class]="c.dot"></span>{{ c.label }}
              @if (c.hint) { <span class="text-[12px] text-ok-muted">{{ c.hint }}</span> }
            </label>
          }
        </div>
      </fieldset>

      <div class="flex gap-2 justify-end flex-wrap">
        <button type="button" (click)="discardChanges()" [disabled]="!hasChanges() || isSaving()" class="h-11 px-5 rounded-ok-md font-semibold bg-ok-surface-2 text-ok-text disabled:opacity-50">Отменить</button>
        <button type="submit" [disabled]="!hasChanges() || isSaving()" class="h-11 px-5 rounded-ok-md font-semibold bg-ok-accent text-ok-on-accent disabled:opacity-50">
          {{ isSaving() ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </form>
  `,
})
export class AccountSettingsSectionComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  protected readonly statuses = STATUSES;
  readonly isSaving = signal(false);

  readonly name = signal('');
  readonly bio = signal('');
  readonly status = signal<ChosenStatus>('online');
  readonly username = signal('');
  readonly avatarPreview = signal<string | null>(null);
  readonly newAvatarFile = signal<File | null>(null);
  readonly avatarRemoved = signal(false);

  private readonly original = signal<User | null>(null);

  readonly hasChanges = computed(() => {
    const o = this.original();
    return !!o && (
      this.name() !== o.display_name ||
      this.bio() !== (o.bio ?? '') ||
      this.status() !== o.status ||
      this.newAvatarFile() !== null ||
      this.avatarRemoved()
    );
  });

  constructor() {
    const u = this.auth.user();
    if (u) this.apply(u);
  }

  private apply(u: User) {
    this.original.set(u);
    this.username.set(u.username);
    this.name.set(u.display_name);
    this.bio.set(u.bio ?? '');
    this.status.set(u.status);
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
    this.avatarRemoved.set(!!this.original()?.avatar);
  }

  discardChanges() {
    const o = this.original();
    if (o) this.apply(o);
  }

  /** Profile fields first, then the picture; each step returns the whole user. */
  saveChanges() {
    const o = this.original();
    if (!o || !this.hasChanges() || this.isSaving()) return;
    const steps: Observable<User>[] = [];
    const patch: { display_name?: string; bio?: string; status?: ChosenStatus } = {};
    if (this.name().trim() !== o.display_name) patch.display_name = this.name().trim();
    if (this.bio().trim() !== (o.bio ?? '')) patch.bio = this.bio().trim();
    if (this.status() !== o.status) patch.status = this.status();
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
}
