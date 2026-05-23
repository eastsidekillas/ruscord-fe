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
  RoomEvent,
  Participant,
  LocalVideoTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';
import { environment } from '../../../environment/environment';

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  avatar?: string;
}

export interface VideoTrackInfo {
  track: MediaStreamTrack;
  stream: MediaStream;
  id: string;
  name?: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class LivekitService {
  private room!: Room;
  private livekitToken = '';

  readonly currentChannelId = signal<string | null>(null);
  readonly micMuted = signal(false);
  readonly videoDisabled = signal(false);
  readonly soundDisabled = signal(false);

  public participants$ = new BehaviorSubject<ParticipantInfo[]>([]);
  public connected$ = new BehaviorSubject<boolean>(false);
  public videoStreams$ = new BehaviorSubject<VideoTrackInfo[]>([]);

  public localVideoTrack: LocalVideoTrack | null = null;

  constructor(private apiService: ApiService) {
    setLogLevel(LogLevel.warn);
  }

  async joinRoom(roomUuid: string): Promise<void> {
    try {
      if (this.room) this.room.disconnect();

      this.livekitToken = await this.getToken(roomUuid);
      this.room = new Room();

      this.room
        .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
        .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
        .on(RoomEvent.ActiveSpeakersChanged, () => this.updateParticipants())
        .on(RoomEvent.TrackMuted, () => this.updateParticipants())
        .on(RoomEvent.TrackUnmuted, () => this.updateParticipants())
        .on(RoomEvent.LocalTrackPublished, () => this.updateParticipants())
        .on(RoomEvent.Disconnected, () => {
          this.connected$.next(false);
        });

      await this.room.connect(`${environment.API_WS_LIVEKIT_URL}`, this.livekitToken);
      this.connected$.next(true);
      this.currentChannelId.set(roomUuid);

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
    const raw = localStorage.getItem('currentUser');
    if (!raw) return identity;
    try {
      const u = JSON.parse(raw);
      if (identity === 'local' || identity === String(u.user_id)) return u.name;
    } catch { /* ignore */ }
    return identity;
  }

  private updateParticipants = () => {
    if (!this.room) return;

    const fromRemote = (p: RemoteParticipant): ParticipantInfo => {
      const meta = this.parseMetadata(p.metadata);
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      return {
        identity: p.identity,
        name: meta?.name ?? this.getUsernameFromIdentity(p.identity),
        isSpeaking: p.isSpeaking,
        isMuted: micPub?.isMuted ?? true,
        avatar: meta?.avatar,
      };
    };

    const localMeta = this.parseMetadata(this.room.localParticipant.metadata);
    const local: ParticipantInfo = {
      identity: 'local',
      name: localMeta?.name ?? this.getUsernameFromIdentity('local'),
      isSpeaking: this.room.localParticipant.isSpeaking,
      isMuted: this.micMuted(),
      avatar: localMeta?.avatar,
    };

    const remote = Array.from(this.room.remoteParticipants.values()).map(fromRemote);
    this.participants$.next([local, ...remote]);
  };

  private handleParticipantConnected = (participant: Participant) => {
    participant.on('isSpeakingChanged', this.updateParticipants);
    this.updateParticipants();
  };

  private handleParticipantDisconnected = () => {
    this.updateParticipants();
  };

  private handleTrackSubscribed = (
    track: RemoteTrack,
    _: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (track.kind === Track.Kind.Video) {
      const meta = this.parseMetadata(participant.metadata);
      const stream = new MediaStream([track.mediaStreamTrack]);
      this.videoStreams$.next([
        ...this.videoStreams$.getValue(),
        { track: track.mediaStreamTrack, stream, id: participant.identity, name: meta?.name, avatar: meta?.avatar },
      ]);
    }

    if (track.kind === Track.Kind.Audio) {
      if (participant.identity === this.room.localParticipant.identity) return;
      const stream = new MediaStream([track.mediaStreamTrack]);
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.play().catch(e => console.warn('Audio playback failed', e));
    }
  };

  private handleTrackUnsubscribed = (track: RemoteTrack) => {
    this.videoStreams$.next(
      this.videoStreams$.getValue().filter(t => t.track !== track.mediaStreamTrack),
    );
  };

  async enableLocalVideo(): Promise<void> {
    const track = await createLocalVideoTrack({ resolution: VideoPresets.h720.resolution });
    this.localVideoTrack = track;
    await this.room.localParticipant.publishTrack(track);
    const stream = new MediaStream([track.mediaStreamTrack]);
    this.videoStreams$.next([...this.videoStreams$.getValue(), { track: track.mediaStreamTrack, stream, id: 'local' }]);
  }

  disableLocalVideo(): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.mute();
      this.localVideoTrack.stop();
      this.videoStreams$.next(this.videoStreams$.getValue().filter(t => t.id !== 'local'));
      this.localVideoTrack = null;
    }
  }

  toggleMic(): void {
    const next = !this.micMuted();
    this.micMuted.set(next);
    this.room?.localParticipant.setMicrophoneEnabled(!next);
    this.updateParticipants();
  }

  async toggleVideo(): Promise<void> {
    const next = !this.videoDisabled();
    this.videoDisabled.set(next);
    if (next) this.disableLocalVideo(); else await this.enableLocalVideo();
  }

  toggleSound(): void {
    this.soundDisabled.update(v => !v);
  }

  disconnectRoom(): void {
    if (this.room) {
      this.room.disconnect();
      this.connected$.next(false);
      this.currentChannelId.set(null);
      this.participants$.next([]);
      this.videoStreams$.next([]);
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
    try { return JSON.parse(raw); } catch { return null; }
  }
}
