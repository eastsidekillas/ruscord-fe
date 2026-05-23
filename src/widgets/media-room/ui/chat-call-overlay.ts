import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import { toSignal } from '@angular/core/rxjs-interop';

interface CallParticipantInfo {
  id: string;
  avatar: string | null;
  name: string | null;
}

@Component({
  selector: 'ChatCallOverlay',
  standalone: true,
  imports: [CommonModule, ChatCallSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="bg-main-surface-secondary text-white rounded-b-xl p-8 shadow-lg">
        <div class="flex gap-4 justify-center items-center mb-4">
          <ng-container *ngIf="getStream(callerInfo?.id); else callerAvatar">
            <div class="text-center">
              <video
                *ngFor="let stream of videoStreams()"
                [srcObject]="stream.stream"
                class="w-24 h-24 rounded-full object-cover border-4 border-blue-500 ring ring-offset-2 transition-all"
                autoplay muted playsinline
              ></video>
            </div>
          </ng-container>
          <ng-template #callerAvatar>
            <div class="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-600">
              <img [src]="callerInfo?.avatar" class="w-full h-full object-cover" />
            </div>
          </ng-template>
        </div>

        <ChatCallSettings />
      </div>
    </div>
  `,
})
export class ChatCallOverlay {
  @Input() callerInfo: CallParticipantInfo | null = null;

  private readonly livekitService = inject(LivekitService);
  protected readonly videoStreams = toSignal(this.livekitService.videoStreams$, { initialValue: [] });

  getStream(identity: string | undefined): MediaStream | null {
    if (!identity) return null;
    return this.videoStreams().find(v => v.id === identity)?.stream ?? null;
  }
}
