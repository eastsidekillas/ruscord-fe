import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, X } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, FullGuild, Perm, errorText, hasPerm } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { RolesTab } from './roles-tab';
import { MembersTab } from './members-tab';
import { BansTab } from './bans-tab';

type Tab = 'overview' | 'roles' | 'members' | 'bans';

/** The settings tabs a guild offers the caller, by their permissions. */
export function settingsTabs(g: FullGuild | null): { id: Tab; label: string }[] {
  if (!g) return [];
  const p = g.permissions;
  const tabs: { id: Tab; label: string }[] = [];
  if (hasPerm(p, Perm.ManageGuild)) tabs.push({ id: 'overview', label: 'Обзор' });
  if (hasPerm(p, Perm.ManageRoles)) tabs.push({ id: 'roles', label: 'Роли' });
  if (hasPerm(p, Perm.KickMembers) || hasPerm(p, Perm.BanMembers) || hasPerm(p, Perm.ManageRoles)) {
    tabs.push({ id: 'members', label: 'Участники' });
  }
  if (hasPerm(p, Perm.BanMembers)) tabs.push({ id: 'bans', label: 'Баны' });
  return tabs;
}

const MAX_UPLOAD = 8 << 20;

/**
 * Server settings over the whole window, like the user settings: the
 * guild's sections on the left (each only for the permission it needs; the
 * server checks them too), the section on the right, Esc or the cross closes.
 */
@Component({
  selector: 'ServerSettingsModal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RolesTab, MembersTab, BansTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div class="fixed inset-0 z-50 flex flex-wrap overflow-y-auto bg-ok-bg text-ok-text text-[15px] leading-normal">
      @if (guild(); as g) {
        <nav aria-label="Настройки сервера" class="flex-[1_1_240px] max-w-[280px] min-h-full box-border bg-ok-sidebar pt-12 pb-6 pl-6 pr-4 flex flex-col gap-0.5">
          <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-3 pb-2 truncate">{{ g.name.toUpperCase() }}</div>
          @for (t of tabs(); track t.id) {
            <button type="button" (click)="tab.set(t.id)" [attr.aria-current]="current() === t.id ? 'page' : null"
                    class="text-left px-3 py-2.5 rounded-lg"
                    [class]="current() === t.id ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-1'">{{ t.label }}</button>
          }
          @if (isOwner()) {
            <div class="h-px bg-ok-border my-3"></div>
            <button type="button" (click)="deleteGuild()" class="text-left px-3 py-2.5 rounded-lg text-ok-danger hover:bg-ok-surface-1">Удалить сервер</button>
          }
        </nav>

        <div class="flex-[999_1_560px] min-w-0 relative">
          <button type="button" (click)="close()" aria-label="Закрыть настройки" title="Закрыть (Esc)"
                  class="absolute top-12 right-10 z-10 w-10 h-10 rounded-[10px] border border-ok-border-control bg-ok-bg text-ok-muted hover:text-ok-text flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="X"></lucide-angular>
          </button>
          @switch (current()) {
            @case ('roles') { <RolesTab [guild]="g" /> }
            @case ('members') { <div class="px-10 py-12 pr-24 max-w-[860px] box-border"><MembersTab [guild]="g" /></div> }
            @case ('bans') { <div class="px-10 py-12 pr-24 max-w-[860px] box-border"><BansTab [guild]="g" /></div> }
            @case ('overview') {
              <form class="px-10 py-12 pr-24 max-w-[760px] box-border flex flex-col gap-8" (ngSubmit)="saveName()">
                <h1 class="m-0 text-[20px] leading-7 font-semibold">Обзор</h1>
                <section aria-label="Иконка сервера" class="flex items-center gap-5 flex-wrap">
                  <span class="w-24 h-24 rounded-ok-lg overflow-hidden bg-ok-avatar flex items-center justify-center text-[32px] font-semibold">
                    @if (g.icon) { <img [src]="g.icon" alt="" class="w-full h-full object-cover" /> } @else { {{ g.name.charAt(0).toUpperCase() }} }
                  </span>
                  <div class="flex flex-col gap-2">
                    <div class="flex gap-2 flex-wrap">
                      <label class="h-10 px-4 rounded-[10px] bg-ok-accent text-ok-on-accent font-semibold flex items-center cursor-pointer" [class.opacity-50]="busy()">
                        Загрузить иконку
                        <input type="file" class="sr-only-ok" accept="image/png,image/jpeg,image/webp,image/gif"
                               data-testid="guild-icon-input" [disabled]="busy()" (change)="pickIcon($event)" />
                      </label>
                      @if (g.icon) {
                        <button type="button" (click)="removeIcon()" [disabled]="busy()" class="h-10 px-4 rounded-[10px] bg-ok-surface-2 text-ok-text font-semibold disabled:opacity-50">Удалить</button>
                      }
                    </div>
                    <span class="text-[13px] text-ok-muted">PNG, JPEG, WebP или GIF, до 8 МиБ.</span>
                  </div>
                </section>
                <div class="flex flex-col gap-1.5 max-w-[420px]">
                  <label for="guildName" class="text-[13px] font-medium text-ok-muted">Название сервера</label>
                  <input id="guildName" name="guildName" type="text" maxlength="100" [(ngModel)]="name"
                         class="h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4" />
                </div>
                @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
                <div>
                  <button type="submit" [disabled]="busy() || name.trim() === g.name"
                          class="h-11 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Сохранить</button>
                </div>
              </form>
            }
          }
        </div>
      } @else {
        <div class="m-auto flex flex-col items-center gap-3">
          <p class="m-0 text-ok-muted">Сервер недоступен.</p>
          <button type="button" (click)="close()" class="h-10 px-4 rounded-[10px] bg-ok-surface-2 font-semibold">Закрыть</button>
        </div>
      }
    </div>
  `,
})
export class ServerSettingsModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  protected readonly X = X;

  /** The live guild: GUILD_UPDATE from anyone shows here too. */
  protected readonly guild = computed(() => {
    const g = this.store.guild(this.modal.modalData()['serverId']);
    return settingsTabs(g).length ? g : null;
  });
  protected readonly tabs = computed(() => settingsTabs(this.guild()));
  protected readonly tab = signal<Tab | null>(null);
  /** The chosen tab while it is still allowed, else the first one. */
  protected readonly current = computed(() => {
    const ids = this.tabs().map(t => t.id);
    const t = this.tab();
    return t && ids.includes(t) ? t : ids[0] ?? null;
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected name = '';

  constructor() {
    // Fill the name once; later updates must not overwrite what is typed.
    effect(() => {
      const g = this.guild();
      untracked(() => {
        if (g && !this.name) this.name = g.name;
      });
    });
  }

  protected saveName(): void {
    const g = this.guild();
    const name = this.name.trim();
    if (!g || this.busy() || name === g.name) return;
    if (name.length < 2 || name.length > 100) {
      this.error.set('Название — от 2 до 100 символов.');
      return;
    }
    this.run(this.api.updateGuild(g.id, { name }), 'Не удалось сохранить название', () => this.close());
  }

  protected pickIcon(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const g = this.guild();
    if (!file || !g) return;
    if (file.size > MAX_UPLOAD) {
      this.error.set('Файл больше 8 МиБ.');
      return;
    }
    this.run(this.api.setGuildIcon(g.id, file), 'Не удалось загрузить иконку');
  }

  protected removeIcon(): void {
    const g = this.guild();
    if (g) this.run(this.api.deleteGuildIcon(g.id), 'Не удалось удалить иконку');
  }

  /** The new state arrives as GUILD_UPDATE; the answer is not applied twice. */
  private run(req: ReturnType<ApiService['updateGuild']>, fallback: string, done?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        done?.();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, fallback));
      },
    });
  }

  protected readonly isOwner = computed(() => {
    const g = this.guild();
    return !!g && g.owner_id === this.store.me()?.id;
  });

  protected deleteGuild(): void {
    const g = this.guild();
    if (!g || !confirm(`Удалить сервер «${g.name}» со всеми каналами и сообщениями? Это нельзя отменить.`)) return;
    this.api.deleteGuild(g.id).subscribe({
      next: () => {
        this.close();
        this.router.navigate(['/channels/me']);
      },
      error: err => this.notify.show(errorText(err, 'Не удалось удалить сервер'), 'error'),
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
