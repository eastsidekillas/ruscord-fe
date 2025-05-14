import { Injectable, computed, signal } from '@angular/core';
import { Room, Participant, LocalParticipant } from 'livekit-client';

@Injectable({ providedIn: 'root' })
export class CallStateService {
  private _room = signal<Room | null>(null);
  private _participants = signal<Participant[]>([]);
  private _localParticipant = signal<LocalParticipant | null>(null);
  private _active = signal(false);
  private _callType = signal<'dm' | 'server' | null>(null);
  private _channelId = signal<string | null>(null);

  readonly room = computed(() => this._room());
  readonly participants = computed(() => this._participants());
  readonly localParticipant = computed(() => this._localParticipant());
  readonly active = computed(() => this._active());
  readonly callType = computed(() => this._callType());
  readonly channelId = computed(() => this._channelId());

  // Setters
  startCall(room: Room, type: 'dm' | 'server', channelId: string) {
    this._room.set(room);
    this._callType.set(type);
    this._channelId.set(channelId);
    this._active.set(true);

    this._localParticipant.set(room.localParticipant);
    this.updateParticipants();

    room.on('participantConnected', () => this.updateParticipants());
    room.on('participantDisconnected', () => this.updateParticipants());
  }

  leaveCall() {
    const room = this._room();
    if (room) {
      room.disconnect();
    }

    this._room.set(null);
    this._participants.set([]);
    this._localParticipant.set(null);
    this._active.set(false);
    this._callType.set(null);
    this._channelId.set(null);
  }

  private updateParticipants() {
    const room = this._room();
    if (!room) return;

    const participants = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values())
    ];
    this._participants.set(participants);
  }
}
