import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { MessageInput } from '@features/update-message/ui/message-input';
import { SocketService } from '@shared/api/socket.service';
import { ApiService } from '@shared/api/api.service';
import {Observable, Subject, takeUntil} from 'rxjs';
import { AuthService } from '@shared/api/auth.service';
import {ServerMembersSidebar} from '@widgets/sidebar/ui/server-sidebar/server-members-sidebar';
import {map} from 'rxjs/operators';
import {ChatCallOverlay} from '@widgets/media-room/ui/chat-call-overlay';
import {LocalParticipant, Participant, Room} from 'livekit-client';
import {ModalService} from '@shared/model/modal.service';
import {LivekitService} from '@shared/api/livekit.service';
import {ServerMediaRoom} from '@widgets/sidebar/ui/server-sidebar/server-media-room';

interface CallParticipantInfo {
  avatar: string | null;
  name: string | null;
}

@Component({
  selector: 'ChannelPage',
  standalone: true,
  imports: [CommonModule, ChatHeader, ChatMessages, MessageInput, ServerMembersSidebar, ChatCallOverlay, ServerMediaRoom],
  styles:
    `
      .typing-indicator {
        display: inline-flex; /* Чтобы точки выравнивались по горизонтали */
        align-items: center; /* Выравнивание по вертикали по центру */
      }

      .dot {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background-color: currentColor; /* Наследует цвет текста */
        margin-left: 3px;
        animation: blink 1.4s infinite both; /* Запускаем анимацию */
      }

      .dot:nth-child(1) {
        animation-delay: 0s;
      }

      .dot:nth-child(2) {
        animation-delay: 0.2s;
      }

      .dot:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes blink {
        0% {
          opacity: 0.2;
        }
        20% {
          opacity: 1;
        }
        100% {
          opacity: 0.2;
        }
      }
  `,
  template: `
    <div class="flex flex-col h-screen">
      <!-- Верхняя панель -->
      <ChatHeader
        [name]="chatHeaderName || 'Чат'"
        [type]="channel?.scope === 'DM' ? 'conversation' : 'channel'"
        [imageUrl]="otherParticipant?.avatar"
        [userId]="chatHeaderUserId"
        (callInitiated)="onInitiateCallToServer($event)"
      />



      <ChatCallOverlay
        *ngIf="isCallActive || isCallingInitiation"
      />



      <div class="flex flex-1 overflow-hidden" >
        <div class="flex-1 flex flex-col overflow-hidden" >
          <ChatMessages [messages]="messages" class="flex-1 min-h-0" *ngIf="!isAudioChannel"/>


          <div *ngIf="typing" class="typing-indicator text-xs text-gray-500 ml-4 -mb-5">
            {{ typing }} печатает
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>

          <MessageInput *ngIf="!isAudioChannel"
            class="h-28 flex items-center px-4 relative"
            [channelId]="channel?.id"
            (sendMessage)="onSendMessage($event)"
            (typing)="onTyping($event)"
          />

          <div class="flex flex-1 overflow-hidden" *ngIf="isAudioChannel" >
            <ServerMediaRoom class="w-full"/>
          </div>
        </div>


        <ng-container *ngIf="serverId$ && serverId !== 'me' && channel?.scope !== 'DM'">
          <ServerMembersSidebar
            class="w-64 border-l border-border border-gray-500 bg-sidebar-surface-secondary hidden lg:block"
            [serverId]="serverId$"
          />
        </ng-container>
      </div>

    </div>




  `,
})
export class ChannelPage implements OnInit, OnDestroy {
  messages: any[] = [];
  channel: any = null;
  channelId!: string;
  serverId: string | null = null;
  serverId$: Observable<string | null>;
  sender_id!: number;
  currentUserId: string | null = null;
  chatHeaderName: string | null = null;
  otherParticipant: any | null = null;
  chatHeaderUserId: string | null = null;

  room!: Room;
  localParticipant!: LocalParticipant;
  participants: Participant[] = [];
  isCallActive: boolean = false;
  isCallingInitiation: boolean = false;
  callerParticipantInfo: CallParticipantInfo | null = null;
  calleeParticipantInfo: CallParticipantInfo | null = null;

  isAudioChannel: boolean = false;


  typing: string | null = null;
  private socket$!: Subject<any>;
  private ngUnsubscribe = new Subject<void>();
  private notificationSound = new Audio('sounds/dm_notification.mp3');
  @ViewChild(ChatMessages) chatMessagesComponent!: ChatMessages;



  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private livekitService: LivekitService,
    private auth: AuthService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef)
  {
    this.serverId$ = this.route.parent?.paramMap.pipe(map(params => params.get('serverId'))) ?? new Observable<string | null>();
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.channelId = this.route.snapshot.paramMap.get('channelId') || '';
      this.loadData();
      this.connectWebSocket();
    });

    this.serverId$.subscribe((serverId) => {
      this.serverId = serverId;
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.socket$) {
      this.socket$.complete();
    }
  }

  connectWebSocket() {
    this.socketService.connectToChannel(this.channelId).subscribe({
      next: (msg) => {
        console.log('Получено сообщение через WebSocket:', msg);
        this.socketService.handleMessage(msg);
      },
      error: (err) => console.error('Ошибка веб-сокета:', err),
      complete: () => console.log('Соединение WebSocket закрыто'),
    });

    // Слушаем сообщения и обрабатываем их
    this.socketService.listenMessages().pipe(takeUntil(this.ngUnsubscribe)).subscribe((msg) => {
      if (msg.type === 'chat.message') {
        const isIncoming = msg.sender_id !== this.currentUserId;
        if (isIncoming) {
          this.messages.push(msg);
          if (document.hidden) {
            this.playNotificationSound();
          }
        }
        this.scrollToBottomMessages();
      }

      if (msg.type === 'user.typing') {
        this.typing = msg.typing ? msg.sender_username : null;
        this.cdr.detectChanges();
      }
    });
  }

  onSendMessage(text: string) {
    this.socketService.send({
      type: 'chat.message',
      message: text,
    });
  }

  onTyping(isTyping: boolean) {
    this.socketService.send({ type: 'typing', typing: isTyping });
  }




  async loadData() {
    try {
      this.channel = await this.api.getChannel(this.channelId).toPromise();
      this.currentUserId = this.auth.userId;



      if (this.channel?.scope === 'DM' && this.channel?.participants) {
        this.otherParticipant = this.channel.participants.find(
          (participant: any) => participant.user.id !== this.currentUserId
        );
        this.chatHeaderName = this.otherParticipant?.name || 'Direct Message';
        this.chatHeaderUserId = this.otherParticipant?.user?.id;
      } else if (this.channel?.scope === 'GROUP') {
        this.chatHeaderName = this.channel.name;
        this.chatHeaderUserId = null;
      } else {
        this.chatHeaderName = this.channel?.name || 'Channel';
        this.chatHeaderUserId = null;
      }

      this.isAudioChannel = this.channel?.channel_type === 'AUDIO';

      this.cdr.detectChanges();

      this.api.getMessagesChannel(this.channelId).subscribe((messages: any[]) => {
        this.messages = messages.map((msg) => ({
          sender_avatar: msg.sender.avatar,
          sender_username: msg.sender.name,
          timestamp: msg.created_at,
          message: msg.content,
        }));
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных канала:', error);
    }
  }

  scrollToBottomMessages() {
    if (this.chatMessagesComponent) {
      this.chatMessagesComponent.scrollToBottom();
    }
  }

  private playNotificationSound() {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch((e) => console.warn('Ошибка воспроизведения звука:', e));
  }

  onInitiateCallToServer(calleeId: string) {
    this.isCallingInitiation = true;
    this.livekitService.joinRoom(this.channelId)
  }




  onCancelCall() {
    this.isCallingInitiation = false;
  }

}
