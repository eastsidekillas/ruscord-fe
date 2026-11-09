import { Injectable, signal } from '@angular/core';
import type { AudioFlags } from './voice-prefs';

export interface MicCheckOptions {
  /** Input device id; empty for the system default. */
  input: string;
  /** Output device id; empty for the system default. */
  output: string;
  flags: AudioFlags;
}

/** Microphone level, RMS scaled by 4 and clamped to 0..1. */
export function levelOf(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const v of samples) sum += v * v;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

export function micErrorText(err: unknown): string {
  switch ((err as { name?: string } | null)?.name) {
    case 'NotAllowedError':
      return 'Доступ к микрофону запрещён: разрешите его в настройках браузера';
    case 'NotFoundError':
      return 'Микрофон не найден';
    case 'NotReadableError':
      return 'Микрофон занят другим приложением';
    default:
      return 'Не удалось включить микрофон';
  }
}

type SinkAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };

async function routeTo(audio: SinkAudio, output: string): Promise<void> {
  if (!output || typeof audio.setSinkId !== 'function') return;
  try {
    await audio.setSinkId(output);
  } catch {
    // keep the default output
  }
}

/**
 * Microphone check and speaker test outside a call. Plain WebAudio and
 * getUserMedia; deliberately independent of the call's LiveKit room.
 */
@Injectable({ providedIn: 'root' })
export class MicCheck {
  readonly running = signal(false);
  readonly level = signal(0);
  readonly error = signal<string | null>(null);

  /** Bumped by every start and stop, so a slow start can tell it is stale. */
  private run = 0;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private audio: SinkAudio | null = null;
  private frame = 0;

  async start(o: MicCheckOptions): Promise<void> {
    this.stop();
    const id = this.run;
    this.error.set(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: o.input || undefined, ...o.flags },
      });
    } catch (e) {
      if (id === this.run) this.error.set(micErrorText(e));
      return;
    }
    if (id !== this.run) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    this.stream = stream;
    const ctx = new AudioContext();
    this.ctx = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      this.level.set(levelOf(samples));
      this.frame = requestAnimationFrame(tick);
    };
    tick();

    // Hear yourself through the chosen output.
    const audio: SinkAudio = new Audio();
    audio.srcObject = stream;
    this.audio = audio;
    await routeTo(audio, o.output);
    if (id !== this.run) return;
    audio.play().catch(() => undefined);
    this.running.set(true);
  }

  stop(): void {
    this.run++;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
      this.audio = null;
    }
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.running.set(false);
    this.level.set(0);
  }

  /** A 440 Hz, 400 ms tone through the chosen output; resolves when it ends. */
  async playTone(output: string): Promise<void> {
    const ctx = new AudioContext();
    const audio: SinkAudio = new Audio();
    try {
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(dest);
      audio.srcObject = dest.stream;
      await routeTo(audio, output);
      audio.play().catch(() => undefined);
      // Not awaited: resume() can stay pending while autoplay is blocked.
      ctx.resume().catch(() => undefined);
      // A context the browser keeps suspended never fires onended; the timer
      // keeps the promise from hanging.
      const ended = new Promise<void>(r => {
        osc.onended = () => r();
        setTimeout(r, 700);
      });
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      await ended;
    } finally {
      audio.pause();
      audio.srcObject = null;
      await ctx.close().catch(() => undefined);
    }
  }
}
