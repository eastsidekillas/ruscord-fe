import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@shared/model/modal.service';
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
 * Server settings: overview (name, icon), roles, members, bans — each tab
 * only for the permission it needs; the server checks them too.
 */
@Component({
  selector: 'ServerSettingsModal',
  standalone: true,
  imports: [CommonModule, FormsModule, RolesTab, MembersTab, BansTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50" (click)="close()">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative bg-main-surface-primary text-white w-full max-w-2xl p-6 rounded-2xl shadow-xl"
           (click)="$event.stopPropagation()">
        <button (click)="close()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition" aria-label="Закрыть">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <ng-container *ngIf="guild() as g; else gone">
          <h2 class="text-xl font-semibold text-center mb-4">Настройки сервера</h2>
          <div class="flex gap-1 mb-5 border-b border-white/10">
            <button *ngFor="let t of tabs()" type="button" (click)="tab.set(t.id)"
                    class="px-3 py-2 text-sm -mb-px border-b-2 transition"
                    [ngClass]="current() === t.id ? 'border-green-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'">
              {{ t.label }}
            </button>
          </div>
          <RolesTab *ngIf="current() === 'roles'" [guild]="g" />
          <MembersTab *ngIf="current() === 'members'" [guild]="g" />
          <BansTab *ngIf="current() === 'bans'" [guild]="g" />
          <ng-container *ngIf="current() === 'overview'">

          <div class="flex flex-col items-center gap-3 mb-6">
            <label class="relative w-24 h-24 rounded-full overflow-hidden bg-main-surface-secondary border border-gray-700 cursor-pointer group"
                   [class.pointer-events-none]="busy()">
              <img *ngIf="g.icon" [src]="g.icon" alt="" class="w-full h-full object-cover" />
              <span *ngIf="!g.icon" class="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
                {{ g.name.charAt(0).toUpperCase() }}
              </span>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs">
                Сменить
              </div>
              <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/gif"
                     data-testid="guild-icon-input" (change)="pickIcon($event)" />
            </label>
            <button *ngIf="g.icon" type="button" (click)="removeIcon()" [disabled]="busy()"
                    class="text-xs text-red-400 hover:underline disabled:opacity-50">Удалить иконку</button>
          </div>

          <form (ngSubmit)="saveName()">
            <label for="guildName" class="block text-typo-secondary text-sm font-medium mb-1">Название сервера</label>
            <input id="guildName" name="guildName" type="text" maxlength="100" [(ngModel)]="name"
                   class="w-full px-3 py-2 rounded-xl bg-main-surface-secondary text-white border border-gray-700 focus:outline-none" />
            <div *ngIf="error()" class="text-red-400 text-sm mt-2">{{ error() }}</div>
            <div class="flex justify-end mt-6">
              <button type="submit" [disabled]="busy() || name.trim() === g.name"
                      class="px-4 py-2 bg-green-500 text-sm rounded-xl hover:bg-green-600 transition disabled:opacity-50">
                Сохранить
              </button>
            </div>
          </form>
          </ng-container>
        </ng-container>
        <ng-template #gone><p class="text-center text-sm text-typo-secondary">Сервер недоступен.</p></ng-template>
      </div>
    </div>
  `,
})
export class ServerSettingsModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);

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

  protected close(): void {
    this.modal.close();
  }
}
