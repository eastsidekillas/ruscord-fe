import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  LucideAngularModule,
  Mic,
  MicOff,
  PhoneMissed, PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeOff
} from 'lucide-angular';

@Component({
  selector: 'ChatCallSettings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template:
    `
      <div class="flex items-center justify-center space-x-4 mt-6">
        <button (click)="onToggleMute()" class="p-4 bg-gray-600 rounded-full hover:bg-gray-700 transition">

          <lucide-angular *ngIf="!micMuted" [img]="Mic"></lucide-angular>

          <lucide-angular *ngIf="micMuted" [img]="MicOff"></lucide-angular>

        </button>

        <button (click)="onToggleVideo()" class="p-4 bg-gray-600 rounded-full hover:bg-gray-700 transition">
          <lucide-angular *ngIf="!videoDisabled" [img]="Video"></lucide-angular>
          <lucide-angular *ngIf="videoDisabled" [img]="VideoOff"></lucide-angular>
        </button>

        <button (click)="onToggleSound()" class="p-4 bg-gray-600 rounded-full hover:bg-gray-700 transition">
          <lucide-angular *ngIf="!soundDisabled" [img]="Volume2"></lucide-angular>
          <lucide-angular *ngIf="soundDisabled" [img]="VolumeOff"></lucide-angular>
        </button>

        <button (click)="onDisconnect()" class="p-4 bg-red-600 rounded-full hover:bg-red-700 transition">
          <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.693 16.013H7.31a1.685 1.685 0 0 0 1.685-1.684v-.645A1.684 1.684 0 0 1 10.679 12h2.647a1.686 1.686 0 0 1 1.686 1.686v.646c0 .446.178.875.494 1.19.316.317.693.495 1.14.495h1.685a1.556 1.556 0 0 0 1.597-1.016c.078-.214.107-.776.088-1.002.014-4.415-3.571-6.003-8-6.004-4.427 0-8.014 1.585-8.01 5.996-.02.227.009.79.087 1.003a1.558 1.558 0 0 0 1.6 1.02Z"/>
          </svg>

        </button>

      </div>
    `
})


export class ChatCallSettings {
  @Input() micMuted: boolean = false;
  @Input() videoDisabled: boolean = false;
  @Input() soundDisabled: boolean = false;


  @Output() toggleMute = new EventEmitter<void>();
  @Output() toggleVideo = new EventEmitter<void>();
  @Output() toggleSound = new EventEmitter<void>();
  @Output() disconnect = new EventEmitter<void>();

  onToggleMute() {
    this.toggleMute.emit();
  }

  onToggleVideo() {
    this.toggleVideo.emit();
  }

  onToggleSound() {
    this.toggleSound.emit();
  }

  onDisconnect() {
    this.disconnect.emit();
  }

  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Video = Video;
  protected readonly VideoOff = VideoOff;
  protected readonly Volume2 = Volume2;
  protected readonly VolumeOff = VolumeOff;
  protected readonly PhoneMissed = PhoneMissed;
  protected readonly PhoneOff = PhoneOff;
}
