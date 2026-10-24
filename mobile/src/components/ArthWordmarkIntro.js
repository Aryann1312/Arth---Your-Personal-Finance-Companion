/**
 * @file ArthWordmarkIntro.js
 * @description Master "Arth" Opening Animation Component (React Native / Expo Go).
 *
 * Architecture & Features:
 * - Driven from ONE Reanimated shared value `frame` running linearly from 0 to totalFrames at 30 fps.
 * - Every block, card, tab, and letter is a pure function of `frame`, computed in worklets (useAnimatedStyle).
 * - 100% UI thread execution at 60 fps; zero web-only code.
 * - Measured advance widths at runtime with hidden Text (onLayout) at reference fontSize.
 * - Scales through constant fit factor: fit = min(1, windowWidth * 0.92 / max(letterRowWidth, blockRowWidth)).
 * - Vertically centered on the full ink box (square plus tallest tab).
 * - Instant tap-to-skip, OS Reduce Motion compliance, and soft gold shimmer.
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  AccessibilityInfo
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import {
  computeCollapseAt,
  computeSplitRanks,
  computeResolveOrder,
  computeSwapFrames,
  SPIN_EASE,
  OUT_EASE,
  IN_EASE
} from '../utils/arthTimingMath.js';

// Default tuned tab configurations for Ultra font
// Keys correspond to character glyphs. Letters without an entry get no tab.
export const DEFAULT_TAB_CONFIG = {
  A: {
    widthRatio: 1.0, // full width of block
    heightRatio: 0.65, // tall apex peak
    align: 'center',
    leftRatio: 0
  },
  r: null,
  t: {
    widthRatio: 0.44, // narrow stem
    heightRatio: 0.28, // short tab
    align: 'center',
    leftRatio: 0.28
  },
  h: {
    widthRatio: 0.38, // narrow ascender stem
    heightRatio: 0.65, // tall ascender matching Cap Height
    align: 'left',
    leftRatio: 0
  }
};

// Default reference advance width ratios for "Arth" in Ultra font (advanceWidth / fontSize)
const DEFAULT_ADVANCE_RATIOS = {
  A: 71.25 / 76, // ~0.9375
  r: 38.95 / 76, // ~0.5125
  t: 36.1 / 76,  // ~0.4750
  h: 48.45 / 76  // ~0.6375
};

export function ArthWordmarkIntro({
  text = 'Arth',
  fontSize = 160,
  ink = '#111111',
  background = '#FAF8F5',
  deckColors = ['#D4AF37', '#8A6D1A', '#E9CF7A', '#5C4710', '#F5E6A8'],
  speed = 1,
  onFinish,
  onSkip,

  // Tunable Geometry & Font Metrics
  xHeightRatio = 0.54,
  baselineOffsetRatio = 0.16,
  blockGapRatio = 0.093,
  cornerRadiusRatio = 0.18,
  liftRatio = 0.665,
  tabConfig = DEFAULT_TAB_CONFIG,

  // Tunable Choreography Frames
  totalCards = 6,
  splitLag = 2,
  holdDuration = 54,
  flashStagger = 4,
  flashDuration = 3,
  swapDelay = 5,
  endHoldFrames = 39,

  // Font family name
  fontFamily = 'Ultra_400Regular'
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [measuredWidths, setMeasuredWidths] = useState({});

  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  // Single Reanimated Shared Value driving all choreography (0 to totalFrames)
  const frame = useSharedValue(0);

  // Compute choreography timelines via pure frame math
  const timing = useMemo(() => {
    return computeSwapFrames({
      totalCards,
      letterCount: text.length,
      splitLag,
      holdDuration,
      flashStagger,
      flashDuration,
      swapDelay,
      endHoldFrames
    });
  }, [totalCards, text.length, splitLag, holdDuration, flashStagger, flashDuration, swapDelay, endHoldFrames]);

  const { collapseAt, splitStart, cues, totalFrames } = timing;
  const splitRanks = useMemo(() => computeSplitRanks(text.length), [text.length]);

  // Check OS Reduce Motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (enabled) {
        setReduceMotion(true);
      }
    });
  }, []);

  // Compute character advance widths (dynamically measured or scaled defaults)
  const characters = useMemo(() => text.split(''), [text]);
  const letterAdvanceWidths = useMemo(() => {
    return characters.map((char) => {
      if (measuredWidths[char]) return measuredWidths[char];
      const fallbackRatio = DEFAULT_ADVANCE_RATIOS[char] || 0.6;
      return fontSize * fallbackRatio;
    });
  }, [characters, measuredWidths, fontSize]);

  const rawLetterRowWidth = useMemo(() => {
    return letterAdvanceWidths.reduce((sum, w) => sum + w, 0);
  }, [letterAdvanceWidths]);

  const rawSide = fontSize * xHeightRatio;
  const rawBlockGap = rawSide * blockGapRatio;
  const rawBlockRowWidth = characters.length * rawSide + (characters.length - 1) * rawBlockGap;

  // Fit factor: fit = min(1, windowWidth * 0.92 / max(letterRowWidth, blockRowWidth))
  const fit = useMemo(() => {
    const maxWidth = Math.max(rawLetterRowWidth, rawBlockRowWidth);
    const availableWidth = (windowWidth || 390) * 0.92;
    return maxWidth > 0 ? Math.min(1, availableWidth / maxWidth) : 1;
  }, [windowWidth, rawLetterRowWidth, rawBlockRowWidth]);

  // Fold fit into every measurement and font size (constant scale, letters rasterize once)
  const scaledFontSize = fontSize * fit;
  const side = rawSide * fit;
  const cornerRadius = side * cornerRadiusRatio;
  const maxLift = side * liftRatio;
  const letterRowWidth = rawLetterRowWidth * fit;
  const baselineOffset = side * baselineOffsetRatio;

  // Horizontal layout slots: position each letter within letterRowWidth
  const letterPositions = useMemo(() => {
    let curX = 0;
    return letterAdvanceWidths.map((rawW) => {
      const w = rawW * fit;
      const left = curX;
      const center = curX + w / 2;
      curX += w;
      return { left, center, width: w };
    });
  }, [letterAdvanceWidths, fit]);

  // Max tab height for vertical ink box calculation (vertically center on ink box)
  const maxTabHeight = useMemo(() => {
    let maxRatio = 0;
    characters.forEach((char) => {
      const cfg = tabConfig[char];
      if (cfg && cfg.heightRatio > maxRatio) {
        maxRatio = cfg.heightRatio;
      }
    });
    return maxRatio * side;
  }, [characters, tabConfig, side]);

  // Total ink box stage dimensions (stage is centered dead-middle of screen)
  const stageHeight = side + maxTabHeight + baselineOffset;
  const deckLeft = (letterRowWidth - side) / 2;

  // Animation playback controller
  const handleComplete = useCallback(() => {
    if (onFinishRef.current) {
      onFinishRef.current();
    }
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Honor Reduce Motion: show finished wordmark statically for 800ms
      frame.value = totalFrames;
      const timer = setTimeout(() => {
        handleComplete();
      }, 800);
      return () => clearTimeout(timer);
    }

    // Drive Reanimated shared value linearly at 30 fps
    frame.value = 0;
    const duration = ((totalFrames / 30) * 1000) / speed;

    frame.value = withTiming(
      totalFrames,
      {
        duration,
        easing: Easing.linear
      },
      (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      }
    );
  }, [reduceMotion, totalFrames, speed, handleComplete]);

  // Tap-to-skip handler
  const handleSkipPress = () => {
    frame.value = totalFrames;
    if (onSkipRef.current) {
      onSkipRef.current();
    } else if (onFinishRef.current) {
      onFinishRef.current();
    }
  };

  // Measure runtime letter widths
  const handleMeasureLetter = (char, measuredW) => {
    if (measuredW && (!measuredWidths[char] || Math.abs(measuredWidths[char] - measuredW) > 1)) {
      setMeasuredWidths((prev) => ({
        ...prev,
        [char]: measuredW
      }));
    }
  };

  // =========================================================================
  // ANIMATED STYLES (Worklets)
  // =========================================================================

  // 1. Deck Container (Frames 0 to 38 + Dip)
  const deckContainerStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f > collapseAt + 3) {
      return { display: 'none' };
    }

    // Deck Lift & Fall:
    // Starts frame 2 with spring-like ease out, falls back with IN_EASE over 9 frames before collapseAt
    let currentLift = 0;
    if (f >= 2 && f <= collapseAt - 9) {
      const progress = (f - 2) / (collapseAt - 11);
      currentLift = maxLift * OUT_EASE(progress);
    } else if (f > collapseAt - 9 && f <= collapseAt) {
      const fallProgress = (f - (collapseAt - 9)) / 9;
      currentLift = maxLift * (1 - IN_EASE(fallProgress));
    }

    // DIP (collapseAt to collapseAt + 3): 1-frame anticipation squash
    let dipScaleY = 1;
    let dipScaleX = 1;
    let dipLift = 0;
    if (f >= collapseAt && f <= collapseAt + 3) {
      const dipProgress = (f - collapseAt) / 3;
      const dipSine = Math.sin(dipProgress * Math.PI);
      dipLift = 0.03 * side * dipSine;
      dipScaleY = 1 - 0.013 * dipSine;
      dipScaleX = 1 + 0.013 * dipSine;
    }

    return {
      transform: [
        { translateY: -(currentLift + dipLift) },
        { scaleX: dipScaleX },
        { scaleY: dipScaleY }
      ]
    };
  });

  // 2. Shimmer Sweep Style (soft gold shimmer sweeps once after resolve)
  const shimmerStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f < 114 || f > 138 || reduceMotion) {
      return { opacity: 0 };
    }
    const p = (f - 114) / 24;
    const sweepRange = letterRowWidth + 100;
    const translateX = -50 + p * sweepRange;
    return {
      opacity: 0.5 * Math.sin(p * Math.PI),
      transform: [{ translateX }]
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleSkipPress}
      style={[styles.container, { backgroundColor: background }]}
      accessibilityRole="button"
      accessibilityLabel="Arth Opening Intro Animation. Tap anywhere to skip."
    >
      {/* Hidden Text components measuring runtime advance widths in Ultra font */}
      <View style={styles.hiddenMeasureContainer} pointerEvents="none">
        {characters.map((char, i) => (
          <Text
            key={`measure_${char}_${i}`}
            allowFontScaling={false}
            style={[styles.referenceText, { fontSize: scaledFontSize, fontFamily }]}
            onLayout={(e) => handleMeasureLetter(char, e.nativeEvent.layout.width)}
          >
            {char}
          </Text>
        ))}
      </View>

      {/* Main Centered Stage (Dimensions equal the ink box, centered dead middle of screen) */}
      <View
        style={[
          styles.stage,
          {
            width: letterRowWidth,
            height: stageHeight
          }
        ]}
      >
        {/* ===================================================================
            PHASE 1 & 2: LEAD SQUARE & DECK CARDS (Frames 0 - 38)
            =================================================================== */}
        <Animated.View
          style={[
            styles.deckContainer,
            {
              left: deckLeft,
              bottom: baselineOffset,
              width: side,
              height: side
            },
            deckContainerStyle
          ]}
        >
          {/* 5 Colored Deck Cards behind lead square */}
          {Array.from({ length: 5 }).map((_, cardIndex) => {
            const trailingIndex = cardIndex + 1; // 1 to 5
            const cardColor = deckColors[cardIndex % deckColors.length];
            return (
              <TrailingDeckCard
                key={`deck_card_${cardIndex}`}
                cardIndex={trailingIndex}
                side={side}
                cornerRadius={cornerRadius}
                color={cardColor}
                collapseAt={collapseAt}
                frame={frame}
              />
            );
          })}

          {/* Lead Card (Black / Ink) */}
          <LeadDeckSquare
            side={side}
            cornerRadius={cornerRadius}
            ink={ink}
            collapseAt={collapseAt}
            frame={frame}
          />
        </Animated.View>

        {/* ===================================================================
            PHASE 4, 5, 6: SPLITTING BLOCKS & RESOLVED LETTERS (Frame 40+)
            =================================================================== */}
        {characters.map((char, index) => {
          const charCue = cues.find((c) => c.letterIdx === index) || {
            cueFrame: 94,
            flashEndFrame: 97,
            swapFrame: 99
          };
          const charRank = splitRanks[index] || 0;
          const letterPos = letterPositions[index] || { left: 0, center: side / 2, width: side };
          const targetDeltaX = letterPos.center - side / 2 - deckLeft;
          const tab = tabConfig[char];
          const flashColor = deckColors[charCue.step % deckColors.length];

          return (
            <React.Fragment key={`letter_unit_${char}_${index}`}>
              {/* Animated Block (Visible from splitStart to swapFrame) */}
              <LetterBlock
                char={char}
                side={side}
                cornerRadius={cornerRadius}
                rank={charRank}
                splitStart={splitStart}
                cue={charCue}
                deckLeft={deckLeft}
                baselineOffset={baselineOffset}
                targetDeltaX={targetDeltaX}
                ink={ink}
                flashColor={flashColor}
                tab={tab}
                frame={frame}
              />

              {/* Resolved Text Glyph (Visible from swapFrame onwards) */}
              <ResolvedLetter
                char={char}
                fontSize={scaledFontSize}
                fontFamily={fontFamily}
                ink={ink}
                left={letterPos.left}
                width={letterPos.width}
                side={side}
                baselineOffset={baselineOffset}
                swapFrame={charCue.swapFrame}
                frame={frame}
              />
            </React.Fragment>
          );
        })}

        {/* Subtle Gold Shimmer Sweep after resolve */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerBar,
            {
              width: 50 * fit,
              height: (side + maxTabHeight) * 1.3,
              bottom: 0
            },
            shimmerStyle
          ]}
        >
          <LinearGradient
            colors={['rgba(212, 175, 55, 0)', 'rgba(245, 230, 168, 0.75)', 'rgba(212, 175, 55, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>

      {/* Skip Prompt */}
      <View style={styles.skipPromptContainer}>
        <Text style={styles.skipPromptText}>Tap to skip</Text>
      </View>
    </TouchableOpacity>
  );
}

// ===========================================================================
// SUB-COMPONENTS
// ===========================================================================

/**
 * Lead Card in the deck:
 * - Scales up 0 to 1 off baseline in frames 0-9 (OUT_EASE).
 * - Performs full 360 rotation along with deck until collapseAt (SPIN_EASE).
 */
function LeadDeckSquare({ side, cornerRadius, ink, collapseAt, frame }) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f >= collapseAt + 2) {
      return { display: 'none' };
    }

    // GROW (frames 0 to 9): scale 0 to 1 off baseline
    let scale = 1;
    if (f <= 9) {
      scale = OUT_EASE(f / 9);
    }

    // 360 degree rotation using SPIN_EASE around bottom-center pivot
    let rotateDeg = 0;
    if (f <= collapseAt) {
      const progress = Math.min(Math.max(f / collapseAt, 0), 1);
      rotateDeg = SPIN_EASE(progress) * 360;
    }

    return {
      transform: [
        { translateY: side / 2 },
        { rotate: `${rotateDeg}deg` },
        { translateY: -side / 2 },
        { scale }
      ]
    };
  });

  return (
    <Animated.View
      style={[
        styles.squareBase,
        {
          width: side,
          height: side,
          borderRadius: cornerRadius,
          backgroundColor: ink,
          zIndex: 20
        },
        animatedStyle
      ]}
    />
  );
}

/**
 * Trailing colored cards in the deck (indices 1 to 5).
 * Each card starts its rotation at 2 * cardIndex frames and finishes by collapseAt.
 */
function TrailingDeckCard({ cardIndex, side, cornerRadius, color, collapseAt, frame }) {
  const startFrame = cardIndex * 2;
  const duration = Math.max(collapseAt - startFrame, 1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f >= collapseAt) {
      return { display: 'none' };
    }

    if (f < startFrame) {
      return {
        opacity: 0,
        transform: [{ translateY: side / 2 }, { rotate: '0deg' }, { translateY: -side / 2 }]
      };
    }

    const progress = Math.min(Math.max((f - startFrame) / duration, 0), 1);
    const rotateDeg = SPIN_EASE(progress) * 360;

    return {
      opacity: 1,
      transform: [
        { translateY: side / 2 },
        { rotate: `${rotateDeg}deg` },
        { translateY: -side / 2 }
      ]
    };
  });

  return (
    <Animated.View
      style={[
        styles.squareBase,
        {
          width: side,
          height: side,
          borderRadius: cornerRadius,
          backgroundColor: color,
          zIndex: 10 - cardIndex
        },
        animatedStyle
      ]}
    />
  );
}

/**
 * Individual Splitting Block for each letter with optional Ascender Tab.
 * Travels outside-in, flashes deck color at cueFrame, and hard-cuts out at swapFrame.
 */
function LetterBlock({
  char,
  side,
  cornerRadius,
  rank,
  splitStart,
  cue,
  deckLeft,
  baselineOffset,
  targetDeltaX,
  ink,
  flashColor,
  tab,
  frame
}) {
  const { cueFrame, flashEndFrame, swapFrame } = cue;
  const blockStartFrame = splitStart + rank; // Outermost leads (rank 0), innermost lags (rank 1)
  const tabStartFrame = splitStart + 2; // Ascender tabs start 2 frames after split starts
  const tabMaxHeight = tab ? tab.heightRatio * side : 0;
  const tabWidth = tab ? tab.widthRatio * side : 0;
  const tabLeft = tab ? tab.leftRatio * side : 0;

  // Has full-width or side-meeting tab: remove top corner radius where tab meets block
  const blockTopLeftRadius = tab && tabLeft === 0 ? 0 : cornerRadius;
  const blockTopRightRadius = tab && tab.widthRatio === 1 ? 0 : cornerRadius;

  // Block movement & flash style
  const blockStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;

    // Remove block once swapped to real letter glyph
    if (f >= swapFrame || f < splitStart) {
      return { display: 'none' };
    }

    // Horizontal travel: 5 frames with OUT_EASE from center to target slot
    let currentX = 0;
    if (f >= blockStartFrame) {
      const travelProgress = Math.min(Math.max((f - blockStartFrame) / 5, 0), 1);
      currentX = targetDeltaX * OUT_EASE(travelProgress);
    }

    // Color: flash one deck color for 3 frames, then return to ink
    let currentColor = ink;
    if (f >= cueFrame && f < flashEndFrame) {
      currentColor = flashColor;
    }

    return {
      backgroundColor: currentColor,
      transform: [{ translateX: currentX }]
    };
  });

  // Tab growth style (animates height only, never width, over 12 frames)
  const tabStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (!tab || f < tabStartFrame || f >= swapFrame) {
      return { height: 0, opacity: 0 };
    }

    const tabProgress = Math.min(Math.max((f - tabStartFrame) / 12, 0), 1);
    const animatedHeight = tabMaxHeight * OUT_EASE(tabProgress);

    // Color mirrors block
    let currentColor = ink;
    if (f >= cueFrame && f < flashEndFrame) {
      currentColor = flashColor;
    }

    return {
      height: animatedHeight,
      backgroundColor: currentColor,
      opacity: 1
    };
  });

  return (
    <Animated.View
      style={[
        styles.blockWrapper,
        {
          left: deckLeft,
          bottom: baselineOffset,
          width: side,
          height: side,
          borderTopLeftRadius: blockTopLeftRadius,
          borderTopRightRadius: blockTopRightRadius,
          borderBottomLeftRadius: cornerRadius,
          borderBottomRightRadius: cornerRadius
        },
        blockStyle
      ]}
    >
      {tab && (
        <Animated.View
          style={[
            styles.tabBase,
            {
              width: tabWidth,
              left: tabLeft,
              borderTopLeftRadius: cornerRadius,
              borderTopRightRadius: cornerRadius,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0
            },
            tabStyle
          ]}
        />
      )}
    </Animated.View>
  );
}

/**
 * Real Resolved Ultra Text Glyph.
 * Appears instantaneously at swapFrame (HARD-CUT: no fade, no morph, no spring).
 */
function ResolvedLetter({
  char,
  fontSize,
  fontFamily,
  ink,
  left,
  width,
  side,
  baselineOffset,
  swapFrame,
  frame
}) {
  const letterStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f < swapFrame) {
      return { display: 'none', opacity: 0 };
    }

    return {
      display: 'flex',
      opacity: 1
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.resolvedLetterWrapper,
        {
          left,
          width,
          height: side,
          bottom: baselineOffset
        },
        letterStyle
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.resolvedGlyph,
          {
            fontSize,
            fontFamily,
            color: ink,
            lineHeight: side * 1.02
          }
        ]}
      >
        {char}
      </Text>
    </Animated.View>
  );
}

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stage: {
    position: 'relative'
  },
  hiddenMeasureContainer: {
    position: 'absolute',
    opacity: 0,
    top: -9999,
    left: -9999
  },
  referenceText: {
    fontWeight: '400'
  },
  deckContainer: {
    position: 'absolute'
  },
  squareBase: {
    position: 'absolute',
    left: 0,
    bottom: 0
  },
  blockWrapper: {
    position: 'absolute'
  },
  tabBase: {
    position: 'absolute',
    bottom: '100%'
  },
  resolvedLetterWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  resolvedGlyph: {
    fontWeight: '400',
    includeFontPadding: false,
    textAlign: 'center'
  },
  shimmerBar: {
    position: 'absolute'
  },
  skipPromptContainer: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  skipPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9E978C',
    letterSpacing: 1
  }
});
