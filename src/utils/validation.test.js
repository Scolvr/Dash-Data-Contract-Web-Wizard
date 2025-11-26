/**
 * Unit Tests for Validation Module
 * Comprehensive tests for all validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateTokenName,
  validateTokenSymbol,
  validateBase58Identity,
  validateLanguageCode,
  validateLocalizationEntry,
  validateEmail,
  validateURL,
  validatePositiveInteger,
  validateDecimals,
  validateSupply,
  validateRequired,
  validateMnemonic,
  validatePercentage
} from './validation.js';

describe('validateTokenName', () => {
  it('should accept valid token names', () => {
    expect(validateTokenName('MyToken').valid).toBe(true);
    expect(validateTokenName('Ab').valid).toBe(true);
    expect(validateTokenName('Token 123').valid).toBe(true);
    expect(validateTokenName('My-Token_Name').valid).toBe(true);
  });

  it('should reject names that are too short', () => {
    const result = validateTokenName('A');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2–64 characters');
  });

  it('should reject names that are too long', () => {
    const longName = 'A'.repeat(65);
    const result = validateTokenName(longName);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2–64 characters');
  });

  it('should reject names with leading or trailing spaces', () => {
    const result = validateTokenName(' MyToken');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('leading or trailing spaces');
    expect(result.normalized).toBe('MyToken');
  });

  it('should reject names with invalid characters', () => {
    const result = validateTokenName('Token@Name');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('letters, numbers, spaces');
  });

  it('should reject empty names', () => {
    const result = validateTokenName('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2–64 characters');
  });

  it('should handle emoji in token names', () => {
    const result = validateTokenName('Token 🚀');
    expect(result.valid).toBe(true);
  });

  it('should return normalized value', () => {
    const result = validateTokenName('MyToken');
    expect(result.normalized).toBe('MyToken');
  });
});

describe('validateTokenSymbol', () => {
  it('should accept valid token symbols', () => {
    expect(validateTokenSymbol('BTC').valid).toBe(true);
    expect(validateTokenSymbol('ETH').valid).toBe(true);
    expect(validateTokenSymbol('DASH').valid).toBe(true);
    expect(validateTokenSymbol('TOKEN1').valid).toBe(true);
  });

  it('should convert symbols to uppercase', () => {
    const result = validateTokenSymbol('btc');
    expect(result.normalized).toBe('BTC');
  });

  it('should reject symbols that are too short', () => {
    const result = validateTokenSymbol('A');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2–8 characters');
  });

  it('should reject symbols that are too long', () => {
    const result = validateTokenSymbol('VERYLONGSYMBOL');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2–8 characters');
  });

  it('should reject symbols with lowercase letters', () => {
    const result = validateTokenSymbol('Btc');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('leading or trailing spaces');
  });

  it('should reject symbols with special characters', () => {
    const result = validateTokenSymbol('BTC$');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('uppercase letters and numbers');
  });

  it('should reject empty symbols', () => {
    const result = validateTokenSymbol('');
    expect(result.valid).toBe(false);
  });

  it('should handle leading/trailing spaces', () => {
    const result = validateTokenSymbol(' BTC ');
    expect(result.valid).toBe(false);
    expect(result.normalized).toBe('BTC');
  });
});

describe('validateBase58Identity', () => {
  it('should accept valid Base58 identity IDs', () => {
    const validId = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefgh';
    expect(validateBase58Identity(validId).valid).toBe(true);
  });

  it('should reject IDs that are too short', () => {
    const result = validateBase58Identity('123456789ABCDEFGH');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('43-44 characters');
  });

  it('should reject IDs that are too long', () => {
    const longId = '1'.repeat(50);
    const result = validateBase58Identity(longId);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('43-44 characters');
  });

  it('should reject IDs with invalid Base58 characters', () => {
    const invalidId = '0OIl' + '1'.repeat(40); // Contains invalid Base58 chars
    const result = validateBase58Identity(invalidId);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Base58 format');
  });

  it('should reject empty IDs', () => {
    const result = validateBase58Identity('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should reject IDs with leading/trailing spaces', () => {
    const validId = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefgh';
    const result = validateBase58Identity(` ${validId} `);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('leading or trailing spaces');
  });
});

describe('validateLanguageCode', () => {
  it('should accept valid 2-letter language codes', () => {
    expect(validateLanguageCode('en')).toBe(true);
    expect(validateLanguageCode('es')).toBe(true);
    expect(validateLanguageCode('fr')).toBe(true);
    expect(validateLanguageCode('de')).toBe(true);
  });

  it('should reject codes with uppercase letters', () => {
    expect(validateLanguageCode('EN')).toBe(false);
    expect(validateLanguageCode('En')).toBe(false);
  });

  it('should reject codes that are too short', () => {
    expect(validateLanguageCode('e')).toBe(false);
  });

  it('should reject codes that are too long', () => {
    expect(validateLanguageCode('eng')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(validateLanguageCode(123)).toBe(false);
    expect(validateLanguageCode(null)).toBe(false);
    expect(validateLanguageCode(undefined)).toBe(false);
  });

  it('should reject codes with numbers', () => {
    expect(validateLanguageCode('e1')).toBe(false);
  });

  it('should reject codes with special characters', () => {
    expect(validateLanguageCode('e-')).toBe(false);
  });
});

describe('validateLocalizationEntry', () => {
  it('should accept valid localization entries', () => {
    const entry = {
      code: 'en',
      singularForm: 'Token',
      pluralForm: 'Tokens',
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject invalid language codes', () => {
    const entry = {
      code: 'ENG',
      singularForm: 'Token',
      pluralForm: 'Tokens',
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid language code (must be 2 lowercase letters)');
  });

  it('should reject missing singular form', () => {
    const entry = {
      code: 'en',
      singularForm: '',
      pluralForm: 'Tokens',
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Singular form is required');
  });

  it('should reject missing plural form', () => {
    const entry = {
      code: 'en',
      singularForm: 'Token',
      pluralForm: '',
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plural form is required');
  });

  it('should reject singular form that is too long', () => {
    const entry = {
      code: 'en',
      singularForm: 'A'.repeat(101),
      pluralForm: 'Tokens',
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Singular form too long (max 100 characters)');
  });

  it('should reject plural form that is too long', () => {
    const entry = {
      code: 'en',
      singularForm: 'Token',
      pluralForm: 'A'.repeat(101),
      shouldCapitalize: true
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plural form too long (max 100 characters)');
  });

  it('should reject invalid shouldCapitalize flag', () => {
    const entry = {
      code: 'en',
      singularForm: 'Token',
      pluralForm: 'Tokens',
      shouldCapitalize: 'yes'
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Capitalization flag must be true or false');
  });

  it('should reject null or undefined entries', () => {
    expect(validateLocalizationEntry(null).valid).toBe(false);
    expect(validateLocalizationEntry(undefined).valid).toBe(false);
  });

  it('should accumulate multiple errors', () => {
    const entry = {
      code: 'ENG',
      singularForm: '',
      pluralForm: '',
      shouldCapitalize: 'yes'
    };
    const result = validateLocalizationEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
    expect(validateEmail('first.last@subdomain.domain.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('invalid@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('invalid@domain')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(validateEmail(123)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validateURL', () => {
  it('should accept valid URLs', () => {
    expect(validateURL('https://example.com')).toBe(true);
    expect(validateURL('http://subdomain.example.com/path')).toBe(true);
    expect(validateURL('https://example.com:8080/path?query=value')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateURL('not a url')).toBe(false);
    expect(validateURL('htp://invalid')).toBe(false);
    expect(validateURL('example.com')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(validateURL(123)).toBe(false);
    expect(validateURL(null)).toBe(false);
    expect(validateURL(undefined)).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validateURL('')).toBe(false);
  });
});

describe('validatePositiveInteger', () => {
  it('should accept valid positive integers', () => {
    expect(validatePositiveInteger('123').valid).toBe(true);
    expect(validatePositiveInteger('0').valid).toBe(true);
    expect(validatePositiveInteger(456).valid).toBe(true);
  });

  it('should reject negative numbers', () => {
    const result = validatePositiveInteger('-123');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('positive integer');
  });

  it('should reject decimal numbers', () => {
    const result = validatePositiveInteger('123.45');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('positive integer');
  });

  it('should reject non-numeric strings', () => {
    const result = validatePositiveInteger('abc');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('positive integer');
  });

  it('should reject empty values', () => {
    const result = validatePositiveInteger('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should enforce minimum value', () => {
    const result = validatePositiveInteger('5', { min: 10 });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least 10');
  });

  it('should enforce maximum value', () => {
    const result = validatePositiveInteger('100', { max: 50 });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at most 50');
  });

  it('should normalize value to string', () => {
    const result = validatePositiveInteger(123);
    expect(result.normalized).toBe('123');
  });
});

describe('validateDecimals', () => {
  it('should accept valid decimals (0-18)', () => {
    expect(validateDecimals('0').valid).toBe(true);
    expect(validateDecimals('8').valid).toBe(true);
    expect(validateDecimals('18').valid).toBe(true);
  });

  it('should reject decimals less than 0', () => {
    const result = validateDecimals('-1');
    expect(result.valid).toBe(false);
  });

  it('should reject decimals greater than 18', () => {
    const result = validateDecimals('19');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at most 18');
  });
});

describe('validateSupply', () => {
  it('should accept valid supply values', () => {
    expect(validateSupply('1000000').valid).toBe(true);
    expect(validateSupply('0').valid).toBe(true);
  });

  it('should reject negative supply values', () => {
    const result = validateSupply('-1000');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('positive integer');
  });

  it('should reject decimal supply values', () => {
    const result = validateSupply('1000.5');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('positive integer');
  });

  it('should enforce minimum supply', () => {
    const result = validateSupply('100', { min: '1000' });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least 1000');
  });

  it('should enforce maximum supply', () => {
    const result = validateSupply('10000', { max: '5000' });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at most 5000');
  });

  it('should use custom label in error messages', () => {
    const result = validateSupply('', { label: 'Base Supply' });
    expect(result.message).toContain('Base Supply is required');
  });

  it('should handle very large numbers with BigInt', () => {
    const largeNumber = '9007199254740991'; // MAX_SAFE_INTEGER
    const result = validateSupply(largeNumber);
    expect(result.valid).toBe(true);
  });
});

describe('validateRequired', () => {
  it('should accept non-empty values', () => {
    expect(validateRequired('value').valid).toBe(true);
    expect(validateRequired(123).valid).toBe(true);
    expect(validateRequired(true).valid).toBe(true);
  });

  it('should reject null values', () => {
    const result = validateRequired(null);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should reject undefined values', () => {
    const result = validateRequired(undefined);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should reject empty strings', () => {
    const result = validateRequired('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should reject strings with only whitespace', () => {
    const result = validateRequired('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should use custom field name in error message', () => {
    const result = validateRequired('', 'Token Name');
    expect(result.message).toContain('Token Name is required');
  });
});

describe('validateMnemonic', () => {
  it('should accept 12-word mnemonics', () => {
    const mnemonic = 'word '.repeat(11) + 'word';
    expect(validateMnemonic(mnemonic).valid).toBe(true);
  });

  it('should accept 24-word mnemonics', () => {
    const mnemonic = 'word '.repeat(23) + 'word';
    expect(validateMnemonic(mnemonic).valid).toBe(true);
  });

  it('should reject mnemonics with wrong word count', () => {
    const mnemonic = 'word '.repeat(10) + 'word';
    const result = validateMnemonic(mnemonic);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('12 or 24 words');
  });

  it('should reject mnemonics with numbers', () => {
    const mnemonic = 'word1 '.repeat(11) + 'word2';
    const result = validateMnemonic(mnemonic);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('only letters');
  });

  it('should reject mnemonics with special characters', () => {
    const mnemonic = 'word! '.repeat(11) + 'word@';
    const result = validateMnemonic(mnemonic);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('only letters');
  });

  it('should reject non-string mnemonics', () => {
    const result = validateMnemonic(123);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('string');
  });

  it('should handle extra whitespace', () => {
    const mnemonic = '  word  '.repeat(12);
    expect(validateMnemonic(mnemonic).valid).toBe(true);
  });
});

describe('validatePercentage', () => {
  it('should accept valid percentages (0-100)', () => {
    expect(validatePercentage('0').valid).toBe(true);
    expect(validatePercentage('50').valid).toBe(true);
    expect(validatePercentage('100').valid).toBe(true);
  });

  it('should reject percentages less than 0', () => {
    const result = validatePercentage('-1');
    expect(result.valid).toBe(false);
  });

  it('should reject percentages greater than 100', () => {
    const result = validatePercentage('101');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at most 100');
  });

  it('should reject decimal percentages', () => {
    const result = validatePercentage('50.5');
    expect(result.valid).toBe(false);
  });
});
