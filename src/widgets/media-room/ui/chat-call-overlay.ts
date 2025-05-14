import {ChangeDetectionStrategy, Component, Input, Output, EventEmitter, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ChatCallSettings} from '@widgets/media-room/ui/chat-call-settings';
import {LivekitService} from '@shared/api/livekit.service';

interface CallParticipantInfo {
  id: string;
  avatar: string | null;
  name: string | null;
}

@Component({
  selector: 'ChatCallOverlay',
  standalone: true,
  imports: [CommonModule, ChatCallSettings],
  template: `
    <div>
      <div class="bg-main-surface-secondary text-white rounded-b-xl p-8 shadow-lg">
        <div class="flex gap-4 justify-center items-center mb-4">

          <ng-container *ngIf="getStream(callerInfo?.id) as callerStream; else callerAvatar">
            <div class="text-center">
              <video
                *ngFor="let stream of videoStreams"
                [srcObject]="stream.stream"
                class="w-24 h-24 rounded-full object-cover border-4 border-blue-500 ring ring-offset-2 transition-all"
                autoplay
                muted
                playsinline
              ></video>
              <div class="mt-2 text-sm text-white">Nt</div>
            </div>

          </ng-container>
          <ng-template #callerAvatar>
            <div class="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-600">
              <img [src]="callerInfo?.avatar" class="w-full h-full object-cover" />
            </div>
          </ng-template>

        </div>


        <ChatCallSettings
          [micMuted]="micMuted"
          [videoDisabled]="videoDisabled"
          [soundDisabled]="soundDisabled"
          (toggleMute)="toggleMute()"
          (toggleVideo)="toggleVideo()"
          (toggleSound)="toggleSound()"
        />
      </div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCallOverlay implements OnInit {
  @Input() callerInfo: CallParticipantInfo | null = null;
  @Input() calleeInfo: CallParticipantInfo | null = null;

  @Output() muteChanged = new EventEmitter<boolean>();
  @Output() videoChanged = new EventEmitter<boolean>();
  @Output() soundChanged = new EventEmitter<boolean>();

  videoStreams: { track: MediaStreamTrack, stream: MediaStream, id: string }[] = [];


  micMuted = false;
  videoDisabled = false;
  soundDisabled = false;

  constructor(private livekitService: LivekitService) {}

  ngOnInit(): void {
    this.livekitService.videoStreams$.subscribe((streams) => {
      this.videoStreams = streams;
    });
  }

  toggleMute() {
    this.micMuted = !this.micMuted;
    const localParticipant = this.livekitService.getRoom().localParticipant;
    localParticipant.setMicrophoneEnabled(!this.micMuted);
  }

  async toggleVideo() {
    this.videoDisabled = !this.videoDisabled;
    if (this.videoDisabled) {
      this.livekitService.disableLocalVideo();
    } else {
      await this.livekitService.enableLocalVideo();
    }
  }

  toggleSound() {
    this.soundDisabled = !this.soundDisabled;
    const localParticipant = this.livekitService.getRoom().localParticipant;
    localParticipant.setIsSpeaking(!this.soundDisabled);
  }

  getStream(identity: string | undefined): MediaStream | null {
    if (!identity) return null; // Тут проверяется как на null, так и на undefined
    const track = this.videoStreams.find(v => v.id === identity);
    return track?.stream || null;
  }


}
