import { TabHistory } from './tab-history';

describe('TabHistory', () => {
  it('starts with nowhere to go', () => {
    const h = new TabHistory();
    expect([h.canBack, h.canForward]).toEqual([false, false]);
    h.push(1);
    expect([h.canBack, h.canForward]).toEqual([false, false]);
  });

  it('goes back and forward like the browser', () => {
    const h = new TabHistory();
    h.push(1);
    h.push(2);
    h.push(3);
    expect([h.canBack, h.canForward]).toEqual([true, false]);
    h.pop(2, 4); // back to the entry of navigation 2
    expect([h.canBack, h.canForward]).toEqual([true, true]);
    h.pop(1, 5);
    expect([h.canBack, h.canForward]).toEqual([false, true]);
    h.pop(2, 6); // forward
    expect([h.canBack, h.canForward]).toEqual([true, true]);
  });

  it('drops what was ahead on a new page', () => {
    const h = new TabHistory();
    h.push(1);
    h.push(2);
    h.pop(1, 3);
    h.push(4);
    expect([h.canBack, h.canForward]).toEqual([true, false]);
  });

  it('replaces without adding a step', () => {
    const h = new TabHistory();
    h.push(1);
    h.replace(2); // the guild home redirects to its first channel
    expect(h.canBack).toBeFalse();
    h.push(3);
    h.pop(2, 4);
    expect([h.canBack, h.canForward]).toEqual([false, true]);
  });

  it('knows an entry by the id of a later visit too', () => {
    const h = new TabHistory();
    h.push(1);
    h.push(2);
    h.pop(1, 3); // the saved state of the first entry may now say 3
    h.pop(2, 4);
    h.pop(3, 5);
    expect([h.canBack, h.canForward]).toEqual([false, true]);
  });

  it('starts over on an entry it never saw', () => {
    const h = new TabHistory();
    h.push(1);
    h.push(2);
    h.pop(undefined, 9);
    expect([h.canBack, h.canForward]).toEqual([false, false]);
    h.replace(10);
    expect(h.canBack).toBeFalse();
  });
});
