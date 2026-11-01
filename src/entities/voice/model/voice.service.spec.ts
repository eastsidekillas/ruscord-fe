import { DisconnectReason } from 'livekit-client';
import { disconnectText, liveKitUrl } from './voice.service';

describe('voice helpers', () => {
  it('connects to LiveKit on this site unless the core names another address', () => {
    expect(liveKitUrl({ url: '' }, { protocol: 'http:', host: 'localhost:8081' })).toBe('ws://localhost:8081/livekit');
    expect(liveKitUrl({ url: '' }, { protocol: 'https:', host: 'ruscord.example' })).toBe('wss://ruscord.example/livekit');
    expect(liveKitUrl({ url: 'wss://media.example' }, { protocol: 'https:', host: 'x' })).toBe('wss://media.example');
  });

  it('says why the voice connection ended, and nothing when you left', () => {
    expect(disconnectText(DisconnectReason.CLIENT_INITIATED)).toBeNull();
    expect(disconnectText(DisconnectReason.PARTICIPANT_REMOVED)).toContain('отключены');
    expect(disconnectText(DisconnectReason.DUPLICATE_IDENTITY)).toContain('другой вкладке');
    expect(disconnectText(undefined)).toContain('потеряно');
  });
});
