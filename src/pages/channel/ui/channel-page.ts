import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { MessageInput } from '@features/update-message/ui/message-input';
import { SocketService } from '@shared/api/socket.service';
import { ApiService } from '@shared/api/api.service';
import { EMPTY, Observable, Subject, catchError, takeUntil, switchMap } from 'rxjs';
import { AuthService } from '@entities/session/api/auth.service';
import { ServerMembersSidebar } from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import { map } from 'rxjs/operators';
import { ChatCallOverlay } from '@widgets/media-room/ui/chat-call-overlay';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { ServerMediaRoom } from '@widgets/sidebar/ui/server-sidebar/server-media-room';

@Component({
  selector: 'ChannelPage',
  standalone: true,
  imports: [CommonModule, ChatHeader, ChatMessages, MessageInput, ServerMembersSidebar, ChatCallOverlay, ServerMediaRoom],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .typing-indicator {
      display: inline-flex;
      align-items: center;
    }
    .dot {
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: currentColor;
      margin-left: 3px;
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
    <div class="flex flex-col h-screen">
      <ChatHeader
        [name]="chatHeaderName() || 'Чат'"
        [type]="channel()?.scope === 'DM' ? 'conversation' : 'channel'"
        [imageUrl]="otherParticipant()?.avatar"
        [userId]="chatHeaderUserId()"
        (callInitiated)="onInitiateCallToServer($event)"
      />

      <ChatCallOverlay *ngIf="isCallActive() || isCallingInitiation()" />

      <div class="flex flex-1 overflow-hidden">
        <div class="flex-1 flex flex-col overflow-hidden">
          <ChatMessages [messages]="messages()" class="flex-1 min-h-0" *ngIf="!isAudioChannel()" />

          <div *ngIf="typing()" class="typing-indicator text-xs text-gray-500 ml-4 -mb-5">
            {{ typing() }} печатает
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>

          <MessageInput *ngIf="!isAudioChannel()"
            class="h-28 flex items-center px-4 relative"
            [channelId]="channel()?.id"
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
  `,
})
export class ChannelPage implements OnInit, OnDestroy {
  readonly messages = signal<any[]>([]);
  readonly channel = signal<any>(null);
  readonly chatHeaderName = signal<string | null>(null);
  readonly otherParticipant = signal<any | null>(null);
  readonly chatHeaderUserId = signal<string | null>(null);
  readonly isCallActive = signal(false);
  readonly isCallingInitiation = signal(false);
  readonly isAudioChannel = signal(false);
  readonly typing = signal<string | null>(null);
  readonly serverId = signal<string | null>(null);

  channelId = '';
  currentUserId: string | null = null;
  serverId$: Observable<string | null>;

  private ngUnsubscribe = new Subject<void>();
  private notificationSound = new Audio('sounds/dm_notification.mp3');
  @ViewChild(ChatMessages) chatMessagesComponent!: ChatMessages;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly livekitService = inject(LivekitService);
  private readonly auth = inject(AuthService);
  private readonly socketService = inject(SocketService);

  constructor() {
    this.serverId$ = this.route.parent?.paramMap.pipe(map(params => params.get('serverId'))) ?? EMPTY;
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
          sender_avatar: msg.sender.avatar,
          sender_username: msg.sender.name,
          timestamp: msg.created_at,
          message: msg.content,
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

  onSendMessage(text: string) {
    this.socketService.send({ type: 'chat.message', message: text });
  }

  onTyping(isTyping: boolean) {
    this.socketService.send({ type: 'typing', typing: isTyping });
  }

  scrollToBottomMessages() {
    if (this.chatMessagesComponent) {
      this.chatMessagesComponent.scrollToBottom();
    }
  }

  private playNotificationSound() {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(e => console.warn('Ошибка воспроизведения звука:', e));
  }

  onInitiateCallToServer(_calleeId: string) {
    this.isCallingInitiation.set(true);
    this.livekitService.joinRoom(this.channelId).catch(e => console.error('Ошибка подключения к комнате:', e));
  }
}
