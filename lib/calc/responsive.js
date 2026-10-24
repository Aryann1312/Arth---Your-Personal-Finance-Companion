/**
 * @file responsive.js
 * @description Pure responsive layout calculation helpers and currency formatters.
 * Zero native framework dependencies to allow seamless unit testing across all environments.
 */

export const BREAKPOINTS = {
  compact: 360,
  phone: 600,
  tablet: 768,
  desktop: 1024
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40
};

/**
 * Calculates responsive device classifications, columns, and layout metrics from dimensions.
 * @param {number} width - Current screen width in DIPs/pixels
 * @param {number} height - Current screen height in DIPs/pixels
 * @returns {object} Responsive layout metrics
 */
export function getResponsiveLayout(width, height) {
  const isLandscape = width > height;
  const isCompact = width < BREAKPOINTS.compact;
  const isTablet = width >= BREAKPOINTS.phone || (isLandscape && width >= 650);

  return {
    width,
    height,
    isLandscape,
    isCompact,
    isTablet,
    numColumns: isTablet ? 2 : 1,
    contentMaxWidth: isTablet ? 1100 : 540,
    horizontalPadding: isTablet ? SPACING.xxxl : (isCompact ? SPACING.md : SPACING.lg)
  };
}

/**
 * Formats numbers into standard Indian numbering system (e.g. ₹ 5,00,000)
 * @param {number} value
 * @param {boolean} [includeSymbol=true]
 * @returns {string}
 */
export function formatINR(value, includeSymbol = true) {
  const val = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(val);
  return includeSymbol ? `₹ ${formatted}` : formatted;
}
