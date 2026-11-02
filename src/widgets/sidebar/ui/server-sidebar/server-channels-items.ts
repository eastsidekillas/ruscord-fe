import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Hash, HeadphoneOff, Headphones, Lock, LucideAngularModule, Mic, MicOff, PhoneOff, Plus, Settings, Volume2 } from 'lucide-angular';
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
    <div class="flex flex-col gap-0.5 px-2 py-3">
      <ng-container *ngFor="let group of groups(); trackBy: byGroup; let first = first">
        <div *ngIf="group.category as cat" class="flex items-center gap-1 px-2 pb-1 group/cat" [ngClass]="first ? 'pt-2' : 'pt-4'">
          <h4 class="flex-1 text-[12px] font-semibold tracking-[0.1em] uppercase text-ok-muted truncate">{{ cat.name }}</h4>
          <ng-container *ngIf="canManage(cat.id)">
            <button type="button" (click)="create(cat.id)" title="Создать канал в категории" aria-label="Создать канал в категории"
                    class="w-6 h-6 rounded-md text-ok-muted hover:text-ok-text opacity-0 group-hover/cat:opacity-100 focus:opacity-100 flex items-center justify-center">
              <lucide-angular class="w-3.5 h-3.5" [img]="Plus"></lucide-angular>
            </button>
            <button type="button" (click)="edit(cat.id)" title="Настройки категории" aria-label="Настройки категории"
                    class="w-6 h-6 rounded-md text-ok-muted hover:text-ok-text opacity-0 group-hover/cat:opacity-100 focus:opacity-100 flex items-center justify-center">
              <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
            </button>
          </ng-container>
        </div>
        <ng-container *ngFor="let channel of group.channels; trackBy: byId">
          <a *ngIf="channel.type === 0"
             [routerLink]="['/channels', guildId(), channel.id]"
             routerLinkActive="!bg-ok-surface-2 !text-ok-text"
             class="flex items-center gap-2 p-2 rounded-lg text-ok-muted hover:bg-ok-surface-1 hover:text-ok-text group">
            <lucide-angular class="w-4 h-4 shrink-0 text-ok-muted" [img]="Hash"></lucide-angular>
            <span class="truncate flex-1">{{ channel.name }}</span>
            <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала" aria-label="Настройки канала"
                    class="w-6 h-6 -my-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 text-ok-muted hover:text-ok-text flex items-center justify-center">
              <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
            </button>
          </a>
          <ng-container *ngIf="channel.type === 2">
            <div (click)="join(channel.id)" [attr.data-voice-channel]="channel.name" [attr.aria-current]="here(channel.id) ? 'true' : null"
                 [title]="canConnect(channel.id) ? 'Войти в голосовой канал' : 'Нет права подключаться'"
                 class="flex items-center gap-2 p-2 rounded-lg group"
                 [ngClass]="[
                   here(channel.id) || inVoice(channel.id).length ? 'text-ok-text' : 'text-ok-muted',
                   canConnect(channel.id) ? 'cursor-pointer hover:bg-ok-surface-1 hover:text-ok-text' : 'cursor-not-allowed'
                 ]">
              <lucide-angular class="w-4 h-4 shrink-0 text-ok-muted" [img]="canConnect(channel.id) ? Volume2 : Lock"></lucide-angular>
              <span class="truncate flex-1">{{ channel.name }}</span>
              <span *ngIf="channel.user_limit" class="text-[12px] text-ok-muted tabular-nums">{{ inVoice(channel.id).length }}/{{ channel.user_limit }}</span>
              <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала" aria-label="Настройки канала"
                      class="w-6 h-6 -my-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 text-ok-muted hover:text-ok-text flex items-center justify-center">
                <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
              </button>
            </div>
            <div *ngFor="let v of inVoice(channel.id); trackBy: byUser"
                 class="flex items-center gap-2 py-1 pl-8 pr-2 rounded-md text-[13px] font-medium group/member hover:bg-ok-surface-1"
                 [attr.data-voice-member]="nameOf(v)">
              <span class="w-6 h-6 rounded-ok-sm overflow-hidden shrink-0 transition-shadow"
                    [ngClass]="speaking(channel.id, v.user_id) ? 'shadow-[0_0_0_2px_var(--color-ok-accent)]' : ''"
                    [attr.data-speaking]="speaking(channel.id, v.user_id) ? '' : null">
                <AvatarUI [src]="store.user(v.user ?? null)?.avatar ?? null" [name]="nameOf(v)" />
              </span>
              <span class="truncate flex-1">{{ nameOf(v) }}</span>
              <lucide-angular *ngIf="v.mute" class="w-3.5 h-3.5 text-ok-danger" [img]="MicOff" title="Микрофон выключил модератор"></lucide-angular>
              <lucide-angular *ngIf="v.self_mute && !v.mute" class="w-3.5 h-3.5 text-ok-muted" [img]="MicOff" title="Микрофон выключен"></lucide-angular>
              <lucide-angular *ngIf="v.deaf" class="w-3.5 h-3.5 text-ok-danger" [img]="HeadphoneOff" title="Звук выключил модератор"></lucide-angular>
              <lucide-angular *ngIf="v.self_deaf && !v.deaf" class="w-3.5 h-3.5 text-ok-muted" [img]="HeadphoneOff" title="Звук выключен"></lucide-angular>
              <span class="hidden group-hover/member:flex group-focus-within/member:flex items-center gap-0.5" data-voice-moderation>
                <button *ngIf="can(channel.id, Perm.MuteMembers)" type="button" (click)="moderate(v, { mute: !v.mute })"
                        [title]="v.mute ? 'Вернуть микрофон' : 'Выключить микрофон участнику'"
                        class="w-6 h-6 rounded-md text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 flex items-center justify-center">
                  <lucide-angular class="w-3.5 h-3.5" [img]="v.mute ? Mic : MicOff"></lucide-angular>
                </button>
                <button *ngIf="can(channel.id, Perm.DeafenMembers)" type="button" (click)="moderate(v, { deaf: !v.deaf })"
                        [title]="v.deaf ? 'Вернуть звук' : 'Выключить звук участнику'"
                        class="w-6 h-6 rounded-md text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 flex items-center justify-center">
                  <lucide-angular class="w-3.5 h-3.5" [img]="v.deaf ? Headphones : HeadphoneOff"></lucide-angular>
                </button>
                <button *ngIf="can(channel.id, Perm.MoveMembers)" type="button" (click)="disconnect(v)" title="Отключить от канала"
                        class="w-6 h-6 rounded-md text-ok-danger hover:bg-ok-surface-2 flex items-center justify-center">
                  <lucide-angular class="w-3.5 h-3.5" [img]="PhoneOff"></lucide-angular>
                </button>
              </span>
            </div>
          </ng-container>
        </ng-container>
      </ng-container>
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
  protected readonly Hash = Hash;
  protected readonly Lock = Lock;
  protected readonly Plus = Plus;
  protected readonly Settings = Settings;
  private readonly modal = inject(ModalService);

  /** MANAGE_CHANNELS or MANAGE_ROLES in that channel, as the server computed it: either opens the settings. */
  protected canManage(channelId: string): boolean {
    const p = this.current()?.channel_permissions[channelId];
    return hasPerm(p, Perm.ManageChannels) || hasPerm(p, Perm.ManageRoles);
  }

  protected edit(channelId: string, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.modal.open('channelSettings', { serverId: this.guildId(), channelId });
  }

  protected create(parentId: string): void {
    this.modal.open('channel', { serverId: this.guildId(), parentId });
  }
}
