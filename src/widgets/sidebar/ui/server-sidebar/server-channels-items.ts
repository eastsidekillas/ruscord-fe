import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HeadphoneOff, Headphones, LucideAngularModule, Mic, MicOff, PhoneOff, Settings, Volume2 } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, FullGuild, Perm, VoiceState, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore, channelGroups } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { AvatarUI } from '@shared/ui/avatar';

@Component({
  selector: 'ServerChannelsItems',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-y-auto' },
  template: `
    <div class="px-2 py-3 space-y-4">
      <div *ngFor="let group of groups(); trackBy: byGroup">
        <div *ngIf="group.category as cat" class="flex items-center gap-1 mb-1 px-2 group/cat">
          <h4 class="flex-1 text-[11px] font-semibold text-typo-secondary uppercase tracking-wider truncate">{{ cat.name }}</h4>
          <ng-container *ngIf="canManage(cat.id)">
            <button type="button" (click)="create(cat.id)" title="Создать канал в категории"
                    class="text-typo-secondary hover:text-white opacity-0 group-hover/cat:opacity-100 text-sm leading-none">+</button>
            <button type="button" (click)="edit(cat.id)" title="Настройки категории"
                    class="text-typo-secondary hover:text-white opacity-0 group-hover/cat:opacity-100">
              <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
            </button>
          </ng-container>
        </div>
        <div class="space-y-0.5">
          <ng-container *ngFor="let channel of group.channels; trackBy: byId">
            <a *ngIf="channel.type === 0"
               [routerLink]="['/channels', guildId(), channel.id]"
               routerLinkActive="bg-main-surface-secondary text-white"
               class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-main-surface-secondary text-gray-300 hover:text-white transition group">
              <svg class="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-gray-200" fill="none"
                   stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/>
              </svg>
              <span class="text-sm truncate flex-1">{{ channel.name }}</span>
              <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала"
                      class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
                <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
              </button>
            </a>
            <ng-container *ngIf="channel.type === 2">
              <div (click)="join(channel.id)" [attr.data-voice-channel]="channel.name"
                   [title]="canConnect(channel.id) ? 'Войти в голосовой канал' : 'Нет права подключаться'"
                   class="flex items-center gap-2 py-1.5 px-2 rounded-md transition group"
                   [ngClass]="[
                     here(channel.id) ? 'bg-main-surface-secondary text-white' : 'text-gray-300',
                     canConnect(channel.id) ? 'cursor-pointer hover:bg-main-surface-secondary hover:text-white' : 'text-gray-500 cursor-not-allowed'
                   ]">
                <lucide-angular class="w-4 h-4 flex-shrink-0 text-gray-400" [img]="Volume2"></lucide-angular>
                <span class="text-sm truncate flex-1">{{ channel.name }}</span>
                <span *ngIf="channel.user_limit" class="text-[11px] text-gray-500">{{ inVoice(channel.id).length }}/{{ channel.user_limit }}</span>
                <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала"
                        class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
                  <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
                </button>
              </div>
              <div *ngFor="let v of inVoice(channel.id); trackBy: byUser" class="flex items-center gap-2 py-1 pl-8 pr-2 group/member"
                   [attr.data-voice-member]="nameOf(v)">
                <div class="w-6 h-6 rounded-full overflow-hidden shrink-0 ring-2 transition"
                     [ngClass]="speaking(channel.id, v.user_id) ? 'ring-green-500' : 'ring-transparent'"
                     [attr.data-speaking]="speaking(channel.id, v.user_id) ? '' : null">
                  <AvatarUI [src]="store.user(v.user ?? null)?.avatar ?? null" [name]="nameOf(v)" />
                </div>
                <span class="text-xs text-gray-300 truncate flex-1">{{ nameOf(v) }}</span>
                <lucide-angular *ngIf="v.mute" class="w-3.5 h-3.5 text-red-400" [img]="MicOff" title="Микрофон выключил модератор"></lucide-angular>
                <lucide-angular *ngIf="v.self_mute && !v.mute" class="w-3.5 h-3.5 text-gray-400" [img]="MicOff" title="Микрофон выключен"></lucide-angular>
                <lucide-angular *ngIf="v.deaf" class="w-3.5 h-3.5 text-red-400" [img]="HeadphoneOff" title="Звук выключил модератор"></lucide-angular>
                <lucide-angular *ngIf="v.self_deaf && !v.deaf" class="w-3.5 h-3.5 text-gray-400" [img]="HeadphoneOff" title="Звук выключен"></lucide-angular>
                <span class="hidden group-hover/member:flex group-focus-within/member:flex items-center gap-0.5" data-voice-moderation>
                  <button *ngIf="can(channel.id, Perm.MuteMembers)" type="button" (click)="moderate(v, { mute: !v.mute })"
                          [title]="v.mute ? 'Вернуть микрофон' : 'Выключить микрофон участнику'"
                          class="p-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10">
                    <lucide-angular class="w-3.5 h-3.5" [img]="v.mute ? Mic : MicOff"></lucide-angular>
                  </button>
                  <button *ngIf="can(channel.id, Perm.DeafenMembers)" type="button" (click)="moderate(v, { deaf: !v.deaf })"
                          [title]="v.deaf ? 'Вернуть звук' : 'Выключить звук участнику'"
                          class="p-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10">
                    <lucide-angular class="w-3.5 h-3.5" [img]="v.deaf ? Headphones : HeadphoneOff"></lucide-angular>
                  </button>
                  <button *ngIf="can(channel.id, Perm.MoveMembers)" type="button" (click)="disconnect(v)" title="Отключить от канала"
                          class="p-0.5 rounded text-red-400 hover:bg-red-500/20">
                    <lucide-angular class="w-3.5 h-3.5" [img]="PhoneOff"></lucide-angular>
                  </button>
                </span>
              </div>
            </ng-container>
          </ng-container>
        </div>
      </div>
    </div>
  `,
})
export class ServerChannelsItems {
  @Input({ required: true }) set guild(g: FullGuild) { this.current.set(g); }

  private readonly current = signal<FullGuild | null>(null);
  protected readonly guildId = computed(() => this.current()?.id);
  protected readonly groups = computed(() => {
    const g = this.current();
    return g ? channelGroups(g) : [];
  });

  protected byId = (_: number, c: { id: string }) => c.id;
  protected byUser = (_: number, v: VoiceState) => v.user_id;
  protected readonly store = inject(AppStateStore);
  private readonly voice = inject(VoiceService);
  protected readonly MicOff = MicOff;
  protected readonly HeadphoneOff = HeadphoneOff;

  /** Who is in a voice channel, in the order they came. */
  protected inVoice(channelId: string): VoiceState[] {
    return (this.current()?.voice_states ?? []).filter(v => v.channel_id === channelId);
  }

  protected nameOf(v: VoiceState): string {
    return nameOf(this.store.user(v.user ?? null));
  }

  protected here(channelId: string): boolean {
    return this.voice.target()?.channelId === channelId;
  }

  /** LiveKit tells who speaks only in the room we are in. */
  protected speaking(channelId: string, userId: string): boolean {
    return this.here(channelId) && this.voice.speaking().has(userId);
  }

  protected readonly Perm = Perm;
  protected readonly Mic = Mic;
  protected readonly Headphones = Headphones;
  protected readonly PhoneOff = PhoneOff;
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  /** A permission in that channel, as the server computed it; the server decides anyway. */
  protected can(channelId: string, bit: bigint): boolean {
    return hasPerm(this.current()?.channel_permissions[channelId], bit);
  }

  /** The new state comes back through the gateway, like everyone else's. */
  protected moderate(v: VoiceState, change: { mute?: boolean; deaf?: boolean }): void {
    this.api.setServerVoice(v.guild_id, v.user_id, change).subscribe({
      error: err => this.notify.show(errorText(err, 'Не получилось'), 'error'),
    });
  }

  protected disconnect(v: VoiceState): void {
    this.api.disconnectVoice(v.guild_id, v.user_id).subscribe({
      error: err => this.notify.show(errorText(err, 'Не получилось отключить'), 'error'),
    });
  }

  protected canConnect(channelId: string): boolean {
    return hasPerm(this.current()?.channel_permissions[channelId], Perm.Connect);
  }

  protected join(channelId: string): void {
    const g = this.guildId();
    if (g && this.canConnect(channelId)) void this.voice.join({ guildId: g, channelId });
  }
  protected byGroup = (_: number, gr: { category: { id: string } | null }) => gr.category?.id ?? '-';
  protected readonly Volume2 = Volume2;
  protected readonly Settings = Settings;
  private readonly modal = inject(ModalService);

  /** MANAGE_CHANNELS in that channel, as the server computed it. */
  protected canManage(channelId: string): boolean {
    return hasPerm(this.current()?.channel_permissions[channelId], Perm.ManageChannels);
  }

  protected edit(channelId: string, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.modal.open('channel', { serverId: this.guildId(), channelId });
  }

  protected create(parentId: string): void {
    this.modal.open('channel', { serverId: this.guildId(), parentId });
  }
}
