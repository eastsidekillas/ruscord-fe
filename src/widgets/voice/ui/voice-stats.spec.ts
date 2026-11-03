import { describe as text } from './voice-stats';

describe('describe (statistics in words)', () => {
  it('lists what is known, with the reason quality drops', () => {
    expect(text({ width: 1280, height: 720, fps: 29.6, kbps: 1800, codec: 'VP8', limit: 'bandwidth' }))
      .toBe('1280×720 · 30 к/с · 1800 кбит/с · VP8 · ограничено: не хватает сети');
    expect(text({ kbps: 32, codec: 'opus', bufferMs: 60 })).toBe('32 кбит/с · opus · буфер 60 мс');
  });

  it('shows a dash when there is nothing', () => {
    expect(text(null)).toBe('—');
    expect(text({})).toBe('—');
  });
});
