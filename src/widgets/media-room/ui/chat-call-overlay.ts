import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { CallStateService } from '@entities/call';
import { AvatarUI } from '@shared/ui/avatar';
import { toSignal } from '@angular/core/rxjs-interop';

const DEFAULT_W = 220;
const DEFAULT_H = 124;
const MIN_W = 160;
const MAX_W = 640;

@Component({
  selector: 'ChatCallOverlay',
  standalone: true,
  imports: [CommonModule, ChatCallSettings, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes speaking-ring {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: .7; }
    }
    .speaking { animation: speaking-ring .8s ease-in-out infinite; }

    @keyframes speaking-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
      50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    }
    .speaking-video {
      border-color: rgb(34 197 94) !important;
      animation: speaking-glow .8s ease-in-out infinite;
    }
    .mirror { transform: scaleX(-1); }

    @keyframes connecting-pulse {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 1; }
    }
    .connecting-dot { animation: connecting-pulse 1.2s ease-in-out infinite; }
    .connecting-dot:nth-child(2) { animation-delay: 0.2s; }
    .connecting-dot:nth-child(3) { animation-delay: 0.4s; }
  `,
  template: `
    <div class="flex flex-col h-full bg-[#1e2124] text-white">

      <!-- ── CALLING STATE ── -->
      <ng-container *ngIf="call.isCalling()">
        <div class="flex-1 flex flex-col items-center justify-center gap-6">
          <div class="relative flex items-center justify-center">
            <span class="absolute w-40 h-40 rounded-full bg-green-500/10 animate-ping"></span>
            <span class="absolute w-32 h-32 rounded-full bg-green-500/15 animate-ping" style="animation-delay:.3s"></span>
            <div class="relative w-24 h-24 rounded-full overflow-hidden border-4 border-green-500 z-10">
              <AvatarUI [src]="call.party()?.avatar" [name]="call.party()?.name ?? ''" />
            </div>
          </div>
          <div class="text-center">
            <p class="text-2xl font-semibold">{{ call.party()?.name }}</p>
            <p class="text-gray-400 text-sm mt-2 animate-pulse">Вызов...</p>
          </div>
        </div>
        <div class="flex justify-center pb-10">
          <button (click)="call.endCall()"
            class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition"
            title="Завершить вызов">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.693 16.013H7.31a1.685 1.685 0 0 0 1.685-1.684v-.645A1.684 1.684 0 0 1 10.679 12h2.647a1.686 1.686 0 0 1 1.686 1.686v.646c0 .446.178.875.494 1.19.316.317.693.495 1.14.495h1.685a1.556 1.556 0 0 0 1.597-1.016c.078-.214.107-.776.088-1.002.014-4.415-3.571-6.003-8-6.004-4.427 0-8.014 1.585-8.01 5.996-.02.227.009.79.087 1.003a1.558 1.558 0 0 0 1.6 1.02Z"/>
            </svg>
          </button>
        </div>
      </ng-container>

      <!-- ── ACTIVE STATE ── -->
      <ng-container *ngIf="call.isActive()">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#18191c] flex-shrink-0">
          <div class="flex items-center gap-2 text-green-400 text-sm font-medium">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Идёт звонок · {{ elapsed() }}
          </div>

          <!-- Connection state badge -->
          <div *ngIf="!livekit.connected$.value"
               class="flex items-center gap-1.5 text-yellow-400 text-xs">
            <span class="connecting-dot w-1 h-1 rounded-full bg-yellow-400"></span>
            <span class="connecting-dot w-1 h-1 rounded-full bg-yellow-400"></span>
            <span class="connecting-dot w-1 h-1 rounded-full bg-yellow-400"></span>
            <span>Подключение...</span>
          </div>
        </div>

        <!-- Tiles -->
        <div class="flex-1 flex items-center justify-center gap-4 p-4 overflow-auto flex-wrap min-h-0">

          <!-- Empty / connecting state -->
          <div *ngIf="userTiles().length === 0"
               class="flex flex-col items-center gap-3 text-gray-500">
            <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/>
            </svg>
            <span class="text-sm">Ожидание участников...</span>
          </div>

          <div *ngFor="let tile of userTiles()" class="flex flex-col items-center gap-2">

            <!-- VIDEO TILE -->
            <div *ngIf="tile.stream"
              class="group relative rounded-xl overflow-hidden border-2 flex-shrink-0 select-none"
              [style.width.px]="tile.size.w"
              [style.height.px]="tile.size.h"
              [ngClass]="tile.isSpeaking ? 'speaking-video' : 'border-white/10'">
              <video [srcObject]="tile.stream"
                class="w-full h-full object-cover"
                [class.mirror]="tile.identity === 'local'"
                autoplay muted playsinline></video>
              <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 pointer-events-none">
                <div class="flex items-center gap-1.5">
                  <span *ngIf="tile.isSpeaking" class="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"></span>
                  <span class="text-xs text-white font-medium truncate">{{ tile.name }}</span>
                </div>
              </div>
              <div class="absolute bottom-0 right-0 z-10 w-6 h-6 flex items-end justify-end pb-1 pr-1 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                (mousedown)="startResize($event, tile.identity)"
                (dblclick)="resetTileSize(tile.identity)"
                title="Потяни чтобы изменить размер · двойной клик — сброс">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" class="text-white/60">
                  <circle cx="9" cy="9" r="1.2"/>
                  <circle cx="5" cy="9" r="1.2"/>
                  <circle cx="9" cy="5" r="1.2"/>
                </svg>
              </div>
            </div>

            <!-- AVATAR TILE -->
            <ng-container *ngIf="!tile.stream">
              <div class="relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all duration-300"
                [ngClass]="tile.isSpeaking ? 'border-green-500 speaking' : 'border-gray-600'">
                <AvatarUI [src]="tile.avatar" [name]="tile.name" />
              </div>
              <div class="flex items-center gap-1.5">
                <span *ngIf="tile.isMuted" title="Микрофон выключен">
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
                  </svg>
                </span>
                <span class="text-xs text-gray-300 max-w-[80px] truncate">{{ tile.name }}</span>
              </div>
            </ng-container>

          </div>
        </div>

        <!-- Controls -->
        <div class="flex justify-center pb-6 flex-shrink-0">
          <ChatCallSettings (disconnect)="call.endCall()" />
        </div>

      </ng-container>

    </div>
  `,
})
export class ChatCallOverlay implements OnDestroy {
  protected readonly call = inject(CallStateService);
  protected readonly livekit = inject(LivekitService);

  private readonly videoStreams = toSignal(this.livekit.videoStreams$, { initialValue: [] });
  private readonly participants = toSignal(this.livekit.participants$, { initialValue: [] });

  private readonly tileSizes = signal<Record<string, { w: number; h: number }>>({});

  protected readonly userTiles = computed(() => {
    const videos = this.videoStreams();
    const sizes = this.tileSizes();
    return this.participants().map(p => ({
      identity: p.identity,
      name: p.name,
      isSpeaking: p.isSpeaking,
      isMuted: p.isMuted,
      avatar: p.avatar ?? null,
      stream: videos.find(v => v.id === p.identity)?.stream ?? null,
      size: sizes[p.identity] ?? { w: DEFAULT_W, h: DEFAULT_H },
    }));
  });

  protected readonly elapsed = signal('0:00');
  private timerHandle?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      if (this.call.isActive()) {
        this.startTimer();
      } else {
        this.stopTimer();
        this.elapsed.set('0:00');
        this.tileSizes.set({});
      }
    });
  }

  protected startResize(event: MouseEvent, identity: string): void {
    event.preventDefault();
    const startX = event.clientX;
    const startW = this.tileSizes()[identity]?.w ?? DEFAULT_W;

    const onMove = (e: MouseEvent) => {
      const w = Math.max(MIN_W, Math.min(MAX_W, startW + e.clientX - startX));
      const h = Math.round(w * 9 / 16);
      this.tileSizes.update(s => ({ ...s, [identity]: { w, h } }));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  protected resetTileSize(identity: string): void {
    this.tileSizes.update(s => {
      const next = { ...s };
      delete next[identity];
      return next;
    });
  }

  private startTimer(): void {
    this.stopTimer();
    const startTime = Date.now();
    this.elapsed.set('0:00');
    this.timerHandle = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      this.elapsed.set(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle !== undefined) {
      clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}