import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Room,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalParticipant,
  LocalTrackPublication,
  Track,
  LogLevel,
  setLogLevel
} from 'livekit-client';
import { ApiService } from './api.service';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class LivekitService {
  private room!: Room;
  private livekitToken: string = '';
  private roomUuid!: string;

  // Стейт для UI
  // Добавь в класс:
  public participants$ = new BehaviorSubject<{ identity: string; isSpeaking: boolean }[]>([]);


  public micMuted$ = new BehaviorSubject<boolean>(false);
  public videoDisabled$ = new BehaviorSubject<boolean>(false);
  public soundDisabled$ = new BehaviorSubject<boolean>(false);
  public connected$ = new BehaviorSubject<boolean>(false);

  constructor(private apiService: ApiService) {
    setLogLevel(LogLevel.debug);
  }

  async joinRoom(roomUuid: string, currentUser: string, recipient: string): Promise<void> {
    this.roomUuid = roomUuid;

    try {
      this.livekitToken = await this.getToken(roomUuid);
      this.room = new Room({ adaptiveStream: true, dynacast: true });

      // Подписываемся на события
      this.room
        .on('trackSubscribed', this.handleTrackSubscribed)
        .on('trackUnsubscribed', this.handleTrackUnsubscribed)
        .on('disconnected', this.handleDisconnect)
        .on('localTrackUnpublished', this.handleLocalTrackUnpublished);

      await this.room.connect(environment.API_WS_LIVEKIT_URL, this.livekitToken);
      console.log('Connected to room:', this.room.name);
      this.connected$.next(true);


      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.attachLocalTracks();

      // Подписка на события "говорит/не говорит"
      this.room.localParticipant.on('isSpeakingChanged', () => {
        this.updateSpeakingParticipants();
      });

      this.room.remoteParticipants.forEach((p) => {
        p.on('isSpeakingChanged', () => {
          this.updateSpeakingParticipants();
        });
      });

      this.updateSpeakingParticipants(); // первичная инициализация


    } catch (error) {
      console.error('Error connecting to room:', error);
    }
  }

  async toggleMic(): Promise<void> {
    const newState = !this.micMuted$.value;
    await this.room.localParticipant.setMicrophoneEnabled(newState);
    this.micMuted$.next(newState);
  }

  async toggleSound(): Promise<void> {
    const newState = !this.soundDisabled$.value;

    this.room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((pub) => {
        const track = pub.track as RemoteTrack | null; // Явно указываем тип
        if (track && pub.isSubscribed) {
          track.isMuted = !newState;
        }
      });
    });

    this.soundDisabled$.next(newState);
  }



  async toggleVideo(): Promise<void> {
    const newState = !this.videoDisabled$.value;
    await this.room.localParticipant.setCameraEnabled(newState);
    this.videoDisabled$.next(newState);
  }

  async leaveRoom(): Promise<void> {
    if (this.room) {
      this.room.disconnect();
      this.connected$.next(false);
      console.log('Disconnected from room');
    }
  }

  private async getToken(roomUuid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.apiService.getLivekitToken(roomUuid).subscribe(
        (response) => resolve(response.token),
        (error) => reject(error)
      );
    });
  }

  private updateSpeakingParticipants() {
    const remote = Array.from(this.room.remoteParticipants.values()).map((p) => ({
      identity: p.identity,
      isSpeaking: p.isSpeaking,
    }));

    const local = {
      identity: this.room.localParticipant.identity,
      isSpeaking: this.room.localParticipant.isSpeaking,
    };

    this.participants$.next([...remote, local]);
  }


  private attachLocalTracks(): void {
    this.room.localParticipant.videoTrackPublications.forEach((pub) => {
      if (pub.track) {
        const element = pub.track.attach();
        document.getElementById('videoContainer')?.appendChild(element);
      }
    });
  }

  private handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const element = track.attach();
      document.getElementById('videoContainer')?.appendChild(element);
    }
  };

  private handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    track.detach();
  };

  private handleLocalTrackUnpublished = (
    publication: LocalTrackPublication,
    participant: LocalParticipant
  ) => {
    publication.track?.detach();
  };

  private handleDisconnect = () => {
    this.connected$.next(false);
    console.log('Disconnected from room');
  };
}
