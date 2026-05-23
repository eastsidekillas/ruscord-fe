import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { MessageInput, SendPayload } from '@features/update-message/ui/message-input';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { SocketService } from '@shared/api/socket.service';
import { ApiService } from '@shared/api/api.service';
import { EMPTY, Observable, Subject, catchError, takeUntil, switchMap } from 'rxjs';
import { AuthService } from '@entities/session/api/auth.service';
import { ServerMembersSidebar } from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import { map } from 'rxjs/operators';
import { ChatCallOverlay } from '@widgets/media-room/ui/chat-call-overlay';
import { ServerMediaRoom } from '@widgets/sidebar/ui/server-sidebar/server-media-room';
import { CallStateService } from '@entities/call';
import { ModalService } from '@shared/model/modal.service';

@Component({
  selector: 'ChannelPage',
  standalone: true,
  host: { class: 'flex-1 min-h-0' },
  imports: [CommonModule, ChatHeader, ChatMessages, MessageInput, ServerMembersSidebar, ChatCallOverlay, ServerMediaRoom],
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
    @keyframes blink {
      0%   { opacity: 0.2; }
      20%  { opacity: 1; }
      100% { opacity: 0.2; }
    }
  `,
  template: `
    <div class="flex flex-col h-full">

      <ChatHeader
        [name]="chatHeaderName() || 'Чат'"
        [type]="channel()?.scope === 'DM' ? 'conversation' : 'channel'"
        [imageUrl]="otherParticipant()?.avatar"
        [userId]="chatHeaderUserId()"
        (callInitiated)="onInitiateCall($event)"
      />

      <div class="flex flex-col flex-1 overflow-hidden min-h-0">

        <!-- ── CALL PANEL ── -->
        <div
          class="relative flex flex-col overflow-hidden bg-[#1e2124]"
          style="transition: height 0.35s cubic-bezier(.4,0,.2,1); flex-shrink: 0;"
          [style.height]="callPanelHeight()"

        >
          <ChatCallOverlay class="flex-1 min-h-0 overflow-hidden" />

          <!-- Expand / collapse toggle -->
          <button
            *ngIf="isCurrentChannelInCall()"
            (click)="toggleCallExpanded()"
            class="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center transition-colors"
            [title]="callExpanded() ? 'Свернуть' : 'На весь экран'"
          >
            <!-- ArrowsPointingOut -->
            <svg *ngIf="!callExpanded()" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
            </svg>
            <!-- ArrowsPointingIn -->
            <svg *ngIf="callExpanded()" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/>
            </svg>
          </button>
        </div>

        <!-- Horizontal divider (visible only in split mode) -->
        <div
          class="h-px w-full bg-white/10 flex-shrink-0"
          style="transition: opacity 0.3s ease;"
          [style.opacity]="isCurrentChannelInCall() && !callExpanded() ? '1' : '0'"
        ></div>

        <!-- ── CHAT PANEL ── -->
        <div
          class="flex overflow-hidden"
          style="transition: height 0.35s cubic-bezier(.4,0,.2,1), opacity 0.2s ease;"
          [style.height]="chatPanelHeight()"
          [style.opacity]="isCurrentChannelInCall() && callExpanded() ? '0' : '1'"
          [style.pointer-events]="isCurrentChannelInCall() && callExpanded() ? 'none' : 'auto'"
        >
          <div class="flex-1 flex flex-col overflow-hidden min-h-0">

            <ChatMessages
              [messages]="messages()"
              class="flex-1 min-h-0"
              *ngIf="!isAudioChannel()"
              (replyTo)="replyToMsg.set($event)"
              (forwardMessage)="onForwardMessage($event)"
            />

            <div *ngIf="typing()" class="typing-indicator text-xs text-gray-500 ml-4 -mb-5">
              {{ typing() }} печатает
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>

            <MessageInput
              *ngIf="!isAudioChannel()"
              class="flex flex-col px-4 pb-4 pt-2 bg-main-surface-primary"
              [channelId]="channel()?.id"
              [replyTo]="replyToMsg()"
              (cancelReply)="replyToMsg.set(null)"
              (sendMessage)="onSendMessage($event)"
              (typing)="onTyping($event)"
            />

            <div class="flex flex-1 overflow-hidden" *ngIf="isAudioChannel()">
              <ServerMediaRoom class="w-full" />
            </div>
          </div>

          <ng-container *ngIf="serverId$ && serverId() !== 'me' && channel()?.scope !== 'DM'">
            <ServerMembersSidebar
              class="w-64 border-l border-gray-500 bg-sidebar-surface-secondary hidden lg:block"
              [serverId]="serverId$"
            />
          </ng-container>
        </div>

      </div>
    </div>
  `,
})
export class ChannelPage implements OnInit, OnDestroy {
  readonly messages = signal<any[]>([]);
  readonly channel = signal<any>(null);
  readonly chatHeaderName = signal<string | null>(null);
  readonly otherParticipant = signal<any | null>(null);
  readonly chatHeaderUserId = signal<string | null>(null);
  readonly isAudioChannel = signal(false);
  readonly typing = signal<string | null>(null);
  readonly serverId = signal<string | null>(null);
  readonly callExpanded = signal(false);
  readonly replyToMsg = signal<ChatMessage | null>(null);

  channelId = '';
  currentUserId: string | null = null;
  serverId$: Observable<string | null>;

  private ngUnsubscribe = new Subject<void>();
  private notificationSound = new Audio('sounds/dm_notification.mp3');
  @ViewChild(ChatMessages) chatMessagesComponent!: ChatMessages;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly socketService = inject(SocketService);
  protected readonly callState = inject(CallStateService);
  private readonly modalService = inject(ModalService);

  protected readonly isCurrentChannelInCall = computed(
    () => this.callState.isInCall() && this.callState.party()?.channelId === this.channelId
  );

  protected readonly callPanelHeight = computed(() => {
    if (!this.isCurrentChannelInCall()) return '0%';
    return this.callExpanded() ? '100%' : '40%';
  });

  protected readonly chatPanelHeight = computed(() => {
    if (!this.isCurrentChannelInCall()) return '100%';
    return this.callExpanded() ? '0%' : '60%';
  });

  constructor() {
    this.serverId$ = this.route.parent?.paramMap.pipe(map(params => params.get('serverId'))) ?? EMPTY;
    effect(() => {
      if (!this.isCurrentChannelInCall()) {
        untracked(() => this.callExpanded.set(false));
      }
    });
  }

  ngOnInit() {
    this.serverId$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(id => {
      this.serverId.set(id);
    });

    this.socketService.listenMessages().pipe(takeUntil(this.ngUnsubscribe)).subscribe(msg => {
      if (msg.type === 'chat.message') {
        this.messages.update(msgs => [...msgs, msg]);
        if (document.hidden) this.playNotificationSound();
        this.scrollToBottomMessages();
      }
      if (msg.type === 'user.typing' && msg.sender_id !== this.auth.userId) {
        this.typing.set(msg.typing ? msg.sender_username : null);
      }
    });

    this.route.paramMap.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(params => {
        this.channelId = params.get('channelId') || '';
        this.messages.set([]);
        this.channel.set(null);
        this.isAudioChannel.set(false);
        this.connectWebSocket();

        return this.api.getChannel(this.channelId).pipe(
          switchMap(channel => {
            this.channel.set(channel);
            this.currentUserId = this.auth.userId;

            if (channel?.scope === 'DM' && channel?.participants) {
              const other = channel.participants.find((p: any) => p.user.id !== this.currentUserId);
              this.otherParticipant.set(other ?? null);
              this.chatHeaderName.set(other?.name || 'Direct Message');
              this.chatHeaderUserId.set(other?.user?.id ?? null);
            } else if (channel?.scope === 'GROUP') {
              this.otherParticipant.set(null);
              this.chatHeaderName.set(channel.name);
              this.chatHeaderUserId.set(null);
            } else {
              this.otherParticipant.set(null);
              this.chatHeaderName.set(channel?.name || 'Channel');
              this.chatHeaderUserId.set(null);
            }

            this.isAudioChannel.set(channel?.channel_type === 'AUDIO');
            return this.api.getMessagesChannel(this.channelId);
          }),
          catchError(err => {
            console.error('Ошибка при загрузке данных канала:', err);
            return EMPTY;
          })
        );
      })
    ).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response) ? response : (response?.results ?? []);
        this.messages.set(list.map((msg: any) => ({
          message_id: msg.id,
          sender_avatar: msg.sender.avatar,
          sender_username: msg.sender.name,
          timestamp: msg.created_at,
          message: msg.content,
          reply_to: msg.reply_to ?? null,
          forwarded_from: msg.forwarded_from ?? null,
        })));
        this.scrollToBottomMessages();
      },
      error: err => console.error('Критическая ошибка подписки:', err),
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private connectWebSocket() {
    this.socketService.connectToChannel(this.channelId)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: msg => this.socketService.handleMessage(msg),
        error: err => console.error('Ошибка веб-сокета:', err),
      });
  }

  onForwardMessage(msg: ChatMessage) {
    this.modalService.open('forwardMessage', {
      messageId: msg.message_id,
      content: msg.message || msg.text || '',
    });
  }

  onSendMessage(payload: SendPayload) {
    this.socketService.send({
      type: 'chat.message',
      message: payload.text,
      reply_to_id: payload.replyToId ?? undefined,
    });
    this.replyToMsg.set(null);
  }

  onTyping(isTyping: boolean) {
    this.socketService.send({ type: 'typing', typing: isTyping });
  }

  onInitiateCall(calleeId: string) {
    const other = this.otherParticipant();
    this.callState.initiateCall(this.channelId, {
      id: calleeId,
      name: other?.name ?? calleeId,
      avatar: other?.avatar ?? '',
    });
  }

  scrollToBottomMessages() {
    if (this.chatMessagesComponent) {
      this.chatMessagesComponent.scrollToBottom();
    }
  }

  toggleCallExpanded() {
    this.callExpanded.set(!this.callExpanded());
  }

  private playNotificationSound() {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(e => console.warn('Ошибка воспроизведения звука:', e));
  }
}
