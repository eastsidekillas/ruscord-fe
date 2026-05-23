import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '@shared/api/socket.service';
import { StatusSocketService } from '@entities/user-status/api/status-socket';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { ModalService } from '@shared/model/modal.service';
import { AuthService } from '@entities/session/api/auth.service';
import { NotificationService } from '@shared/model/notification.service';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active';

export interface CallParty {
  userId: string;
  name: string;
  avatar: string;
  channelId: string;
}

@Injectable({ providedIn: 'root' })
export class CallStateService {
  readonly status = signal<CallStatus>('idle');
  readonly party = signal<CallParty | null>(null);

  readonly isCalling = computed(() => this.status() === 'calling');
  readonly isIncoming = computed(() => this.status() === 'incoming');
  readonly isActive = computed(() => this.status() === 'active');
  readonly isInCall = computed(() => this.status() === 'calling' || this.status() === 'active');

  constructor(
    private socketService: SocketService,
    private statusSocket: StatusSocketService,
    private livekit: LivekitService,
    private modalService: ModalService,
    private router: Router,
    private auth: AuthService,
    private notifications: NotificationService,
  ) {
    // Listen on chat channel socket (when both users are in the same channel)
    this.socketService.listenMessages().subscribe(msg => this.dispatch(msg));
    // Listen on status socket for cross-channel call notifications
    this.statusSocket.getMessage().subscribe(msg => this.dispatch(msg));
  }

  private dispatch(msg: any): void {
    // Chat socket uses `type`, status socket uses `op`
    const type: string = msg.type ?? msg.op ?? '';
    // sender_id is set by the backend relay; skip messages we sent ourselves
    const senderId: string = msg.sender_id ?? '';
    const isOwnMessage = senderId !== '' && senderId === this.auth.userId;

    if (type === 'call.request' && !isOwnMessage) {
      this.status.set('incoming');
      this.party.set({
        userId: msg.fromUserId ?? senderId,
        name: msg.fromName ?? msg.sender_name ?? senderId,
        avatar: msg.fromAvatar ?? '',
        channelId: msg.channelId,
      });
      this.modalService.open('incomingCall');
    }

    if (type === 'call.response' && !isOwnMessage) {
      if (msg.accepted) {
        this.status.set('active');
        const channelId = this.party()?.channelId;
        if (channelId) {
          this.livekit.joinRoom(channelId).catch(console.error);
        }
      } else {
        this.notifications.show('Звонок отклонён', 'info');
        this.status.set('idle');
        this.party.set(null);
      }
    }

    if (type === 'call.ended' && !isOwnMessage) {
      if (this.status() !== 'idle') {
        this.notifications.show('Звонок завершён', 'info');
        this.modalService.close();
        this.livekit.disconnectRoom();
        this.status.set('idle');
        this.party.set(null);
      }
    }
  }

  initiateCall(channelId: string, callee: { id: string; name: string; avatar: string }): void {
    this.status.set('calling');
    this.party.set({ userId: callee.id, name: callee.name, avatar: callee.avatar, channelId });
    this.socketService.send({
      type: 'call.request',
      channelId,
      fromUserId: this.auth.userId,
      fromName: this.auth.userName,
      fromAvatar: this.auth.userAvatar,
    });
  }

  acceptCall(): void {
    const p = this.party();
    if (!p) return;
    this.socketService.send({
      type: 'call.response',
      accepted: true,
      channelId: p.channelId,
      senderId: p.userId,
    });
    this.modalService.close();
    this.status.set('active');
    this.router.navigate(['/channels/me', p.channelId]);
    this.livekit.joinRoom(p.channelId).catch(console.error);
  }

  declineCall(): void {
    const p = this.party();
    if (!p) return;
    this.socketService.send({
      type: 'call.response',
      accepted: false,
      channelId: p.channelId,
      senderId: p.userId,
    });
    this.modalService.close();
    this.status.set('idle');
    this.party.set(null);
  }

  endCall(): void {
    const p = this.party();
    if (p) {
      this.socketService.send({ type: 'call.ended', channelId: p.channelId });
    }
    this.livekit.disconnectRoom();
    this.status.set('idle');
    this.party.set(null);
  }
}
