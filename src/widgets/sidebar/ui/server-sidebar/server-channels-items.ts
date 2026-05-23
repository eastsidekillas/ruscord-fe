import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '@shared/api/api.service';
import { LivekitService } from '@entities/media-room/api/livekit.service';
import {LucideAngularModule, Volume2} from 'lucide-angular';

interface Channel {
  id: string;
  name: string;
  channel_type: 'TEXT' | 'AUDIO';
}

@Component({
  selector: 'ServerChannelsItems',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-1 overflow-y-auto px-2 py-3 space-y-4">

      <!-- TEXT CHANNELS -->
      <div *ngIf="textChannels().length > 0">
        <h4 class="text-[11px] font-semibold text-typo-secondary uppercase tracking-wider mb-1 px-2">
          Текстовые каналы
        </h4>
        <div class="space-y-0.5">
          <a *ngFor="let channel of textChannels()"
             [routerLink]="['/channels', serverId, channel.id]"
             routerLinkActive="bg-main-surface-secondary text-white"
             class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-main-surface-secondary text-gray-300 hover:text-white transition group">
            <svg class="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-gray-200" fill="none"
                 stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/>
            </svg>
            <span class="text-sm truncate">{{ channel.name }}</span>
          </a>
        </div>
      </div>

      <!-- VOICE CHANNELS -->
      <div *ngIf="audioChannels().length > 0">
        <h4 class="text-[11px] font-semibold text-typo-secondary uppercase tracking-wider mb-1 px-2">
          Голосовые каналы
        </h4>
        <div class="space-y-0.5">
          <div *ngFor="let channel of audioChannels()">

            <!-- Channel row -->
            <button
              (click)="joinAudioChannel(channel)"
              class="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-main-surface-secondary transition group"
              [ngClass]="livekit.currentChannelId() === channel.id
                ? 'bg-main-surface-secondary text-white'
                : 'text-gray-300 hover:text-white'"
            >
              <lucide-angular class="w-4 h-4 flex-shrink-0 transition-colors"
                              [ngClass]="livekit.currentChannelId() === channel.id ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-200'"
                              [img]="Volume2">

              </lucide-angular>

              <span class="text-sm flex-1 text-left truncate">{{ channel.name }}</span>
            </button>

            <div *ngIf="livekit.currentChannelId() === channel.id && voiceParticipants().length > 0"
                 class="mt-0.5 ml-5 space-y-0.5 pt-2">
              <div *ngFor="let p of voiceParticipants()"
                   class="flex items-center gap-2 px-2 py-0.5 rounded-sm">

                <div class="relative flex-shrink-0">
                  <div class="w-5 h-5 rounded-full bg-[#36393f] flex items-center justify-center text-[10px] font-semibold text-gray-300 overflow-hidden transition-all duration-150"
                       [ngClass]="p.isSpeaking ? 'ring-1 ring-green-500 ring-offset-1 ring-offset-[#2b2d31]' : ''">
                    {{ p.name.charAt(0).toUpperCase() }}
                  </div>
                </div>

                <!-- Name -->
                <span class="text-xs truncate flex-1 transition-colors duration-100"
                      [ngClass]="p.isSpeaking ? 'text-green-400' : 'text-gray-400'">
                  {{ p.name }}
                </span>

                <!-- Mic indicator -->
                <svg *ngIf="p.isMuted"
                     class="w-3 h-3 text-red-400 flex-shrink-0"
                     fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>

              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  `,
})
export class ServerChannelsItems implements OnChanges {
  @Input() serverId: string | null = null;

  readonly textChannels = signal<Channel[]>([]);
  readonly audioChannels = signal<Channel[]>([]);

  protected readonly livekit = inject(LivekitService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly voiceParticipants = toSignal(this.livekit.participants$, { initialValue: [] });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverId']?.currentValue) {
      this.loadServerChannels(changes['serverId'].currentValue);
    }
  }

  loadServerChannels(serverId: string): void {
    this.apiService.getServerChannels(serverId).subscribe({
      next: (channels: Channel[]) => {
        this.textChannels.set(channels.filter(c => c.channel_type === 'TEXT'));
        this.audioChannels.set(channels.filter(c => c.channel_type === 'AUDIO'));
      },
      error: err => console.error('Ошибка загрузки каналов сервера:', err),
    });
  }

  joinAudioChannel(channel: Channel): void {
    if (!this.serverId) return;

    if (this.livekit.currentChannelId() === channel.id) {
      this.router.navigate(['/channels', this.serverId, channel.id]);
      return;
    }

    this.livekit.joinRoom(channel.id)
      .then(() => this.router.navigate(['/channels', this.serverId, channel.id]))
      .catch(err => console.error('Error joining room:', err));
  }

  protected readonly Volume2 = Volume2;
}
