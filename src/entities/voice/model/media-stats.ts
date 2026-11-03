/**
 * What a video or sound stream actually does, from the browser's WebRTC
 * statistics (W3C webrtc-stats): to find why a screen looks poor or the
 * sound lags the picture with numbers rather than guesses.
 */
export interface StreamStats {
  width?: number;
  height?: number;
  fps?: number;
  /** Since the previous sample; absent on the first one. */
  kbps?: number;
  codec?: string;
  /** Receiving: average time in the jitter buffer since the previous sample. */
  bufferMs?: number;
  /** Receiving: the sender's capture time of what plays now (estimatedPlayoutTimestamp, ms). */
  playout?: number;
  /** Sending: why the encoder lowers quality (bandwidth, cpu), when it does. */
  limit?: string;
}

/** The path media takes: direct UDP, TCP to the server, or through TURN. */
export type Route = 'udp' | 'tcp' | 'relay';

export interface ConnectionStats {
  rttMs?: number;
  route?: Route;
}

type Stat = Record<string, unknown> & { id: string; type: string; timestamp: number };

function all(report: RTCStatsReport | undefined): Stat[] {
  const out: Stat[] = [];
  report?.forEach(s => out.push(s as Stat));
  return out;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function codecOf(report: RTCStatsReport, s: Stat): string | undefined {
  const c = typeof s['codecId'] === 'string' ? (report.get(s['codecId']) as Stat | undefined) : undefined;
  const mime = c?.['mimeType'];
  return typeof mime === 'string' ? mime.replace(/^(audio|video)\//, '') : undefined;
}

/** Bytes per millisecond between two samples of the same stat, as kbit/s. */
function rate(now: Stat, prev: Stat | undefined, key: 'bytesReceived' | 'bytesSent'): number | undefined {
  const b = num(now[key]);
  const pb = num(prev?.[key]);
  if (b === undefined || pb === undefined || !prev || now.timestamp <= prev.timestamp) return undefined;
  return Math.round(((b - pb) * 8) / (now.timestamp - prev.timestamp));
}

/** What one received track does now; prev is the previous report of the same track. */
export function received(report: RTCStatsReport | undefined, prev?: RTCStatsReport): StreamStats | null {
  const s = all(report).find(x => x.type === 'inbound-rtp');
  if (!report || !s) return null;
  const p = prev?.get(s.id) as Stat | undefined;
  const delay = num(s['jitterBufferDelay']);
  const count = num(s['jitterBufferEmittedCount']);
  const pDelay = num(p?.['jitterBufferDelay']) ?? 0;
  const pCount = num(p?.['jitterBufferEmittedCount']) ?? 0;
  const bufferMs = delay !== undefined && count !== undefined && count > pCount
    ? Math.round(((delay - pDelay) / (count - pCount)) * 1000)
    : undefined;
  return {
    width: num(s['frameWidth']),
    height: num(s['frameHeight']),
    fps: num(s['framesPerSecond']),
    kbps: rate(s, p, 'bytesReceived'),
    codec: codecOf(report, s),
    bufferMs,
    playout: num(s['estimatedPlayoutTimestamp']),
  };
}

/**
 * What we send of one track now. A simulcast track has a stream per layer:
 * the picture is the largest active layer, the rate the sum of all.
 */
export function sent(report: RTCStatsReport | undefined, prev?: RTCStatsReport): StreamStats | null {
  const layers = all(report).filter(x => x.type === 'outbound-rtp');
  if (!report || !layers.length) return null;
  const top = layers.reduce((a, b) => ((num(b['frameWidth']) ?? 0) > (num(a['frameWidth']) ?? 0) ? b : a));
  const rates = layers.map(l => rate(l, prev?.get(l.id) as Stat | undefined, 'bytesSent'));
  const limit = top['qualityLimitationReason'];
  return {
    width: num(top['frameWidth']),
    height: num(top['frameHeight']),
    fps: num(top['framesPerSecond']),
    kbps: rates.every(r => r === undefined) ? undefined : rates.reduce<number>((a, r) => a + (r ?? 0), 0),
    codec: codecOf(report, top),
    limit: typeof limit === 'string' && limit !== 'none' ? limit : undefined,
  };
}

/** The round trip and the path of the connection the report's track uses. */
export function connection(report: RTCStatsReport | undefined): ConnectionStats {
  const stats = all(report);
  const pair = stats.find(x => x.type === 'candidate-pair' && x['state'] === 'succeeded' && x['nominated'] === true)
    ?? stats.find(x => x.type === 'candidate-pair' && x['state'] === 'succeeded');
  if (!report || !pair) return {};
  const rtt = num(pair['currentRoundTripTime']);
  const local = typeof pair['localCandidateId'] === 'string' ? (report.get(pair['localCandidateId']) as Stat | undefined) : undefined;
  const route: Route | undefined = local?.['candidateType'] === 'relay' ? 'relay'
    : local?.['protocol'] === 'tcp' ? 'tcp'
      : local?.['protocol'] === 'udp' ? 'udp' : undefined;
  return { rttMs: rtt === undefined ? undefined : Math.round(rtt * 1000), route };
}

/**
 * How far the sound plays behind the picture of the same person, in ms:
 * positive when the sound lags. Both playout times are the sender's capture
 * times of what plays now, so their difference is the offset the viewer
 * sees and hears.
 */
export function avOffset(audio: StreamStats | null, video: StreamStats | null): number | undefined {
  if (audio?.playout === undefined || video?.playout === undefined) return undefined;
  return Math.round(video.playout - audio.playout);
}
