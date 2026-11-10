import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateStore, channelGroups } from '@entities/app-state';
import { ReadStateStore } from '@entities/read-states';
import { VoiceService } from '@entities/voice';
import { ModalService } from '@shared/model/modal.service';
import { NavHistory } from '@shared/model/nav-history.service';
import { HotkeyAction, endsTalk, hotkeyFor, isTyping, neighbour, startsTalk } from '../lib/keys';

/** The app-wide keyboard shortcuts (ruscord-core ADR-0045). */
@Injectable({ providedIn: 'root' })
export class HotkeysService {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly store = inject(AppStateStore);
  private readonly reads = inject(ReadStateStore);
  private readonly voice = inject(VoiceService);
  private readonly modal = inject(ModalService);
  private readonly history = inject(NavHistory);
  private started = false;

  start(): void {
    if (this.started || typeof document === 'undefined') return;
    this.started = true;
    document.addEventListener('keydown', ev => {
      if (ev.defaultPrevented || ev.isComposing) return;
      const action = hotkeyFor(ev);
      if (!action) return;
      this.zone.run(() => {
        if (this.run(action)) ev.preventDefault();
      });
    });
    this.listenForTalkKey();
  }

  /**
   * Push-to-talk, independent of the shortcuts above and never preventing
   * default. Release and blur close the microphone whatever has focus.
   */
  private listenForTalkKey(): void {
    const release = () => void this.voice.holdTalk(false);
    document.addEventListener('keydown', ev => {
      const talk = startsTalk(ev, {
        key: this.voice.prefs().talkKey,
        required: this.voice.talkRequired(),
        typing: isTyping(ev.target),
        modalOpen: !!this.modal.modalType(),
      });
      if (talk) void this.voice.holdTalk(true);
    });
    document.addEventListener('keyup', ev => {
      if (endsTalk(ev, this.voice.prefs().talkKey)) release();
    });
    window.addEventListener('blur', release);
  }

  /** True when the key did something here (and the browser should not). */
  private run(action: HotkeyAction): boolean {
    const open = this.modal.modalType();
    if (action === 'switch') {
      if (open === 'quickSwitch') this.modal.close();
      else if (!open) this.modal.open('quickSwitch');
      else return false;
      return true;
    }
    if (open) return false;
    switch (action) {
      case 'mute': void this.voice.toggleMute(); return true;
      case 'deafen': void this.voice.toggleDeaf(); return true;
      case 'back': this.history.back(); return true;
      case 'forward': this.history.forward(); return true;
      case 'markRead': return this.markRead();
      default: return this.step(action);
    }
  }

  /** Where we are: /channels/me[/:dm] or /channels/:guild[/:channel]. */
  private place(): { guildId: string | null; channelId: string | null } | null {
    const parts = this.router.url.split(/[?#]/)[0].split('/');
    if (parts[1] !== 'channels' || !parts[2]) return null;
    return { guildId: parts[2] === 'me' ? null : parts[2], channelId: parts[3] || null };
  }

  private step(action: HotkeyAction): boolean {
    const here = this.place();
    if (!here) return false;
    const dir = action === 'prev' || action === 'prevUnread' ? -1 : 1;
    const unreadOnly = action === 'prevUnread' || action === 'nextUnread';
    const g = here.guildId ? this.store.guild(here.guildId) : null;
    const ids = g
      ? channelGroups(g).flatMap(group => group.channels).filter(c => c.type === 0).map(c => c.id)
      : this.store.dms().map(d => d.id);
    const to = neighbour(ids, here.channelId, dir, unreadOnly ? id => this.reads.unread(id) : undefined);
    if (!to) return unreadOnly; // nothing unread: still ours, nothing to do
    void this.router.navigate(g ? ['/channels', g.id, to] : ['/channels/me', to]);
    return true;
  }

  private markRead(): boolean {
    const id = this.place()?.channelId;
    if (!id || !this.reads.unread(id)) return false;
    this.reads.ackLatest(id);
    return true;
  }
}
