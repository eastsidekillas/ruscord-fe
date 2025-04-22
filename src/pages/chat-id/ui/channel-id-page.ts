import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatHeader } from '@widgets/chat/ui/chat-header';
import { ChatMessages } from '@widgets/chat/ui/chat-messages';
import { MessageInput } from '@features/update-message/ui/message-input';
import { SocketService } from '@shared/api/socket.service';
import { ApiService } from '@shared/api/api.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@shared/api/auth.service';

@Component({
  selector: 'ChannelPage',
  standalone: true,
  imports: [CommonModule, ChatHeader, ChatMessages, MessageInput],
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
      <ChatHeader
        [name]="chatHeaderName || 'Чат'"
        [type]="channel?.scope === 'DM' ? 'conversation' : 'channel'"
        [serverId]="serverId"
        [imageUrl]="otherParticipant?.avatar"
        [userId]="chatHeaderUserId">
      </ChatHeader>

      <ng-container *ngIf="channel?.channel_type === 'TEXT'">
        <ChatMessages [messages]="messages" class="flex-1 min-h-0" />
        <div *ngIf="typing && typing !== chatHeaderName" class="typing-indicator text-xs text-gray-500 ml-4 -mb-5">
          {{ typing }} печатает
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <MessageInput class="h-28 flex items-center px-4 relative"
                      [channelId]="channel?.id"
                      (sendMessage)="onSendMessage($event)"
                      (typing)="onTyping($event)"/>
      </ng-container>
    </div>
  `,
})
export class ChannelPage implements OnInit, OnDestroy {
  messages: any[] = [];
  channel: any = null;
  channelId!: string;
  serverId!: string;
  sender_id!: number;
  currentUserId: string | null = null;
  chatHeaderName: string | null = null;
  otherParticipant: any | null = null;
  chatHeaderUserId: string | null = null;
  typing: string | null = null; // Храним имя печатающего пользователя
  private socket$!: Subject<any>;
  private ngUnsubscribe = new Subject<void>();
  private notificationSound = new Audio('sounds/dm_notification.mp3');
  @ViewChild(ChatMessages) chatMessagesComponent!: ChatMessages;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.channelId = this.route.snapshot.paramMap.get('channelId') || '';
      this.serverId = this.route.snapshot.paramMap.get('serverId') || '';
      this.loadData();
      this.connectWebSocket();
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
    if (this.socket$) {
      this.socket$.complete();
    }

    this.socket$ = this.socketService.connectToChannel(this.channelId);

    this.socket$.pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (msg) => {
        if (msg.type === 'user.typing') {
          const currentUserIdParsed = parseInt(this.currentUserId || '-1', 10); // Используем '-1' как запасное значение
          const senderId = msg.sender_id;

          if (msg.typing && senderId !== currentUserIdParsed) {
            this.typing = msg.sender_username;
          } else if (!msg.typing && senderId === currentUserIdParsed) {
            this.typing = null;
          }
          this.cdr.detectChanges();
          return;
        }

        if (msg.type === 'chat.message') {
          const isIncoming = msg.sender_id !== this.currentUserId;
          if (isIncoming) {
            this.messages.push({
              sender_username: msg.sender_username,
              sender_avatar: msg.sender_avatar,
              message: msg.message,
              timestamp: msg.timestamp,
            });
            if (document.hidden) {
              this.playNotificationSound();
            }
          }
          this.scrollToBottomMessages();
        }
      },
      error: (err) => console.error('Ошибка веб-сокета:', err),
      complete: () => console.log('Соединение WebSocket закрыто'),
    });
  }

  onSendMessage(text: string) {
    if (this.socket$) {
      const message = {
        type: 'chat.message', // Указываем тип сообщения
        message: text,
      };
      this.socket$.next(message);
      this.scrollToBottomMessages();
    } else {
      console.error('Соединение WebSocket не установлено.');
    }
  }

  onTyping(isTyping: boolean) {
    if (this.socket$) {
      this.socket$.next({ type: 'typing', typing: isTyping });
    }
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

  getCurrentUserId(): string {
    return this.auth.userId || '';
  }
}
