import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { AuthService } from '@entities/session/api/auth.service';
import { AvatarUI } from '@shared/ui/avatar';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';

@Component({
  selector: 'ServerMediaRoom',
  standalone: true,
  imports: [CommonModule, AvatarUI, ChatCallSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes speak-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,.7); }
      50%       { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
    }
    .speaking { animation: speak-glow 1s ease-in-out infinite; }
  `,
  template: `
    <div class="flex flex-col h-full bg-[#313338] text-white">

      <!-- ── PARTICIPANTS ── -->
      <div class="flex-1 flex flex-wrap content-center items-center justify-center gap-8 p-8 overflow-y-auto">

        <!-- Empty state (before connection resolves) -->
        <div *ngIf="userTiles().length === 0"
             class="flex flex-col items-center gap-3 text-gray-500">
          <svg class="w-12 h-12 opacity-40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53L6.75 15.75H4.5a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75H6.75Z"/>
          </svg>
          <p class="text-sm">Подключение к голосовому каналу…</p>
        </div>

        <!-- Participant tile -->
        <div *ngFor="let tile of userTiles()"
             class="flex flex-col items-center gap-3 select-none">

          <div class="relative">
            <!-- Video or avatar -->
            <div
              class="w-28 h-28 rounded-full overflow-hidden relative bg-[#1e2124] transition-shadow duration-200"
              [ngClass]="tile.isSpeaking ? 'speaking' : ''"
            >
              <video
                *ngIf="tile.stream"
                [srcObject]="tile.stream"
                autoplay muted playsinline
                class="w-full h-full object-cover"
              ></video>
              <AvatarUI *ngIf="!tile.stream" [src]="tile.avatar" [name]="tile.name" />
            </div>

            <!-- Mic-muted badge -->
            <div
              *ngIf="tile.isMuted"
              class="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#1e2124] border-2 border-[#313338]
                     flex items-center justify-center"
            >
              <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
          </div>

          <!-- Name -->
          <span
            class="text-sm font-medium max-w-[112px] truncate transition-colors duration-150"
            [ngClass]="tile.isSpeaking ? 'text-green-400' : 'text-gray-200'"
          >{{ tile.name }}</span>
        </div>
      </div>

      <div class="border-t border-[#1e2124] p-4 flex justify-center bg-[#23272a]">
        <ChatCallSettings (disconnect)="onDisconnect()" />
      </div>

    </div>
  `,
})
export class ServerMediaRoom implements OnInit {
  private readonly livekit = inject(LivekitService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly videoStreams = toSignal(this.livekit.videoStreams$, { initialValue: [] });
  private readonly participants = toSignal(this.livekit.participants$, { initialValue: [] });

  protected readonly userTiles = computed(() => {
    const videos = this.videoStreams();
    const currentUser = this.auth.currentUserValue;
    return this.participants().map(p => ({
      identity: p.identity,
      name: p.name,
      isSpeaking: p.isSpeaking,
      isMuted: p.isMuted,
      avatar: p.identity === 'local' ? (currentUser?.avatar ?? null) : (p.avatar ?? null),
      stream: videos.find(v => v.id === p.identity)?.stream ?? null,
    }));
  });

  protected readonly channelName = computed(() => {
    const channelId = this.livekit.currentChannelId();
    return channelId ? `Канал: ${channelId.slice(0, 8)}…` : '—';
  });

  ngOnInit(): void {
    const channelId = this.route.snapshot.paramMap.get('channelId');
    if (channelId && this.livekit.currentChannelId() !== channelId) {
      this.livekit.joinRoom(channelId).catch(console.error);
    }
  }

  onDisconnect(): void {
    this.livekit.disconnectRoom();
    const serverId = this.route.parent?.snapshot.paramMap.get('serverId');
    const fallback = this.route.parent?.snapshot.data['fallbackTextChannel'];
    if (serverId && fallback) {
      this.router.navigate(['/channels', serverId, fallback.id]);
    } else {
      this.router.navigate(['/channels/me']);
    }
  }
}
