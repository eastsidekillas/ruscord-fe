import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { CallStateService } from '@entities/call';
import { AvatarUI } from '@shared/ui/avatar';
import { toSignal } from '@angular/core/rxjs-interop';

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
  `,
  template: `
    <div class="flex flex-col h-full bg-[#1e2124] text-white">

      <!-- ── CALLING STATE ── -->
      <ng-container *ngIf="call.isCalling()">
        <div class="flex-1 flex flex-col items-center justify-center gap-6">

          <!-- Pulsating avatar -->
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

        <!-- Hang up -->
        <div class="flex justify-center pb-10">
          <button
            (click)="call.endCall()"
            class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition"
            title="Завершить вызов"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.693 16.013H7.31a1.685 1.685 0 0 0 1.685-1.684v-.645A1.684 1.684 0 0 1 10.679 12h2.647a1.686 1.686 0 0 1 1.686 1.686v.646c0 .446.178.875.494 1.19.316.317.693.495 1.14.495h1.685a1.556 1.556 0 0 0 1.597-1.016c.078-.214.107-.776.088-1.002.014-4.415-3.571-6.003-8-6.004-4.427 0-8.014 1.585-8.01 5.996-.02.227.009.79.087 1.003a1.558 1.558 0 0 0 1.6 1.02Z"/>
            </svg>
          </button>
        </div>
      </ng-container>

      <!-- ── ACTIVE STATE ── -->
      <ng-container *ngIf="call.isActive()">

        <!-- Header bar -->
        <div class="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#18191c]">
          <div class="flex items-center gap-2 text-green-400 text-sm font-medium">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.97825 3.99999c-.3729 0-.74128.08169-1.07926.23933-.32394.1511-.61243.36846-.84696.63787-1.81892 1.82189-2.35302 3.87423-1.89899 5.93671.43916 1.9949 1.77747 3.8929 3.45642 5.572 1.67897 1.6791 3.57614 3.0176 5.57034 3.4591 2.0612.4563 4.1141-.0726 5.9396-1.8853.2705-.2348.4888-.524.6405-.8489.1581-.3387.2401-.7081.2401-1.0819 0-.3739-.082-.7432-.2401-1.0819-.1516-.3247-.3696-.6137-.6398-.8483l-1.2098-1.2106c-.5043-.5041-1.1879-.7872-1.9007-.7872-.7128 0-1.3968.2835-1.9011.7876l-.6178.6181c-.1512.1513-.3563.2363-.5701.2363-.2138 0-.4189-.085-.5701-.2363l-1.85336-1.8545c-.15117-.1513-.23609-.3565-.23609-.5704 0-.214.08493-.4192.23613-.5705l.61812-.61851c.5037-.50461.7867-1.18868.7867-1.90191s-.2833-1.39767-.7871-1.90228L8.90499 4.8778c-.23462-.26969-.5233-.48727-.84749-.63848-.33798-.15764-.70636-.23933-1.07925-.23933Z"/>
            </svg>
            Идёт звонок · {{ elapsed() }}
          </div>
        </div>

        <!-- Participants grid -->
        <div class="flex-1 flex items-center justify-center gap-10 p-8 overflow-y-auto">
          <div
            *ngFor="let tile of userTiles()"
            class="flex flex-col items-center gap-3"
          >
            <div
              class="relative w-28 h-28 rounded-full overflow-hidden border-4 transition-all duration-300"
              [ngClass]="{
                'border-green-500 speaking': tile.isSpeaking,
                'border-gray-600': !tile.isSpeaking
              }"
            >
              <!-- Video stream -->
              <video
                *ngIf="tile.stream"
                [srcObject]="tile.stream"
                class="w-full h-full object-cover"
                autoplay
                muted
                playsinline
              ></video>

              <!-- Avatar fallback -->
              <AvatarUI *ngIf="!tile.stream" [src]="tile.avatar" [name]="tile.name" />
            </div>
            <span class="text-sm text-gray-300">{{ tile.name }}</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex justify-center pb-8">
          <ChatCallSettings (disconnect)="call.endCall()" />
        </div>

      </ng-container>

    </div>
  `,
})
export class ChatCallOverlay implements OnInit, OnDestroy {
  protected readonly call = inject(CallStateService);
  private readonly livekit = inject(LivekitService);

  private readonly videoStreams = toSignal(this.livekit.videoStreams$, { initialValue: [] });
  private readonly participants = toSignal(this.livekit.participants$, { initialValue: [] });

  protected readonly userTiles = computed(() => {
    const videos = this.videoStreams();
    return this.participants().map(p => ({
      identity: p.identity,
      name: p.name,
      isSpeaking: p.isSpeaking,
      avatar: p.avatar ?? null,
      stream: videos.find(v => v.id === p.identity)?.stream ?? null,
    }));
  });

  // Call duration timer
  protected readonly elapsed = signal('0:00');
  private timerHandle?: ReturnType<typeof setInterval>;
  private startTime = 0;

  ngOnInit(): void {
    this.startTime = Date.now();
    this.timerHandle = setInterval(() => {
      const secs = Math.floor((Date.now() - this.startTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      this.elapsed.set(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerHandle);
  }
}
