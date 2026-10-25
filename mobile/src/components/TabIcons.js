/**
 * @file TabIcons.js
 * @description Sleek minimalist vector line icons for bottom navigation bar:
 * - MarketTrendIcon: Market trendline inside rounded rectangle (Gold Rates)
 * - LoanPeakIcon: Valuation apex peak curve inside rounded rectangle (Gold Loan)
 * - EMIPieIcon: Segmented financial allocation pie chart (EMI Calculator)
 * Designed to replace emojis with clean luxury fintech iconography matching the app aesthetic.
 */

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Gold Rates / Market Trendline Icon
 * Rounded square with interactive market chart wave
 */
export function MarketTrendIcon({ color = '#7D776C', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M7 13.5 L10 10.5 L13 13.5 L17 9.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Gold Loan / Valuation Apex Peak Icon
 * Rounded square with apex curve and flat baseline
 */
export function LoanPeakIcon({ color = '#7D776C', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M6 15 L8.5 15 L12 9.5 L15.5 15 L18 15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * EMI Calculator / Allocation Pie Chart Icon
 * Minimalist circular pie chart with segmented quadrant slice
 */
export function EMIPieIcon({ color = '#7D776C', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.21 15.89 A 10 10 0 1 1 8 2.83"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 12 A 10 10 0 0 0 12 2 V 12 Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
