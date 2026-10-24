/**
 * @file ArthWordmarkIntro.js
 * @description Master "Arth" Opening Animation Component (React Native / Expo Go).
 *
 * Architecture:
 * - Driven from ONE Reanimated shared value `frame` running linearly from 0 to totalFrames at 30 fps.
 * - Every block, deck card, tab, and letter is computed in worklets (useAnimatedStyle).
 * - Mounts/renders strictly visible elements per frame; letters are hard-cut to Ultra font glyphs.
 * - Zero web-only code; 100% UI thread execution at 60 fps.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
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

// Default reference advance widths for "Arth" at reference fontSize = 160 in Ultra font
const DEFAULT_ADVANCE_WIDTHS = {
  A: 150,
  r: 82,
  t: 76,
  h: 102
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [measuredWidths, setMeasuredWidths] = useState({});

  // Frame Driver Shared Value (0 to totalFrames)
  const frame = useSharedValue(0);

  // Compute choreography timelines
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
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (enabled) {
        setReduceMotion(true);
      }
    });
  }, []);

  // Compute character widths (measured or tuned defaults)
  const characters = useMemo(() => text.split(''), [text]);
  const letterAdvanceWidths = useMemo(() => {
    return characters.map(char => measuredWidths[char] || DEFAULT_ADVANCE_WIDTHS[char] || fontSize * 0.55);
  }, [characters, measuredWidths, fontSize]);

  const rawLetterRowWidth = useMemo(() => {
    return letterAdvanceWidths.reduce((sum, w) => sum + w, 0);
  }, [letterAdvanceWidths]);

  const rawSide = fontSize * xHeightRatio;
  const rawBlockGap = rawSide * blockGapRatio;
  const rawBlockRowWidth = characters.length * rawSide + (characters.length - 1) * rawBlockGap;

  // Responsive Fit Factor
  // min(1, windowWidth * 0.92 / max(letterRowWidth, blockRowWidth))
  const fit = useMemo(() => {
    const maxWidth = Math.max(rawLetterRowWidth, rawBlockRowWidth);
    const availableWidth = windowWidth * 0.92;
    return maxWidth > 0 ? Math.min(1, availableWidth / maxWidth) : 1;
  }, [windowWidth, rawLetterRowWidth, rawBlockRowWidth]);

  // Scaled dimensions
  const scaledFontSize = fontSize * fit;
  const side = rawSide * fit;
  const cornerRadius = rawSide * cornerRadiusRatio * fit;
  const blockGap = rawBlockGap * fit;
  const maxLift = side * liftRatio;

  // Horizontal layout slots:
  // Center the wordmark around x = 0
  const letterRowWidth = rawLetterRowWidth * fit;
  const letterPositions = useMemo(() => {
    let currentX = -letterRowWidth / 2;
    return letterAdvanceWidths.map(rawW => {
      const w = rawW * fit;
      const left = currentX;
      const center = currentX + w / 2;
      currentX += w;
      return { left, center, width: w };
    });
  }, [letterAdvanceWidths, fit, letterRowWidth]);

  // Compute block target positions:
  // Each block aligns with its letter center for pixel-stable resolve
  const blockTargetPositions = useMemo(() => {
    return letterPositions.map(pos => pos.center);
  }, [letterPositions]);

  // Max tab height for vertical ink box centering
  const maxTabHeight = useMemo(() => {
    let maxRatio = 0;
    characters.forEach(char => {
      const cfg = tabConfig[char];
      if (cfg && cfg.heightRatio > maxRatio) {
        maxRatio = cfg.heightRatio;
      }
    });
    return maxRatio * side;
  }, [characters, tabConfig, side]);

  // Vertical center offset to align ink box (side + maxTabHeight)
  const verticalCenterOffset = maxTabHeight / 2;

  // Animation playback controller
  const handleComplete = useCallback(() => {
    if (onFinish) {
      onFinish();
    }
  }, [onFinish]);

  useEffect(() => {
    if (reduceMotion) {
      // Show finished wordmark statically for 800ms
      frame.value = totalFrames;
      const timer = setTimeout(() => {
        handleComplete();
      }, 800);
      return () => clearTimeout(timer);
    }

    // Drive Reanimated shared value linearly
    frame.value = 0;
    const duration = ((totalFrames / 30) * 1000) / speed;

    frame.value = withTiming(
      totalFrames,
      {
        duration,
        easing: Easing.linear
      },
      finished => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      }
    );
  }, [reduceMotion, totalFrames, speed, handleComplete]);

  // Skip handler
  const handleSkipPress = () => {
    frame.value = totalFrames;
    if (onSkip) {
      onSkip();
    } else if (onFinish) {
      onFinish();
    }
  };

  // Measure hidden letter widths
  const handleMeasureLetter = (char, measuredW) => {
    if (measuredW && (!measuredWidths[char] || Math.abs(measuredWidths[char] - measuredW) > 1)) {
      setMeasuredWidths(prev => ({
        ...prev,
        [char]: measuredW
      }));
    }
  };

  // =========================================================================
  // ANIMATED STYLES (Worklets)
  // =========================================================================

  // 1. Deck Container (Frame 0 to 38)
  const deckContainerStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f > collapseAt + 2) {
      return { display: 'none' };
    }

    // Deck Lift & Fall:
    // Rises from frame 2 to frame 29 with spring ease out
    // Falls from frame 29 to frame 38 (9 frames) with IN_EASE
    let currentLift = 0;
    if (f >= 2 && f <= 29) {
      const progress = (f - 2) / 27;
      currentLift = maxLift * OUT_EASE(progress);
    } else if (f > 29 && f <= collapseAt) {
      const fallProgress = (f - 29) / 9;
      currentLift = maxLift * (1 - IN_EASE(fallProgress));
    }

    // DIP (frames 38 to 41): One-frame anticipation squash
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

  // Shimmer Sweep Style (frames 112 to 132)
  const shimmerStyle = useAnimatedStyle(() => {
    'worklet';
    const f = frame.value;
    if (f < 112 || f > 136 || reduceMotion) {
      return { opacity: 0 };
    }
    const p = (f - 112) / 24;
    const translateX = -letterRowWidth / 2 + p * (letterRowWidth + 120);
    return {
      opacity: 0.45 * Math.sin(p * Math.PI),
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
            style={[styles.referenceText, { fontSize, fontFamily }]}
            onLayout={e => handleMeasureLetter(char, e.nativeEvent.layout.width)}
          >
            {char}
          </Text>
        ))}
      </View>

      {/* Main Centered Stage */}
      <View
        style={[
          styles.stage,
          {
            transform: [{ translateY: verticalCenterOffset }]
          }
        ]}
      >
        {/* ===================================================================
            PHASE 1 & 2: LEAD SQUARE & DECK CARDS (Frames 0 - 38)
            =================================================================== */}
        <Animated.View style={[styles.deckContainer, deckContainerStyle]}>
          {/* 5 Colored Deck Cards behind lead square */}
          {Array.from({ length: 5 }).map((_, cardIndex) => {
            const trailingIndex = cardIndex + 1; // 1 to 5
            const cardColor = deckColors[cardIndex % deckColors.length];
            return (
              <TrailingDeckCard
                key={`deck_card_${cardIndex}`}
                cardIndex={trailingIndex}
                totalCards={totalCards}
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
          const charCue = cues.find(c => c.letterIdx === index) || {
            cueFrame: 94,
            flashEndFrame: 97,
            swapFrame: 99
          };
          const charRank = splitRanks[index] || 0;
          const targetX = blockTargetPositions[index] || 0;
          const letterPos = letterPositions[index] || { left: 0, width: side };
          const tab = tabConfig[char];
          const flashColor = deckColors[charCue.step % deckColors.length];

          return (
            <React.Fragment key={`letter_unit_${char}_${index}`}>
              {/* Animated Block (Visible from splitStart to swapFrame) */}
              <LetterBlock
                index={index}
                char={char}
                side={side}
                cornerRadius={cornerRadius}
                rank={charRank}
                splitStart={splitStart}
                cue={charCue}
                targetX={targetX}
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
                baselineOffsetRatio={baselineOffsetRatio}
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
              height: (side + maxTabHeight) * 1.2
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

      {/* Skip Prompt Ticker */}
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
 * Lead Card in the deck (scales up from 0 to 1 off baseline in frames 0-9,
 * performs full 360 rotation along with deck until collapse).
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

    // 360 degree rotation using SPIN_EASE
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
  targetX,
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

    // Horizontal travel: 5 frames with OUT_EASE
    let currentX = 0;
    if (f >= blockStartFrame) {
      const travelProgress = Math.min(Math.max((f - blockStartFrame) / 5, 0), 1);
      currentX = targetX * OUT_EASE(travelProgress);
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
          width: side,
          height: side,
          marginLeft: -side / 2, // Centered at local origin
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
  baselineOffsetRatio,
  swapFrame,
  frame
}) {
  // Baseline adjustment so text sits precisely at baseline
  const baselineOffset = side * baselineOffsetRatio;

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
          bottom: -baselineOffset
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
            color: ink
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  squareBase: {
    position: 'absolute'
  },
  blockWrapper: {
    position: 'absolute',
    bottom: 0
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
    position: 'absolute',
    top: -30
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
