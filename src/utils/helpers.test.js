/**
 * Unit Tests for Helpers Module
 * Comprehensive tests for helper utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  normaliseUnsignedValue,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  safeJsonParse,
  safeJsonStringify,
  escapeHtml,
  formatNumber,
  truncate,
  capitalize,
  hasBigIntSupport,
  safeBigIntCompare,
  announce
} from './helpers.js';

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should use provided prefix', () => {
    const id = generateId('test');
    expect(id).toMatch(/^test-/);
  });

  it('should use default prefix if not provided', () => {
    const id = generateId();
    expect(id).toMatch(/^id-/);
  });
});

describe('normaliseUnsignedValue', () => {
  it('should normalize positive numbers', () => {
    expect(normaliseUnsignedValue(123)).toBe('123');
    expect(normaliseUnsignedValue('456')).toBe('456');
  });

  it('should remove non-numeric characters', () => {
    expect(normaliseUnsignedValue('$123.45')).toBe('12345');
  });

  it('should remove leading zeros', () => {
    expect(normaliseUnsignedValue('00123')).toBe('123');
    expect(normaliseUnsignedValue('0')).toBe('0');
  });

  it('should handle negative numbers', () => {
    expect(normaliseUnsignedValue(-123)).toBe('123');
  });

  it('should return empty string for invalid input', () => {
    expect(normaliseUnsignedValue('')).toBe('');
    expect(normaliseUnsignedValue('abc')).toBe('');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const func = vi.fn();
    const debounced = debounce(func, 100);

    debounced();
    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledOnce();
  });

  it('should cancel previous calls', () => {
    const func = vi.fn();
    const debounced = debounce(func, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);

    expect(func).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(func).toHaveBeenCalledOnce();
  });

  it('should pass arguments to debounced function', () => {
    const func = vi.fn();
    const debounced = debounce(func, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function immediately on first call', () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled();
    expect(func).toHaveBeenCalledOnce();
  });

  it('should prevent execution within limit period', () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled();
    throttled();
    throttled();

    expect(func).toHaveBeenCalledOnce();
  });

  it('should allow execution after limit period', () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled();
    vi.advanceTimersByTime(100);
    throttled();

    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to throttled function', () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled('arg1', 'arg2');
    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(123)).toBe(123);
    expect(deepClone('string')).toBe('string');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('should clone arrays', () => {
    const arr = [1, 2, 3];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  it('should clone objects', () => {
    const obj = { a: 1, b: 2 };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  it('should clone nested objects', () => {
    const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned.b).not.toBe(obj.b);
    expect(cloned.b.d).not.toBe(obj.b.d);
  });

  it('should clone Date objects', () => {
    const date = new Date('2024-01-15');
    const cloned = deepClone(date);
    expect(cloned).toEqual(date);
    expect(cloned).not.toBe(date);
  });

  it('should clone arrays within objects', () => {
    const obj = { arr: [1, 2, 3] };
    const cloned = deepClone(obj);
    expect(cloned.arr).toEqual(obj.arr);
    expect(cloned.arr).not.toBe(obj.arr);
  });
});

describe('isEmpty', () => {
  it('should return true for null and undefined', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty strings', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for empty arrays', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('should return true for empty objects', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('should return false for non-empty strings', () => {
    expect(isEmpty('text')).toBe(false);
  });

  it('should return false for non-empty arrays', () => {
    expect(isEmpty([1, 2, 3])).toBe(false);
  });

  it('should return false for non-empty objects', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('should return false for numbers and booleans', () => {
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const json = '{"a":1,"b":2}';
    expect(safeJsonParse(json)).toEqual({ a: 1, b: 2 });
  });

  it('should return fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid', { error: true })).toEqual({ error: true });
  });

  it('should use null as default fallback', () => {
    expect(safeJsonParse('invalid')).toBe(null);
  });

  it('should handle arrays', () => {
    const json = '[1,2,3]';
    expect(safeJsonParse(json)).toEqual([1, 2, 3]);
  });

  it('should handle nested objects', () => {
    const json = '{"a":{"b":{"c":1}}}';
    expect(safeJsonParse(json)).toEqual({ a: { b: { c: 1 } } });
  });
});

describe('safeJsonStringify', () => {
  it('should stringify valid objects', () => {
    expect(safeJsonStringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('should return fallback for circular references', () => {
    const obj = {};
    obj.self = obj;
    expect(safeJsonStringify(obj, '{}')).toBe('{}');
  });

  it('should use default fallback', () => {
    const obj = {};
    obj.self = obj;
    expect(safeJsonStringify(obj)).toBe('{}');
  });

  it('should handle arrays', () => {
    expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]');
  });

  it('should handle nested objects', () => {
    expect(safeJsonStringify({ a: { b: { c: 1 } } })).toBe('{"a":{"b":{"c":1}}}');
  });
});

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(escapeHtml('<div>test</div>')).not.toContain('<div>');
  });

  it('should escape ampersands', () => {
    const escaped = escapeHtml('A & B');
    expect(escaped).toContain('&amp;');
  });

  it('should escape quotes', () => {
    const escaped = escapeHtml('He said "Hello"');
    expect(escaped).toContain('&quot;');
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle plain text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should handle string numbers', () => {
    expect(formatNumber('1234')).toBe('1,234');
  });

  it('should handle decimal numbers', () => {
    const formatted = formatNumber(1234.56);
    expect(formatted).toMatch(/1,234/);
  });

  it('should return "0" for NaN', () => {
    expect(formatNumber('abc')).toBe('0');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should handle exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should handle null and undefined', () => {
    expect(truncate(null, 5)).toBe(null);
    expect(truncate(undefined, 5)).toBe(undefined);
  });

  it('should handle empty strings', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle empty strings', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(capitalize(null)).toBe('');
    expect(capitalize(undefined)).toBe('');
  });

  it('should only capitalize first character', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });
});

describe('hasBigIntSupport', () => {
  it('should return true when BigInt is supported', () => {
    expect(hasBigIntSupport()).toBe(typeof BigInt !== 'undefined');
  });
});

describe('safeBigIntCompare', () => {
  it('should compare values correctly', () => {
    expect(safeBigIntCompare('100', '50')).toBe(1);
    expect(safeBigIntCompare('50', '100')).toBe(-1);
    expect(safeBigIntCompare('100', '100')).toBe(0);
  });

  it('should handle very large numbers', () => {
    const large1 = '9007199254740991';
    const large2 = '9007199254740992';
    expect(safeBigIntCompare(large2, large1)).toBe(1);
  });
});

describe('announce', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should create announcer element if not exists', () => {
    announce('Test message');
    const announcer = document.getElementById('aria-announcer');
    expect(announcer).toBeTruthy();
  });

  it('should set message text', () => {
    announce('Test message');
    const announcer = document.getElementById('aria-announcer');
    expect(announcer.textContent).toBe('Test message');
  });

  it('should set aria-live attribute', () => {
    announce('Test message', 'assertive');
    const announcer = document.getElementById('aria-announcer');
    expect(announcer.getAttribute('aria-live')).toBe('assertive');
  });

  it('should use polite priority by default', () => {
    announce('Test message');
    const announcer = document.getElementById('aria-announcer');
    expect(announcer.getAttribute('aria-live')).toBe('polite');
  });

  it('should reuse existing announcer element', () => {
    announce('Message 1');
    const announcer1 = document.getElementById('aria-announcer');
    announce('Message 2');
    const announcer2 = document.getElementById('aria-announcer');
    expect(announcer1).toBe(announcer2);
  });

  it('should clear message after timeout', async () => {
    vi.useFakeTimers();
    announce('Test message');
    const announcer = document.getElementById('aria-announcer');
    expect(announcer.textContent).toBe('Test message');

    vi.advanceTimersByTime(1000);
    expect(announcer.textContent).toBe('');

    vi.restoreAllMocks();
  });
});
