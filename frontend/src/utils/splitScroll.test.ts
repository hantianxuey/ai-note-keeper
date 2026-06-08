import { describe, expect, it } from 'vitest';
import { getCursorLineScrollRatio, getSyncedScrollTop } from './splitScroll';

describe('split editor scroll helpers', () => {
  it('maps the cursor line to a scroll ratio', () => {
    const content = ['line 1', 'line 2', 'line 3', 'line 4'].join('\n');
    const cursorIndex = content.indexOf('line 3');

    expect(getCursorLineScrollRatio(content, cursorIndex)).toBeCloseTo(2 / 3);
  });

  it('clamps cursor positions outside the content length', () => {
    expect(getCursorLineScrollRatio('one\ntwo', 999)).toBe(1);
    expect(getCursorLineScrollRatio('one\ntwo', -5)).toBe(0);
  });

  it('converts a source scroll position into the target scroll range', () => {
    expect(
      getSyncedScrollTop({
        sourceScrollTop: 250,
        sourceScrollHeight: 1000,
        sourceClientHeight: 500,
        targetScrollHeight: 1200,
        targetClientHeight: 300,
      }),
    ).toBe(450);
  });
});
