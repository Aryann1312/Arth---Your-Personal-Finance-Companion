/**
 * @file arthTimingMath.test.js
 * @description Unit tests for Arth Wordmark Intro Animation frame math,
 * verifying collapseAt, split ranks, resolve order, and hard-cut swap frames.
 */

import {
  computeCollapseAt,
  computeSplitRanks,
  computeResolveOrder,
  computeSwapFrames,
  solveCubicBezier,
  SPIN_EASE,
  OUT_EASE,
  IN_EASE
} from '../../lib/calc/arthTimingMath.js';

describe('Arth Intro Animation — Pure Frame Choreography Engine', () => {
  test('Deck Collapse Frame (collapseAt) calculates exactly 38 for 6 cards', () => {
    // collapseAt = round(33 + 2 * (cards - 1) / 2) = round(33 + 5) = 38
    expect(computeCollapseAt(6)).toBe(38);
    expect(computeCollapseAt(4)).toBe(36);
  });

  test('Split ranks are computed outside-in (outermost pair leads, inner lags)', () => {
    // For 4 letters ("Arth"): [0, 1, 1, 0]
    const ranks = computeSplitRanks(4);
    expect(ranks).toEqual([0, 1, 1, 0]);

    // For 5 letters: [0, 1, 2, 1, 0]
    expect(computeSplitRanks(5)).toEqual([0, 1, 2, 1, 0]);
  });

  test('Resolve order resolves second letter first, rest left to right, first letter last', () => {
    // For 4 letters ("Arth" -> [A(0), r(1), t(2), h(3)]):
    // Order: r(1), t(2), h(3), A(0)
    const order = computeResolveOrder(4);
    expect(order).toEqual([1, 2, 3, 0]);
  });

  test('Swap frames match exact choreography specification', () => {
    const timing = computeSwapFrames({
      totalCards: 6,
      letterCount: 4,
      splitLag: 2,
      holdDuration: 54,
      flashStagger: 4,
      flashDuration: 3,
      swapDelay: 5,
      endHoldFrames: 39
    });

    expect(timing.collapseAt).toBe(38);
    expect(timing.splitStart).toBe(40);
    expect(timing.resolveStart).toBe(94);

    // Letter 'r' (index 1) - step 0
    const rTimeline = timing.letterTimeline[1];
    expect(rTimeline.cueFrame).toBe(94);
    expect(rTimeline.flashEndFrame).toBe(97);
    expect(rTimeline.swapFrame).toBe(99);

    // Letter 't' (index 2) - step 1
    const tTimeline = timing.letterTimeline[2];
    expect(tTimeline.cueFrame).toBe(96);
    expect(tTimeline.flashEndFrame).toBe(99);
    expect(tTimeline.swapFrame).toBe(101);

    // Letter 'h' (index 3) - step 2
    const hTimeline = timing.letterTimeline[3];
    expect(hTimeline.cueFrame).toBe(100);
    expect(hTimeline.flashEndFrame).toBe(103);
    expect(hTimeline.swapFrame).toBe(105);

    // Letter 'A' (index 0) - step 3
    const ATimeline = timing.letterTimeline[0];
    expect(ATimeline.cueFrame).toBe(104);
    expect(ATimeline.flashEndFrame).toBe(107);
    expect(ATimeline.swapFrame).toBe(109);

    // Last swap at frame 109, total frames 148
    expect(timing.lastSwapFrame).toBe(109);
    expect(timing.totalFrames).toBe(148);
  });

  test('Cubic-bezier solver smoothly interpolates boundary conditions without NaN', () => {
    expect(SPIN_EASE(0)).toBe(0);
    expect(SPIN_EASE(1)).toBe(1);
    expect(SPIN_EASE(0.5)).toBeCloseTo(0.5, 2);

    expect(OUT_EASE(0)).toBe(0);
    expect(OUT_EASE(1)).toBe(1);

    expect(IN_EASE(0)).toBe(0);
    expect(IN_EASE(1)).toBe(1);
  });
});
