/**
 * Storage Module
 * Handles localStorage persistence with fallback to in-memory storage
 */

const STATE_STORAGE_KEY = 'dashTokenWizardState';
const SENSITIVE_DATA_KEY = 'dashTokenWizardIdentities';
const THEME_STORAGE_KEY = 'ui.theme';

/**
 * Initialize storage with localStorage fallback
 * @returns {Storage} Storage object (localStorage or in-memory fallback)
 */
function initStorage() {
  try {
    const ls = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
    if (!ls) {
      throw new Error('localStorage unavailable');
    }
    const k = '__wizard_test__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    const store = new Map();
    return {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear()
    };
  }
}

// Initialize storage singleton
const storage = initStorage();

/**
 * Saves wizard state to storage
 * @param {Object} state - Wizard state to save
 * @returns {boolean} Success status
 */
export function saveState(state) {
  try {
    // Clone state and remove sensitive data before saving
    const stateToSave = sanitizeStateForStorage(state);
    storage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error('Failed to save state:', error);
    return false;
  }
}

/**
 * Loads wizard state from storage
 * @returns {Object|null} Wizard state or null if not found
 */
export function loadState() {
  try {
    const saved = storage.getItem(STATE_STORAGE_KEY);
    if (!saved) {
      return null;
    }
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load state:', error);
    return null;
  }
}

/**
 * Clears wizard state from storage
 * @returns {boolean} Success status
 */
export function clearState() {
  try {
    storage.removeItem(STATE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear state:', error);
    return false;
  }
}

/**
 * Saves theme preference to storage
 * @param {string} theme - Theme name (light, dark, auto)
 * @returns {boolean} Success status
 */
export function saveTheme(theme) {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch (error) {
    console.error('Failed to save theme:', error);
    return false;
  }
}

/**
 * Loads theme preference from storage
 * @returns {string|null} Theme name or null if not found
 */
export function loadTheme() {
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to load theme:', error);
    return null;
  }
}

/**
 * Sanitizes state before saving (removes sensitive data)
 * @param {Object} state - Raw state object
 * @returns {Object} Sanitized state
 * @private
 */
function sanitizeStateForStorage(state) {
  const sanitized = JSON.parse(JSON.stringify(state));

  // Remove sensitive data from registration step
  if (sanitized.form?.registration?.wallet) {
    sanitized.form.registration.wallet.mnemonic = '';
    sanitized.form.registration.wallet.privateKey = '';
  }

  // Remove any other runtime-only data
  if (sanitized.runtime) {
    delete sanitized.runtime.walletClient;
    delete sanitized.runtime.identity;
  }

  return sanitized;
}

/**
 * Gets the raw storage object (for advanced use cases)
 * @returns {Storage} Storage object
 */
export function getStorage() {
  return storage;
}

/**
 * Checks if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
export function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Export storage keys for reference
export { STATE_STORAGE_KEY, SENSITIVE_DATA_KEY, THEME_STORAGE_KEY };
