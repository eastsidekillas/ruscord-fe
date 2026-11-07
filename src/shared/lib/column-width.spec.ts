import { ColumnSpec, KEY_STEP, clampWidth, loadWidth, saveWidth, widthAfterDrag, widthAfterKey } from './column-width';

const spec: ColumnSpec = { key: 'test.col', min: 200, max: 360, initial: 248 };

function memory(init: Record<string, string> = {}) {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe('column width', () => {
  it('clamps to the limits and falls back on garbage', () => {
    const cases: [number, number][] = [[100, 200], [500, 360], [250.6, 251], [NaN, 248], [Infinity, 248]];
    for (const [given, want] of cases) expect(clampWidth(spec, given)).withContext(String(given)).toBe(want);
  });

  it('loads the stored width, clamped', () => {
    const cases: [Record<string, string>, number][] = [
      [{}, 248],
      [{ 'test.col': '300' }, 300],
      [{ 'test.col': '9999' }, 360],
      [{ 'test.col': 'wide' }, 248],
    ];
    for (const [stored, want] of cases) expect(loadWidth(spec, memory(stored))).withContext(JSON.stringify(stored)).toBe(want);
  });

  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(loadWidth(spec, broken)).toBe(248);
    expect(() => saveWidth(spec, 300, broken)).not.toThrow();
    expect(loadWidth(spec, null)).toBe(248);
  });

  it('saves a clamped width', () => {
    const m = memory();
    saveWidth(spec, 1000, m);
    expect(m.data['test.col']).toBe('360');
  });

  it('moves with the arrow keys from either edge', () => {
    const cases: [string, 'right' | 'left', number | null][] = [
      ['ArrowRight', 'right', 248 + KEY_STEP],
      ['ArrowLeft', 'right', 248 - KEY_STEP],
      ['ArrowLeft', 'left', 248 + KEY_STEP],
      ['ArrowRight', 'left', 248 - KEY_STEP],
      ['Home', 'right', 200],
      ['End', 'left', 360],
      ['Enter', 'right', null],
    ];
    for (const [key, edge, want] of cases) expect(widthAfterKey(spec, 248, key, edge)).withContext(`${key} ${edge}`).toBe(want);
  });

  it('follows the pointer from either edge', () => {
    expect(widthAfterDrag(spec, 248, 40, 'right')).toBe(288);
    expect(widthAfterDrag(spec, 248, 40, 'left')).toBe(208);
    expect(widthAfterDrag(spec, 248, -200, 'right')).toBe(200);
  });
});
