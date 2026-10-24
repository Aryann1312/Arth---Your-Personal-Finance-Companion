/**
 * @file arthTimingMath.js
 * @description Pure mathematical engine for the "Arth" Wordmark Intro Animation.
 * Computes exact frame timings, outside-in split ranks, resolve cue offsets,
 * and worklet-ready cubic-bezier curve solvers.
 */

/**
 * Solves a cubic-bezier curve (p1x, p1y, p2x, p2y) for parameter t in [0, 1].
 * Implements Newton-Raphson approximation suitable for UI thread worklets.
 */
export function solveCubicBezier(p1x, p1y, p2x, p2y) {
  'worklet';
  return function bezierEase(t) {
    'worklet';
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    let u = t;
    for (let i = 0; i < 10; i++) {
      const currentX = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
      const dx = 3 * (1 - u) * (1 - u) * p1x + 6 * (1 - u) * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
      if (Math.abs(currentX - t) < 1e-5 || Math.abs(dx) < 1e-6) break;
      u -= (currentX - t) / dx;
      u = Math.min(Math.max(u, 0), 1);
    }

    return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
  };
}

// Choreography Easing Presets
export const SPIN_EASE = solveCubicBezier(0.76, 0, 0.24, 1);

export function OUT_EASE(x) {
  'worklet';
  const clamped = Math.min(Math.max(x, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

export function IN_EASE(x) {
  'worklet';
  const clamped = Math.min(Math.max(x, 0), 1);
  return Math.pow(clamped, 3);
}

/**
 * Computes deck collapse frame:
 * collapseAt = round(33 + 2 * (totalCards - 1) / 2)
 * For 6 cards (1 lead + 5 trailing), collapseAt = 38.
 */
export function computeCollapseAt(totalCards = 6) {
  return Math.round(33 + (2 * (totalCards - 1)) / 2);
}

/**
 * Computes outside-in split ranks for N letters.
 * Outermost pair leads (rank 0), each inward step lags 1 frame (rank 1, 2...).
 * Example for N=4 ("Arth"): [0, 1, 1, 0]
 */
export function computeSplitRanks(letterCount = 4) {
  const ranks = [];
  for (let i = 0; i < letterCount; i++) {
    const distFromEdge = Math.min(i, letterCount - 1 - i);
    ranks.push(distFromEdge);
  }
  return ranks;
}

/**
 * Computes the resolve sequence order:
 * "second letter first, then the rest left to right, and the FIRST letter last."
 * Example for N=4: [1, 2, 3, 0] (r, t, h, A)
 */
export function computeResolveOrder(letterCount = 4) {
  if (letterCount <= 1) return [0];
  const order = [];
  // 1. Second letter first
  order.push(1);
  // 2. Rest left to right
  for (let i = 2; i < letterCount; i++) {
    order.push(i);
  }
  // 3. First letter last
  order.push(0);
  return order;
}

/**
 * Computes cue start frames and hard-cut swap frames for each letter.
 */
export function computeSwapFrames(options = {}) {
  const {
    totalCards = 6,
    letterCount = 4,
    splitLag = 2,
    holdDuration = 54,
    flashStagger = 4,
    flashDuration = 3,
    swapDelay = 5,
    endHoldFrames = 39 // ~1.3s at 30fps
  } = options;

  const collapseAt = computeCollapseAt(totalCards);
  const splitStart = collapseAt + splitLag;
  const resolveStart = splitStart + holdDuration;
  const resolveOrder = computeResolveOrder(letterCount);

  const cues = resolveOrder.map((letterIdx, k) => {
    const offset = k === 0 ? 0 : flashStagger * k - Math.floor(flashStagger / 2);
    const cueFrame = resolveStart + offset;
    const flashEndFrame = cueFrame + flashDuration;
    const swapFrame = cueFrame + swapDelay;

    return {
      letterIdx,
      step: k,
      cueFrame,
      flashEndFrame,
      swapFrame
    };
  });

  const letterTimeline = {};
  cues.forEach(item => {
    letterTimeline[item.letterIdx] = item;
  });

  const lastSwapFrame = Math.max(...cues.map(c => c.swapFrame));
  const totalFrames = lastSwapFrame + endHoldFrames;

  return {
    collapseAt,
    splitStart,
    resolveStart,
    cues,
    letterTimeline,
    lastSwapFrame,
    totalFrames
  };
}
