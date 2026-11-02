import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, FullGuild, GuildChannel, Perm, errorText, hasPerm } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { ChannelForm } from './channel-form';
import { ChannelPermsTab } from './channel-perms-tab';

type Tab = 'overview' | 'perms';

const KIND: Record<number, string> = { 0: 'ТЕКСТ', 2: 'ГОЛОС', 4: 'КАТЕГОРИЯ' };

/** The channel settings sections the caller has, by their permissions in that channel. */
export function channelTabs(g: FullGuild | null, ch: GuildChannel | null): { id: Tab; label: string }[] {
  if (!g || !ch) return [];
  const p = g.channel_permissions[ch.id];
  const tabs: { id: Tab; label: string }[] = [];
  if (hasPerm(p, Perm.ManageChannels)) tabs.push({ id: 'overview', label: 'Обзор' });
  if (hasPerm(p, Perm.ManageRoles)) tabs.push({ id: 'perms', label: 'Права' });
  return tabs;
}

/**
 * Channel settings over the whole window, like the server settings (modal
 * data: serverId, channelId): Overview (the channel form) and Permissions,
 * each for its permission; deleting the channel with MANAGE_CHANNELS.
 */
@Component({
  selector: 'ChannelSettingsModal',
  standalone: true,
  imports: [LucideAngularModule, ChannelForm, ChannelPermsTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div class="fixed inset-0 z-50 flex flex-wrap overflow-y-auto bg-ok-bg text-ok-text text-[15px] leading-normal">
      @if (guild(); as g) { @if (channel(); as ch) {
        <nav aria-label="Настройки канала" class="flex-[1_1_240px] max-w-[280px] min-h-full box-border bg-ok-sidebar pt-12 pb-6 pl-6 pr-4 flex flex-col gap-0.5">
          <div class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-3 pb-2 truncate">{{ ch.name.toUpperCase() }} · {{ kind(ch) }}</div>
          @for (t of tabs(); track t.id) {
            <button type="button" (click)="tab.set(t.id)" [attr.aria-current]="current() === t.id ? 'page' : null"
                    class="text-left px-3 py-2.5 rounded-lg"
                    [class]="current() === t.id ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-1'">{{ t.label }}</button>
          }
          @if (canManage()) {
            <div class="h-px bg-ok-border my-3"></div>
            <button type="button" (click)="remove(ch)" class="text-left px-3 py-2.5 rounded-lg text-ok-danger hover:bg-ok-surface-1">{{ ch.type === 4 ? 'Удалить категорию' : 'Удалить канал' }}</button>
          }
        </nav>

        <div class="flex-[999_1_560px] min-w-0 relative">
          <button type="button" (click)="close()" aria-label="Закрыть настройки" title="Закрыть (Esc)"
                  class="absolute top-12 right-10 z-10 w-10 h-10 rounded-[10px] border border-ok-border-control bg-ok-bg text-ok-muted hover:text-ok-text flex items-center justify-center">
            <lucide-angular class="w-4 h-4" [img]="X"></lucide-angular>
          </button>
          @switch (current()) {
            @case ('overview') {
              <div class="px-10 py-12 pr-24 max-w-[600px] box-border flex flex-col gap-6">
                <h1 class="m-0 text-[20px] leading-7 font-semibold">Обзор</h1>
                <ChannelForm [guild]="g" [channel]="ch" (done)="saved()" />
              </div>
            }
            @case ('perms') { <ChannelPermsTab [guild]="g" [channel]="ch" /> }
          }
          @if (error()) { <p role="alert" class="mx-10 text-[13px] text-ok-danger">{{ error() }}</p> }
        </div>
      } } @else {
        <div class="m-auto flex flex-col items-center gap-3">
          <p class="m-0 text-ok-muted">Канал недоступен.</p>
          <button type="button" (click)="close()" class="h-10 px-4 rounded-[10px] bg-ok-surface-2 font-semibold">Закрыть</button>
        </div>
      }
    </div>
  `,
})
export class ChannelSettingsModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly notify = inject(NotificationService);
  private readonly data = this.modal.modalData();
  protected readonly X = X;

  protected readonly guild = computed(() => this.store.guild(this.data['serverId']));
  protected readonly channel = computed(() => this.guild()?.channels.find(c => c.id === this.data['channelId']) ?? null);
  protected readonly tabs = computed(() => channelTabs(this.guild(), this.channel()));
  protected readonly tab = signal<Tab | null>(null);
  protected readonly current = computed(() => {
    const ids = this.tabs().map(t => t.id);
    const t = this.tab();
    return t && ids.includes(t) ? t : ids[0] ?? null;
  });
  protected readonly canManage = computed(() => this.tabs().some(t => t.id === 'overview'));
  protected readonly error = signal<string | null>(null);

  protected kind(ch: GuildChannel): string { return KIND[ch.type] ?? ''; }

  protected saved(): void {
    this.notify.show('Канал сохранён', 'success');
  }

  protected remove(ch: GuildChannel): void {
    const what = ch.type === 4 ? `категорию «${ch.name}» (каналы в ней останутся без категории)` : `канал «${ch.name}» со всеми сообщениями`;
    if (!confirm(`Удалить ${what}? Это нельзя отменить.`)) return;
    this.api.deleteChannel(ch.id).subscribe({
      next: () => this.close(),
      error: err => this.error.set(errorText(err, 'Не удалось удалить канал')),
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
