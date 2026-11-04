import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ArrowRightLeft, Hash, HeadphoneOff, Headphones, Lock, LucideAngularModule, Mic, MicOff, Monitor, PhoneOff, Plus, Settings, Volume2 } from 'lucide-angular';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, FullGuild, GuildChannel, Perm, VoiceState, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore, channelGroups } from '@entities/app-state';
import { ReadStateStore } from '@entities/read-states';
import { VoiceService } from '@entities/voice';
import { Track } from 'livekit-client';
import { AvatarUI } from '@shared/ui/avatar';

@Component({
  selector: 'ServerChannelsItems',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-y-auto' },
  styles: `.drop-target { background: var(--color-ok-surface-2); box-shadow: inset 0 0 0 2px var(--color-ok-accent); color: var(--color-ok-text); }`,
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
             class="relative flex items-center gap-2 p-2 rounded-lg text-ok-muted hover:bg-ok-surface-1 hover:text-ok-text group"
             [ngClass]="{ '!text-ok-text font-semibold': reads.unread(channel.id) }"
             [attr.data-unread]="reads.unread(channel.id) || null">
            <span *ngIf="reads.unread(channel.id)" class="absolute -left-2 top-1/2 -mt-1 w-1 h-2 rounded-r bg-ok-text" aria-hidden="true"></span>
            <lucide-angular class="w-4 h-4 shrink-0 text-ok-muted" [img]="Hash"></lucide-angular>
            <span class="truncate flex-1">{{ channel.name }}<span *ngIf="reads.unread(channel.id)" class="sr-only-ok">, непрочитанное</span></span>
            <span *ngIf="mentions(channel.id) as n" class="min-w-5 h-5 px-1.5 rounded-full bg-ok-danger text-ok-on-danger text-[11px] font-bold flex items-center justify-center"
                  [attr.aria-label]="'упоминаний: ' + n">{{ n > 99 ? '99+' : n }}</span>
            <button *ngIf="canManage(channel.id)" type="button" (click)="edit(channel.id, $event)" title="Настройки канала" aria-label="Настройки канала"
                    class="w-6 h-6 -my-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 text-ok-muted hover:text-ok-text flex items-center justify-center">
              <lucide-angular class="w-3.5 h-3.5" [img]="Settings"></lucide-angular>
            </button>
          </a>
          <ng-container *ngIf="channel.type === 2">
            <div (click)="join(channel.id)" [attr.data-voice-channel]="channel.name" [attr.aria-current]="here(channel.id) ? 'true' : null"
                 [title]="!canConnect(channel.id) ? 'Нет права подключаться' : full(channel) ? 'В голосовом канале нет мест' : 'Войти в голосовой канал'"
                 (dragover)="dragOver(channel.id, $event)" (dragleave)="dropTarget.set(null)" (drop)="drop(channel.id, $event)"
                 class="flex items-center gap-2 p-2 rounded-lg group"
                 [class.drop-target]="dropTarget() === channel.id"
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
            <ng-container *ngFor="let v of inVoice(channel.id); trackBy: byUser">
            <div
                 class="flex items-center gap-2 py-1 pl-8 pr-2 rounded-md text-[13px] font-medium group/member hover:bg-ok-surface-1"
                 [class.cursor-grab]="canDrag(channel.id)" [class.opacity-50]="dragging()?.user_id === v.user_id"
                 [attr.draggable]="canDrag(channel.id) ? 'true' : null"
                 (dragstart)="dragStart(v, $event)" (dragend)="dragEnd()"
                 [attr.data-voice-member]="nameOf(v)">
              <span class="w-6 h-6 rounded-ok-sm overflow-hidden shrink-0 transition-shadow"
                    [ngClass]="speaking(channel.id, v.user_id) ? 'shadow-[0_0_0_2px_var(--color-ok-accent)]' : ''"
                    [attr.data-speaking]="speaking(channel.id, v.user_id) ? '' : null">
                <AvatarUI [src]="store.user(v.user ?? null)?.avatar ?? null" [name]="nameOf(v)" />
              </span>
              <span class="truncate flex-1">{{ nameOf(v) }}</span>
              <button *ngIf="sharing(channel.id, v.user_id)" type="button" (click)="watch(channel.id, v.user_id)"
                      [attr.aria-label]="'Смотреть экран: ' + nameOf(v)" title="Смотреть экран" data-voice-screen
                      class="h-5 px-1.5 rounded-md bg-ok-accent text-ok-on-accent text-[11px] font-semibold flex items-center gap-1">
                <lucide-angular class="w-3 h-3" [img]="Monitor" aria-hidden="true"></lucide-angular>экран
              </button>
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
                <button *ngIf="can(channel.id, Perm.MoveMembers) && moveTargets(channel.id).length" type="button"
                        (click)="toggleMove(v.user_id)" title="Перенести в другой канал" [attr.aria-expanded]="moving() === v.user_id"
                        class="w-6 h-6 rounded-md text-ok-muted hover:text-ok-text hover:bg-ok-surface-2 flex items-center justify-center">
                  <lucide-angular class="w-3.5 h-3.5" [img]="ArrowRightLeft"></lucide-angular>
                </button>
                <button *ngIf="can(channel.id, Perm.MoveMembers)" type="button" (click)="disconnect(v)" title="Отключить от канала"
                        class="w-6 h-6 rounded-md text-ok-danger hover:bg-ok-surface-2 flex items-center justify-center">
                  <lucide-angular class="w-3.5 h-3.5" [img]="PhoneOff"></lucide-angular>
                </button>
              </span>
            </div>
            <ul *ngIf="moving() === v.user_id" role="menu" [attr.aria-label]="'Перенести ' + nameOf(v)" data-voice-move-menu
                class="ml-8 mr-2 mb-1 rounded-ok-md bg-ok-surface-2 border border-ok-border py-1 text-[13px]">
              <li *ngFor="let to of moveTargets(channel.id); trackBy: byId" role="none">
                <button type="button" role="menuitem" (click)="move(v, to.id)"
                        class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-ok-surface-1">
                  <lucide-angular class="w-3.5 h-3.5 text-ok-muted" [img]="Volume2" aria-hidden="true"></lucide-angular>
                  <span class="truncate">{{ to.name }}</span>
                </button>
              </li>
            </ul>
            </ng-container>
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
  protected readonly reads = inject(ReadStateStore);

  protected mentions(channelId: string): number {
    const s = this.reads.get(channelId);
    return s && this.reads.unread(channelId) ? s.mentions : 0;
  }
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
  protected readonly ArrowRightLeft = ArrowRightLeft;
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

  /** Someone being dragged to another voice channel (MOVE_MEMBERS). */
  protected readonly dragging = signal<VoiceState | null>(null);
  /** The voice channel under the pointer that accepts the drop. */
  protected readonly dropTarget = signal<string | null>(null);

  /** A member may be dragged out of a channel where we have MOVE_MEMBERS and somewhere to drop them. */
  protected canDrag(channelId: string): boolean {
    return this.can(channelId, Perm.MoveMembers) && this.moveTargets(channelId).length > 0;
  }

  protected dragStart(v: VoiceState, ev: DragEvent): void {
    if (!v.channel_id || !this.canDrag(v.channel_id)) return;
    this.dragging.set(v);
    this.moving.set(null);
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      // Some browsers start a drag only with data set.
      ev.dataTransfer.setData('text/plain', this.nameOf(v));
    }
  }

  protected dragEnd(): void {
    this.dragging.set(null);
    this.dropTarget.set(null);
  }

  private dropAllowed(channelId: string): VoiceState | null {
    const v = this.dragging();
    return v?.channel_id && this.moveTargets(v.channel_id).some(c => c.id === channelId) ? v : null;
  }

  /** Accepting dragover is what lets the browser drop there. */
  protected dragOver(channelId: string, ev: DragEvent): void {
    if (!this.dropAllowed(channelId)) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(channelId);
  }

  protected drop(channelId: string, ev: DragEvent): void {
    const v = this.dropAllowed(channelId);
    this.dragEnd();
    if (!v) return;
    ev.preventDefault();
    this.move(v, channelId);
  }

  /** Whose «move to» list is open. */
  protected readonly moving = signal<string | null>(null);

  protected toggleMove(userId: string): void {
    this.moving.update(cur => (cur === userId ? null : userId));
  }

  /**
   * Voice channels to move someone to from this one: MOVE_MEMBERS and
   * CONNECT there. Whether the member may enter, the server checks.
   */
  protected moveTargets(fromId: string): GuildChannel[] {
    return (this.current()?.channels ?? []).filter(c =>
      c.type === 2 && c.id !== fromId && this.can(c.id, Perm.MoveMembers) && this.can(c.id, Perm.Connect));
  }

  /** The member's client goes there itself (VOICE_MOVE); the list updates through the gateway. */
  protected move(v: VoiceState, channelId: string): void {
    this.moving.set(null);
    this.api.moveVoice(v.guild_id, v.user_id, channelId).subscribe({
      error: err => this.notify.show(errorText(err, 'Не получилось перенести'), 'error'),
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

  /** Opens the voice channel in the centre and enters it, when allowed and not full. */
  protected join(channelId: string): void {
    const g = this.guildId();
    if (!g) return;
    void this.router.navigate(['/channels', g, channelId]);
    const ch = this.current()?.channels.find(c => c.id === channelId);
    if (this.canConnect(channelId) && !(ch && this.full(ch))) void this.voice.join({ guildId: g, channelId });
  }

  /** LiveKit tells who shares a screen only in the room we are in. */
  protected sharing(channelId: string, userId: string): boolean {
    return this.here(channelId) && this.voice.sharers().has(userId);
  }

  protected watch(channelId: string, userId: string): void {
    this.voice.focus.set({ userId, source: Track.Source.ScreenShare });
    void this.router.navigate(['/channels', this.guildId(), channelId]);
  }

  private readonly router = inject(Router);
  protected readonly Monitor = Monitor;
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

  /** Every place taken and the user is not one of them («2/2»); the server refuses the join too. */
  protected full(channel: { id: string; user_limit?: number }): boolean {
    return !!channel.user_limit && !this.here(channel.id) && this.inVoice(channel.id).length >= channel.user_limit;
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
