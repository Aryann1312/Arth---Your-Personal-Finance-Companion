/**
 * @file SideDrawer.js
 * @description Luxury right-side slide-in navigation drawer with semi-transparent
 * backdrop, pan swipe-to-close gesture, safe-area compliance, staggered menu items,
 * and Aryan Desale team profile.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { AppLogo } from '../AppLogo.js';
import { HamburgerButton } from './HamburgerButton.js';
import { DrawerItem } from './DrawerItem.js';
import { TeamCard } from './TeamCard.js';
import { DRAWER_MENU_ITEMS } from './drawerConfig.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.8), 320);

// Safe local Yeseva One font
let localYesevaFont = null;
try {
  localYesevaFont = require('../../../assets/fonts/YesevaOne_400Regular.ttf');
} catch (e) {
  // fallback if asset not resolved
}

export function SideDrawer({
  isOpen = false,
  animValue,
  onClose,
  navigation
}) {
  const insets = useSafeAreaInsets();
  const [fontLoaded, setFontLoaded] = React.useState(() => {
    try {
      return Font.isLoaded('YesevaOne_400Regular');
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    if (!fontLoaded && localYesevaFont) {
      Font.loadAsync({ YesevaOne_400Regular: localYesevaFont })
        .then(() => setFontLoaded(true))
        .catch(() => {});
    }
  }, [fontLoaded]);

  // Swipe right on panel to close
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 50 || gestureState.vx > 0.4) {
            if (onClose) onClose();
          }
        }
      }),
    [onClose]
  );

  // Animations driven by shared animValue (0 -> 1)
  const panelTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_WIDTH + 20, 0]
  });

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.52]
  });

  // Staggered interpolations for menu items (approx 50ms intervals)
  const item0Anim = animValue.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.4, 1]
  });
  const item1Anim = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1]
  });
  const item2Anim = animValue.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0, 0.2, 1]
  });
  const teamAnim = animValue.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [0, 0.1, 1]
  });

  const staggerAnims = [item0Anim, item1Anim, item2Anim];

  const handleItemPress = (item) => {
    if (onClose) {
      // Close drawer with smooth animation, then navigate
      onClose(() => {
        if (navigation && item.target) {
          navigation.navigate(item.target, {
            initialSection: item.section,
            title: item.label
          });
        }
      });
    } else if (navigation && item.target) {
      navigation.navigate(item.target, {
        initialSection: item.section,
        title: item.label
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <View style={styles.absoluteOverlay} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Semi-transparent dark backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => onClose && onClose()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss navigation panel"
        />
      </Animated.View>

      {/* Floating Close Button at top-left, elevated above backdrop */}
      <Animated.View
        style={[
          styles.floatingCloseBtnWrapper,
          {
            top: insets.top + (Platform.OS === 'ios' ? 10 : 12),
            opacity: animValue
          }
        ]}
      >
        <HamburgerButton
          isOpen={true}
          animValue={animValue}
          onPress={() => onClose && onClose()}
        />
      </Animated.View>

      {/* Slide-in Panel from Right */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            paddingTop: insets.top + SPACING.md,
            paddingBottom: insets.bottom + SPACING.lg,
            transform: [{ translateX: panelTranslateX }]
          }
        ]}
      >
        {/* Panel Header */}
        <View style={styles.panelHeader}>
          <View style={styles.brandRow}>
            <AppLogo size={24} variant="gold" />
            <Text
              allowFontScaling={false}
              style={[
                styles.brandTitle,
                {
                  fontFamily: fontLoaded
                    ? 'YesevaOne_400Regular'
                    : Platform.OS === 'ios' ? 'Georgia' : 'serif'
                }
              ]}
            >
              Arth
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onClose && onClose()}
            style={styles.headerCloseTouch}
            accessibilityRole="button"
            accessibilityLabel="Close panel"
          >
            <Text style={styles.closeSymbol}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Subtle Gold Divider */}
        <View style={styles.goldDivider} />

        {/* Menu Items List & Team Card */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.itemsList}>
            {DRAWER_MENU_ITEMS.map((item, idx) => (
              <DrawerItem
                key={item.id}
                item={item}
                staggerAnim={staggerAnims[idx]}
                onPress={handleItemPress}
              />
            ))}
          </View>

          {/* Aryan Desale Team Card */}
          <TeamCard staggerAnim={teamAnim} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 20
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A'
  },
  floatingCloseBtnWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 100000,
    elevation: 22
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADII.xl,
    borderBottomLeftRadius: RADII.xl,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(212, 175, 55, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 14
      },
      android: {
        elevation: 24
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 14
      }
    })
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3
  },
  headerCloseTouch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeSymbol: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700'
  },
  goldDivider: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    width: '100%'
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl
  },
  itemsList: {
    width: '100%'
  }
});
