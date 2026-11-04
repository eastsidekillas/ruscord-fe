import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpEventType } from '@angular/common/http';
import { Observable, Subscription, concat, defer, of } from 'rxjs';
import { filter, map, switchMap, tap, toArray } from 'rxjs/operators';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { ChatMessage, ReactionToggle } from '@widgets/chat/ui/chat-item';
import { PinsPanel } from '@widgets/chat/ui/pins-panel';
import { PendingFile, PendingMessage, failReason } from '@widgets/chat/ui/pending-item';
import { MessageInput, SendPayload } from '@features/update-message/ui/message-input';
import { ServerMembersSidebar } from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import { GroupMembersSidebar } from '@widgets/sidebar/ui/group-members-sidebar';
import { ApiService, GatewayService, Message, Perm, PublicUser, ReactionEvent, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore, TypingStore } from '@entities/app-state';
import { CallStage, VoiceRoom } from '@widgets/voice';
import { VoiceService } from '@entities/voice';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { GuildMembersStore } from '@entities/guild-members';
import { ReadStateStore } from '@entities/read-states';
import { MentionContext } from '@shared/ui/markup-view';
import { plainText } from '@shared/lib/markup';
import { MentionWorld, mentionContext, mentionOptions, mentionsMe } from '../model/mentions';
import { REACTION_EVENTS, ReactionEventType, applyReaction } from '../model/reactions';

const PAGE = 50;
/** TYPING_START lasts 10 s on other screens; repeat it a bit sooner while typing. */
const TYPING_EVERY_MS = 8000;

/** A one-line preview of a message, for the message a reply answers. */
function preview(m: Message, names: Parameters<typeof plainText>[1]): string {
  const text = plainText(m.content, names);
  if (text) return text;
  const n = m.attachments?.length ?? 0;
  return n ? (n === 1 ? m.attachments[0].filename : `Файлов: ${n}`) : '';
}

/** Inserts or replaces a message keeping id order (ids are UUIDv7: time order). */
export function upsertMessage(list: Message[], m: Message): Message[] {
  const i = list.findIndex(x => x.id === m.id);
  // Events carry no reactions (null): the ones shown stay.
  if (i >= 0) return list.map(x => (x.id === m.id ? { ...m, reactions: m.reactions ?? x.reactions } : x));
  const out = [...list];
  let at = out.length;
  while (at > 0 && out[at - 1].id > m.id) at--;
  out.splice(at, 0, m);
  return out;
}

@Component({
  selector: 'ChannelPage',
  standalone: true,
  host: { class: 'flex-1 min-h-0' },
  imports: [CommonModule, VoiceRoom, CallStage, ChatHeader, ChatMessages, MessageInput, ServerMembersSidebar, GroupMembersSidebar, PinsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .typing-indicator { display: inline-flex; align-items: center; }
    .dot {
      display: inline-block; width: 5px; height: 5px; border-radius: 50%;
      background-color: currentColor; margin-left: 3px;
      animation: blink 1.4s infinite both;
    }
    .dot:nth-child(1) { animation-delay: 0s; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } 100% { opacity: .2; } }
  `,
  template: `
    <div class="flex h-full" *ngIf="voiceRoom() as r">
      <VoiceRoom [guildId]="r.guildId" [channelId]="r.channelId" />
    </div>
    <div class="flex h-full" *ngIf="!voiceRoom() && view() as v; else waiting">
        <div class="relative flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
          <ChatHeader [showPins]="v.canRead" [pinsOpen]="pins() !== undefined" (pins)="togglePins()" [name]="v.title" [type]="v.kind" [imageUrl]="v.image" [topic]="v.topic" [userId]="v.partnerId"
                      [title]="v.group?.name ?? null" [members]="v.group?.recipients?.length ?? 0"
                      [canCall]="!!v.dm && !v.blocked && voice.target()?.channelId !== v.dm.id" (call)="startCall()"
                      (profile)="openProfile($event)" (rename)="renameGroup($event)" (addMembers)="addToGroup()" />
          <PinsPanel *ngIf="pins() !== undefined" class="absolute right-4 top-14 z-30" [pins]="pins() ?? null" [ctx]="mentionCtx()"
                     [canPin]="v.canPin" [authorName]="authorName" (unpin)="setPin($event, false)" (closed)="pins.set(undefined)" />
          <CallStage *ngIf="v.dm as d" [dm]="d" />
          <ChatMessages
            class="flex-1 min-h-0"
            [items]="items()"
            [loadingOlder]="loadingOlder()"
            [reachedStart]="reachedStart()"
            [canReply]="v.canSend"
            [notice]="v.canRead ? null : 'У вас нет доступа к истории этого канала.'"
            [ctx]="mentionCtx()"
            (top)="loadOlder()"
            (bottom)="markRead()"
            [newSince]="newSince()"
            (replyTo)="startReply($event)"
            [editingId]="editing()?.message?.id ?? null"
            [pending]="pending()"
            (edit)="startEdit($event)"
            (saveEdit)="saveEdit($event.item, $event.text)"
            (cancelEdit)="editing.set(null)"
            (retry)="retry($event)"
            (discard)="discard($event)"
            (remove)="remove($event)"
            (author)="openProfile($event)"
            (react)="react($event)"
            (pin)="setPin($event.item.message, $event.on)"
          />

          <div class="h-5 px-6 text-[13px] text-ok-muted" aria-live="polite">
            <span *ngIf="typingText() as t" class="typing-indicator">
              <b class="font-semibold text-ok-text">{{ t.who }}</b>&nbsp;{{ t.verb }}<span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </span>
          </div>

          <div *ngIf="v.blocked; else composer" class="px-6 pb-6 pt-1">
            <div class="rounded-ok-md bg-ok-sidebar border border-ok-border px-4 py-3.5 text-[13px] text-ok-muted text-center">Нельзя написать этому пользователю</div>
          </div>
          <ng-template #composer>
            <MessageInput
              class="flex flex-col px-6 pb-6 pt-1"
              [placeholder]="v.placeholder"
              [disabled]="!v.canSend"
              [replyTo]="replyTo()"
              [mentions]="suggest"
              [canAttach]="v.canAttach"
              (cancelReply)="replyTo.set(null)"
              (sendMessage)="send($event)"
              (typing)="onTyping()"
            />
          </ng-template>
        </div>

        <ServerMembersSidebar *ngIf="v.guildId" [guildId]="v.guildId"
          class="w-[240px] shrink-0 hidden lg:block" />
        <GroupMembersSidebar *ngIf="v.group as g" [group]="g" (leave)="leaveGroup()"
          class="w-[260px] shrink-0 hidden lg:flex" />
    </div>
    <ng-template #waiting>
      <div *ngIf="!voiceRoom()" class="h-full flex items-center justify-center text-ok-muted text-[13px]">
        {{ store.loaded() ? 'Канал не найден' : 'Загрузка…' }}
      </div>
    </ng-template>
  `,
})
export class ChannelPage {
  protected readonly store = inject(AppStateStore);
  protected readonly voice = inject(VoiceService);
  private readonly typing = inject(TypingStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly directory = inject(GuildMembersStore);
  private readonly reads = inject(ReadStateStore);
  /** Where «Новые сообщения» goes: the mark when the channel opened. */
  protected readonly newSince = signal<string | null>(null);
  @ViewChild(ChatMessages) private list?: ChatMessages;
  @ViewChild(MessageInput) private input?: MessageInput;

  protected readonly channelId = toSignal(this.route.paramMap.pipe(map(p => p.get('channelId'))), { initialValue: null });

  /** A voice channel shows its room instead of the chat. */
  protected readonly voiceRoom = computed(() => {
    const inGuild = this.store.channel(this.channelId());
    return inGuild?.channel.type === 2 ? { guildId: inGuild.guild.id, channelId: inGuild.channel.id } : null;
  });

  /** Everything the page shows about the channel, from the live state. */
  protected readonly view = computed(() => {
    const id = this.channelId();
    const inGuild = this.store.channel(id);
    if (inGuild) {
      const { guild, channel } = inGuild;
      if (channel.type !== 0) return null;
      const perms = guild.channel_permissions[channel.id];
      return {
        kind: 'channel' as const, title: channel.name, topic: channel.topic || null, image: null, partnerId: null, group: null, dm: null,
        guildId: guild.id, placeholder: `Написать в #${channel.name}`, blocked: false,
        canSend: hasPerm(perms, Perm.SendMessages),
        canAttach: hasPerm(perms, Perm.SendMessages) && hasPerm(perms, Perm.AttachFiles),
        canRead: hasPerm(perms, Perm.ReadMessageHistory),
        canReact: hasPerm(perms, Perm.AddReactions) && hasPerm(perms, Perm.ReadMessageHistory),
        canJoin: hasPerm(perms, Perm.ReadMessageHistory),
        canPin: hasPerm(perms, Perm.PinMessages) && hasPerm(perms, Perm.ReadMessageHistory),
        canManage: hasPerm(perms, Perm.ManageMessages),
      };
    }
    const dm = this.store.dm(id);
    if (!dm) return null;
    if (dm.type === 1) {
      const other = this.store.dmPartner(dm);
      // «Нельзя написать этому пользователю» when you blocked them (relationship type 2);
      // the other way round the client cannot know, the server refuses with cannot_dm.
      const blocked = !!other && this.store.relationship(other.id)?.type === 2;
      return {
        kind: 'dm' as const, title: nameOf(other), topic: null, image: other?.avatar ?? null, partnerId: other?.id ?? null, group: null, dm,
        guildId: null, placeholder: `Написать ${nameOf(other)}`, blocked, canSend: !blocked, canAttach: !blocked, canRead: true, canManage: false,
        canReact: !blocked, canJoin: !blocked, canPin: !blocked,
      };
    }
    const title = this.store.groupTitle(dm);
    return {
      kind: 'group' as const, title, topic: null, image: null, partnerId: null, group: dm, dm,
      guildId: null, placeholder: `Написать в «${title}»`, blocked: false, canSend: true, canAttach: true, canRead: true, canManage: false,
      canReact: true, canJoin: true, canPin: true,
    };
  });

  private readonly messages = signal<Message[]>([]);
  protected readonly reachedStart = signal(false);
  protected readonly loadingOlder = signal(false);
  protected readonly replyTo = signal<ChatMessage | null>(null);
  protected readonly editing = signal<ChatMessage | null>(null);
  /** Sent here and not confirmed yet; cleared when the channel changes. */
  protected readonly pending = signal<PendingMessage[]>([]);

  /** Everything mentions here are resolved against. */
  private readonly world = computed<MentionWorld>(() => {
    const v = this.view();
    const people = new Map<string, PublicUser>();
    const me = this.store.me();
    if (me) people.set(me.id, me);
    for (const r of this.store.relationships()) if (r.user) people.set(r.user.id, r.user);
    for (const m of this.messages()) if (m.author) people.set(m.author.id, m.author);
    for (const r of v?.dm?.recipients ?? []) people.set(r.id, r);
    return {
      guild: this.store.guild(v?.guildId),
      members: v?.guildId ? this.directory.members() : [],
      people: [...people.values()],
      channel: id => this.store.channel(id),
      live: u => this.store.user(u),
    };
  });
  protected readonly mentionCtx = computed<MentionContext>(() => mentionContext(this.world()));
  /** Suggestions while typing @ or #; reads the latest state on each call. */
  protected readonly suggest = (trigger: '@' | '#', query: string) => {
    const v = this.view();
    const perms = v?.guildId ? this.store.guild(v.guildId)?.channel_permissions[this.channelId()!] : null;
    return mentionOptions(this.world(), hasPerm(perms, Perm.MentionEveryone), trigger, query);
  };

  protected readonly items = computed<ChatMessage[]>(() => {
    const v = this.view();
    const me = this.store.me()?.id;
    const myRoles = this.store.guild(v?.guildId)?.member?.roles ?? [];
    const ctx = this.mentionCtx();
    const list = this.messages();
    const byId = new Map(list.map(m => [m.id, m]));
    return list.map(m => {
      const author = this.store.user(m.author);
      const replied = m.reply_to ? byId.get(m.reply_to) : undefined;
      const mine = !!me && author?.id === me;
      return {
        message: m,
        authorId: author?.id ?? null,
        authorName: nameOf(author),
        authorAvatar: author?.avatar ?? null,
        reply: !m.reply_to ? null : replied ? { authorName: nameOf(this.store.user(replied.author)), content: preview(replied, ctx) } : 'missing',
        canEdit: mine && !!v?.canSend,
        canDelete: mine || !!v?.canManage,
        mentioned: mentionsMe(m, me, myRoles),
        canReact: !!v?.canReact,
        canJoin: !!v?.canJoin,
        canPin: !!v?.canPin,
      };
    });
  });

  /** Names of those typing here, from what the page knows about people. */
  protected readonly typingText = computed(() => {
    const ids = this.typing.usersIn(this.channelId());
    if (!ids.length) return null;
    const known = new Map<string, PublicUser>();
    for (const m of this.messages()) if (m.author) known.set(m.author.id, m.author);
    for (const r of this.store.dm(this.channelId())?.recipients ?? []) known.set(r.id, r);
    const names = ids.map(id => {
      const u = known.get(id) ?? this.store.relationship(id)?.user;
      return u ? nameOf(this.store.user(u)) : 'Кто-то';
    });
    if (names.length === 1) return { who: names[0], verb: 'печатает' };
    return names.length <= 3 ? { who: names.join(', '), verb: 'печатают' } : { who: 'Несколько человек', verb: 'печатают' };
  });

  private loading?: Subscription;
  private lastTyping = 0;
  private notificationSound = new Audio('sounds/dm_notification.mp3');

  constructor() {
    // Mentions and the member list of a guild channel share its members.
    effect(() => {
      const gid = this.view()?.guildId;
      if (gid) untracked(() => this.directory.use(gid));
    });
    // Load the history when the channel (or the session) changes.
    effect(() => {
      const id = this.channelId();
      const v = this.view();
      const loaded = this.store.loaded();
      untracked(() => {
        if (!loaded) return;
        if (!v) {
          if (!this.voiceRoom()) this.leaveMissing();
          return;
        }
        if (id !== this.loadedFor) this.load(id!, v.canRead);
      });
    });

    const sub = inject(GatewayService).dispatches.subscribe(ev => {
      const d = ev.d as Partial<Message> | null;
      if (ev.t === 'READY') {
        // A new session: messages may have been missed while disconnected.
        this.loadedFor = null;
        return;
      }
      if (!d || d.channel_id !== this.channelId()) return;
      switch (ev.t) {
        case 'MESSAGE_CREATE':
        case 'MESSAGE_UPDATE':
          if ((d as Message).nonce && (d as Message).author?.id === this.store.me()?.id) this.discard((d as Message).nonce!);
          this.messages.update(list => upsertMessage(list, d as Message));
          if (ev.t === 'MESSAGE_CREATE') setTimeout(() => this.markRead());
          if (ev.t === 'MESSAGE_CREATE' && document.hidden && d.author?.id !== this.store.me()?.id) this.ding();
          break;
        case 'MESSAGE_DELETE':
          this.messages.update(list => list.filter(m => m.id !== d.id));
          break;
      }
      if (ev.t === 'MESSAGE_UPDATE' || ev.t === 'MESSAGE_DELETE') this.notePin(ev.t, d as Message);
      if ((REACTION_EVENTS as readonly string[]).includes(ev.t)) {
        const r = d as unknown as ReactionEvent;
        this.applyReaction(r.message_id, ev.t as ReactionEventType, r);
      }
    });
    const visible = () => this.markRead();
    document.addEventListener('visibilitychange', visible);
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.loading?.unsubscribe();
      document.removeEventListener('visibilitychange', visible);
    });
  }

  private loadedFor: string | null = null;
  private pendingFor: string | null = null;

  private load(id: string, canRead: boolean): void {
    this.loading?.unsubscribe();
    // A reload after reconnecting keeps unsent messages; another channel does not.
    if (id !== this.pendingFor) this.pending.set([]);
    this.pendingFor = id;
    this.loadedFor = id;
    this.messages.set([]);
    this.replyTo.set(null);
    this.editing.set(null);
    this.pins.set(undefined);
    const st = this.reads.get(id);
    this.newSince.set(this.reads.unread(id) ? (st?.lastRead ?? null) : null);
    this.lastTyping = 0;
    this.reachedStart.set(!canRead);
    this.loadingOlder.set(false);
    if (!canRead) return;
    this.loading = this.api.messages(id, { limit: PAGE }).subscribe({
      next: page => {
        // Events that came during the request are kept: merge, not replace.
        this.messages.update(list => page.reduce(upsertMessage, list));
        this.reachedStart.set(page.length < PAGE);
        this.list?.scrollToBottom();
        setTimeout(() => this.markRead());
      },
      error: err => this.notify.show(errorText(err, 'Не удалось загрузить сообщения'), 'error'),
    });
  }

  protected loadOlder(): void {
    const id = this.channelId();
    const first = this.messages()[0];
    if (!id || !first || this.reachedStart() || this.loadingOlder()) return;
    this.loadingOlder.set(true);
    this.api.messages(id, { before: first.id, limit: PAGE }).subscribe({
      next: page => {
        if (id !== this.channelId()) return;
        this.messages.update(list => page.reduce(upsertMessage, list));
        this.reachedStart.set(page.length < PAGE);
        this.loadingOlder.set(false);
      },
      error: () => this.loadingOlder.set(false),
    });
  }

  /** Marks the channel read when its newest message is on screen. */
  protected markRead(): void {
    const id = this.channelId();
    const newest = this.messages().at(-1)?.id;
    if (!id || !newest || document.hidden || !this.list?.isAtBottom() || !this.view()?.canRead) return;
    this.reads.ack(id, newest);
  }

  protected send(p: SendPayload): void {
    this.newSince.set(null);
    const me = this.store.me();
    this.replyTo.set(null);
    this.lastTyping = 0;
    const item: PendingMessage = {
      nonce: crypto.randomUUID(), content: p.text, replyToId: p.replyToId, replyMention: p.replyMention,
      files: p.files.map(file => ({ file, id: null, progress: 0 })),
      authorName: nameOf(me), authorAvatar: me?.avatar ?? null, error: null,
    };
    this.pending.update(list => [...list, item]);
    this.list?.scrollToBottom();
    this.deliver(item);
  }

  /** Sends again with the same nonce: the server keeps one copy at most. */
  protected retry(nonce: string): void {
    // The newest copy: it knows which files are already up.
    const item = this.pending().find(p => p.nonce === nonce);
    if (!item) return;
    this.setPending(nonce, null);
    this.deliver(item);
  }

  protected discard(nonce: string): void {
    this.pending.update(list => list.filter(p => p.nonce !== nonce));
  }

  /**
   * Uploads the files that are not up yet, one at a time with progress,
   * then sends the message with their ids. A retry starts from the first
   * file without an id.
   */
  private deliver(item: PendingMessage): void {
    const id = this.channelId();
    if (!id) return;
    const uploads = item.files.map((f, i) => (f.id ? of(f.id) : this.upload(id, item.nonce, i, f)));
    concat(...uploads).pipe(
      toArray(),
      switchMap(ids => {
        const body = {
          content: item.content, nonce: item.nonce, reply_to: item.replyToId ?? undefined,
          reply_mention: item.replyToId ? item.replyMention : undefined,
          attachments: ids.length ? ids : undefined,
        };
        return this.api.sendMessage(id, body);
      }),
    ).subscribe({
      next: m => {
        if (m.channel_id !== this.channelId()) return;
        this.discard(item.nonce);
        this.messages.update(list => upsertMessage(list, m));
        this.list?.scrollToBottom();
      },
      error: err => this.setPending(item.nonce, failReason(err)),
    });
  }

  /** One file up; its progress and then its id land in the pending message. */
  private upload(channelId: string, nonce: string, i: number, f: PendingFile): Observable<string> {
    return defer(() => this.api.uploadAttachment(channelId, f.file)).pipe(
      tap(ev => {
        if (ev.type === HttpEventType.UploadProgress && ev.total) this.setFile(nonce, i, { progress: ev.loaded / ev.total });
      }),
      filter(ev => ev.type === HttpEventType.Response),
      map(ev => (ev.type === HttpEventType.Response ? ev.body!.id : '')),
      tap(fileId => this.setFile(nonce, i, { id: fileId, progress: 1 })),
    );
  }

  private setFile(nonce: string, i: number, patch: Partial<PendingFile>): void {
    this.pending.update(list => list.map(p => (p.nonce === nonce ? { ...p, files: p.files.map((f, j) => (j === i ? { ...f, ...patch } : f)) } : p)));
  }

  private setPending(nonce: string, error: string | null): void {
    this.pending.update(list => list.map(p => (p.nonce === nonce ? { ...p, error } : p)));
  }

  /** Editing is in place, so a reply being written stays as it is. */
  protected startEdit(item: ChatMessage): void {
    this.editing.set(item);
  }

  protected saveEdit(item: ChatMessage, text: string): void {
    const id = this.channelId();
    if (!id) return;
    if (text === item.message.content) {
      this.editing.set(null);
      return;
    }
    this.api.editMessage(id, item.message.id, text).subscribe({
      next: m => {
        this.messages.update(list => upsertMessage(list, m));
        this.editing.set(null);
      },
      error: err => this.notify.show(errorText(err, 'Не удалось изменить сообщение'), 'error'),
    });
  }

  protected remove(item: ChatMessage): void {
    const id = this.channelId();
    if (!id || !confirm('Удалить сообщение?')) return;
    this.api.deleteMessage(id, item.message.id).subscribe({
      next: () => this.messages.update(list => list.filter(m => m.id !== item.message.id)),
      error: err => this.notify.show(errorText(err, 'Не удалось удалить сообщение'), 'error'),
    });
  }

  /** The pinned panel: undefined when closed, null while loading. */
  protected readonly pins = signal<Message[] | null | undefined>(undefined);
  protected readonly authorName = (m: Message) => nameOf(this.store.user(m.author));

  protected togglePins(): void {
    const id = this.channelId();
    if (this.pins() !== undefined || !id) {
      this.pins.set(undefined);
      return;
    }
    this.pins.set(null);
    this.api.pins(id).subscribe({
      next: list => {
        if (id === this.channelId() && this.pins() !== undefined) this.pins.set(list);
      },
      error: err => {
        this.pins.set(undefined);
        this.notify.show(errorText(err, 'Не удалось загрузить закреплённые'), 'error');
      },
    });
  }

  protected setPin(m: Message, on: boolean): void {
    const id = this.channelId();
    if (!id) return;
    this.api.pin(id, m.id, on).subscribe({
      error: err => this.notify.show(errorText(err, on ? 'Не удалось закрепить' : 'Не удалось открепить'), 'error'),
    });
  }

  /** Keeps an open pinned panel up to date with edits, pins and deletes. */
  private notePin(t: 'MESSAGE_UPDATE' | 'MESSAGE_DELETE', m: Message): void {
    const list = this.pins();
    if (!list) return;
    const rest = list.filter(x => x.id !== m.id);
    if (t === 'MESSAGE_DELETE' || !m.pinned_at) {
      this.pins.set(rest);
      return;
    }
    this.pins.set([m, ...rest].sort((a, b) => (b.pinned_at ?? '').localeCompare(a.pinned_at ?? '')));
  }

  /** Shows the click at once; the server's event then changes nothing. */
  protected react(t: ReactionToggle): void {
    const id = this.channelId();
    const me = this.store.me()?.id;
    if (!id || !me) return;
    const ev: ReactionEvent = { channel_id: id, message_id: t.item.message.id, emoji: t.emoji, user_id: me };
    this.applyReaction(ev.message_id, t.on ? 'MESSAGE_REACTION_ADD' : 'MESSAGE_REACTION_REMOVE', ev);
    const req = t.on ? this.api.react(id, ev.message_id, t.emoji) : this.api.unreact(id, ev.message_id, t.emoji);
    req.subscribe({
      error: err => {
        this.applyReaction(ev.message_id, t.on ? 'MESSAGE_REACTION_REMOVE' : 'MESSAGE_REACTION_ADD', ev);
        this.notify.show(errorText(err, 'Не удалось поставить реакцию'), 'error');
      },
    });
  }

  private applyReaction(messageId: string, t: ReactionEventType, d: ReactionEvent): void {
    const me = this.store.me()?.id;
    this.messages.update(list => list.map(m => (m.id === messageId ? applyReaction(m, t, d, me) : m)));
  }

  protected startReply(item: ChatMessage): void {
    this.replyTo.set(item);
  }

  /** Tells the server at most every 8 s while the user types. */
  protected onTyping(): void {
    const id = this.channelId();
    const now = Date.now();
    if (!id || now - this.lastTyping < TYPING_EVERY_MS) return;
    this.lastTyping = now;
    this.api.typing(id).subscribe({ error: () => undefined });
  }

  protected renameGroup(name: string): void {
    const id = this.channelId();
    if (!id) return;
    this.api.renameGroup(id, name).subscribe({
      next: dm => this.store.noteDM(dm),
      error: err => this.notify.show(errorText(err, 'Не удалось переименовать группу'), 'error'),
    });
  }

  protected addToGroup(): void {
    this.modal.open('group', { channelId: this.channelId() });
  }

  protected leaveGroup(): void {
    const id = this.channelId();
    if (!id || !confirm('Выйти из группы? Вернуть вас сможет только участник группы.')) return;
    this.api.leaveGroup(id).subscribe({
      next: () => this.router.navigate(['/channels/me'], { replaceUrl: true }),
      error: err => this.notify.show(errorText(err, 'Не удалось выйти из группы'), 'error'),
    });
  }

  protected openProfile(userId: string): void {
    this.modal.open('userProfile', { userId });
  }

  /** The channel is gone or hidden now: go where the user can be. */
  /** Calls the DM open here; the others' clients ring (ruscord-core ADR-0032). */
  protected startCall(): void {
    const id = this.channelId();
    if (id) void this.voice.join({ guildId: null, channelId: id });
  }

  private leaveMissing(): void {
    const serverId = this.route.parent?.snapshot.paramMap.get('serverId');
    this.router.navigate(serverId ? ['/channels', serverId] : ['/channels/me'], { replaceUrl: true });
  }

  private ding(): void {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(() => undefined);
  }
}
