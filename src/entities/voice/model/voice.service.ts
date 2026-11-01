import { DestroyRef, Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DisconnectReason,
  Participant,
  RemoteAudioTrack,
  RemoteTrack,
  Room,
  RoomEvent,
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
const DEVICE_KEYS = { audioinput: 'ruscord.voice.audioinput', audiooutput: 'ruscord.voice.audiooutput' } as const;
export type AudioDeviceKind = keyof typeof DEVICE_KEYS;

function readDevice(kind: AudioDeviceKind): string {
  try {
    return localStorage.getItem(DEVICE_KEYS[kind]) ?? '';
  } catch {
    return '';
  }
}

function saveDevice(kind: AudioDeviceKind, id: string): void {
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
  readonly inputs = signal<MediaDeviceInfo[]>([]);
  readonly outputs = signal<MediaDeviceInfo[]>([]);
  readonly input = signal(readDevice('audioinput'));
  readonly output = signal(readDevice('audiooutput'));
  readonly connected = computed(() => this.status() !== 'idle');

  private room: Room | null = null;
  /** Elements playing remote audio, kept to deafen and to remove. */
  private readonly audio = new Map<string, HTMLMediaElement>();
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
      if (ev.t !== 'VOICE_STATE_UPDATE') return;
      const v = ev.d as VoiceState;
      const t = this.target();
      if (!t || v.user_id !== auth.user()?.id || v.channel_id !== t.channelId) return;
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

  async setDevice(kind: AudioDeviceKind, id: string): Promise<void> {
    (kind === 'audioinput' ? this.input : this.output).set(id);
    saveDevice(kind, id);
    await this.room?.switchActiveDevice(kind, id).catch(() => false);
  }

  /** Lists microphones and speakers; labels appear once the microphone is allowed. */
  async refreshDevices(): Promise<void> {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.inputs.set(all.filter(d => d.kind === 'audioinput'));
      this.outputs.set(all.filter(d => d.kind === 'audiooutput'));
    } catch {
      this.inputs.set([]);
      this.outputs.set([]);
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
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => run(() => this.attach(track)))
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => run(() => this.detach(track)))
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
        run(() => this.speaking.set(new Set(speakers.map(p => p.identity)))))
      .on(RoomEvent.Reconnecting, () => run(() => this.status.set('reconnecting')))
      .on(RoomEvent.Reconnected, () => run(() => this.status.set('connected')))
      .on(RoomEvent.MediaDevicesChanged, () => run(() => void this.refreshDevices()))
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) =>
        run(() => {
          if (this.room !== room) return; // we left or moved on
          this.room = null;
          this.reset(disconnectText(reason));
        }));
  }

  private attach(track: RemoteTrack): void {
    if (track.kind !== Track.Kind.Audio || !track.sid) return;
    const el = (track as RemoteAudioTrack).attach();
    el.muted = this.selfDeaf();
    this.sink ??= this.makeSink();
    this.sink.appendChild(el);
    this.audio.set(track.sid, el);
  }

  private detach(track: RemoteTrack): void {
    if (!track.sid) return;
    const el = this.audio.get(track.sid);
    if (el) {
      track.detach(el);
      el.remove();
      this.audio.delete(track.sid);
    }
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
    this.status.set('idle');
    this.target.set(null);
    this.speaking.set(new Set());
    if (error) this.error.set(error);
  }
}
