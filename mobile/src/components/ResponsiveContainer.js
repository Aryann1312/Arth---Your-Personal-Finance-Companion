/**
 * @file ResponsiveContainer.js
 * @description Responsive layout container providing two-column split on tablets and landscape,
 * and single-column stack on phones. Meets acceptance-critical responsive requirements.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout, SPACING } from '../theme/index.js';

export function ResponsiveContainer({
  children,
  headerContent,
  leftContent,
  rightContent,
  bottomContent,
  scrollable = true,
  style,
  contentContainerStyle
}) {
  const { isTablet, horizontalPadding } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const bottomScrollPadding = Math.max(insets.bottom, 16) + 80;

  // If explicit leftContent and rightContent provided, use two-column structure
  if (leftContent && rightContent) {
    if (!scrollable) {
      if (isTablet) {
        return (
          <View style={[styles.container, { paddingHorizontal: horizontalPadding }, style]}>
            {headerContent}
            <View style={styles.twoColumnRow}>
              <View style={styles.columnLeft}>{leftContent}</View>
              <View style={styles.columnRight}>{rightContent}</View>
            </View>
            {bottomContent && (
              <View style={styles.bottomWrapper}>
                {bottomContent}
              </View>
            )}
          </View>
        );
      }

      // Phone single column non-scrollable
      return (
        <View style={[styles.container, { paddingHorizontal: horizontalPadding }, style]}>
          {headerContent}
          <View style={styles.singleColumn}>
            {leftContent}
            {rightContent}
            {bottomContent}
          </View>
        </View>
      );
    }

    if (isTablet) {
      return (
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[
            styles.tabletScrollContent,
            { paddingHorizontal: horizontalPadding, paddingBottom: bottomScrollPadding },
            contentContainerStyle
          ]}
          showsVerticalScrollIndicator={false}
        >
          {headerContent}
          <View style={styles.twoColumnRow}>
            <View style={styles.columnLeft}>{leftContent}</View>
            <View style={styles.columnRight}>{rightContent}</View>
          </View>
          {bottomContent && (
            <View style={styles.bottomWrapper}>
              {bottomContent}
            </View>
          )}
        </ScrollView>
      );
    }

    // Phone single column
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={[
          styles.phoneScrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: bottomScrollPadding },
          contentContainerStyle
        ]}
        showsVerticalScrollIndicator={false}
      >
        {headerContent}
        <View style={styles.singleColumn}>
          {leftContent}
          {rightContent}
          {bottomContent}
        </View>
      </ScrollView>
    );
  }

  // Standard generic children wrapper
  if (scrollable) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={[
          isTablet ? styles.tabletScrollContent : styles.phoneScrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: bottomScrollPadding },
          contentContainerStyle
        ]}
        showsVerticalScrollIndicator={false}
      >
        {headerContent}
        {children}
        {bottomContent}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }, style]}>
      {headerContent}
      {children}
      {bottomContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tabletScrollContent: {
    paddingVertical: SPACING.xl,
    alignItems: 'center'
  },
  phoneScrollContent: {
    paddingVertical: SPACING.md
  },
  twoColumnRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1100,
    gap: SPACING.xl,
    alignItems: 'flex-start',
    alignSelf: 'center'
  },
  bottomWrapper: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center'
  },
  columnLeft: {
    flex: 1
  },
  columnRight: {
    flex: 1.15
  },
  singleColumn: {
    width: '100%'
  }
});
