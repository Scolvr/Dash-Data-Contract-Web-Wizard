/**
 * Helper Utility Functions
 * Common utility functions used throughout the application
 */

/**
 * Generates a unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Normalizes an unsigned value (removes non-numeric characters)
 * @param {string|number} value - Value to normalize
 * @returns {string} Normalized unsigned value
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

  // Remove leading zeros (except for '0' itself)
  return digits.replace(/^0+(?=\d)/, '');
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clones an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Safely parses JSON with fallback
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn('JSON parse failed:', error);
    return fallback;
  }
}

/**
 * Safely stringifies JSON with fallback
 * @param {*} obj - Object to stringify
 * @param {string} fallback - Fallback value if stringification fails
 * @returns {string} JSON string or fallback
 */
export function safeJsonStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON stringify failed:', error);
    return fallback;
  }
}

/**
 * Escapes HTML special characters
 * @param {string} html - HTML string to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Formats a number with thousands separators
 * @param {number|string} num - Number to format
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted number
 */
export function formatNumber(num, locale = 'en-US') {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) {
    return '0';
  }
  return number.toLocaleString(locale);
}

/**
 * Truncates a string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if BigInt is supported
 * @returns {boolean} True if BigInt is supported
 */
export function hasBigIntSupport() {
  return typeof BigInt !== 'undefined';
}

/**
 * Safe BigInt comparison (with fallback for older browsers)
 * @param {string|number|bigint} a - First value
 * @param {string|number|bigint} b - Second value
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
 */
export function safeBigIntCompare(a, b) {
  if (!hasBigIntSupport()) {
    console.warn('BigInt not supported, using fallback comparison');
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
 * Announces a message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
export function announce(message, priority = 'polite') {
  const announcer = document.getElementById('aria-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

/**
 * Creates an aria announcer element
 * @returns {HTMLElement} Announcer element
 * @private
 */
function createAnnouncer() {
  const announcer = document.createElement('div');
  announcer.id = 'aria-announcer';
  announcer.className = 'sr-only';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(announcer);
  return announcer;
}
