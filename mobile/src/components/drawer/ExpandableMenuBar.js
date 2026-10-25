/**
 * @file ExpandableMenuBar.js
 * @description Inline expandable navigation bar component:
 * - Collapsed: small 44x44 rounded-square button with 3-line icon (Picture 1)
 * - Expanded: single horizontal rounded bar with [X | Features How it Works FAQ Team] (Picture 2)
 * - Tapping X collapses back to the 3-line button
 * - Tapping any link navigates to the respective page/section
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  UIManager,
  LayoutAnimation
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { HamburgerButton } from './HamburgerButton.js';
import { COLORS, RADII } from '../../theme/index.js';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MENU_ITEMS = [
  { id: 'features', label: 'Features', title: 'Features & Architecture' },
  { id: 'howItWorks', label: 'How it Works', title: 'How It Works' },
  { id: 'faq', label: 'FAQ', title: 'Frequently Asked Questions' },
  { id: 'team', label: 'Team', title: 'Meet the Creator' }
];

export function ExpandableMenuBar({ navigation, style }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    Animated.timing(animValue, {
      toValue: nextState ? 1 : 0,
      duration: 260,
      useNativeDriver: true
    }).start();
  };

  const handleNavigate = (item) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }

    // Collapse bar back to 3-line button
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();

    // Navigate to respective page/section
    if (navigation) {
      navigation.navigate('AppInfo', {
        initialSection: item.id,
        title: item.title
      });
    }
  };

  // Fade in animation for menu items
  const contentOpacity = animValue.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.4, 1]
  });

  return (
    <View style={[styles.outerWrapper, style]}>
      <View
        style={[
          styles.container,
          isExpanded ? styles.containerExpanded : styles.containerCollapsed
        ]}
      >
        {/* Toggle Button: 3 lines <-> X */}
        <HamburgerButton
          isOpen={isExpanded}
          animValue={animValue}
          onPress={toggle}
          borderless={true}
          size={38}
          style={styles.iconButton}
        />

        {/* Expanded Navigation Links */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.expandedContentRow,
              { opacity: contentOpacity }
            ]}
          >
            {/* Vertical Divider */}
            <View style={styles.verticalDivider} />

            {/* Clickable Links Row */}
            <View style={styles.linksRow}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleNavigate(item)}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={`Navigate to ${item.label}`}
                  style={styles.linkTouch}
                >
                  <Text allowFontScaling={false} style={styles.linkText}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    paddingVertical: 6,
    alignItems: 'flex-start'
  },
  container: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.75,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 3
      },
      android: {
        elevation: 1.5
      },
      default: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 3
      }
    })
  },
  containerCollapsed: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  containerExpanded: {
    width: '100%',
    paddingLeft: 4,
    paddingRight: 8
  },
  iconButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0
  },
  expandedContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%'
  },
  verticalDivider: {
    width: 0.75,
    height: 22,
    backgroundColor: '#D1D5DB',
    marginRight: 6
  },
  linksRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 2
  },
  linkTouch: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  linkText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: 0.1
  }
});
