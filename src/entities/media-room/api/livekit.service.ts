import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Subject, lastValueFrom } from 'rxjs';
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
  readonly videoDisabled = signal(true);
  readonly soundDisabled = signal(false);

  public participants$ = new BehaviorSubject<ParticipantInfo[]>([]);
  public connected$ = new BehaviorSubject<boolean>(false);
  public videoStreams$ = new BehaviorSubject<VideoTrackInfo[]>([]);
  /** Emits when all remote participants have left the room. */
  public allParticipantsLeft$ = new Subject<void>();

  public localVideoTrack: LocalVideoTrack | null = null;

  private joiningRoomId: string | null = null;

  constructor(private apiService: ApiService) {
    setLogLevel(LogLevel.warn);
  }

  async joinRoom(roomUuid: string): Promise<void> {
    if (this.joiningRoomId === roomUuid) return;
    if (this.currentChannelId() === roomUuid && this.connected$.getValue()) return;

    this.joiningRoomId = roomUuid;
    try {
      if (this.room) await this.room.disconnect();

      this.livekitToken = await this.getToken(roomUuid);
      this.room = new Room();

      this.room
        .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
        .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
        // v2: separate events for name, metadata, and attributes
        .on(RoomEvent.ParticipantNameChanged, () => this.updateParticipants())
        .on(RoomEvent.ParticipantMetadataChanged, () => this.updateParticipants())
        .on(RoomEvent.ParticipantAttributesChanged, () => this.updateParticipants())
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

      // Publish identity data so remote participants can display name + avatar.
      // v2 preferred: setName() + setAttributes() instead of JSON metadata.
      const u = this.getLocalUser();
      if (u) {
        await Promise.allSettled([
          this.room.localParticipant.setName(u.name ?? ''),
          this.room.localParticipant.setAttributes({ avatar: u.avatar ?? '' }),
        ]);
      }

      const audioTrack = await createLocalAudioTrack();
      await this.room.localParticipant.publishTrack(audioTrack);

      this.updateParticipants();
    } catch (error) {
      console.error('Error connecting to room:', error);
      this.connected$.next(false);
    } finally {
      this.joiningRoomId = null;
    }
  }

  private resolveAvatar(p: { attributes?: Record<string, string>; metadata?: string }): string | undefined {
    // v2: check attributes first, then fall back to JSON metadata
    const fromAttr = p.attributes?.['avatar'];
    if (fromAttr) return fromAttr;
    return this.parseMetadata(p.metadata)?.avatar;
  }

  private resolveName(p: RemoteParticipant): string {
    // v2: p.name is a first-class property set from the token
    if (p.name) return p.name;
    return this.parseMetadata(p.metadata)?.name ?? this.getUsernameFromIdentity(p.identity);
  }

  getUsernameFromIdentity(identity: string): string {
    const u = this.getLocalUser();
    if (!u) return identity;
    if (identity === 'local' || identity === String(u.user_id)) return u.name;
    return identity;
  }

  private getLocalUser(): { user_id: number; name: string; avatar?: string } | null {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private updateParticipants = () => {
    if (!this.room) return;

    const fromRemote = (p: RemoteParticipant): ParticipantInfo => {
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      return {
        identity: p.identity,
        name: this.resolveName(p),
        isSpeaking: p.isSpeaking,
        isMuted: micPub?.isMuted ?? true,
        avatar: this.resolveAvatar(p),
      };
    };

    // Local participant: use first-class properties, fall back to localStorage.
    const localUser = this.getLocalUser();
    const local: ParticipantInfo = {
      identity: 'local',
      name:
        this.room.localParticipant.name ||
        localUser?.name ||
        this.getUsernameFromIdentity('local'),
      isSpeaking: this.room.localParticipant.isSpeaking,
      isMuted: this.micMuted(),
      avatar: this.resolveAvatar(this.room.localParticipant) ?? localUser?.avatar,
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
    if (this.room && this.room.remoteParticipants.size === 0) {
      this.allParticipantsLeft$.next();
    }
  };

  private handleTrackSubscribed = (
    track: RemoteTrack,
    _: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (track.kind === Track.Kind.Video) {
      const stream = new MediaStream([track.mediaStreamTrack]);
      this.videoStreams$.next([
        ...this.videoStreams$.getValue(),
        {
          track: track.mediaStreamTrack,
          stream,
          id: participant.identity,
          name: this.resolveName(participant),
          avatar: this.resolveAvatar(participant),
        },
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
    this.videoStreams$.next([
      ...this.videoStreams$.getValue(),
      { track: track.mediaStreamTrack, stream, id: 'local' },
    ]);
  }

  async disableLocalVideo(): Promise<void> {
    if (this.localVideoTrack) {
      await this.room.localParticipant.unpublishTrack(this.localVideoTrack);
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
    if (next) await this.disableLocalVideo(); else await this.enableLocalVideo();
  }

  toggleSound(): void {
    this.soundDisabled.update(v => !v);
  }

  disconnectRoom(): void {
    if (this.room) {
      void this.room.disconnect();
      this.connected$.next(false);
      this.currentChannelId.set(null);
      this.participants$.next([]);
      this.videoStreams$.next([]);
      this.localVideoTrack = null;
      this.joiningRoomId = null;
      this.micMuted.set(false);
      this.videoDisabled.set(true);
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