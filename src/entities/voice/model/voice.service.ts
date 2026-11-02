import { DestroyRef, Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DisconnectReason,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteAudioTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
} from 'livekit-client';
import { ApiService, GatewayService, VoiceJoinInfo, VoiceState, errorText } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface VoiceTarget {
  guildId: string;
  channelId: string;
}

/** Remembered device choices; per browser, a convenience only. */
const DEVICE_KEYS = {
  audioinput: 'ruscord.voice.audioinput',
  audiooutput: 'ruscord.voice.audiooutput',
  videoinput: 'ruscord.voice.videoinput',
} as const;
export type DeviceKind = keyof typeof DEVICE_KEYS;
export type AudioDeviceKind = Exclude<DeviceKind, 'videoinput'>;

function readDevice(kind: DeviceKind): string {
  try {
    return localStorage.getItem(DEVICE_KEYS[kind]) ?? '';
  } catch {
    return '';
  }
}

function saveDevice(kind: DeviceKind, id: string): void {
  try {
    localStorage.setItem(DEVICE_KEYS[kind], id);
  } catch {
    // Private mode or blocked storage: the choice lasts until reload.
  }
}

/**
 * The LiveKit address: the one the core gave, or this site under /livekit,
 * which the client's nginx (and `ng serve`) proxy to LiveKit.
 */
export function liveKitUrl(info: Pick<VoiceJoinInfo, 'url'>, loc: Pick<Location, 'protocol' | 'host'> = location): string {
  if (info.url) return info.url;
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/livekit`;
}

/** Why a room ended, in words; null when the user left on purpose. */
export function disconnectText(reason: DisconnectReason | undefined): string | null {
  switch (reason) {
    case DisconnectReason.CLIENT_INITIATED:
      return null;
    case DisconnectReason.DUPLICATE_IDENTITY:
      return 'Вы подключились к голосу в другой вкладке';
    case DisconnectReason.PARTICIPANT_REMOVED:
      return 'Вы отключены от голосового канала';
    case DisconnectReason.ROOM_DELETED:
      return 'Голосовой канал закрыт';
    default:
      return 'Соединение с голосовым каналом потеряно';
  }
}

/** LiveKit's permission of a participant (livekit-client does not export the type). */
type ParticipantPermission = NonNullable<Participant['permissions']>;

/** Whether LiveKit's permission lets the participant publish a source. */
export function sourceAllowed(
  p: Pick<ParticipantPermission, 'canPublish' | 'canPublishSources'> | undefined,
  source: Track.Source,
): boolean {
  if (!p?.canPublish) return false;
  // An empty list allows every source.
  return !p.canPublishSources.length || p.canPublishSources.some(s => Track.sourceFromProto(s) === source);
}

/** Whether LiveKit's permission lets the participant publish the microphone. */
export function micAllowed(p: Pick<ParticipantPermission, 'canPublish' | 'canPublishSources'> | undefined): boolean {
  return sourceAllowed(p, Track.Source.Microphone);
}

/**
 * The screen capture quality: 720p by default, 1080p with STREAM_HQ. LiveKit
 * cannot cap a resolution, so the client keeps to what the right allows.
 */
export function screenPreset(highQuality: boolean) {
  return highQuality ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h720fps30;
}

/**
 * What to say when the browser does not share the screen. Choosing «Cancel»
 * is not an error; a system that forbids capture (macOS privacy settings)
 * and a browser without screen capture are.
 */
export function shareErrorText(err: unknown): string | null {
  const e = err as { name?: string; message?: string } | null;
  if (e?.name === 'NotAllowedError') {
    return /system/i.test(e.message ?? '') ? 'Система не разрешила браузеру показ экрана: проверьте настройки конфиденциальности' : null;
  }
  // DeviceUnsupportedError: livekit-client found no getDisplayMedia (phones).
  if (e?.name === 'NotSupportedError' || e?.name === 'DeviceUnsupportedError') return 'Этот браузер не умеет показывать экран';
  if (e?.name === 'AbortError') return null;
  return 'Не удалось начать показ экрана';
}

/** What to say when the camera does not start. */
export function cameraErrorText(err: unknown): string {
  switch ((err as { name?: string } | null)?.name) {
    case 'NotAllowedError':
      return 'Нет доступа к камере: разрешите её в браузере';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Камера не найдена';
    case 'NotReadableError':
      return 'Камера занята другой программой';
    default:
      return 'Не удалось включить камеру';
  }
}

/** VOICE_MOVE: a moderator moved us to another voice channel (ruscord-core ADR-0031). */
interface VoiceMove {
  guild_id: string;
  channel_id: string;
  from_channel_id: string;
}

/** How long after LiveKit removed us a VOICE_MOVE still applies to this tab. */
const MOVE_WINDOW_MS = 15_000;

/** The video a user publishes: a camera or a screen. */
export type VideoSource = Track.Source.Camera | Track.Source.ScreenShare;

/**
 * The voice connection of this tab (ruscord-core ADR-0025): one LiveKit room
 * at a time. Components read its signals and call its methods; nothing else
 * touches livekit-client (VoiceEngine in ADR-0001).
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(ApiService);
  private readonly zone = inject(NgZone);

  readonly status = signal<VoiceStatus>('idle');
  readonly target = signal<VoiceTarget | null>(null);
  /** User ids speaking now in this room. */
  readonly speaking = signal<ReadonlySet<string>>(new Set());
  readonly selfMute = signal(false);
  readonly selfDeaf = signal(false);
  /** The last problem worth showing (no microphone, disconnected by a moderator...). */
  readonly error = signal<string | null>(null);
  /** The token does not allow the microphone, or push-to-talk is required. */
  readonly canSpeak = signal(true);
  readonly pushToTalk = signal(false);
  /** A moderator muted or deafened us (from our voice state). */
  readonly serverMute = signal(false);
  readonly serverDeaf = signal(false);
  readonly inputs = signal<MediaDeviceInfo[]>([]);
  readonly outputs = signal<MediaDeviceInfo[]>([]);
  readonly cameras = signal<MediaDeviceInfo[]>([]);
  readonly input = signal(readDevice('audioinput'));
  readonly output = signal(readDevice('audiooutput'));
  readonly camera = signal(readDevice('videoinput'));
  readonly connected = computed(() => this.status() !== 'idle');
  /** The token allows sharing the screen (STREAM). */
  readonly canShare = signal(false);
  /** Above 720p allowed (STREAM_HQ). */
  readonly highQuality = signal(false);
  /** The sound of the shared screen may go too (screen_share_audio). */
  private shareAudio = false;
  /** We share our screen now. */
  readonly sharing = signal(false);
  /** User ids sharing a screen in this room, us included. */
  readonly sharers = signal<ReadonlySet<string>>(new Set());
  /** The last move by a moderator, for the view to follow (ruscord-core ADR-0031). */
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  /** Whose screen is open in the voice channel's centre. */
  readonly watching = signal<string | null>(null);
  /** The token allows the camera (VIDEO). */
  readonly canCamera = signal(false);
  /** Our camera is on. */
  readonly cameraOn = signal(false);
  /** User ids with the camera on in this room, us included. */
  readonly filming = signal<ReadonlySet<string>>(new Set());

  private room: Room | null = null;
  /**
   * The channel a moderator just took us out of: LiveKit's removal may come
   * before VOICE_MOVE, and the move must still find this tab.
   */
  private removedFrom: { channelId: string; at: number } | null = null;
  /** Elements playing remote audio, kept to deafen and to remove. */
  private readonly audio = new Map<string, HTMLMediaElement>();
  /** Remote video tracks by source, then user id, while subscribed. */
  private readonly videos = new Map<VideoSource, Map<string, RemoteTrack>>([
    [Track.Source.ScreenShare, new Map()],
    [Track.Source.Camera, new Map()],
  ]);
  private sink: HTMLElement | null = null;

  constructor() {
    // Leave when signed out: the room belongs to the account.
    const auth = inject(AuthService);
    effect(() => {
      if (!auth.signedIn()) untracked(() => void this.leave());
    });
    inject(DestroyRef).onDestroy(() => void this.leave());
    // The core records us in the channel when LiveKit reports the connection,
    // after we connected; our mute and deafen are sent once that state comes.
    inject(GatewayService).dispatches.subscribe(ev => {
      if (ev.t === 'VOICE_MOVE') {
        this.moved(ev.d as VoiceMove);
        return;
      }
      if (ev.t !== 'VOICE_STATE_UPDATE') return;
      const v = ev.d as VoiceState;
      const t = this.target();
      if (!t || v.user_id !== auth.user()?.id || v.channel_id !== t.channelId) return;
      this.moderated(!!v.mute, !!v.deaf);
      if (v.self_mute !== this.selfMute() || v.self_deaf !== this.selfDeaf()) this.report();
    });
  }

  /** Enters a voice channel, leaving the current one first. */
  async join(target: VoiceTarget): Promise<void> {
    const cur = this.target();
    if (cur?.channelId === target.channelId && this.status() !== 'idle') return;
    await this.leave();
    this.error.set(null);
    this.target.set(target);
    this.status.set('connecting');
    let info: VoiceJoinInfo;
    try {
      info = await firstValueFrom(this.api.joinVoice(target.channelId));
    } catch (err) {
      this.reset(errorText(err, 'Не удалось войти в голосовой канал'));
      return;
    }
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { deviceId: this.camera() || undefined },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        deviceId: this.input() || undefined,
      },
    });
    this.room = room;
    this.listen(room);
    try {
      await room.connect(liveKitUrl(info), info.token);
    } catch (err) {
      if (this.room === room) this.reset('Не удалось подключиться к голосовому серверу');
      console.error('voice: connect', err);
      return;
    }
    if (this.room !== room) return; // left while connecting
    this.status.set('connected');
    if (this.output()) await room.switchActiveDevice('audiooutput', this.output()).catch(() => false);
    this.canSpeak.set(info.sources.includes('microphone'));
    this.canShare.set(info.sources.includes('screen_share'));
    this.canCamera.set(info.sources.includes('camera'));
    this.shareAudio = info.sources.includes('screen_share_audio');
    this.highQuality.set(!!info.high_quality);
    this.pushToTalk.set(info.push_to_talk);
    // Push-to-talk comes with the voice settings; until then such users listen.
    const talk = this.canSpeak() && !info.push_to_talk && !this.selfMute() && !this.selfDeaf();
    await this.setMic(talk);
    await this.refreshDevices();
  }

  /** Leaves the voice channel; safe to call when not in one. */
  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;
    if (room) await room.disconnect();
    this.reset(null);
  }

  async toggleMute(): Promise<void> {
    const mute = !this.selfMute();
    this.selfMute.set(mute);
    // Unmuting while deafened undeafens, like in Discord.
    if (!mute && this.selfDeaf()) this.applyDeaf(false);
    await this.setMic(!mute && !this.selfDeaf());
    this.report();
  }

  async toggleDeaf(): Promise<void> {
    const deaf = !this.selfDeaf();
    this.applyDeaf(deaf);
    await this.setMic(!deaf && !this.selfMute());
    this.report();
  }

  /**
   * Starts or stops sharing the screen. The browser asks which screen or
   * window; with the right to share sound (screen_share_audio) the tab's or
   * system sound goes too, where the browser offers it.
   */
  async toggleShare(): Promise<void> {
    const room = this.room;
    if (!room || !this.canShare()) return;
    const on = !this.sharing();
    try {
      await room.localParticipant.setScreenShareEnabled(on, {
        audio: this.shareAudio,
        resolution: screenPreset(this.highQuality()).resolution,
        contentHint: 'detail',
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
      }, { screenShareEncoding: screenPreset(this.highQuality()).encoding });
    } catch (err) {
      const text = shareErrorText(err);
      if (text) this.error.set(text);
      console.warn('voice: screen share', err);
    }
    this.syncLocal(room.localParticipant);
  }

  /** Turns the camera on or off; the browser asks for it the first time. */
  async toggleCamera(): Promise<void> {
    const room = this.room;
    if (!room || !this.canCamera()) return;
    try {
      await room.localParticipant.setCameraEnabled(!this.cameraOn(), { deviceId: this.camera() || undefined });
    } catch (err) {
      this.error.set(cameraErrorText(err));
      console.warn('voice: camera', err);
    }
    this.syncLocal(room.localParticipant);
  }

  /**
   * Shows a user's camera or screen in the given video element; returns the
   * cleanup. Our own plays from the local track, without sound.
   */
  showVideo(source: VideoSource, userId: string, el: HTMLVideoElement): () => void {
    const room = this.room;
    const own = room && userId === room.localParticipant.identity
      ? room.localParticipant.getTrackPublication(source)?.track
      : undefined;
    const track = own ?? this.videos.get(source)!.get(userId);
    if (!track) return () => undefined;
    track.attach(el);
    return () => track.detach(el);
  }

  async setDevice(kind: DeviceKind, id: string): Promise<void> {
    ({ audioinput: this.input, audiooutput: this.output, videoinput: this.camera })[kind].set(id);
    saveDevice(kind, id);
    await this.room?.switchActiveDevice(kind, id).catch(() => false);
  }

  /** Lists microphones, speakers and cameras; labels appear once the microphone is allowed. */
  async refreshDevices(): Promise<void> {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.inputs.set(all.filter(d => d.kind === 'audioinput'));
      this.outputs.set(all.filter(d => d.kind === 'audiooutput'));
      this.cameras.set(all.filter(d => d.kind === 'videoinput'));
    } catch {
      this.inputs.set([]);
      this.outputs.set([]);
      this.cameras.set([]);
    }
  }

  private async setMic(on: boolean): Promise<void> {
    const room = this.room;
    if (!room || !this.canSpeak()) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(on);
    } catch (err) {
      this.error.set('Нет доступа к микрофону: разрешите его в браузере');
      this.selfMute.set(true);
      console.warn('voice: microphone', err);
    }
  }

  /**
   * A moderator moved us: the tab that is (or just was) in the old channel
   * enters the new one with a token of its own; other tabs ignore it.
   */
  private moved(m: VoiceMove): void {
    const removed = this.removedFrom;
    const here = this.target()?.channelId === m.from_channel_id
      || (removed?.channelId === m.from_channel_id && Date.now() - removed.at < MOVE_WINDOW_MS);
    if (!here) return;
    this.removedFrom = null;
    this.lastMove.set({ from: m.from_channel_id, to: m.channel_id });
    void this.join({ guildId: m.guild_id, channelId: m.channel_id });
  }

  /** Tells about a moderator's mute or deafen once, when it changes. */
  private moderated(mute: boolean, deaf: boolean): void {
    if (mute && !this.serverMute()) this.error.set('Модератор выключил вам микрофон');
    if (deaf && !this.serverDeaf()) this.error.set('Модератор выключил вам звук');
    this.serverMute.set(mute);
    this.serverDeaf.set(deaf);
  }

  /**
   * LiveKit changed what we may publish: a moderator's mute, or lost or
   * regained SPEAK. LiveKit stops a track that is no longer allowed itself;
   * a microphone allowed again comes back unless we muted ourselves.
   */
  private async permissionsChanged(local: LocalParticipant): Promise<void> {
    // Losing STREAM or VIDEO: LiveKit unpublishes the track; the button goes too.
    this.canShare.set(sourceAllowed(local.permissions, Track.Source.ScreenShare));
    this.canCamera.set(sourceAllowed(local.permissions, Track.Source.Camera));
    this.syncLocal(local);
    const allowed = micAllowed(local.permissions);
    if (allowed === this.canSpeak()) return;
    this.canSpeak.set(allowed);
    if (allowed) await this.setMic(!this.pushToTalk() && !this.selfMute() && !this.selfDeaf());
  }

  private applyDeaf(deaf: boolean): void {
    this.selfDeaf.set(deaf);
    for (const el of this.audio.values()) el.muted = deaf;
  }

  /** Tells the others in the guild about our mute and deafen. */
  private report(): void {
    const t = this.target();
    if (!t || this.status() === 'idle') return;
    this.api.setSelfVoice(t.channelId, this.selfMute(), this.selfDeaf()).subscribe({ error: () => undefined });
  }

  private listen(room: Room): void {
    // LiveKit callbacks come outside Angular's zone in some paths; signals
    // update the views either way, zone.run keeps change detection simple.
    const run = (fn: () => void) => this.zone.run(fn);
    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) =>
        run(() => this.attach(track, p.identity)))
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) =>
        run(() => this.detach(track, p.identity)))
      // A camera turned off stays published, muted.
      .on(RoomEvent.TrackMuted, () => run(() => this.updateVideos()))
      .on(RoomEvent.TrackUnmuted, () => run(() => this.updateVideos()))
      // Our screen ends from the browser's own «Stop sharing» too.
      .on(RoomEvent.LocalTrackPublished, (_pub: LocalTrackPublication) => run(() => this.syncLocal(room.localParticipant)))
      .on(RoomEvent.LocalTrackUnpublished, (_pub: LocalTrackPublication) => run(() => this.syncLocal(room.localParticipant)))
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
        run(() => this.speaking.set(new Set(speakers.map(p => p.identity)))))
      .on(RoomEvent.Reconnecting, () => run(() => this.status.set('reconnecting')))
      .on(RoomEvent.Reconnected, () => run(() => this.status.set('connected')))
      .on(RoomEvent.ParticipantPermissionsChanged, (_prev: ParticipantPermission | undefined, p: Participant) => {
        if (p === room.localParticipant) run(() => void this.permissionsChanged(room.localParticipant));
      })
      .on(RoomEvent.MediaDevicesChanged, () => run(() => void this.refreshDevices()))
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) =>
        run(() => {
          if (this.room !== room) return; // we left or moved on
          this.room = null;
          const from = this.target()?.channelId;
          if (reason === DisconnectReason.PARTICIPANT_REMOVED && from) this.removedFrom = { channelId: from, at: Date.now() };
          this.reset(disconnectText(reason));
        }));
  }

  private attach(track: RemoteTrack, userId: string): void {
    const videos = this.videos.get(track.source as VideoSource);
    if (videos) {
      videos.set(userId, track);
      this.updateVideos();
      return;
    }
    if (track.kind !== Track.Kind.Audio || !track.sid) return;
    const el = (track as RemoteAudioTrack).attach();
    el.muted = this.selfDeaf();
    this.sink ??= this.makeSink();
    this.sink.appendChild(el);
    this.audio.set(track.sid, el);
  }

  private detach(track: RemoteTrack, userId: string): void {
    const videos = this.videos.get(track.source as VideoSource);
    if (videos) {
      if (videos.get(userId) === track) videos.delete(userId);
      this.updateVideos();
      return;
    }
    if (!track.sid) return;
    const el = this.audio.get(track.sid);
    if (el) {
      track.detach(el);
      el.remove();
      this.audio.delete(track.sid);
    }
  }

  /** Whether we publish a screen and the camera now, by LiveKit's own state. */
  private syncLocal(local: LocalParticipant): void {
    this.sharing.set(local.isScreenShareEnabled);
    this.cameraOn.set(local.isCameraEnabled);
    this.updateVideos();
  }

  /** Who shows a screen or a camera; a muted track shows nothing. */
  private updateVideos(): void {
    const me = this.room?.localParticipant;
    const live = (source: VideoSource, own: boolean) => {
      const ids = new Set([...this.videos.get(source)!].filter(([, t]) => !t.isMuted).map(([id]) => id));
      if (me && own) ids.add(me.identity);
      return ids;
    };
    this.filming.set(live(Track.Source.Camera, this.cameraOn()));
    const ids = live(Track.Source.ScreenShare, this.sharing());
    this.sharers.set(ids);
    // Someone stopped: the centre stops showing their screen.
    const w = this.watching();
    if (w && !ids.has(w)) this.watching.set(null);
  }

  private makeSink(): HTMLElement {
    const div = document.createElement('div');
    div.hidden = true;
    div.dataset['voiceAudio'] = '';
    document.body.appendChild(div);
    return div;
  }

  private reset(error: string | null): void {
    for (const el of this.audio.values()) el.remove();
    this.audio.clear();
    for (const v of this.videos.values()) v.clear();
    this.sharing.set(false);
    this.canCamera.set(false);
    this.cameraOn.set(false);
    this.filming.set(new Set());
    this.canShare.set(false);
    this.highQuality.set(false);
    this.sharers.set(new Set());
    this.watching.set(null);
    this.status.set('idle');
    this.target.set(null);
    this.speaking.set(new Set());
    this.serverMute.set(false);
    this.serverDeaf.set(false);
    if (error) this.error.set(error);
  }
}
