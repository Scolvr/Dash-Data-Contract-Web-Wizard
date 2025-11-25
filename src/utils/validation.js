/**
 * Validation Module
 * Extracted from app.js for modular architecture
 * Pure validation functions with no side effects
 */

import { LANGUAGE_CODE_PATTERN } from './constants.js';

/**
 * Token name validation pattern
 * Allows letters, numbers, spaces, hyphen, underscore, and emoji
 */
const tokenNamePattern = /^[\p{L}\p{N}\p{Emoji}\s_-]+$/u;

/**
 * Base58 pattern for Dash identity IDs
 */
const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

/**
 * Validates a token name
 * @param {string} rawValue - Token name to validate
 * @returns {object} Validation result with { valid, message, normalized }
 */
export function validateTokenName(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed !== rawValue) {
    return { valid: false, message: 'Remove leading or trailing spaces.', normalized: trimmed };
  }
  if (trimmed.length === 0 || trimmed.length < 2 || trimmed.length > 64) {
    return { valid: false, message: 'Please enter a token name (2–64 characters).', normalized: trimmed };
  }
  if (!tokenNamePattern.test(trimmed)) {
    return { valid: false, message: 'Use letters, numbers, spaces, hyphen, underscore, or emoji only.', normalized: trimmed };
  }
  return { valid: true, message: '', normalized: trimmed };
}

/**
 * Validates a token symbol
 * @param {string} rawValue - Token symbol to validate
 * @returns {object} Validation result with { valid, message, normalized }
 */
export function validateTokenSymbol(rawValue) {
  const trimmed = rawValue.trim().toUpperCase();
  if (trimmed !== rawValue.toUpperCase()) {
    return { valid: false, message: 'Remove leading or trailing spaces.', normalized: trimmed };
  }
  if (trimmed.length === 0 || trimmed.length < 2 || trimmed.length > 8) {
    return { valid: false, message: 'Please enter a symbol (2–8 characters).', normalized: trimmed };
  }
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { valid: false, message: 'Use uppercase letters and numbers only.', normalized: trimmed };
  }
  return { valid: true, message: '', normalized: trimmed };
}

/**
 * Validates a Base58 identity ID (Dash Platform)
 * @param {string} rawValue - Identity ID to validate
 * @returns {object} Validation result with { valid, message }
 */
export function validateBase58Identity(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed !== rawValue) {
    return { valid: false, message: 'Remove leading or trailing spaces.' };
  }
  if (trimmed.length === 0) {
    return { valid: false, message: 'Owner identity ID is required.' };
  }
  if (trimmed.length < 43 || trimmed.length > 44) {
    return { valid: false, message: 'Identity ID must be 43-44 characters.' };
  }
  if (!base58Pattern.test(trimmed)) {
    return { valid: false, message: 'Invalid Base58 format. Use only Base58 characters.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates a language code (2-letter ISO code)
 * @param {string} code - Language code to validate
 * @returns {boolean} True if valid
 */
export function validateLanguageCode(code) {
  return typeof code === 'string' && LANGUAGE_CODE_PATTERN.test(code);
}

/**
 * Validates a localization entry
 * @param {object} entry - Localization entry with code, singularForm, pluralForm, shouldCapitalize
 * @returns {object} Validation result with { valid, errors }
 */
export function validateLocalizationEntry(entry) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Invalid entry format'] };
  }

  if (!validateLanguageCode(entry.code)) {
    errors.push('Invalid language code (must be 2 lowercase letters)');
  }

  if (typeof entry.singularForm !== 'string' || entry.singularForm.trim().length === 0) {
    errors.push('Singular form is required');
  } else if (entry.singularForm.length > 100) {
    errors.push('Singular form too long (max 100 characters)');
  }

  if (typeof entry.pluralForm !== 'string' || entry.pluralForm.trim().length === 0) {
    errors.push('Plural form is required');
  } else if (entry.pluralForm.length > 100) {
    errors.push('Plural form too long (max 100 characters)');
  }

  if (typeof entry.shouldCapitalize !== 'boolean') {
    errors.push('Capitalization flag must be true or false');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validates a URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function validateURL(url) {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a positive integer
 * @param {string|number} value - Value to validate
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum value (inclusive)
 * @param {number} options.max - Maximum value (inclusive)
 * @returns {object} Validation result with { valid, message, normalized }
 */
export function validatePositiveInteger(value, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;

  const str = String(value).trim();
  if (str === '') {
    return { valid: false, message: 'Value is required.', normalized: '' };
  }

  if (!/^\d+$/.test(str)) {
    return { valid: false, message: 'Must be a positive integer.', normalized: str };
  }

  const num = parseInt(str, 10);
  if (!Number.isFinite(num)) {
    return { valid: false, message: 'Invalid number.', normalized: str };
  }

  if (num < min) {
    return { valid: false, message: `Must be at least ${min}.`, normalized: String(num) };
  }

  if (num > max) {
    return { valid: false, message: `Must be at most ${max}.`, normalized: String(num) };
  }

  return { valid: true, message: '', normalized: String(num) };
}

/**
 * Validates decimals value (0-18)
 * @param {string|number} value - Decimals value
 * @returns {object} Validation result
 */
export function validateDecimals(value) {
  return validatePositiveInteger(value, { min: 0, max: 18 });
}

/**
 * Validates a supply value
 * @param {string} value - Supply value
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export function validateSupply(value, options = {}) {
  const { min = '0', max = String(Number.MAX_SAFE_INTEGER), label = 'Supply' } = options;

  const str = String(value).trim();
  if (str === '') {
    return { valid: false, message: `${label} is required.`, normalized: '' };
  }

  if (!/^\d+$/.test(str)) {
    return { valid: false, message: `${label} must be a positive integer.`, normalized: str };
  }

  // Use BigInt comparison if available
  try {
    const valueBig = BigInt(str);
    const minBig = BigInt(min);
    const maxBig = BigInt(max);

    if (valueBig < minBig) {
      return { valid: false, message: `${label} must be at least ${min}.`, normalized: str };
    }

    if (valueBig > maxBig) {
      return { valid: false, message: `${label} must be at most ${max}.`, normalized: str };
    }

    return { valid: true, message: '', normalized: str };
  } catch (error) {
    // Fallback for browsers without BigInt
    const num = parseFloat(str);
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);

    if (num < minNum) {
      return { valid: false, message: `${label} must be at least ${min}.`, normalized: str };
    }

    if (num > maxNum) {
      return { valid: false, message: `${label} must be at most ${max}.`, normalized: str };
    }

    return { valid: true, message: '', normalized: str };
  }
}

/**
 * Validates required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateRequired(value, fieldName = 'Field') {
  if (value === null || value === undefined) {
    return { valid: false, message: `${fieldName} is required.` };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, message: `${fieldName} is required.` };
  }

  return { valid: true, message: '' };
}

/**
 * Validates mnemonic phrase (12 or 24 words)
 * @param {string} mnemonic - Mnemonic phrase
 * @returns {object} Validation result
 */
export function validateMnemonic(mnemonic) {
  if (typeof mnemonic !== 'string') {
    return { valid: false, message: 'Mnemonic must be a string.' };
  }

  const words = mnemonic.trim().split(/\s+/);

  if (words.length !== 12 && words.length !== 24) {
    return { valid: false, message: 'Mnemonic must be 12 or 24 words.' };
  }

  // Check that all words are non-empty and contain only letters
  const allWordsValid = words.every(word => /^[a-z]+$/i.test(word));
  if (!allWordsValid) {
    return { valid: false, message: 'All words must contain only letters.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates a percentage value (0-100)
 * @param {string|number} value - Percentage value
 * @returns {object} Validation result
 */
export function validatePercentage(value) {
  const result = validatePositiveInteger(value, { min: 0, max: 100 });
  if (!result.valid) {
    return { ...result, message: result.message.replace('positive integer', 'percentage (0-100)') };
  }
  return result;
}
