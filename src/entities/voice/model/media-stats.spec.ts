import { avOffset, connection, received, sent } from './media-stats';

/** An RTCStatsReport is a read-only Map of stats by id. */
function report(...stats: Record<string, unknown>[]): RTCStatsReport {
  return new Map(stats.map(s => [s['id'] as string, s])) as unknown as RTCStatsReport;
}

describe('media stats', () => {
  it('reads a received video: picture, codec, rate and buffer since the last sample', () => {
    const codec = { id: 'c', type: 'codec', timestamp: 0, mimeType: 'video/VP8' };
    const before = report(codec, {
      id: 'in', type: 'inbound-rtp', timestamp: 1000, bytesReceived: 0, jitterBufferDelay: 1, jitterBufferEmittedCount: 10,
    });
    const now = report(codec, {
      id: 'in', type: 'inbound-rtp', timestamp: 3000, bytesReceived: 250_000, frameWidth: 1920, frameHeight: 1080, framesPerSecond: 30,
      jitterBufferDelay: 4, jitterBufferEmittedCount: 40, estimatedPlayoutTimestamp: 5000, codecId: 'c',
    });
    expect(received(now, before)).toEqual({
      width: 1920, height: 1080, fps: 30, kbps: 1000, codec: 'VP8', bufferMs: 100, playout: 5000,
    });
    expect(received(report(), before)).toBeNull();
  });

  it('reads what we send: the largest layer, the sum of all layers, why quality drops', () => {
    const before = report(
      { id: 'q', type: 'outbound-rtp', timestamp: 0, bytesSent: 0 },
      { id: 'f', type: 'outbound-rtp', timestamp: 0, bytesSent: 0 },
    );
    const now = report(
      { id: 'q', type: 'outbound-rtp', timestamp: 1000, bytesSent: 25_000, frameWidth: 960, frameHeight: 540 },
      { id: 'f', type: 'outbound-rtp', timestamp: 1000, bytesSent: 100_000, frameWidth: 1280, frameHeight: 720, framesPerSecond: 12,
        qualityLimitationReason: 'bandwidth' },
    );
    expect(sent(now, before)).toEqual({ width: 1280, height: 720, fps: 12, kbps: 1000, codec: undefined, limit: 'bandwidth' });
    expect(sent(now)?.kbps).toBeUndefined();
  });

  it('tells the round trip and whether media goes over UDP, TCP or TURN', () => {
    const pair = { id: 'p', type: 'candidate-pair', timestamp: 0, state: 'succeeded', nominated: true, currentRoundTripTime: 0.042, localCandidateId: 'l' };
    expect(connection(report(pair, { id: 'l', type: 'local-candidate', timestamp: 0, candidateType: 'srflx', protocol: 'udp' })))
      .toEqual({ rttMs: 42, route: 'udp' });
    expect(connection(report(pair, { id: 'l', type: 'local-candidate', timestamp: 0, candidateType: 'host', protocol: 'tcp' })).route).toBe('tcp');
    expect(connection(report(pair, { id: 'l', type: 'local-candidate', timestamp: 0, candidateType: 'relay', protocol: 'udp' })).route).toBe('relay');
    expect(connection(undefined)).toEqual({});
  });

  it('measures how far the sound lags the picture', () => {
    expect(avOffset({ playout: 1000 }, { playout: 1300 })).toBe(300);
    expect(avOffset({ playout: 1000 }, { width: 640 })).toBeUndefined();
    expect(avOffset(null, { playout: 1 })).toBeUndefined();
  });
});
