/**
 * @file ResponsiveContainer.js
 * @description Responsive layout container providing two-column split on tablets and landscape,
 * and single-column stack on phones. Meets acceptance-critical responsive requirements.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useResponsiveLayout, SPACING } from '../theme/index.js';

export function ResponsiveContainer({
  children,
  leftContent,
  rightContent,
  scrollable = true,
  style,
  contentContainerStyle
}) {
  const { isTablet, horizontalPadding } = useResponsiveLayout();

  // If explicit leftContent and rightContent provided, use two-column structure
  if (leftContent && rightContent) {
    if (isTablet) {
      return (
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[
            styles.tabletScrollContent,
            { paddingHorizontal: horizontalPadding },
            contentContainerStyle
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.twoColumnRow}>
            <View style={styles.columnLeft}>{leftContent}</View>
            <View style={styles.columnRight}>{rightContent}</View>
          </View>
        </ScrollView>
      );
    }

    // Phone single column
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={[
          styles.phoneScrollContent,
          { paddingHorizontal: horizontalPadding },
          contentContainerStyle
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.singleColumn}>
          {leftContent}
          {rightContent}
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
          styles.phoneScrollContent,
          { paddingHorizontal: horizontalPadding },
          contentContainerStyle
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }, style]}>
      {children}
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
    alignItems: 'flex-start'
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
