import { STICK_PX, afterRender, stickAfterScroll } from './stick';

describe('chat scroll stickiness', () => {
  const at = (top: number, height = 2000, client = 500) => ({ top, height, client });
  const bottom = 1500;

  it('decides whether a scroll keeps following the bottom', () => {
    const cases: [string, ReturnType<typeof at> | null, ReturnType<typeof at>, boolean][] = [
      ['first event at the bottom', null, at(bottom), true],
      ['a small wheel step up leaves the bottom at once', at(bottom), at(bottom - 20), false],
      ['a step up within the threshold, from further up', at(bottom - 60), at(bottom - 70), false],
      ['scrolling down near the bottom sticks again', at(bottom - 200), at(bottom - STICK_PX + 10), true],
      ['scrolling down but still far', at(bottom - 600), at(bottom - 300), false],
      ['content shrank: the browser moved the view, still stuck', at(bottom), at(bottom - 100, 1900), true],
      ['a one-pixel jitter is not a move up', at(bottom), at(bottom - 1), true],
    ];
    for (const [name, prev, cur, want] of cases) expect(stickAfterScroll(prev, cur)).withContext(name).toBe(want);
  });

  it('moves the view after a render only when there is a reason', () => {
    const cases: [string, Parameters<typeof afterRender>, ReturnType<typeof afterRender>][] = [
      ['older messages above while reading', [false, true, 1000, 1600], 'keep-place'],
      ['a new message while at the bottom', [true, false, 1000, 1080], 'to-bottom'],
      ['a render with nothing new while at the bottom (the bug)', [true, false, 1000, 1000], 'none'],
      ['a new message while reading history', [false, false, 1000, 1080], 'none'],
    ];
    for (const [name, args, want] of cases) expect(afterRender(...args)).withContext(name).toBe(want);
  });
});
