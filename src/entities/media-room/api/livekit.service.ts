import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { ApiService } from '@shared/api/api.service';
import {
  Room,
  RemoteParticipant,
  LogLevel,
  setLogLevel,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  VideoPresets,
  RoomEvent, Participant, LocalVideoTrack, createLocalVideoTrack, createLocalAudioTrack,
} from 'livekit-client';
import { environment } from '../../../environment/environment';


export interface VideoTrackInfo {
  track: MediaStreamTrack;
  stream: MediaStream;
  id: string;
  name?: string;
  avatar?: string;
}





@Injectable({
  providedIn: 'root',
})
export class LivekitService {
  private room!: Room;
  private livekitToken: string = '';
  public participants$ = new BehaviorSubject<{ identity: string; isSpeaking: boolean; name: string }[]>([]);
  public connected$ = new BehaviorSubject<boolean>(false);
  public videoStreams$ = new BehaviorSubject<VideoTrackInfo[]>([]); // Для хранения видеопотоков


  public localVideoTrack: LocalVideoTrack | null = null;

  readonly micMuted = signal(false);
  readonly videoDisabled = signal(false);
  readonly soundDisabled = signal(false);

  constructor(private apiService: ApiService) {
    setLogLevel(LogLevel.debug);
  }


  async joinRoom(roomUuid: string): Promise<void> {
    try {
      this.livekitToken = await this.getToken(roomUuid);

      this.room = new Room;


      this.room
        .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
        .on(RoomEvent.ParticipantConnected, this.subscribeToSpeaking)
        .on(RoomEvent.ParticipantDisconnected, this.handleDisconnect);

      await this.room.connect(`${environment.API_WS_LIVEKIT_URL}`, this.livekitToken);
      this.connected$.next(true);

      // 👉 Включаем только микрофон (аудио)
      const audioTrack = await createLocalAudioTrack();
      await this.room.localParticipant.publishTrack(audioTrack);

      this.updateParticipants();
    } catch (error) {
      console.error('Error connecting to room:', error);
      this.connected$.next(false);
    }
  }


  getRoom(): Room {
    return this.room;
  }

  getUsernameFromIdentity(identity: string): string {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (!currentUserRaw) return identity;

    const currentUser = JSON.parse(currentUserRaw);

    // Если это local user
    if (identity === 'local' || identity === String(currentUser.user_id)) {
      return currentUser.name;
    }

    // Тут можно добавить логику для сопоставления других участников
    return identity; // fallback
  }




  private updateParticipants = () => {
    if (!this.room) return;

    const remote = Array.from(this.room.remoteParticipants.values()).map((p) => {
      const metadata = this.parseMetadata(p.metadata);
      return {
        identity: p.identity,
        isSpeaking: p.isSpeaking,
        name: metadata?.name || this.getUsernameFromIdentity(p.identity),
      };
    });

    const localMetadata = this.parseMetadata(this.room.localParticipant.metadata);
    const localUser = localMetadata?.name || this.getUsernameFromIdentity('local');

    remote.unshift({
      identity: 'local',
      isSpeaking: this.room.localParticipant.isSpeaking,
      name: localUser,
    });

    this.participants$.next(remote);
  };





  private handleTrackSubscribed = (
    track: RemoteTrack,
    _: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video) {

      const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
      const name = meta.name || this.getUsernameFromIdentity(participant.identity);
      const avatar = meta.avatar || undefined;

      const mediaTrack = track.mediaStreamTrack;
      const stream = new MediaStream([mediaTrack]);

      this.videoStreams$.next([
        ...this.videoStreams$.getValue(),
        { track: mediaTrack, stream, id: participant.identity, name, avatar }
      ]);
    }

    if (track.kind === Track.Kind.Audio) {
      if (participant.identity === this.room.localParticipant.identity) {
        return;
      }

      const mediaTrack = track.mediaStreamTrack;
      const stream = new MediaStream([mediaTrack]);

      const audioElement = new Audio();
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      audioElement.play().catch(e => {
        console.warn('Audio playback failed', e);
      });
    }
  };




  private handleTrackUnsubscribed = (
    track: RemoteTrack,
    _: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    this.videoStreams$.next(this.videoStreams$.getValue().filter(t => t.track !== track.mediaStreamTrack));
  };


  public async enableLocalVideo() {
    const track = await createLocalVideoTrack({ resolution: VideoPresets.h720.resolution });
    this.localVideoTrack = track;
    await this.room.localParticipant.publishTrack(track);

    const stream = new MediaStream([track.mediaStreamTrack]);

    this.videoStreams$.next([
      ...this.videoStreams$.getValue(),
      { track: track.mediaStreamTrack, stream, id: 'local' }
    ]);
  }


  public disableLocalVideo() {
    if (this.localVideoTrack) {
      this.localVideoTrack.mute();
      this.localVideoTrack.stop();
      this.videoStreams$.next(
        this.videoStreams$.getValue().filter(t => t.id !== 'local')
      );
      this.localVideoTrack = null;
    }
  }


  private subscribeToSpeaking = (participant: Participant) => {
    participant.on('isSpeakingChanged', this.updateParticipants);
  };

  private handleDisconnect = () => {
    console.log('Disconnected from room');
    this.connected$.next(false);
  };

  toggleMic(): void {
    const next = !this.micMuted();
    this.micMuted.set(next);
    this.room?.localParticipant.setMicrophoneEnabled(!next);
  }

  async toggleVideo(): Promise<void> {
    const next = !this.videoDisabled();
    this.videoDisabled.set(next);
    if (next) this.disableLocalVideo(); else await this.enableLocalVideo();
  }

  toggleSound(): void {
    this.soundDisabled.update(v => !v);
  }

  public disconnectRoom(): void {
    if (this.room) {
      this.room.disconnect();
      this.connected$.next(false);
      this.micMuted.set(false);
      this.videoDisabled.set(false);
      this.soundDisabled.set(false);
    }
  }


  private async getToken(roomUuid: string): Promise<string> {
    const response = await lastValueFrom(this.apiService.getLiveKitToken(roomUuid));
    return response.token;
  }

  private parseMetadata(raw?: string): { name?: string; avatar?: string } | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Invalid metadata JSON', e);
      return null;
    }
  }

}
