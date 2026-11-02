import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, FullGuild, GuildChannel, Invite, Perm, errorText, hasPerm } from '@shared/api';
import { channelGroups } from '@entities/app-state';

export interface Option { label: string; value: number }

/** Lifetimes of the mockup, in seconds; 0 never expires (the core allows up to a week). */
export const AGES: Option[] = [
  { label: '1 час', value: 3600 },
  { label: '12 часов', value: 43200 },
  { label: '1 день', value: 86400 },
  { label: '7 дней', value: 604800 },
  { label: 'Бессрочно', value: 0 },
];

/** Use limits of the mockup; 0 is no limit (the core allows up to 100). */
export const USES: Option[] = [
  { label: 'Без ограничений', value: 0 },
  { label: '1', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '100', value: 100 },
];

/** «Ссылка действует сутки» and the like, for the line under the link. */
export function ageText(seconds: number): string {
  switch (seconds) {
    case 0: return 'Ссылка действует бессрочно';
    case 3600: return 'Ссылка действует час';
    case 43200: return 'Ссылка действует 12 часов';
    case 86400: return 'Ссылка действует сутки';
    case 604800: return 'Ссылка действует неделю';
    default: return '';
  }
}

/** Channels the caller may invite to, in the order of the channel list. */
export function invitableChannels(g: FullGuild): GuildChannel[] {
  return channelGroups(g).flatMap(group => group.channels)
    .filter(c => c.type !== 4 && hasPerm(g.channel_permissions[c.id], Perm.CreateInvite));
}

/**
 * «Пригласить своих» of the mockup: channel, lifetime and uses; a new link
 * on every change, copied with one button. Used by the invite window and by
 * the Invites section of the server settings.
 */
@Component({
  selector: 'InviteCreator',
  standalone: true,
  host: { class: 'flex flex-col gap-4' },
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (channels().length) {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5">
          <label for="i-ch" class="text-[13px] font-medium text-ok-muted">Канал</label>
          <select id="i-ch" name="channel" [ngModel]="channelId()" (ngModelChange)="channelId.set($event); create()" class="h-11 rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-3">
            @for (c of channels(); track c.id) { <option [ngValue]="c.id">{{ c.type === 0 ? '# ' + c.name : c.name }}</option> }
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="i-age" class="text-[13px] font-medium text-ok-muted">Действует</label>
          <select id="i-age" name="age" [ngModel]="age()" (ngModelChange)="age.set($event); create()" class="h-11 rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-3">
            @for (o of ages; track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="i-uses" class="text-[13px] font-medium text-ok-muted">Сколько раз</label>
          <select id="i-uses" name="uses" [ngModel]="uses()" (ngModelChange)="uses.set($event); create()" class="h-11 rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-3">
            @for (o of usesList; track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }
          </select>
        </div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <label for="i-link" class="sr-only-ok">Ссылка-приглашение</label>
        <input id="i-link" type="text" readonly [value]="url() ?? (loading() ? 'Создаём ссылку…' : '')" (focus)="$any($event.target).select()"
               class="flex-[1_1_280px] h-12 box-border rounded-ok-md border bg-ok-sidebar text-ok-text px-4 tabular-nums"
               [class]="url() ? 'border-ok-accent' : 'border-ok-border-control text-ok-muted'" />
        <button type="button" (click)="copy()" [disabled]="!url()" class="h-12 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">
          {{ copied() ? 'Скопировано' : 'Скопировать' }}
        </button>
      </div>
      @if (error()) {
        <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p>
      } @else if (url()) {
        <span class="text-[13px] text-ok-muted">{{ hint() }}</span>
      }
    } @else {
      <p class="m-0 text-[13px] text-ok-muted">У вас нет права приглашать на этот сервер.</p>
    }
  `,
})
export class InviteCreator {
  readonly guild = input.required<FullGuild>();
  /** The channel open now, preferred when the caller may invite there. */
  readonly preferChannel = input<string | null>(null);
  readonly created = output<Invite>();

  private readonly api = inject(ApiService);
  protected readonly ages = AGES;
  protected readonly usesList = USES;
  protected readonly channels = computed(() => invitableChannels(this.guild()));
  protected readonly channelId = signal<string | null>(null);
  protected readonly age = signal(86400);
  protected readonly uses = signal(0);
  protected readonly url = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly copied = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hint = computed(() => {
    const ch = this.channels().find(c => c.id === this.channelId());
    const where = ch ? ` Новичок попадёт в ${ch.type === 0 ? '#' : '«'}${ch.name}${ch.type === 0 ? '' : '»'}.` : '';
    return ageText(this.age()) + '.' + where;
  });
  private request = 0;
  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copyTimer));
    // The first link right away, for the preferred channel or the first allowed.
    queueMicrotask(() => {
      const list = this.channels();
      const pick = list.find(c => c.id === this.preferChannel()) ?? list[0];
      if (!pick) return;
      this.channelId.set(pick.id);
      this.create();
    });
  }

  /** A new link for the current choice; an older answer cannot overwrite it. */
  protected create(): void {
    const id = this.channelId();
    if (!id) return;
    const req = ++this.request;
    this.url.set(null);
    this.copied.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.api.createInvite(id, this.age(), this.uses()).subscribe({
      next: inv => {
        if (req !== this.request) return;
        this.url.set(`${location.origin}/invite/${inv.code}`);
        this.loading.set(false);
        this.created.emit(inv);
      },
      error: err => {
        if (req !== this.request) return;
        this.loading.set(false);
        this.error.set(errorText(err, 'Не удалось создать ссылку. Попробуйте ещё раз.'));
      },
    });
  }

  protected copy(): void {
    const url = this.url();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 2500);
    });
  }
}
