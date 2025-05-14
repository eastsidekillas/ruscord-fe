import { Component, OnInit } from '@angular/core';
import { LivekitService } from '@shared/api/livekit.service';
import {Track, RemoteTrack, createLocalVideoTrack, VideoPresets} from 'livekit-client';
import { ChatCallSettings } from '@widgets/media-room/ui/chat-call-settings';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, ActivatedRouteSnapshot, Route, Router} from '@angular/router';

@Component({
  selector: 'ServerMediaRoom',
  standalone: true,
  imports: [CommonModule, ChatCallSettings],
  template: `
    <div class="w-full h-full flex bg-[#2c2f33] text-white">
      <main class="w-full h-full flex-1 flex flex-col">
        <!-- Видео -->
        <div class="flex-1 grid [grid-template-columns:repeat(auto-fit,_minmax(200px,_1fr))] gap-4 p-6 overflow-y-auto">
          <div *ngFor="let tile of userTiles" class="relative bg-black rounded-lg overflow-hidden">
            <video *ngIf="tile.stream"
                   [srcObject]="tile.stream"
                   autoplay
                   muted
                   playsinline
                   class="w-full h-auto object-cover">
            </video>

            <div *ngIf="!tile.stream"
                 class="w-full h-[150px] flex items-center justify-center bg-[#1e2124] text-white">
              <img *ngIf="tile.avatar"
                   [src]="tile.avatar"
                   class="w-16 h-16 rounded-full object-cover border-2"
                   [ngClass]="tile.isSpeaking ? 'border-green-500' : 'border-gray-700'" />
              <span *ngIf="!tile.avatar">{{ tile.name }}</span>
            </div>

            <div class="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-sm">
              {{ tile.name }}
            </div>
          </div>
        </div>



        <!-- Панель управления -->
        <div class="border-t border-[#1e2124] p-4 flex justify-center bg-[#23272a]">
          <ChatCallSettings
            [micMuted]="micMuted"
            [videoDisabled]="videoDisabled"
            [soundDisabled]="soundDisabled"
            (toggleMute)="toggleMute()"
            (toggleVideo)="toggleVideo()"
            (toggleSound)="toggleSound()"
            (disconnect)="onDisconnect()"
          />
        </div>
      </main>
    </div>
  `
})
export class ServerMediaRoom implements OnInit {
  micMuted = false;
  videoDisabled = false;
  soundDisabled = false;
  videoStreams: { track: MediaStreamTrack, stream: MediaStream, id: string }[] = [];
  participants: { identity: string; isSpeaking: boolean, name: string }[] = [];

  userTiles: {
    stream: MediaStream | null;
    id: string;
    name: string;
    avatar?: string;
    isSpeaking: boolean;
  }[] = [];


  constructor(private livekitService: LivekitService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.livekitService.videoStreams$.subscribe(videoStreams => {
      this.updateTiles(videoStreams, this.participants);
    });

    this.livekitService.participants$.subscribe(participants => {
      this.updateTiles(this.videoStreams, participants);
    });
  }


  private updateTiles(videoStreams: any[], participants: any[]) {
    this.videoStreams = videoStreams;
    this.participants = participants;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    this.userTiles = participants.map(user => {
      const streamObj = videoStreams.find(s => s.id === user.identity);
      return {
        id: user.identity,
        name: user.name,
        avatar: user.identity === 'local' ? currentUser.avatar : user.avatar, // используем avatar из метаданных
        isSpeaking: user.isSpeaking,
        stream: streamObj?.stream || null,
      };
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
    localParticipant.setIsSpeaking(true);
  }

  onDisconnect() {
    this.livekitService.disconnectRoom();

    const serverId = this.route.snapshot.paramMap.get('serverId');
    const fallbackTextChannel = this.route.snapshot.data['fallbackTextChannel'];

    if (serverId && fallbackTextChannel) {
      this.router.navigate(['/channels', serverId, fallbackTextChannel.id]);
    } else {
      this.router.navigate(['/channels/me']); // запасной редирект
    }
  }
}
