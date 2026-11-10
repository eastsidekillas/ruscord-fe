import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicUser, nameOf } from '@shared/api';
import { GuildMembersStore } from '@entities/guild-members';
import { StatusUi } from '@entities/user-status';
import { AvatarUI } from '@shared/ui/avatar';
import { MoodFace } from '@entities/profile';
import { AppStateStore, TypingStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { ModalService } from '@shared/model/modal.service';
import { LayoutService } from '@shared/model/layout.service';
import { ResizeHandle } from '@shared/ui/resize-handle';
import { MEMBERS_COLUMN } from '@shared/lib/column-width';
import { memberSections } from '../../lib/member-sections';

/** Statuses of members come only for guilds up to this size (ruscord-core ADR-0018). */
const STATUS_MAX_MEMBERS = 250;

/**
 * The right column of a server channel: who is here right now (in voice,
 * typing in this channel), then the members grouped by role.
 */
@Component({
  selector: 'ServerMembersSidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatusUi, AvatarUI, ResizeHandle, MoodFace],
  host: { class: 'relative shrink-0', '[style.width.px]': 'layout.membersWidth()' },
  template: `
    <ResizeHandle [spec]="MEMBERS" edge="left" label="Ширина правой колонки" />
    <aside aria-label="Сейчас здесь и участники" class="h-full overflow-y-auto bg-ok-sidebar px-2 py-3 flex flex-col gap-0.5">
      <ng-container *ngIf="now() as n">
        <h2 class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pb-2">СЕЙЧАС ЗДЕСЬ</h2>
        <section *ngFor="let room of n.rooms; trackBy: byKey" class="mb-2 rounded-ok-md bg-ok-surface-1 p-2 flex flex-col gap-1" [attr.data-now-voice]="room.name">
          <div class="flex items-center gap-2 px-1 text-[12px] font-semibold text-ok-success">
            <span class="flex-1 truncate">{{ room.name }} · {{ room.people.length }}</span>
            <span *ngIf="room.mine" class="text-ok-muted">вы здесь</span>
          </div>
          <button *ngFor="let p of room.people; trackBy: byUser" type="button" (click)="openProfile(p.user_id)"
                  class="flex items-center gap-2.5 px-1 py-1 rounded-lg text-left hover:bg-ok-surface-2">
            <span class="w-7 h-7 shrink-0 rounded-lg overflow-hidden" [ngClass]="p.speaking ? 'shadow-[0_0_0_2px_var(--color-ok-success)]' : ''">
              <AvatarUI [src]="p.avatar" [name]="p.name" />
            </span>
            <span class="flex-1 text-[13px] font-medium truncate">{{ p.name }}</span>
            <span *ngIf="p.speaking" class="text-[11px] font-semibold text-ok-success">говорит</span>
            <span *ngIf="!p.speaking && p.typing" class="text-[11px] text-ok-muted">печатает</span>
          </button>
        </section>
        <div *ngIf="n.typing.length" class="mb-2 px-2 text-[12px] text-ok-muted" data-now-typing>
          <b class="font-semibold text-ok-text">{{ n.typing.join(', ') }}</b> {{ n.typing.length === 1 ? 'печатает' : 'печатают' }} здесь
        </div>
      </ng-container>

      <ng-container *ngFor="let section of sections(); let first = first; trackBy: byKey">
        <h2 *ngIf="!section.offline; else offlineTitle" class="text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pb-2 truncate" [class.pt-3]="!first || now()">
          {{ section.title }} — {{ section.rows.length }}
        </h2>
        <ng-template #offlineTitle>
          <button type="button" (click)="offlineOpen.set(!offlineOpen())" [attr.aria-expanded]="offlineOpen()" data-members-offline
                  class="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.1em] text-ok-muted px-2 pb-2 pt-3 text-left hover:text-ok-text">
            <span class="inline-block transition-transform" [class.rotate-90]="offlineOpen()" aria-hidden="true">›</span>
            {{ section.title }} — {{ section.rows.length }}
          </button>
        </ng-template>
        <ng-container *ngIf="!section.offline || offlineOpen()">
          <button *ngFor="let m of section.rows; trackBy: byUser" type="button" (click)="openProfile(m.user_id)"
                  class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-ok-surface-1"
                  [ngClass]="section.offline ? 'text-ok-muted' : 'text-ok-text'">
            <span class="relative w-8 h-8 shrink-0">
              <span class="block w-full h-full rounded-lg overflow-hidden" [class.grayscale]="section.offline">
                <AvatarUI [src]="m.avatar" [name]="m.name" [tone]="section.offline ? 'bg-ok-surface-2 text-ok-muted' : 'bg-ok-avatar text-ok-text'" />
              </span>
              <StatusUI *ngIf="withStatus() && !section.offline" [userId]="m.user_id" />
            </span>
            <span class="text-[13px] font-medium truncate" [style.color]="section.offline ? null : m.color">{{ m.name }}</span>
            <MoodFace [mood]="m.mood" />
          </button>
        </ng-container>
      </ng-container>
      <p *ngIf="loaded() && !members().length" class="text-[13px] text-ok-muted px-2">Нет участников.</p>
    </aside>
  `,
})
export class ServerMembersSidebar {
  readonly guildId = input.required<string>();
  /** The open text channel: who types in it shows on top. */
  readonly channelId = input<string | null>(null);

  private readonly directory = inject(GuildMembersStore);
  private readonly store = inject(AppStateStore);
  private readonly typing = inject(TypingStore);
  private readonly voice = inject(VoiceService);
  private readonly modal = inject(ModalService);
  protected readonly layout = inject(LayoutService);
  protected readonly MEMBERS = MEMBERS_COLUMN;

  protected readonly members = this.directory.members;
  protected readonly loaded = this.directory.loaded;
  protected readonly withStatus = computed(() => this.members().length <= STATUS_MAX_MEMBERS);
  protected readonly offlineOpen = signal(false);

  constructor() {
    // The directory follows the open guild.
    effect(() => this.directory.use(this.guildId()));
  }

  protected readonly rows = computed(() => {
    return this.members().map(m => {
      const u = this.store.user(m.user ?? null);
      return { user_id: m.user_id, name: m.nick || nameOf(u), roles: m.roles ?? [], avatar: u?.avatar ?? null, mood: u?.mood ?? null };
    });
  });

  protected readonly sections = computed(() => {
    const g = this.store.guild(this.guildId());
    return memberSections(this.rows(), g?.roles ?? [], this.guildId(), this.withStatus() ? id => this.store.status(id) : null);
  });

  /** Voice rooms with people and who types in this channel; null when nothing is going on. */
  protected readonly now = computed(() => {
    const g = this.store.guild(this.guildId());
    if (!g) return null;
    const typingHere = new Set(this.typing.usersIn(this.channelId()));
    const myRoom = this.voice.target()?.channelId;
    const speaking = this.voice.speaking();
    const known = new Map(this.members().map(m => [m.user_id, m]));
    const name = (id: string, user: PublicUser | null) => known.get(id)?.nick || nameOf(user);
    const userOf = (id: string, given?: PublicUser) => this.store.user(given ?? known.get(id)?.user ?? null);
    const rooms = g.channels
      .filter(c => c.type === 2)
      .map(c => {
        const people = (g.voice_states ?? [])
          .filter(v => v.channel_id === c.id)
          .map(v => {
            const u = userOf(v.user_id, v.user);
            return {
              user_id: v.user_id,
              name: name(v.user_id, u),
              avatar: u?.avatar ?? null,
              speaking: myRoom === c.id && speaking.has(v.user_id),
              typing: typingHere.has(v.user_id),
            };
          });
        return { key: c.id, name: c.name, mine: myRoom === c.id, people };
      })
      .filter(r => r.people.length);
    const inRooms = new Set(rooms.flatMap(r => r.people.map(p => p.user_id)));
    const typing = [...typingHere].filter(id => !inRooms.has(id)).map(id => name(id, userOf(id)));
    return rooms.length || typing.length ? { rooms, typing } : null;
  });

  protected byKey = (_: number, x: { key: string }) => x.key;
  protected byUser = (_: number, m: { user_id: string }) => m.user_id;

  protected openProfile(userId: string): void {
    this.modal.open('userProfile', { userId });
  }
}
