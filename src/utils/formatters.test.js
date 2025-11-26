/**
 * Unit Tests for Formatters Module
 * Comprehensive tests for all formatter functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateId,
  normaliseUnsignedValue,
  safeBigIntCompare,
  normalizeWalletBalance,
  formatWalletBalance,
  formatNumber,
  clamp,
  clampFurthestIndex,
  normalisePermissionMember,
  normalisePermissionGroup,
  normalisePermissionsGroups,
  truncateText,
  capitalizeFirst,
  formatTimestamp
} from './formatters.js';

describe('generateId', () => {
  it('should generate unique IDs with prefix', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');
    expect(id1).toMatch(/^test-/);
    expect(id2).toMatch(/^test-/);
    expect(id1).not.toBe(id2);
  });

  it('should use crypto.randomUUID if available', () => {
    const id = generateId('test');
    expect(id).toMatch(/^test-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should fallback to timestamp+random if crypto.randomUUID not available', () => {
    const originalCrypto = global.crypto;
    global.crypto = { randomUUID: undefined };
    const id = generateId('test');
    expect(id).toMatch(/^test-/);
    global.crypto = originalCrypto;
  });
});

describe('normaliseUnsignedValue', () => {
  it('should handle numeric inputs', () => {
    expect(normaliseUnsignedValue(123)).toBe('123');
    expect(normaliseUnsignedValue(0)).toBe('0');
    expect(normaliseUnsignedValue(456.789)).toBe('456');
  });

  it('should handle string inputs', () => {
    expect(normaliseUnsignedValue('123')).toBe('123');
    expect(normaliseUnsignedValue('456.789')).toBe('456789');
    expect(normaliseUnsignedValue('abc123def')).toBe('123');
  });

  it('should remove non-numeric characters', () => {
    expect(normaliseUnsignedValue('$1,234.56')).toBe('123456');
    expect(normaliseUnsignedValue('1-2-3')).toBe('123');
  });

  it('should return empty string for invalid inputs', () => {
    expect(normaliseUnsignedValue('')).toBe('');
    expect(normaliseUnsignedValue('abc')).toBe('');
    expect(normaliseUnsignedValue(null)).toBe('');
    expect(normaliseUnsignedValue(undefined)).toBe('');
  });

  it('should handle negative numbers by converting to positive', () => {
    expect(normaliseUnsignedValue(-123)).toBe('0');
  });

  it('should clamp values above MAX_U32', () => {
    const maxU32 = 4294967295;
    expect(normaliseUnsignedValue(maxU32 + 1)).toBe(String(maxU32));
  });

  it('should handle Infinity', () => {
    expect(normaliseUnsignedValue(Infinity)).toBe('Infinity');
  });
});

describe('safeBigIntCompare', () => {
  it('should compare BigInt values correctly', () => {
    expect(safeBigIntCompare('100', '50')).toBe(1);
    expect(safeBigIntCompare('50', '100')).toBe(-1);
    expect(safeBigIntCompare('100', '100')).toBe(0);
  });

  it('should handle very large numbers', () => {
    const large1 = '9007199254740991';
    const large2 = '9007199254740992';
    expect(safeBigIntCompare(large2, large1)).toBe(1);
  });

  it('should handle string representations', () => {
    expect(safeBigIntCompare('1000', '999')).toBe(1);
  });

  it('should handle zero', () => {
    expect(safeBigIntCompare('0', '0')).toBe(0);
    expect(safeBigIntCompare('1', '0')).toBe(1);
    expect(safeBigIntCompare('0', '1')).toBe(-1);
  });
});

describe('normalizeWalletBalance', () => {
  it('should handle bigint values', () => {
    expect(normalizeWalletBalance(BigInt(100000000))).toBe(100000000);
  });

  it('should handle number values', () => {
    expect(normalizeWalletBalance(100000000)).toBe(100000000);
  });

  it('should extract availableBalance from object', () => {
    expect(normalizeWalletBalance({ availableBalance: 100000000 })).toBe(100000000);
  });

  it('should extract totalBalance from object', () => {
    expect(normalizeWalletBalance({ totalBalance: 200000000 })).toBe(200000000);
  });

  it('should extract balance from object', () => {
    expect(normalizeWalletBalance({ balance: 300000000 })).toBe(300000000);
  });

  it('should prioritize availableBalance over totalBalance', () => {
    expect(normalizeWalletBalance({
      availableBalance: 100000000,
      totalBalance: 200000000
    })).toBe(100000000);
  });

  it('should return null for invalid values', () => {
    expect(normalizeWalletBalance(null)).toBe(null);
    expect(normalizeWalletBalance(undefined)).toBe(null);
    expect(normalizeWalletBalance({})).toBe(null);
    expect(normalizeWalletBalance(Infinity)).toBe(null);
  });
});

describe('formatWalletBalance', () => {
  it('should format balance in DASH with 6 decimals', () => {
    expect(formatWalletBalance(100000000)).toBe('1.000000 DASH');
    expect(formatWalletBalance(50000000)).toBe('0.500000 DASH');
  });

  it('should handle zero balance', () => {
    expect(formatWalletBalance(0)).toBe('0 DASH');
  });

  it('should handle null/undefined', () => {
    expect(formatWalletBalance(null)).toBe('—');
    expect(formatWalletBalance(undefined)).toBe('—');
  });

  it('should handle invalid numbers', () => {
    expect(formatWalletBalance(Infinity)).toBe('—');
    expect(formatWalletBalance(NaN)).toBe('—');
  });

  it('should convert from duffs (satoshis) correctly', () => {
    expect(formatWalletBalance(1)).toBe('0.000000 DASH');
    expect(formatWalletBalance(12345678)).toBe('0.123457 DASH');
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should handle string numbers', () => {
    expect(formatNumber('1000')).toBe('1,000');
  });

  it('should handle decimal numbers', () => {
    expect(formatNumber(1234.56)).toMatch(/1,234\.56/);
  });

  it('should return original value for invalid numbers', () => {
    expect(formatNumber('abc')).toBe('abc');
    expect(formatNumber(NaN)).toMatch(/NaN/);
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should work with negative ranges', () => {
    expect(clamp(-5, -10, 0)).toBe(-5);
    expect(clamp(-15, -10, 0)).toBe(-10);
    expect(clamp(5, -10, 0)).toBe(0);
  });
});

describe('clampFurthestIndex', () => {
  it('should clamp index to valid range', () => {
    expect(clampFurthestIndex(3)).toBe(3);
    expect(clampFurthestIndex(-2)).toBe(-1);
    expect(clampFurthestIndex(10)).toBe(6);
  });

  it('should handle NaN', () => {
    expect(clampFurthestIndex(NaN)).toBe(-1);
  });

  it('should handle non-numeric values', () => {
    expect(clampFurthestIndex('abc')).toBe(-1);
  });

  it('should truncate decimals', () => {
    expect(clampFurthestIndex(3.7)).toBe(3);
  });
});

describe('normalisePermissionMember', () => {
  it('should normalize valid permission members', () => {
    const member = { type: 'owner', identity: 'abc123' };
    const normalized = normalisePermissionMember(member);
    expect(normalized).toEqual({ type: 'owner', identity: 'abc123' });
  });

  it('should provide defaults for missing properties', () => {
    const normalized = normalisePermissionMember({});
    expect(normalized).toEqual({ type: 'none', identity: '' });
  });

  it('should handle null/undefined', () => {
    expect(normalisePermissionMember(null)).toEqual({ type: 'none', identity: '' });
    expect(normalisePermissionMember(undefined)).toEqual({ type: 'none', identity: '' });
  });

  it('should convert non-string types to "none"', () => {
    const normalized = normalisePermissionMember({ type: 123, identity: 'abc' });
    expect(normalized.type).toBe('none');
  });

  it('should convert non-string identities to empty string', () => {
    const normalized = normalisePermissionMember({ type: 'owner', identity: 123 });
    expect(normalized.identity).toBe('');
  });
});

describe('normalisePermissionGroup', () => {
  it('should normalize valid permission groups', () => {
    const group = {
      members: [
        { type: 'owner', identity: 'abc' },
        { type: 'specific', identity: 'def' }
      ]
    };
    const normalized = normalisePermissionGroup(group);
    expect(normalized.members).toHaveLength(2);
  });

  it('should provide empty members array for missing members', () => {
    const normalized = normalisePermissionGroup({});
    expect(normalized.members).toEqual([]);
  });

  it('should handle null/undefined', () => {
    expect(normalisePermissionGroup(null).members).toEqual([]);
    expect(normalisePermissionGroup(undefined).members).toEqual([]);
  });

  it('should normalize each member in the group', () => {
    const group = {
      members: [{}, { type: 'owner' }]
    };
    const normalized = normalisePermissionGroup(group);
    expect(normalized.members[0]).toEqual({ type: 'none', identity: '' });
  });
});

describe('normalisePermissionsGroups', () => {
  it('should normalize array of groups', () => {
    const groups = [
      { members: [{ type: 'owner', identity: 'abc' }] },
      { members: [{ type: 'specific', identity: 'def' }] }
    ];
    const normalized = normalisePermissionsGroups(groups);
    expect(normalized).toHaveLength(2);
  });

  it('should return empty array for non-arrays', () => {
    expect(normalisePermissionsGroups(null)).toEqual([]);
    expect(normalisePermissionsGroups(undefined)).toEqual([]);
    expect(normalisePermissionsGroups({})).toEqual([]);
  });

  it('should normalize each group in the array', () => {
    const groups = [{}, { members: [] }];
    const normalized = normalisePermissionsGroups(groups);
    expect(normalized[0].members).toEqual([]);
    expect(normalized[1].members).toEqual([]);
  });
});

describe('truncateText', () => {
  it('should truncate text longer than maxLength', () => {
    expect(truncateText('Hello World', 8)).toBe('Hello...');
  });

  it('should not truncate text shorter than maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should handle exact maxLength', () => {
    expect(truncateText('Hello', 5)).toBe('Hello');
  });

  it('should handle non-string values', () => {
    expect(truncateText(null, 5)).toBe(null);
    expect(truncateText(undefined, 5)).toBe(undefined);
    expect(truncateText(123, 5)).toBe(123);
  });

  it('should handle empty strings', () => {
    expect(truncateText('', 5)).toBe('');
  });
});

describe('capitalizeFirst', () => {
  it('should capitalize first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('world')).toBe('World');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });

  it('should handle single characters', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });

  it('should handle empty strings', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('should handle non-string values', () => {
    expect(capitalizeFirst(null)).toBe(null);
    expect(capitalizeFirst(undefined)).toBe(undefined);
    expect(capitalizeFirst(123)).toBe(123);
  });

  it('should only capitalize first character', () => {
    expect(capitalizeFirst('hello WORLD')).toBe('Hello WORLD');
  });
});

describe('formatTimestamp', () => {
  beforeEach(() => {
    // Mock Date to return consistent values for testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  it('should format timestamp to readable date', () => {
    const timestamp = new Date('2024-01-15T10:30:00.000Z').getTime();
    const formatted = formatTimestamp(timestamp);
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/2024/);
  });

  it('should handle invalid timestamps', () => {
    expect(formatTimestamp(NaN)).toBe('—');
    expect(formatTimestamp(Infinity)).toBe('—');
  });

  it('should include time in format', () => {
    const timestamp = new Date('2024-01-15T10:30:00.000Z').getTime();
    const formatted = formatTimestamp(timestamp);
    expect(formatted).toMatch(/:/); // Contains time separator
  });
});
