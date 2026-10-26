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
 * Formats numbers into standard Indian numbering system (e.g. ₹5,88,161.25)
 * Built on Intl en-IN, ₹ symbol with no space and Indian digit grouping everywhere.
 * @param {number|string} value
 * @param {boolean|{includeSymbol?: boolean, decimals?: number}} [options=true]
 * @returns {string}
 */
export function formatINR(value, options = {}) {
  let includeSymbol = true;
  let decimals = 2;

  if (typeof options === 'boolean') {
    includeSymbol = options;
    if (!options && Number.isInteger(Number(value))) {
      decimals = 0;
    }
  } else if (typeof options === 'object' && options !== null) {
    if (options.includeSymbol !== undefined) includeSymbol = options.includeSymbol;
    if (options.decimals !== undefined) {
      decimals = options.decimals;
    }
  }

  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    const zeroFormatted = Number(0).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return includeSymbol ? `₹${zeroFormatted}` : zeroFormatted;
  }

  const num = Number(value);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (includeSymbol) {
    return isNegative ? `-₹${formatted}` : `₹${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats large amounts into compact Indian financial chips (e.g. ₹2L, ₹5L, ₹10L, ₹1Cr)
 * @param {number|string} value
 * @returns {string}
 */
export function formatCompactINR(value) {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '₹0';
  }
  const val = Number(value);
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  let formatted = '';
  if (absVal >= 10000000) {
    const cr = absVal / 10000000;
    formatted = `${cr % 1 === 0 ? cr : cr.toFixed(2)}Cr`;
  } else if (absVal >= 100000) {
    const l = absVal / 100000;
    formatted = `${l % 1 === 0 ? l : l.toFixed(2)}L`;
  } else if (absVal >= 1000) {
    const k = absVal / 1000;
    formatted = `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  } else {
    formatted = absVal.toLocaleString('en-IN');
  }

  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}
