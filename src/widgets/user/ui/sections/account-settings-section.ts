import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Observable, concat, last } from 'rxjs';
import { ApiService, Mood, MoodState, ProfileColor, ProfilePatch, PublicUser, User, errorText } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import {
  DEFAULT_PROFILE_COLOR, EXPIRY_CHOICES, ExpiryChoice, MOOD_STATES, MOOD_TEXT_MAX, MinuteClock, PROFILE_COLORS, ProfileCard,
  expiresAt, expiryLabel, liveMood, sameMood,
} from '@entities/profile';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';
import { Dolobeb } from '@shared/ui/dolobeb';
import { SettingsSplit } from '../settings-split';

/** Upload limit of ruscord-core. */
const MAX_UPLOAD = 8 << 20;

/** 'keep' leaves the expiry of the saved mood as it is. */
type Expiry = ExpiryChoice | 'keep';

const FIELD = 'h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4';
const BTN = 'h-10 px-4 rounded-[10px] font-semibold disabled:opacity-50';
const LABEL = 'text-[13px] font-medium text-ok-muted';
const PICKED = 'bg-ok-surface-2 shadow-[inset_0_0_0_2px_var(--color-ok-accent)]';

/**
 * The mood the form describes at `now`: null without a face. A new expiry
 * is counted from `now`; 'keep' carries the saved one over.
 */
export function draftMood(state: MoodState | null, text: string, expiry: Expiry, saved: Mood | null, now: Date): Mood | null {
  if (!state) return null;
  const expires_at = expiry === 'keep' ? saved?.expires_at ?? null : expiresAt(expiry, now)?.toISOString() ?? null;
  return { state, text: text.trim(), expires_at };
}

/**
 * «Настройки: профиль»: the mood, the cover colour, the picture, the name
 * and «о себе», saved together, next to the card others see.
 */
@Component({
  selector: 'AccountSettingsSection',
  standalone: true,
  imports: [AvatarUI, Dolobeb, ProfileCard, SettingsSplit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <SettingsSplit>
      <form class="flex flex-col gap-8" (submit)="$event.preventDefault(); saveChanges()">
        <h1 class="m-0 text-[20px] leading-7 font-semibold">Профиль</h1>

        <section class="flex flex-col gap-2">
          <span id="p-mood-label" class="${LABEL}">Настроение</span>
          <div role="radiogroup" aria-labelledby="p-mood-label" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            @for (m of moods; track m.state) {
              <button type="button" role="radio" [attr.aria-checked]="moodState() === m.state" [attr.data-mood]="m.state"
                      (click)="toggleMood(m.state)"
                      class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-ok-md text-[12px]"
                      [class]="moodState() === m.state ? '${PICKED} text-ok-text' : 'bg-ok-surface-1 text-ok-muted hover:text-ok-text'">
                <Dolobeb [state]="m.state" [size]="48" [animate]="moodState() === m.state" />
                {{ m.label }}
              </button>
            }
          </div>
          <span class="text-[12px] text-ok-muted">Лицо и фразу видят все. Нажмите на выбранное лицо ещё раз, чтобы снять настроение.</span>
        </section>

        <div class="flex flex-col gap-1.5">
          <label for="p-mood-text" class="${LABEL}">Что у вас сейчас</label>
          <input id="p-mood-text" type="text" [attr.maxlength]="textMax" [disabled]="!moodState()"
                 [placeholder]="moodState() ? 'Например: пишу диплом' : 'Сначала выберите лицо'"
                 [value]="moodText()" (input)="moodText.set(getInputValue($event))" class="${FIELD} disabled:opacity-50" />
          <span class="self-end text-[12px] text-ok-muted">{{ moodText().length }} / {{ textMax }}</span>
        </div>

        <section class="flex flex-col gap-2">
          <span id="p-expiry-label" class="${LABEL}">Убрать настроение</span>
          <div role="radiogroup" aria-labelledby="p-expiry-label" class="flex gap-2 flex-wrap">
            @for (c of expiryChoices(); track c.key) {
              <button type="button" role="radio" [attr.aria-checked]="expiry() === c.key" [attr.data-expiry]="c.key"
                      [disabled]="!moodState()" (click)="expiry.set(c.key)"
                      class="h-10 px-3.5 rounded-[10px] text-[14px] disabled:opacity-50"
                      [class]="expiry() === c.key ? '${PICKED} text-ok-text font-semibold' : 'bg-ok-surface-1 text-ok-muted hover:text-ok-text'">
                {{ c.label }}
              </button>
            }
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <span id="p-color-label" class="${LABEL}">Цвет обложки</span>
          <div role="radiogroup" aria-labelledby="p-color-label" class="flex gap-2.5 flex-wrap">
            @for (c of colors; track c.color) {
              <button type="button" role="radio" [attr.aria-checked]="color() === c.color" [attr.aria-label]="c.label" [title]="c.label"
                      [attr.data-color]="c.color" (click)="color.set(c.color)"
                      class="w-12 h-12 rounded-ok-md border-4"
                      [class]="color() === c.color ? 'border-ok-text' : 'border-ok-bg hover:border-ok-border-control'"
                      [style.background]="c.css"></button>
            }
          </div>
        </section>

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
            <label for="p-name" class="${LABEL}">Отображаемое имя</label>
            <input id="p-name" type="text" maxlength="32" [placeholder]="username()" [value]="name()" (input)="name.set(getInputValue($event))" class="${FIELD}" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="p-user" class="${LABEL}">Имя пользователя</label>
            <input id="p-user" type="text" readonly [value]="username()" class="h-12 box-border rounded-ok-md border border-ok-border bg-ok-bg text-ok-muted px-4" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="p-bio" class="${LABEL}">О себе</label>
          <textarea id="p-bio" rows="3" maxlength="190" [value]="bio()" (input)="bio.set(getInputValue($event))"
                    class="box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4 py-3 leading-[22px] resize-y"></textarea>
          <span class="self-end text-[12px] text-ok-muted">{{ bio().length }} / 190</span>
        </div>

        @if (hasChanges()) {
          <div role="status" data-unsaved
               class="sticky bottom-4 flex items-center gap-2 flex-wrap rounded-ok-md bg-ok-surface-2 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            <span class="flex-1 min-w-[180px] font-medium">Есть несохранённые изменения</span>
            <button type="button" (click)="discardChanges()" [disabled]="isSaving()" class="${BTN} bg-ok-surface-1 text-ok-text">Сбросить</button>
            <button type="submit" [disabled]="isSaving()" class="${BTN} bg-ok-accent text-ok-on-accent">
              {{ isSaving() ? 'Сохраняем…' : 'Сохранить' }}
            </button>
          </div>
        }
      </form>

      <div preview class="flex flex-col gap-3">
        <h2 class="m-0 text-[12px] font-semibold tracking-[0.1em] text-ok-muted">КАК ВАС ВИДЯТ ДРУГИЕ</h2>
        @if (preview(); as u) {
          <ProfileCard class="rounded-ok-lg shadow-[0_0_0_1px_var(--color-ok-border)]" [user]="u" [bio]="bio().trim()" [statusOf]="u.id" />
        }
      </div>
    </SettingsSplit>
  `,
})
export class AccountSettingsSectionComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly clock = inject(MinuteClock);

  protected readonly moods = MOOD_STATES;
  protected readonly colors = PROFILE_COLORS;
  protected readonly textMax = MOOD_TEXT_MAX;
  readonly isSaving = signal(false);

  readonly name = signal('');
  readonly bio = signal('');
  readonly username = signal('');
  readonly avatarPreview = signal<string | null>(null);
  readonly newAvatarFile = signal<File | null>(null);
  readonly avatarRemoved = signal(false);
  readonly moodState = signal<MoodState | null>(null);
  readonly moodText = signal('');
  readonly expiry = signal<Expiry>('never');
  readonly color = signal<ProfileColor>(DEFAULT_PROFILE_COLOR);

  private readonly original = signal<User | null>(null);
  /** The saved mood, unless it had expired when the form was filled. */
  private readonly savedMood = signal<Mood | null>(null);

  /** «Как сейчас» comes first when the saved mood has an expiry to keep. */
  protected readonly expiryChoices = computed<{ key: Expiry; label: string }[]>(() => {
    const at = this.savedMood()?.expires_at;
    return at
      ? [{ key: 'keep', label: 'Как сейчас: ' + expiryLabel(new Date(at), this.clock.now()) }, ...EXPIRY_CHOICES]
      : [...EXPIRY_CHOICES];
  });

  private moodAt(now: Date): Mood | null {
    return draftMood(this.moodState(), this.moodText(), this.expiry(), this.savedMood(), now);
  }

  private readonly moodChanged = computed(() => {
    const saved = this.savedMood();
    // A new expiry is a change even when it lands on the saved moment.
    return !sameMood(this.moodAt(this.clock.now()), saved) || (!!this.moodState() && this.expiry() !== (saved?.expires_at ? 'keep' : 'never'));
  });

  readonly hasChanges = computed(() => {
    const o = this.original();
    return !!o && (
      this.name().trim() !== o.display_name ||
      this.bio().trim() !== (o.bio ?? '') ||
      this.moodChanged() ||
      this.color() !== (o.profile_color ?? DEFAULT_PROFILE_COLOR) ||
      this.newAvatarFile() !== null ||
      this.avatarRemoved()
    );
  });

  /** The card others would see if the form were saved now. */
  protected readonly preview = computed<PublicUser | null>(() => {
    const o = this.original();
    if (!o) return null;
    return {
      id: o.id,
      username: o.username,
      display_name: this.name().trim(),
      avatar: this.avatarPreview(),
      mood: this.moodAt(this.clock.now()) ?? undefined,
      profile_color: this.color(),
    };
  });

  constructor() {
    const u = this.auth.user();
    if (u) this.apply(u);
  }

  private apply(u: User) {
    const mood = liveMood(u.mood, new Date());
    this.original.set(u);
    this.savedMood.set(mood);
    this.username.set(u.username);
    this.name.set(u.display_name);
    this.bio.set(u.bio ?? '');
    this.avatarPreview.set(u.avatar);
    this.newAvatarFile.set(null);
    this.avatarRemoved.set(false);
    this.moodState.set(mood?.state ?? null);
    this.moodText.set(mood?.text ?? '');
    this.expiry.set(mood?.expires_at ? 'keep' : 'never');
    this.color.set(u.profile_color ?? DEFAULT_PROFILE_COLOR);
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  /** Picking the chosen face again takes the mood off. */
  toggleMood(state: MoodState) {
    this.moodState.set(this.moodState() === state ? null : state);
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

  /**
   * Profile fields first, then the picture; each step returns the whole
   * user. Resolves to whether the form is saved now (true with nothing to
   * save), so a caller can go on only after a success.
   */
  saveChanges(): Promise<boolean> {
    const o = this.original();
    if (!o || this.isSaving()) return Promise.resolve(false);
    if (!this.hasChanges()) return Promise.resolve(true);
    const steps: Observable<User>[] = [];
    const patch: ProfilePatch = {};
    if (this.name().trim() !== o.display_name) patch.display_name = this.name().trim();
    if (this.bio().trim() !== (o.bio ?? '')) patch.bio = this.bio().trim();
    // The expiry is counted from the moment of saving, not of choosing.
    if (this.moodChanged()) patch.mood = this.moodAt(new Date());
    if (this.color() !== (o.profile_color ?? DEFAULT_PROFILE_COLOR)) patch.profile_color = this.color();
    if (Object.keys(patch).length) steps.push(this.api.updateMe(patch));
    const file = this.newAvatarFile();
    if (file) steps.push(this.api.setAvatar(file));
    else if (this.avatarRemoved()) steps.push(this.api.deleteAvatar());
    if (!steps.length) {
      this.discardChanges();
      return Promise.resolve(true);
    }
    this.isSaving.set(true);
    return new Promise(resolve => {
      concat(...steps).pipe(last()).subscribe({
        next: u => {
          this.auth.setUser(u);
          this.apply(u);
          this.isSaving.set(false);
          this.notifications.show('Профиль обновлён', 'success');
          resolve(true);
        },
        error: err => {
          this.isSaving.set(false);
          this.notifications.show(errorText(err, 'Ошибка при сохранении'), 'error');
          resolve(false);
        },
      });
    });
  }
}
