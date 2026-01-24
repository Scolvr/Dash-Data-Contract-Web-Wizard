/**
 * Theme Management Module
 * Handles light/dark theme switching with system preference support
 */

import { saveTheme, loadTheme } from '../core/storage.js';
import { THEMES, STORAGE_KEYS } from '../core/constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// THEME STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentTheme = THEMES.LIGHT;
const themeListeners = new Set();

// Media query for system preference
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the current theme
 */
export function getTheme() {
  return currentTheme;
}

/**
 * Gets the system's preferred theme
 */
export function getSystemTheme() {
  return darkModeQuery.matches ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Applies a theme to the document
 */
export function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  // Update all theme toggle elements
  updateThemeToggleUI(theme);

  // Notify listeners
  notifyThemeListeners(theme);

  console.log('[Theme] Applied:', theme);
}

/**
 * Sets the theme with optional persistence
 */
export function setTheme(theme, persist = true) {
  applyTheme(theme);
  if (persist) {
    saveTheme(theme);
  }
}

/**
 * Toggles between light and dark themes
 */
export function toggleTheme() {
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  setTheme(newTheme, true);
  return newTheme;
}

/**
 * Initializes the theme from storage or system preference
 */
export function initializeTheme() {
  const savedTheme = loadTheme();
  const systemTheme = getSystemTheme();
  const initialTheme = savedTheme || systemTheme;

  applyTheme(initialTheme);

  // Listen for system theme changes
  darkModeQuery.addEventListener('change', (e) => {
    const newSystemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
    const userPref = loadTheme();

    if (!userPref) {
      // No saved preference - follow system
      applyTheme(newSystemTheme);
      console.log('[Theme] Following system:', newSystemTheme);
    } else {
      console.log('[Theme] System changed to', newSystemTheme, '- user preference:', userPref);
    }
  });

  return initialTheme;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates all theme toggle UI elements
 */
function updateThemeToggleUI(theme) {
  // Update header theme buttons
  const headerThemeBtns = document.querySelectorAll('.global-header__theme-btn');
  headerThemeBtns.forEach(btn => {
    btn.classList.toggle('global-header__theme-btn--active', btn.dataset.theme === theme);
  });

  // Update sidebar theme toggles
  const sidebarThemeRadios = document.querySelectorAll('input[name="ui-theme"], input[name="ui-theme-group"]');
  sidebarThemeRadios.forEach(radio => {
    radio.checked = radio.value === theme;
    const option = radio.closest('.theme-toggle__option');
    if (option) {
      option.classList.toggle('theme-toggle__option--active', radio.value === theme);
    }
  });
}

/**
 * Sets up theme toggle event listeners
 */
export function setupThemeToggleListeners() {
  // Header theme buttons
  const headerThemeBtns = document.querySelectorAll('.global-header__theme-btn');
  headerThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (theme) {
        setTheme(theme, true);
      }
    });
  });

  // Sidebar theme radios
  const sidebarThemeRadios = document.querySelectorAll('input[name="ui-theme"], input[name="ui-theme-group"]');
  sidebarThemeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        setTheme(radio.value, true);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTENER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds a theme change listener
 */
export function addThemeListener(listener) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

/**
 * Notifies all theme listeners
 */
function notifyThemeListeners(theme) {
  for (const listener of themeListeners) {
    try {
      listener(theme);
    } catch (error) {
      console.error('[Theme] Listener error:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR GLOBAL ACCESS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.DashWizardTheme = {
    get: getTheme,
    set: setTheme,
    toggle: toggleTheme,
    getSystem: getSystemTheme,
    initialize: initializeTheme,
    addListener: addThemeListener
  };
}
