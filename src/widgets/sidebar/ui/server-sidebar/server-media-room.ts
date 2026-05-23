import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { AuthService } from '@entities/session/api/auth.service';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'ServerMediaRoom',
  standalone: true,
  imports: [CommonModule, ChatCallSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full h-full flex bg-[#2c2f33] text-white">
      <main class="w-full h-full flex-1 flex flex-col">
        <div class="flex-1 grid [grid-template-columns:repeat(auto-fit,_minmax(200px,_1fr))] gap-4 p-6 overflow-y-auto">
          <div *ngFor="let tile of userTiles()" class="relative bg-black rounded-lg overflow-hidden">
            <video *ngIf="tile.stream"
                   [srcObject]="tile.stream"
                   autoplay muted playsinline
                   class="w-full h-auto object-cover">
            </video>

            <div *ngIf="!tile.stream"
                 class="w-full h-[150px] flex items-center justify-center bg-[#1e2124] text-white">
              <img *ngIf="tile.avatar"
                   [src]="tile.avatar" [alt]="tile.name"
                   class="w-16 h-16 rounded-full object-cover border-2"
                   [ngClass]="tile.isSpeaking ? 'border-green-500' : 'border-gray-700'" />
              <span *ngIf="!tile.avatar">{{ tile.name }}</span>
            </div>

            <div class="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-sm">
              {{ tile.name }}
            </div>
          </div>
        </div>

        <div class="border-t border-[#1e2124] p-4 flex justify-center bg-[#23272a]">
          <ChatCallSettings (disconnect)="onDisconnect()" />
        </div>
      </main>
    </div>
  `
})
export class ServerMediaRoom {
  private readonly livekitService = inject(LivekitService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly videoStreams = toSignal(this.livekitService.videoStreams$, { initialValue: [] });
  private readonly participants = toSignal(this.livekitService.participants$, { initialValue: [] });

  protected readonly userTiles = computed(() => {
    const videoStreams = this.videoStreams();
    const participants = this.participants();
    const currentUser = this.auth.currentUserValue;

    return participants.map(user => {
      const streamObj = videoStreams.find(s => s.id === user.identity);
      return {
        id: user.identity,
        name: user.name,
        avatar: user.identity === 'local' ? currentUser?.avatar : (user as any).avatar,
        isSpeaking: user.isSpeaking,
        stream: streamObj?.stream ?? null,
      };
    });
  });

  onDisconnect() {
    this.livekitService.disconnectRoom();
    const serverId = this.route.parent?.snapshot.paramMap.get('serverId');
    const fallbackTextChannel = this.route.parent?.snapshot.data['fallbackTextChannel'];
    if (serverId && fallbackTextChannel) {
      this.router.navigate(['/channels', serverId, fallbackTextChannel.id]);
    } else {
      this.router.navigate(['/channels/me']);
    }
  }
}
