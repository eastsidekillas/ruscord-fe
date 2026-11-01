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
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { PendingMessage, failReason } from '@widgets/chat/ui/pending-item';
import { MessageInput, SendPayload } from '@features/update-message/ui/message-input';
import { ServerMembersSidebar } from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import { GroupMembersSidebar } from '@widgets/sidebar/ui/group-members-sidebar';
import { ApiService, GatewayService, Message, Perm, PublicUser, errorText, hasPerm, nameOf } from '@shared/api';
import { AppStateStore, TypingStore } from '@entities/app-state';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';

const PAGE = 50;
/** TYPING_START lasts 10 s on other screens; repeat it a bit sooner while typing. */
const TYPING_EVERY_MS = 8000;

/** Inserts or replaces a message keeping id order (ids are UUIDv7: time order). */
export function upsertMessage(list: Message[], m: Message): Message[] {
  const i = list.findIndex(x => x.id === m.id);
  if (i >= 0) return list.map(x => (x.id === m.id ? m : x));
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
  imports: [CommonModule, ChatHeader, ChatMessages, MessageInput, ServerMembersSidebar, GroupMembersSidebar],
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
    <div class="flex h-full" *ngIf="view() as v; else waiting">
        <div class="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
          <ChatHeader [name]="v.title" [type]="v.kind" [imageUrl]="v.image" [topic]="v.topic" [userId]="v.partnerId"
                      [title]="v.group?.name ?? null" [members]="v.group?.recipients?.length ?? 0"
                      (profile)="openProfile($event)" (rename)="renameGroup($event)" (addMembers)="addToGroup()" />
          <ChatMessages
            class="flex-1 min-h-0"
            [items]="items()"
            [loadingOlder]="loadingOlder()"
            [reachedStart]="reachedStart()"
            [canReply]="v.canSend"
            [notice]="v.canRead ? null : 'У вас нет доступа к истории этого канала.'"
            (top)="loadOlder()"
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
          />

          <div class="h-5 px-6 text-[13px] text-ok-muted" aria-live="polite">
            <span *ngIf="typingText() as t" class="typing-indicator">
              <b class="font-semibold text-ok-text">{{ t.who }}</b>&nbsp;{{ t.verb }}<span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </span>
          </div>

          <MessageInput
            class="flex flex-col px-6 pb-6 pt-1"
            [placeholder]="v.placeholder"
            [disabled]="!v.canSend"
            [replyTo]="replyTo()"
            (cancelReply)="replyTo.set(null)"
            (sendMessage)="send($event)"
            (typing)="onTyping()"
          />
        </div>

        <ServerMembersSidebar *ngIf="v.guildId" [guildId]="v.guildId"
          class="w-[240px] shrink-0 hidden lg:block" />
        <GroupMembersSidebar *ngIf="v.group as g" [group]="g" (leave)="leaveGroup()"
          class="w-[260px] shrink-0 hidden lg:flex" />
    </div>
    <ng-template #waiting>
      <div class="h-full flex items-center justify-center text-ok-muted text-[13px]">
        {{ store.loaded() ? 'Канал не найден' : 'Загрузка…' }}
      </div>
    </ng-template>
  `,
})
export class ChannelPage {
  protected readonly store = inject(AppStateStore);
  private readonly typing = inject(TypingStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild(ChatMessages) private list?: ChatMessages;
  @ViewChild(MessageInput) private input?: MessageInput;

  protected readonly channelId = toSignal(this.route.paramMap.pipe(map(p => p.get('channelId'))), { initialValue: null });

  /** Everything the page shows about the channel, from the live state. */
  protected readonly view = computed(() => {
    const id = this.channelId();
    const inGuild = this.store.channel(id);
    if (inGuild) {
      const { guild, channel } = inGuild;
      if (channel.type !== 0) return null;
      const perms = guild.channel_permissions[channel.id];
      return {
        kind: 'channel' as const, title: channel.name, topic: channel.topic || null, image: null, partnerId: null, group: null,
        guildId: guild.id, placeholder: `Написать в #${channel.name}`,
        canSend: hasPerm(perms, Perm.SendMessages),
        canRead: hasPerm(perms, Perm.ReadMessageHistory),
        canManage: hasPerm(perms, Perm.ManageMessages),
      };
    }
    const dm = this.store.dm(id);
    if (!dm) return null;
    if (dm.type === 1) {
      const other = this.store.dmPartner(dm);
      return {
        kind: 'dm' as const, title: nameOf(other), topic: null, image: other?.avatar ?? null, partnerId: other?.id ?? null, group: null,
        guildId: null, placeholder: `Написать ${nameOf(other)}`, canSend: true, canRead: true, canManage: false,
      };
    }
    const title = this.store.groupTitle(dm);
    return {
      kind: 'group' as const, title, topic: null, image: null, partnerId: null, group: dm,
      guildId: null, placeholder: `Написать в «${title}»`, canSend: true, canRead: true, canManage: false,
    };
  });

  private readonly messages = signal<Message[]>([]);
  protected readonly reachedStart = signal(false);
  protected readonly loadingOlder = signal(false);
  protected readonly replyTo = signal<ChatMessage | null>(null);
  protected readonly editing = signal<ChatMessage | null>(null);
  /** Sent here and not confirmed yet; cleared when the channel changes. */
  protected readonly pending = signal<PendingMessage[]>([]);

  protected readonly items = computed<ChatMessage[]>(() => {
    const v = this.view();
    const me = this.store.me()?.id;
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
        reply: !m.reply_to ? null : replied ? { authorName: nameOf(this.store.user(replied.author)), content: replied.content } : 'missing',
        canEdit: mine && !!v?.canSend,
        canDelete: mine || !!v?.canManage,
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
    // Load the history when the channel (or the session) changes.
    effect(() => {
      const id = this.channelId();
      const v = this.view();
      const loaded = this.store.loaded();
      untracked(() => {
        if (!loaded) return;
        if (!v) {
          this.leaveMissing();
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
          if (ev.t === 'MESSAGE_CREATE' && document.hidden && d.author?.id !== this.store.me()?.id) this.ding();
          break;
        case 'MESSAGE_DELETE':
          this.messages.update(list => list.filter(m => m.id !== d.id));
          break;
      }
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.loading?.unsubscribe();
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

  protected send(p: SendPayload): void {
    const me = this.store.me();
    this.replyTo.set(null);
    this.lastTyping = 0;
    const item: PendingMessage = {
      nonce: crypto.randomUUID(), content: p.text, replyToId: p.replyToId,
      authorName: nameOf(me), authorAvatar: me?.avatar ?? null, error: null,
    };
    this.pending.update(list => [...list, item]);
    this.list?.scrollToBottom();
    this.deliver(item);
  }

  /** Sends again with the same nonce: the server keeps one copy at most. */
  protected retry(nonce: string): void {
    const item = this.pending().find(p => p.nonce === nonce);
    if (!item) return;
    this.setPending(nonce, null);
    this.deliver(item);
  }

  protected discard(nonce: string): void {
    this.pending.update(list => list.filter(p => p.nonce !== nonce));
  }

  private deliver(item: PendingMessage): void {
    const id = this.channelId();
    if (!id) return;
    const body = { content: item.content, nonce: item.nonce, reply_to: item.replyToId ?? undefined };
    this.api.sendMessage(id, body).subscribe({
      next: m => {
        if (m.channel_id !== this.channelId()) return;
        this.discard(item.nonce);
        this.messages.update(list => upsertMessage(list, m));
        this.list?.scrollToBottom();
      },
      error: err => this.setPending(item.nonce, failReason(err)),
    });
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
  private leaveMissing(): void {
    const serverId = this.route.parent?.snapshot.paramMap.get('serverId');
    this.router.navigate(serverId ? ['/channels', serverId] : ['/channels/me'], { replaceUrl: true });
  }

  private ding(): void {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(() => undefined);
  }
}
