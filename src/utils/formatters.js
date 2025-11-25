/**
 * Formatters Module
 * Extracted from app.js for modular architecture
 * Pure functions for formatting and normalizing values
 */

import { MAX_U32, hasBigIntSupport } from './constants.js';

/**
 * Generates a unique ID with a prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Generated ID
 */
export function generateId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Normalizes an unsigned integer value
 * Strips non-numeric characters and ensures the value is within valid range
 * @param {number|string} value - Value to normalize
 * @returns {string} Normalized string representation
 */
export function normaliseUnsignedValue(value) {
  let digits;
  if (typeof value === 'number' && Number.isFinite(value)) {
    digits = String(Math.max(0, Math.trunc(value)));
  } else if (typeof value === 'string') {
    digits = value.replace(/[^0-9]/g, '');
  } else {
    digits = '';
  }

  if (!digits) {
    return '';
  }

  const numericValue = Number(digits);
  if (!Number.isFinite(numericValue)) {
    return digits;
  }

  if (numericValue > MAX_U32) {
    return String(MAX_U32);
  }

  if (numericValue < 0) {
    return '0';
  }

  return String(numericValue);
}

/**
 * Safe BigInt comparison utility
 * Falls back to float comparison for browsers without BigInt support
 * @param {string|number} a - First value
 * @param {string|number} b - Second value
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
 */
export function safeBigIntCompare(a, b) {
  if (!hasBigIntSupport) {
    // Fallback for older browsers - use string comparison (less accurate but works)
    console.warn('BigInt not supported, using fallback comparison');
    // Pad strings and compare (simple fallback, not perfect for all cases)
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
    }
    return 0;
  }
  try {
    const aBig = BigInt(a);
    const bBig = BigInt(b);
    return aBig < bBig ? -1 : aBig > bBig ? 1 : 0;
  } catch (error) {
    console.error('BigInt comparison failed:', error);
    throw error;
  }
}

/**
 * Normalizes wallet balance to a numeric value
 * Handles various balance object formats from Dash SDK
 * @param {bigint|number|object} rawBalance - Raw balance value
 * @returns {number|null} Normalized balance or null
 */
export function normalizeWalletBalance(rawBalance) {
  if (typeof rawBalance === 'bigint') {
    return Number(rawBalance);
  }
  if (typeof rawBalance === 'number') {
    return Number.isFinite(rawBalance) ? rawBalance : null;
  }
  if (rawBalance && typeof rawBalance === 'object') {
    if (typeof rawBalance.availableBalance === 'number') {
      return rawBalance.availableBalance;
    }
    if (typeof rawBalance.totalBalance === 'number') {
      return rawBalance.totalBalance;
    }
    if (typeof rawBalance.balance === 'number') {
      return rawBalance.balance;
    }
  }
  return null;
}

/**
 * Formats wallet balance for display
 * @param {number|null} rawBalance - Balance in duffs (satoshis)
 * @returns {string} Formatted balance string
 */
export function formatWalletBalance(rawBalance) {
  if (rawBalance === null || typeof rawBalance === 'undefined') {
    return '—';
  }
  const numeric = typeof rawBalance === 'number' ? rawBalance : Number(rawBalance);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  if (numeric === 0) {
    return '0 DASH';
  }
  const dashValue = numeric / 1e8;
  return `${dashValue.toFixed(6)} DASH`;
}

/**
 * Formats a number with thousand separators
 * @param {number|string} value - Value to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return num.toLocaleString('en-US');
}

/**
 * Clamps a value within a range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamps furthest index within valid step sequence range
 * @param {number} value - Index to clamp
 * @returns {number} Clamped index (-1 to STEP_SEQUENCE.length - 1)
 */
export function clampFurthestIndex(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return -1;
  }
  // Note: This will need STEP_SEQUENCE.length imported when used
  // For now, we'll keep it simple
  return Math.min(Math.max(Math.trunc(value), -1), 6); // 6 = STEP_SEQUENCE.length - 1
}

/**
 * Normalizes a permission member object
 * @param {object} member - Permission member to normalize
 * @returns {object} Normalized member
 */
export function normalisePermissionMember(member = {}) {
  return {
    type: typeof member.type === 'string' ? member.type : 'none',
    identity: typeof member.identity === 'string' ? member.identity : ''
  };
}

/**
 * Normalizes a permission group object
 * @param {object} group - Permission group to normalize
 * @returns {object} Normalized group
 */
export function normalisePermissionGroup(group = {}) {
  return {
    members: Array.isArray(group.members) ? group.members.map(normalisePermissionMember) : []
  };
}

/**
 * Normalizes permission groups array
 * @param {Array} rawGroups - Raw groups array
 * @returns {Array} Normalized groups array
 */
export function normalisePermissionsGroups(rawGroups) {
  if (!Array.isArray(rawGroups)) {
    return [];
  }
  return rawGroups.map(normalisePermissionGroup);
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (typeof text !== 'string' || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalizeFirst(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a timestamp to a readable date string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return '—';
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
