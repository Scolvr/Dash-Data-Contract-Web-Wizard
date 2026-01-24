/*
 * Dash Token Wizard front-end logic.
 * Version: 22.2
 */

// ============================================
// FULL RESET CHECK - Must run FIRST before IIFE wraps
// Sets a global flag to prevent persistState from saving
// ============================================
window.__WIZARD_RESET_MODE__ = false;

(function checkForPendingReset() {
  'use strict';
  try {
    // Check URL for reset parameter (more reliable than sessionStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const resetRequested = urlParams.has('reset') || sessionStorage.getItem('__wizard_reset_pending__') === '1';

    if (resetRequested) {
      console.log('[App] Reset requested - BLOCKING all state persistence');

      // SET GLOBAL FLAG TO BLOCK persistState
      window.__WIZARD_RESET_MODE__ = true;

      // Clear the flag
      sessionStorage.removeItem('__wizard_reset_pending__');

      // Clear ALL localStorage keys one by one (more thorough)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        keysToRemove.push(localStorage.key(i));
      }
      keysToRemove.forEach(key => {
        if (key) localStorage.removeItem(key);
      });
      localStorage.clear();

      // Clear sessionStorage (except our flag check is done)
      sessionStorage.clear();

      console.log('[App] Storage cleared, localStorage:', localStorage.length, 'sessionStorage:', sessionStorage.length);

      // If URL has reset param, clean it up and redirect to fresh page
      if (urlParams.has('reset')) {
        urlParams.delete('reset');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        // Use replace to ensure clean URL, then reload to get fresh state
        window.history.replaceState({}, '', newUrl);
        console.log('[App] Cleaned reset param from URL, reloading fresh...');
        // Force a complete reload without the reset param
        window.location.reload();
        return; // Stop execution - page will reload
      }
    }
  } catch (e) {
    console.error('[App] Reset check error:', e);
  }
})();
// ============================================

(function () {
  'use strict';

  // ============================================
  // Mobile Scroll Management
  // Uses CSS touch-action for better performance
  // ============================================
  if (window.innerWidth <= 900) {
    // Apply scroll lock via CSS (more performant than JS blocking)
    document.documentElement.style.cssText = 'overflow: hidden !important; height: 100% !important; position: fixed !important; width: 100% !important; touch-action: none;';
    document.body.style.cssText = 'overflow: hidden !important; height: 100% !important; position: fixed !important; width: 100% !important; top: 0 !important; left: 0 !important; touch-action: none;';

    // Note: Using CSS touch-action: none instead of non-passive touchmove listener
    // This allows the browser to optimize scroll handling without blocking the main thread
  }
  // ============================================

  // ============================================
  // Scroll Performance Optimization
  // Disables CSS transitions during scroll for 60fps
  // ============================================
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    // Add class to disable transitions during scroll
    if (!document.documentElement.classList.contains('is-scrolling')) {
      document.documentElement.classList.add('is-scrolling');
    }
    // Remove class after scrolling stops
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      document.documentElement.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });
  // ============================================

  // Development mode - set to false for production
  const DEV_MODE = false;

  // Timing constants
  const TIMINGS = Object.freeze({
    SCROLL_DELAY: 300,
    ERROR_PULSE_DURATION: 1500,
    TOAST_AUTO_DISMISS: 5000,
    DEBOUNCE_DEFAULT: 300,
    AUTO_SAVE_INTERVAL: 5000,
    ANIMATION_BASE: 150,
    ANIMATION_SLOW: 300
  });

  const STATE_STORAGE_KEY = 'dashTokenWizardState';
  const SENSITIVE_DATA_KEY = 'dashTokenWizardIdentities';
  const THEME_STORAGE_KEY = 'ui.theme';

  // Debug logging helper - only logs in DEV_MODE
  const debug = {
    log: (...args) => DEV_MODE && console.log(...args),
    warn: (...args) => DEV_MODE && console.warn(...args),
    error: (...args) => console.error(...args) // Always log errors
  };

  // Performance Enhancement: Auto-save timer for debounced state persistence
  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY_MS = TIMINGS.AUTO_SAVE_INTERVAL;
  // FIXED: Correct order matching sidebar navigation
  // Note: 'overview' removed from sequence - accessible only from Document tab
  // Note: 'welcome' removed - templates now on standalone page
  const STEP_SEQUENCE = ['naming', 'permissions', 'advanced', 'distribution', 'search', 'export'];
  const INFO_STEPS = Object.freeze([
    'permissions-group',
    'permissions-manual-mint',
    'permissions-manual-burn',
    'permissions-unfreeze',
    'permissions-destroy-frozen',
    'permissions-emergency-action',
    'permissions-max-supply',
    'permissions-conventions',
    'permissions-marketplace-trade-mode',
    'permissions-direct-pricing',
    'permissions-main-control'
  ]);
  const TRACKED_STEPS = Object.freeze([...STEP_SEQUENCE, ...INFO_STEPS]);
  const MANUAL_ACTION_DEFINITIONS = Object.freeze([
    { key: 'manualMint', stepId: 'permissions-manual-mint', domPrefix: 'manual-mint' },
    { key: 'manualBurn', stepId: 'permissions-manual-burn', domPrefix: 'manual-burn' },
    { key: 'manualFreeze', stepId: 'permissions-manual-freeze', domPrefix: 'manual-freeze' },
    { key: 'emergencyAction', stepId: 'permissions-emergency', domPrefix: 'emergency' },
    { key: 'marketplaceTradeMode', stepId: 'permissions-marketplace-trade-mode-change', domPrefix: 'marketplace-trade-mode' },
    { key: 'directPricing', stepId: 'permissions-direct-pricing-change', domPrefix: 'direct-pricing' },
    { key: 'mainControl', stepId: 'permissions-main-control-change', domPrefix: 'main-control' }
  ]);

  // Configuration for wizard-choice automation: auto-set dropdowns when Yes/No is clicked
  const WIZARD_CHOICE_AUTOMATION = Object.freeze([
    { radioName: 'manual-mint-enabled', stateKey: 'manualMint', performDropdown: 'manual-mint-permission', ruleChangerDropdown: 'manual-mint-change-rules' },
    { radioName: 'manual-burn-enabled', stateKey: 'manualBurn', performDropdown: 'manual-burn-permission', ruleChangerDropdown: 'manual-burn-change-rules' },
    { radioName: 'manual-freeze-enabled', stateKey: 'manualFreeze', performDropdown: 'manual-freeze-permission', ruleChangerDropdown: 'manual-freeze-change-rules' },
    { radioName: 'manual-unfreeze-enabled', stateKey: 'unfreeze', performDropdown: 'manual-unfreeze-permission', ruleChangerDropdown: 'manual-unfreeze-change-rules' },
    { radioName: 'destroy-frozen-enabled', stateKey: 'destroyFrozen', performDropdown: 'destroy-frozen-permission', ruleChangerDropdown: 'destroy-frozen-change-rules' },
    { radioName: 'emergency-enabled', stateKey: 'emergencyAction', performDropdown: 'emergency-permission', ruleChangerDropdown: 'emergency-change-rules' },
    { radioName: 'update-names-enabled', stateKey: 'updateNames', performDropdown: 'update-names-permission', ruleChangerDropdown: 'update-names-rule-changer' },
    { radioName: 'change-max-supply-enabled', stateKey: 'changeMaxSupply', performDropdown: 'change-max-supply-permission', ruleChangerDropdown: 'change-max-supply-change-rules' }
  ]);

  const INFO_STEP_PARENT = Object.freeze({
    // Naming substeps
    'naming-localization': 'naming',
    'naming-update': 'naming',
    // Permissions substeps
    'permissions-group': 'permissions',
    'permissions-transfer': 'permissions',
    'permissions-manual-mint': 'permissions',
    'permissions-manual-burn': 'permissions',
    'permissions-manual-freeze': 'permissions',
    'permissions-unfreeze': 'permissions',
    'permissions-destroy-frozen': 'permissions',
    'permissions-emergency': 'permissions',
    'permissions-emergency-action': 'permissions',
    'permissions-conventions-change': 'permissions',
    'permissions-marketplace-trade-mode-change': 'permissions',
    'permissions-direct-pricing-change': 'permissions',
    'permissions-main-control-change': 'permissions',
    'permissions-max-supply': 'permissions',
    'permissions-conventions': 'permissions',
    'permissions-marketplace-trade-mode': 'permissions',
    'permissions-direct-pricing': 'permissions',
    'permissions-main-control': 'permissions',
    // Advanced substeps
    'advanced-history': 'advanced',
    'advanced-launch': 'advanced',
    // Distribution substeps
    'distribution-preprogrammed': 'distribution',
    'distribution-perpetual': 'distribution'
  });

  // FIXED: Substep sequences matching the actual sidebar navigation
  // naming: Token Name → Localization → Update
  // permissions: Token Supply → Minting → Burning → Freezing → Emergency Actions
  // advanced (displayed as "Usage"): History → Trading Rules → Launch Settings
  // distribution: Schedule → Emission
  // search: Keywords & Description (single screen)
  // export: Export to Documents (no substeps)
  const SUBSTEP_SEQUENCES = Object.freeze({
    naming: ['naming', 'naming-localization', 'naming-update'],
    permissions: ['permissions', 'permissions-transfer', 'permissions-manual-mint', 'permissions-manual-burn', 'permissions-manual-freeze', 'permissions-emergency', 'permissions-marketplace-trade-mode-change', 'permissions-direct-pricing-change', 'permissions-main-control-change'],
    advanced: ['advanced-history', 'advanced', 'advanced-launch'],
    distribution: ['distribution-preprogrammed', 'distribution-perpetual'],
    search: ['search'],
    export: ['export']
  });

  const MAX_U32 = 4294967295;
  const STEP_LABELS = {
    naming: 'Naming',
    permissions: 'Permissions',
    distribution: 'Distribution',
    advanced: 'Advanced',
    overview: 'Overview',
    export: 'Export',
    'permissions-group': 'Group permissions',
    'permissions-transfer': 'Transfer settings',
    'permissions-manual-mint': 'Manual mint',
    'permissions-manual-burn': 'Manual burn',
    'permissions-manual-freeze': 'Manual freeze',
    'permissions-unfreeze': 'Unfreeze',
    'permissions-destroy-frozen': 'Destroy frozen funds',
    'permissions-emergency': 'Emergency actions',
    'permissions-emergency-action': 'Emergency action',
    'permissions-max-supply': 'Max. supply change',
    'permissions-conventions': 'Conventions change',
    'permissions-marketplace-trade-mode': 'Marketplace trade mode change',
    'permissions-direct-pricing': 'Direct purchase pricing change',
    'permissions-main-control': 'Main control change'
  };
  const CHUNK_ERROR_PATTERN = /(ChunkLoadError|Loading chunk|dynamically imported module)/i;
  const CHUNK_RECOVERY_FLAG = 'dashWizardChunkRecoveryPending';

  // ADDED: BigInt feature detection (for browsers that don't support BigInt)
  const hasBigIntSupport = typeof BigInt !== 'undefined';

  // Safe BigInt comparison utility
  function safeBigIntCompare(a, b) {
    if (!hasBigIntSupport) {
      // Fallback for older browsers - use string comparison (less accurate but works)
      debug.warn('BigInt not supported, using fallback comparison');
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
      debug.error('BigInt comparison failed:', error);
      throw error;
    }
  }

  // Screen transition lock to prevent rapid consecutive transitions
  let isTransitioning = false;
  let pendingTransition = null;

  // Storage with localStorage fallback (keeps UI state across reloads; never persist secrets)
  const storage = (() => {
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
  })();

  const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

  function generateId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    const random = Math.random().toString(36).slice(2, 10);
    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}${random}`;
  }

  function normaliseUnsignedValue(value) {
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

  // ═══════════════════════════════════════════════════════
  // Loading State Utilities
  // ═══════════════════════════════════════════════════════

  /**
   * Shows loading overlay with optional custom message
   * @param {string} message - Message to display (default: "Loading...")
   */
  function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.querySelector('.loading-overlay');
    const messageEl = overlay?.querySelector('.loading-overlay__message');
    const mainContent = document.querySelector('.wizard-main');

    if (!overlay) return;

    if (messageEl && message) {
      messageEl.textContent = message;
    }

    // Show overlay and announce to screen readers
    overlay.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-busy', 'true');

    // Optionally make main content inert while loading
    if (mainContent) {
      mainContent.setAttribute('aria-busy', 'true');
    }
  }

  /**
   * Hides the loading overlay
   */
  function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    const mainContent = document.querySelector('.wizard-main');

    if (!overlay) return;

    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-busy', 'false');

    if (mainContent) {
      mainContent.setAttribute('aria-busy', 'false');
    }
  }

  /**
   * Sets a button to loading state
   * @param {HTMLElement} button - The button element
   */
  function setButtonLoading(button) {
    if (!button) return;
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
  }

  /**
   * Removes loading state from a button
   * @param {HTMLElement} button - The button element
   */
  function setButtonReady(button) {
    if (!button) return;
    button.setAttribute('aria-busy', 'false');
    button.disabled = false;
  }

  /**
   * Shows loading spinner in an element
   * @param {HTMLElement} element - Container element
   * @param {string} size - Spinner size: 'small', 'medium', 'large'
   */
  function showLoadingSpinner(element, size = 'medium') {
    if (!element) return;

    const spinner = document.createElement('div');
    spinner.className = `spinner spinner--${size}`;
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');

    element.innerHTML = '';
    element.appendChild(spinner);
  }

  /**
   * Hides loading spinner from an element
   * @param {HTMLElement} element - Container element
   */
  function hideLoadingSpinner(element) {
    if (!element) return;
    element.innerHTML = '';
  }

  // ═══════════════════════════════════════════════════════
  // End Loading State Utilities
  // ═══════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // Toast Notification System
  // ═══════════════════════════════════════════════════════

  /**
   * T2: Scrolls to the first error field and highlights it with a pulse animation
   * @param {HTMLElement} container - Optional container to search within (default: active screen)
   */
  function scrollToFirstError(container) {
    const searchContainer = container || document.querySelector('.wizard-screen--active');
    if (!searchContainer) return;

    // Find first invalid input
    const firstError = searchContainer.querySelector('.wizard-field__input--error, .is-invalid, [aria-invalid="true"]');
    if (!firstError) return;

    // Scroll into view with offset for header - use auto for instant scroll
    firstError.scrollIntoView({ behavior: 'auto', block: 'center' });

    // Add pulse animation
    firstError.classList.add('wizard-field__input--error-pulse');

    // Focus the field immediately (no delay needed with instant scroll)
    firstError.focus();

    // Remove pulse class after animation
    setTimeout(() => {
      firstError.classList.remove('wizard-field__input--error-pulse');
    }, 1500);
  }

  /**
   * Shows a toast notification
   * @param {Object} options - Toast configuration
   * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message (optional)
   * @param {number} options.duration - Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
   */
  function showToast({ type = 'info', title, message = '', duration = 5000 }) {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    // Use role="alert" for errors/warnings (assertive), role="status" for others (polite)
    const isUrgent = type === 'error' || type === 'warning';
    toast.setAttribute('role', isUrgent ? 'alert' : 'status');
    toast.setAttribute('aria-live', isUrgent ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    // Icon SVGs for each type (with aria-hidden for accessibility)
    const icons = {
      success: '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      error: '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      warning: '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };

    // Build toast HTML
    toast.innerHTML = `
      <div class="toast__icon">${icons[type]}</div>
      <div class="toast__content">
        <h4 class="toast__title">${title}</h4>
        ${message ? `<p class="toast__message">${message}</p>` : ''}
      </div>
      <button class="toast__close" aria-label="Dismiss notification">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;

    // Add toast to container
    container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      toast.classList.add('toast--show');
    });

    // Close button handler
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => {
      dismissToast(toast);
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Dismisses a toast notification
   * @param {HTMLElement} toast - The toast element to dismiss
   */
  function dismissToast(toast) {
    if (!toast) return;

    // Trigger slide-out animation
    toast.classList.remove('toast--show');
    toast.classList.add('toast--hide');

    // Remove from DOM after animation
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  /**
   * Convenience functions for specific toast types
   */
  function showSuccessToast(title, message, duration) {
    return showToast({ type: 'success', title, message, duration });
  }

  function showErrorToast(title, message, duration) {
    return showToast({ type: 'error', title, message, duration });
  }

  function showWarningToast(title, message, duration) {
    return showToast({ type: 'warning', title, message, duration });
  }

  function showInfoToast(title, message, duration) {
    return showToast({ type: 'info', title, message, duration });
  }

  // ═══════════════════════════════════════════════════════
  // End Toast Notification System
  // ═══════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // Mobile Hamburger Menu
  // ═══════════════════════════════════════════════════════

  // PERFORMANCE: AbortController for event listener cleanup
  let mobileMenuAbortController = null;

  /**
   * Initializes mobile menu functionality
   * Uses AbortController to prevent memory leaks from duplicate listeners
   */
  function initMobileMenu() {
    const mobileHeader = document.querySelector('.mobile-header');
    const menuToggles = document.querySelectorAll('.mobile-menu-toggle');
    const sidebar = document.querySelector('.wizard-sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay'); // May be null - that's OK

    if (!sidebar) return;

    // PERFORMANCE: Clean up previous listeners before adding new ones
    if (mobileMenuAbortController) {
      mobileMenuAbortController.abort();
    }
    mobileMenuAbortController = new AbortController();
    const { signal } = mobileMenuAbortController;

    // Toggle mobile menu
    function toggleMobileMenu() {
      const isOpen = sidebar.classList.contains('mobile-menu-open');

      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }

    function openMobileMenu() {
      sidebar.classList.add('mobile-menu-open');
      if (overlay) overlay.classList.add('active');
      if (mobileHeader) mobileHeader.classList.add('menu-open');
      menuToggles.forEach(toggle => toggle.setAttribute('aria-expanded', 'true'));
      if (overlay) overlay.setAttribute('aria-hidden', 'false');

      // Simple scroll lock
      document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
      sidebar.classList.remove('mobile-menu-open');
      if (overlay) overlay.classList.remove('active');
      if (mobileHeader) mobileHeader.classList.remove('menu-open');
      menuToggles.forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
      if (overlay) overlay.setAttribute('aria-hidden', 'true');

      // Only restore body scroll if NOT on mobile placeholder view
      // Mobile placeholder handles its own scroll lock via CSS
      if (window.innerWidth > 900) {
        document.body.style.overflow = '';
      }
    }

    // Event listeners - attach to all menu toggles with AbortController signal
    menuToggles.forEach(toggle => {
      toggle.addEventListener('click', toggleMobileMenu, { signal });
    });
    if (overlay) overlay.addEventListener('click', closeMobileMenu, { signal });

    // Close menu ONLY when subitem (actual page link) is clicked
    // Do NOT close when clicking expandable parent items
    const navSubitems = document.querySelectorAll('.wizard-nav-subitem');
    navSubitems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          closeMobileMenu();
        }
      }, { signal });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
      }
    }, { signal });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && sidebar.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
      }
    }, { signal });
  }

  // ═══════════════════════════════════════════════════════
  // End Mobile Hamburger Menu
  // ═══════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // Progress Indicator Utilities
  // ═══════════════════════════════════════════════════════

  /**
   * Map of step IDs to their position in the main wizard flow
   */
  const PROGRESS_STEP_MAP = {
    'naming': 0,
    'permissions': 1,
    'distribution': 2,
    'advanced': 3,
    'export': 4
  };

  /**
   * Updates the compact progress indicator based on current step
   * @param {string} currentStepId - The current step ID
   */
  function updateProgressIndicator(currentStepId) {
    const progressBar = document.querySelector('.wizard-progress-compact');
    const progressSteps = document.querySelectorAll('.wizard-progress-compact__step');

    // P2: Update sidebar progress bar
    updateSidebarProgress();

    if (!progressBar) return;

    // Get step position (0-5)
    const stepPosition = PROGRESS_STEP_MAP[currentStepId] || 0;

    // Update aria-valuenow
    progressBar.setAttribute('aria-valuenow', stepPosition);

    // Update step states
    progressSteps.forEach((stepBtn, index) => {
      const stepNum = index + 1;

      // Remove all states
      stepBtn.removeAttribute('data-current');
      stepBtn.removeAttribute('data-completed');

      if (stepNum < stepPosition) {
        // Completed step
        stepBtn.setAttribute('data-completed', 'true');
        stepBtn.disabled = false;
        // Hide the number, show checkmark via CSS
        const dotEl = stepBtn.querySelector('.wizard-progress-compact__dot');
        if (dotEl) dotEl.textContent = '';
      } else if (stepNum === stepPosition) {
        // Current step
        stepBtn.setAttribute('data-current', 'true');
        stepBtn.disabled = false;
        const dotEl = stepBtn.querySelector('.wizard-progress-compact__dot');
        if (dotEl) dotEl.textContent = stepNum;
      } else {
        // Future step (disabled)
        stepBtn.disabled = true;
        const dotEl = stepBtn.querySelector('.wizard-progress-compact__dot');
        if (dotEl) dotEl.textContent = stepNum;
      }
    });
  }

  /**
   * P2: Updates the sidebar progress bar based on completed steps
   */
  function updateSidebarProgress() {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    const progressContainer = document.querySelector('.wizard-progress');

    if (!progressText || !progressFill) return;

    // Count completed steps from STEP_SEQUENCE (naming, permissions, distribution, advanced, export)
    const mainSteps = ['naming', 'permissions', 'distribution', 'advanced', 'export'];
    let completedCount = 0;

    mainSteps.forEach(stepId => {
      const step = wizardState.steps[stepId];
      if (step && step.validity === 'valid') {
        completedCount++;
      }
    });

    const totalSteps = mainSteps.length;
    const percentage = Math.round((completedCount / totalSteps) * 100);

    // Update text
    progressText.textContent = `${completedCount}/${totalSteps} Steps`;

    // Update fill bar
    progressFill.style.width = `${percentage}%`;

    // Toggle complete state
    if (progressContainer) {
      if (completedCount === totalSteps) {
        progressContainer.classList.add('wizard-progress--complete');
      } else {
        progressContainer.classList.remove('wizard-progress--complete');
      }
    }
  }

  /**
   * Initialize compact progress indicator click handlers
   */
  function initProgressIndicator() {
    const progressSteps = document.querySelectorAll('.wizard-progress-compact__step');

    progressSteps.forEach((stepBtn) => {
      stepBtn.addEventListener('click', () => {
        if (stepBtn.disabled) return;

        const targetStep = stepBtn.dataset.step;
        if (targetStep) {
          // Navigate to the step using showScreen
          showScreen(targetStep);
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // End Progress Indicator Utilities
  // ═══════════════════════════════════════════════════════

  function normalisePermissionMember(member = {}) {
    return {
      id: typeof member.id === 'string' && member.id ? member.id : generateId('member'),
      identity: typeof member.identity === 'string'
        ? member.identity
        : typeof member.name === 'string'
          ? member.name
          : '',
      power: normaliseUnsignedValue(member.power)
    };
  }

  function normalisePermissionGroup(group = {}) {
    const members = Array.isArray(group.members) ? group.members.map(normalisePermissionMember) : [];
    return {
      id: typeof group.id === 'string' && group.id ? group.id : generateId('group'),
      name: typeof group.name === 'string' ? group.name : '',
      requiredPower: normaliseUnsignedValue(group.requiredPower),
      members
    };
  }

  function normalisePermissionsGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) {
      return [];
    }
    return rawGroups.map(normalisePermissionGroup);
  }

  function clampMainControlIndex(index, groupCount) {
    if (!groupCount) {
      return -1;
    }
    if (typeof index !== 'number' || Number.isNaN(index)) {
      return 0;
    }
    return Math.max(0, Math.min(groupCount - 1, Math.trunc(index)));
  }

  function createInfoButton(panelId, srLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wizard-info-trigger';
    button.setAttribute('aria-expanded', 'false');
    if (panelId) {
      button.setAttribute('aria-controls', panelId);
    }
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = srLabel;
    const icon = document.createElement('span');
    icon.className = 'wizard-info-trigger__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'i';
    button.append(srOnly, icon);
    return button;
  }

  function createInfoPanel(panelId, message) {
    const panel = document.createElement('div');
    panel.className = 'wizard-info-panel';
    if (panelId) {
      panel.id = panelId;
    }
    panel.setAttribute('hidden', '');
    const body = document.createElement('p');
    body.className = 'wizard-info-panel__body';
    body.textContent = message;
    panel.appendChild(body);
    return panel;
  }

  function createConditionalFieldMount(wrapper) {
    if (!wrapper) {
      return {
        show: () => { },
        hide: () => { }
      };
    }

    const parent = wrapper.parentNode;
    const marker = document.createComment('conditional-field');
    if (parent) {
      parent.insertBefore(marker, wrapper);
    }

    function ensureMarkerParent() {
      return marker.parentNode;
    }

    function show() {
      const host = ensureMarkerParent();
      if (!host) {
        return;
      }
      if (wrapper.parentNode !== host) {
        host.insertBefore(wrapper, marker.nextSibling);
      }
      wrapper.removeAttribute('hidden');
    }

    function hide() {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      wrapper.setAttribute('hidden', '');
    }

    const mount = { show, hide };
    if (wrapper.hasAttribute('hidden')) {
      hide();
    } else {
      show();
    }
    return mount;
  }

  function getStepIndex(stepId) {
    return STEP_SEQUENCE.indexOf(stepId);
  }

  function getPrimaryStepId(stepId) {
    return INFO_STEP_PARENT[stepId] || stepId;
  }

  function computeFurthestValidIndexFromSteps(steps) {
    let furthest = -1;
    STEP_SEQUENCE.forEach((id, index) => {
      const state = steps[id];
      if (state && state.validity === 'valid') {
        furthest = index;
      }
    });
    return furthest;
  }

  function clampFurthestIndex(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return -1;
    }
    return Math.min(Math.max(Math.trunc(value), -1), STEP_SEQUENCE.length - 1);
  }

  const DEFAULT_KEEP_HISTORY = {
    transfers: false,
    mints: false,
    burns: false,
    freezes: false,
    purchases: false,
    directPricing: false
  };

  const DEFAULT_CHANGE_CONTROL_FLAGS = {
    freeze: false,
    unfreeze: false,
    destroyFrozen: false,
    emergency: false,
    directPurchase: false,
    admin: false
  };

  const DEFAULT_WALLET_STATE = Object.freeze({
    mnemonic: '',
    privateKey: '',
    address: '',
    balance: null,
    fingerprint: ''
  });

  const DEFAULT_MANUAL_ACTION_STATE = Object.freeze({
    enabled: false,
    performerType: 'none',
    performerReference: '',
    ruleChangerType: 'none',
    ruleChangerReference: '',
    allowChangeAuthorizedToNone: false,
    allowChangeAdminToNone: false,
    allowSelfChangeAdmin: false,
    destinationType: 'contract-owner',
    destinationIdentity: '',
    allowCustomDestination: false
  });

  const DEFAULT_FREEZE_RULES_STATE = Object.freeze({
    enabled: false,
    perform: {
      type: 'none',
      identity: ''
    },
    changeRules: {
      type: 'none',
      identity: ''
    },
    flags: {
      changeAuthorizedToNoOneAllowed: false,
      changeAdminToNoOneAllowed: false,
      selfChangeAdminAllowed: false
    }
  });

  const DEFAULT_IDENTITY_STATE = Object.freeze({ id: '' });

  function cloneDefaultWalletState() {
    return { ...DEFAULT_WALLET_STATE };
  }

  function cloneDefaultIdentityState() {
    return { ...DEFAULT_IDENTITY_STATE };
  }

  function createDefaultManualActionState() {
    return { ...DEFAULT_MANUAL_ACTION_STATE };
  }

  function createDefaultFreezeState() {
    return {
      enabled: DEFAULT_FREEZE_RULES_STATE.enabled,
      perform: { ...DEFAULT_FREEZE_RULES_STATE.perform },
      changeRules: { ...DEFAULT_FREEZE_RULES_STATE.changeRules },
      flags: { ...DEFAULT_FREEZE_RULES_STATE.flags }
    };
  }

  function createDefaultWizardState() {
    const steps = TRACKED_STEPS.reduce((accumulator, id) => {
      accumulator[id] = { id, validity: 'unknown', touched: false };
      return accumulator;
    }, {});
    const manualActionsDefaults = MANUAL_ACTION_DEFINITIONS.reduce((accumulator, definition) => {
      accumulator[definition.key] = createDefaultManualActionState();
      return accumulator;
    }, {});

    return {
      active: 'naming',
      furthestValidIndex: -1,
      activeTemplate: null,
      templateMeta: {
        appliedTemplate: null,
        appliedAt: null,
        customizations: {
          supplyOverrides: {
            baseSupply: null,
            maxSupply: null,
            decimals: null,
            useMaxSupply: null
          }
        },
        deviations: {}
      },
      steps,
      runtime: {
        walletClient: null,
        walletClientFingerprint: null,
        walletInitializationError: '',
        walletInfoLoading: false
      },
      form: {
        tokenName: '',
        ownerIdentityId: '',
        naming: {
          singular: '',
          plural: '',
          capitalize: false,
          description: '',
          keywords: [],
          conventions: {
            localizations: {}
          },
          rows: [],
          updateNames: {
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: '',
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          }
        },
        permissions: {
          decimals: 2,
          baseSupply: '',
          useMaxSupply: false,
          maxSupply: '',
          keepsHistory: { ...DEFAULT_KEEP_HISTORY },
          startAsPaused: false,
          allowTransferToFrozenBalance: false,
          transferNotesEnabled: false,
          transferNoteTypes: {
            public: false,
            sharedEncrypted: false,
            privateEncrypted: false
          },
          groups: [],
          mainControlGroupIndex: -1,
          freeze: createDefaultFreezeState(),
          unfreeze: {
            enabled: false,
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: '',
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          },
          changeMaxSupply: {
            enabled: false,
            perform: { type: 'none', identityId: '', groupId: null },
            changeRules: { type: 'none', identityId: '', groupId: null },
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          },
          destroyFrozen: createDefaultManualActionState(),
          ...manualActionsDefaults
        },
        distribution: {
          enablePreProgrammed: false,
          enablePerpetual: false,
          cadence: {
            type: 'BlockBasedDistribution',
            intervalBlocks: '10',
            intervalSeconds: '60',
            epoch: 'monthly',
            startBlock: '',
            startTimestamp: ''
          },
          emission: {
            type: '',
            // Fixed Amount
            amount: '',
            // Random
            min: '10',
            max: '100',
            // Step Decreasing
            stepCount: '4',
            decreasePerIntervalNumerator: '1',
            decreasePerIntervalDenominator: '2',
            distributionStartAmount: '500',
            trailingDistributionIntervalAmount: '25',
            // Stepwise
            stepwise: [],
            // Linear
            linearStart: '',
            linearChange: '',
            // Exponential
            exponentialInitial: '',
            exponentialRate: '',
            // Polynomial
            polyA: '',
            polyD: '',
            polyM: '',
            polyN: '',
            polyO: '',
            polyB: '',
            // Logarithmic
            logA: '',
            logD: '',
            logM: '',
            logN: '',
            logO: '',
            logB: '',
            // Inverted Logarithmic
            invlogA: '',
            invlogD: '',
            invlogM: '',
            invlogN: '',
            invlogO: '',
            invlogB: ''
          },
          recipient: {
            type: 'contract-owner',
            identityId: ''
          },
          preProgrammed: {
            entries: []
          }
        },
        group: {
          enabled: false,
          name: '',
          threshold: 2,
          members: [
            { id: 'member-default-1', identityId: '', power: '1' },
            { id: 'member-default-2', identityId: '', power: '1' }
          ],
          permissions: {
            mint: false,
            burn: false,
            freeze: false,
            config: false,
            members: false
          }
        },
        documentTypes: {},
        advanced: {
          tradeMode: 'closed',
          changeControl: { ...DEFAULT_CHANGE_CONTROL_FLAGS },
          // Authorization settings for advanced permissions
          conventions: {
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: ''
          },
          marketplaceTradeMode: {
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: ''
          },
          directPricing: {
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: ''
          },
          mainControl: {
            performerType: 'none',
            performerReference: '',
            ruleChangerType: 'none',
            ruleChangerReference: '',
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          }
        },
        search: {
          keywords: '',
          description: ''
        },
        registration: {
          method: 'det',
          wallet: cloneDefaultWalletState(),
          identity: cloneDefaultIdentityState(),
          preflight: {
            det: { jsonDisplayed: false },
            self: { warningAcknowledged: false }
          }
        }
      }
    };
  }

  function createEmptyLocalizationRowData() {
    return {
      code: '',
      singularForm: '',
      pluralForm: '',
      shouldCapitalize: true
    };
  }

  function normalizeLocalizationRowData(row) {
    if (!row || typeof row !== 'object') {
      return createEmptyLocalizationRowData();
    }
    const shouldCapitalize =
      typeof row.shouldCapitalize === 'boolean'
        ? row.shouldCapitalize
        : typeof row.should_capitalize === 'boolean'
          ? row.should_capitalize
          : Boolean(row.should_capitalize);
    return {
      code: typeof row.code === 'string' ? row.code : '',
      singularForm: typeof row.singularForm === 'string' ? row.singularForm : (typeof row.singular === 'string' ? row.singular : ''),
      pluralForm: typeof row.pluralForm === 'string' ? row.pluralForm : (typeof row.plural === 'string' ? row.plural : ''),
      shouldCapitalize
    };
  }

  function limitLocalizationRows(rows) {
    const candidates = Array.isArray(rows) ? rows : [];
    if (candidates.length === 0) {
      return [];
    }
    // FIXED: Return ALL localization rows, not just the first one
    // This allows multiple languages to be added
    return candidates.map(row => normalizeLocalizationRowData(row));
  }

  function createLocalizationRecordFromRow(row) {
    const normalized = normalizeLocalizationRowData(row);
    const code = typeof normalized.code === 'string' ? normalized.code.trim() : '';
    if (!code) {
      return {};
    }
    return {
      [code]: {
        should_capitalize: Boolean(normalized.shouldCapitalize),
        singular_form: normalized.singularForm || '',
        plural_form: normalized.pluralForm || ''
      }
    };
  }

  function limitLocalizationRecord(record) {
    if (!record || typeof record !== 'object') {
      return {};
    }
    const keys = Object.keys(record);
    if (keys.length === 0) {
      return {};
    }

    // Preserve all valid localization entries (changed from keeping only first one)
    // This allows auto-synced English + manually added languages to coexist
    const result = {};
    for (const key of keys) {
      const entry = record[key];
      if (entry && typeof entry === 'object') {
        result[key] = {
          should_capitalize: Boolean(entry.should_capitalize ?? entry.shouldCapitalize),
          singular_form:
            typeof entry.singular_form === 'string'
              ? entry.singular_form
              : typeof entry.singular === 'string'
                ? entry.singular
                : '',
          plural_form:
            typeof entry.plural_form === 'string'
              ? entry.plural_form
              : typeof entry.plural === 'string'
                ? entry.plural
                : ''
        };
      }
    }
    return result;
  }

  const wizardState = loadState();

  // FIXED: Expose wizardState and persistState to window for access from separate IIFEs (Group Management)
  window.wizardState = wizardState;
  window.persistState = persistState;
  window.renderPermissionGroups = renderPermissionGroups;
  const tokenNamePattern = createTokenNamePattern();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedStatus = window.sessionStorage.getItem(CHUNK_RECOVERY_FLAG);
      if (storedStatus === 'pending') {
        window.sessionStorage.removeItem(CHUNK_RECOVERY_FLAG);
      }
    }
  } catch (error) {
    console.debug('Unable to reset chunk recovery flag', error);
  }

  // ═══════════════════════════════════════════════════════
  // Performance Enhancement: DOM Element Cache
  // All frequently accessed DOM elements are cached here to avoid
  // repeated querySelector calls throughout the application lifecycle.
  // This significantly improves performance for operations that reference
  // these elements multiple times.
  // ═══════════════════════════════════════════════════════

  const wizardElement = document.getElementById('wizard');
  const globalLiveRegion = document.getElementById('global-live-region');
  // FIXED: Use actual selector from HTML - .wizard-nav-item (includes both expandable and regular)
  const progressItems = Array.from(document.querySelectorAll('.wizard-nav-item'));
  // FIXED: Use correct selector for substep navigation items
  const subpathItems = Array.from(document.querySelectorAll('.wizard-nav-subitem'));
  let manualNavigationActive = false;
  let registrationValidationSequence = 0;

  progressItems.forEach((item) => {
    item.setAttribute('role', 'button');
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }

    const stepId = item.getAttribute('data-step') || '';
    item.setAttribute('aria-disabled', stepId ? 'false' : 'true');
    // FIXED: Detect children by data-toggle attribute (points to submenu)
    const hasChildren = Boolean(item.getAttribute('data-toggle'));
    const submenuId = item.getAttribute('data-toggle');
    const nestedList = submenuId ? document.getElementById(submenuId) : null;

    if (hasChildren) {
      item.setAttribute('aria-haspopup', 'true');
      const isExpanded = item.getAttribute('aria-expanded') === 'true';
      if (nestedList && !isExpanded) {
        nestedList.setAttribute('hidden', '');
      }
    }

    item.addEventListener('click', (event) => {
      event.preventDefault();
      if (hasChildren) {
        // Toggle the submenu visibility
        // Use nestedList from outer scope (found via data-toggle -> getElementById)
        const isOpen = item.classList.toggle('is-open');
        if (isOpen) {
          delete item.dataset.userCollapsed;
        } else {
          item.dataset.userCollapsed = 'true';
        }
        item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        // Also update parent .sidebar-step wrapper for CSS styling
        const parentStep = item.closest('.sidebar-step');
        if (parentStep) {
          parentStep.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        if (nestedList) {
          if (isOpen) {
            nestedList.removeAttribute('hidden');
          } else {
            nestedList.setAttribute('hidden', '');
          }
        }
        // ALSO navigate to the substep when opening (not just toggle)
        // This ensures clicking "Distribution" shows content, not blank screen
        // FIX: If the item has data-substep, navigate directly to that substep
        // instead of resolving to the first substep of the step
        if (isOpen) {
          const targetSubstep = item.getAttribute('data-substep');
          if (targetSubstep) {
            // Navigate directly to the specified substep
            manualNavigationActive = true;
            showScreen(targetSubstep, { force: true, isManualNavigation: true });
          } else {
            activateWizardStepFromPath(item.getAttribute('data-step'));
          }
        }
        return;
      }
      activateWizardStepFromPath(item.getAttribute('data-step'));
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (hasChildren) {
          // Toggle the submenu visibility
          // Use nestedList from outer scope (found via data-toggle -> getElementById)
          const isOpen = item.classList.toggle('is-open');
          if (isOpen) {
            delete item.dataset.userCollapsed;
          } else {
            item.dataset.userCollapsed = 'true';
          }
          item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          // Also update parent .sidebar-step wrapper for CSS styling
          const parentStep = item.closest('.sidebar-step');
          if (parentStep) {
            parentStep.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          }
          if (nestedList) {
            if (isOpen) {
              nestedList.removeAttribute('hidden');
            } else {
              nestedList.setAttribute('hidden', '');
            }
          }
          // ALSO navigate to the substep when opening (not just toggle)
          // This ensures pressing Enter on "Distribution" shows content, not blank screen
          // FIX: If the item has data-substep, navigate directly to that substep
          if (isOpen) {
            const targetSubstep = item.getAttribute('data-substep');
            if (targetSubstep) {
              manualNavigationActive = true;
              showScreen(targetSubstep, { force: true, isManualNavigation: true });
            } else {
              activateWizardStepFromPath(item.getAttribute('data-step'));
            }
          }
          return;
        }
        activateWizardStepFromPath(item.getAttribute('data-step'));
      }
    });
  });

  subpathItems.forEach((item) => {
    // FIXED: Get data-substep attribute instead of data-step
    const stepId = item.getAttribute('data-substep') || '';
    item.setAttribute('role', 'button');
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }

    const navigateToSubpath = () => {
      // FIXED: Allow substeps in addition to main steps and info steps
      const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps =>
        substeps.includes(stepId)
      );
      if (!stepId || (!STEP_SEQUENCE.includes(stepId) && !INFO_STEPS.includes(stepId) && !isValidSubstep)) {
        return;
      }
      manualNavigationActive = true;
      showScreen(stepId, { force: true, isManualNavigation: true });
      const parent = item.closest('.wizard-nav-item--expandable[data-toggle]');
      if (parent) {
        parent.classList.add('is-open');
        delete parent.dataset.userCollapsed;
        parent.setAttribute('aria-expanded', 'true');
        // Also update parent .sidebar-step wrapper for CSS styling
        const sidebarStep = parent.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
        const nestedList = parent.querySelector('.wizard-subpath');
        if (nestedList) {
          nestedList.removeAttribute('hidden');
        }
      }
    };

    item.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToSubpath();
    });

    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        event.stopPropagation();
        navigateToSubpath();
      }
    });
  });

  function activateWizardStepFromPath(stepId) {
    if (!stepId || (!STEP_SEQUENCE.includes(stepId) && !INFO_STEPS.includes(stepId))) {
      return;
    }

    // INTERCEPT: When clicking on "Export" in sidebar, show validation modal first
    if (stepId === 'export') {
      if (typeof window.showSettingsConfirmationModal === 'function') {
        window.showSettingsConfirmationModal();
        return;
      }
    }

    manualNavigationActive = true;
    // FIX: Resolve primary step to first substep if it has substeps
    // This prevents blank screens when clicking on steps like "Distribution" that have no main screen
    let targetScreenId = stepId;
    if (SUBSTEP_SEQUENCES[stepId] && SUBSTEP_SEQUENCES[stepId].length > 0) {
      targetScreenId = SUBSTEP_SEQUENCES[stepId][0];
    }
    showScreen(targetScreenId, { force: true, isManualNavigation: true });
  }

  const namingForm = document.getElementById('naming-form');
  const permissionsForm = document.getElementById('permissions-form');
  const transferForm = document.getElementById('permissions-transfer-form');
  const distributionForm = document.getElementById('distribution-form');
  const advancedForm = document.getElementById('advanced-form');
  const registrationForm = document.getElementById('registration-form');
  const registrationValidationCard = document.getElementById('registration-validation-card');
  const registrationValidationBody = document.getElementById('registration-validation-body');
  const registrationValidationFallbackHTML = '<p><strong>You\'re almost done!</strong></p><p style=\"margin-bottom: 0;\">Your token is configured and ready to go. Now you just need to publish it to the Dash Platform. Choose the method that works best for you below.</p>';
  const registrationValidationDefaultHTML = registrationValidationBody
    ? registrationValidationBody.innerHTML || registrationValidationFallbackHTML
    : registrationValidationFallbackHTML;
  const groupMainPositionInput = document.getElementById('group-main-position');
  const groupAddButton = document.getElementById('group-add');
  const groupListElement = document.getElementById('group-list');
  const groupEmptyHint = document.getElementById('group-empty');

  const walletFileInput = document.getElementById('wallet-file');
  const walletMnemonicInput = document.getElementById('wallet-mnemonic');
  const walletMessage = document.getElementById('wallet-message');
  const walletAddressValue = document.getElementById('wallet-address');
  const walletBalanceValue = document.getElementById('wallet-balance');
  const walletBalanceNote = document.getElementById('wallet-balance-note');

  const identityMessage = document.getElementById('identity-message');
  const identityRegisterButton = document.getElementById('identity-register');
  const identityIdOutput = document.getElementById('identity-id');
  const identityGuidance = document.getElementById('identity-guidance');

  let walletClientInitializationPromise = null;
  let walletClientInitializationFingerprint = null;

  const tokenNameInput = document.getElementById('token-name');
  const tokenNameMessage = document.getElementById('token-name-message');
  const ownerIdentityInput = document.getElementById('owner-identity-id');
  const ownerIdentityMessage = document.getElementById('owner-identity-message');
  const namingNextButton = document.getElementById('naming-next');
  const namingLocalizationNextButton = document.getElementById('naming-localization-next');

  // Removed tokenSingularInput - using tokenName as singular form
  const tokenPluralInput = document.getElementById('token-plural');
  const tokenCapitalizeInput = document.getElementById('token-capitalize');
  const tokenPluralMessage = document.getElementById('token-plural-message');

  const localizationWrapper = document.getElementById('localization-wrapper');
  const localizationEmptyState = document.getElementById('localization-empty-state');
  const localizationGuidance = document.getElementById('localization-guidance');
  const localizationList = document.getElementById('localization-list');
  const localizationAddButton = document.getElementById('localization-add');
  const localizationGlobalMessage = document.getElementById('localization-global-message');

  const permissionsMessage = document.getElementById('permissions-message');
  const permissionsNextButton = document.getElementById('permissions-next');
  const transferMessage = document.getElementById('permissions-transfer-message');
  const transferNextButton = document.getElementById('permissions-transfer-next');

  const advancedMessage = document.getElementById('advanced-message');
  const advancedNextButton = document.getElementById('advanced-next');
  const overviewNextButton = document.getElementById('overview-next');
  const overviewBackButton = document.getElementById('overview-back');

  const searchMessage = document.getElementById('search-message');
  const searchNextButton = document.getElementById('search-next');
  const searchKeywordsInput = document.getElementById('search-keywords');
  const searchDescriptionInput = document.getElementById('search-description');

  // FIXED: Use existing HTML inputs instead of creating new ones
  let permissionsUI = createPermissionsUIFromHTML(permissionsForm);
  let transferUI = createTransferUI(transferForm);
  let distributionUI = createDistributionUI(distributionForm);
  let advancedUI = createAdvancedUI(advancedForm);
  const manualActionUIs = {};


  /** @type {{ hasJson: boolean; hasIdentity: boolean; hasPrivateKey: boolean }} */
  const wizardReadiness = {
    hasJson: false,
    hasIdentity: false,
    hasPrivateKey: false
  };

  const readinessReminderMessage = 'Please finish JSON, Identity & Private Key before continuing.';

  /**
   * @param {{ hasJson: boolean; hasIdentity: boolean; hasPrivateKey: boolean }} state
   */
  function isReadyToCreateNew(state) {
    return Boolean(state.hasJson && state.hasIdentity && state.hasPrivateKey);
  }

  let localizationRows = [];
  let localizationRowIdCounter = 0;

  const registrationMethodsContainer = document.querySelector('.registration-methods');
  const registrationOptionLabels = registrationMethodsContainer
    ? Array.from(registrationMethodsContainer.querySelectorAll('.wizard-option'))
    : [];
  const registrationMethodInputs = registrationMethodsContainer
    ? Array.from(registrationMethodsContainer.querySelectorAll('input[name="registration-method"]'))
    : [];
  const createTokenButton = document.getElementById('create-new-token');
  const exportToDocumentsButton = document.getElementById('export-to-documents');
  const registrationPanelDet = document.getElementById('registration-panel-det');
  const registrationPanelSelf = document.getElementById('registration-panel-self');
  const registrationPanels = {
    det: registrationPanelDet,
    self: registrationPanelSelf
  };
  const jsonPreview = document.getElementById('json-preview');
  const jsonPreviewContent = document.getElementById('json-preview-content');
  const jsonShowButton = document.getElementById('json-show-button');
  const jsonCopyButton = document.getElementById('json-copy-button');
  const copyJsonBtn = document.getElementById('copy-json-btn');
  const contractJsonPreview = document.getElementById('contract-json-preview');
  const selfWarningCheckbox = document.getElementById('self-warning-checkbox');
  const selfWarningProceedButton = document.getElementById('self-warning-proceed');
  const themeControls = Array.from(document.querySelectorAll('input[name="ui-theme"], input[name="ui-theme-group"], input[name="ui-theme-doc"]'));

  const stepStatusElements = TRACKED_STEPS.reduce((accumulator, step) => {
    const element = document.getElementById(`status-${step}`);
    if (element) {
      accumulator[step] = element;
    }
    return accumulator;
  }, {});

  TRACKED_STEPS.forEach((step) => updateStepStatusUI(step));

  const initialTheme = getStoredTheme();
  setTheme(initialTheme, false);

  themeControls.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        setTheme(input.value);
      }
    });
  });

  // Listen for system theme changes (only applies if user hasn't set a manual preference)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!storage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  syncRegistrationPreflightUI();
  syncWizardReadiness({ refreshStatus: true });

  const namingScreen = document.getElementById('screen-naming');
  const permissionsScreen = document.getElementById('screen-permissions');
  // Note: distribution step uses substeps only (distribution-preprogrammed, distribution-perpetual)
  const distributionScreen = null; // Removed redundant screen-distribution
  const advancedScreen = document.getElementById('screen-advanced');
  const searchScreen = document.getElementById('screen-search');
  const overviewScreen = document.getElementById('screen-overview');
  const exportScreen = document.getElementById('screen-export');
  const documentsScreen = document.getElementById('screen-documents');
  const manualMintScreen = document.getElementById('screen-permissions-manual-mint');
  const manualBurnScreen = document.getElementById('screen-permissions-manual-burn');
  const manualFreezeScreen = document.getElementById('screen-permissions-manual-freeze');
  const destroyFrozenScreen = document.getElementById('screen-permissions-destroy-frozen');
  const emergencyActionScreen = document.getElementById('screen-permissions-emergency');
  const marketplaceTradeModeScreen = document.getElementById('screen-permissions-marketplace-trade-mode-change');
  const directPricingScreen = document.getElementById('screen-permissions-direct-pricing-change');
  const mainControlScreen = document.getElementById('screen-permissions-main-control-change');
  const infoScreenEntries = INFO_STEPS.map((id) => ({
    id,
    element: document.getElementById(`screen-${id}`)
  })).filter(({ element }) => Boolean(element));

  const developerMode = new URLSearchParams(window.location.search).get('dev') === '1';

  // FIXED: Add all substep screens to screenDefinitions so showScreen() can find them
  const getAllSubstepScreens = () => {
    const substeps = [];
    for (const [parentStep, substepIds] of Object.entries(SUBSTEP_SEQUENCES)) {
      for (const substepId of substepIds) {
        // Skip main steps (already added manually)
        if (STEP_SEQUENCE.includes(substepId)) continue;
        const element = document.getElementById(`screen-${substepId}`);
        if (element) {
          substeps.push({
            id: substepId,
            isAdvanced: false,
            shouldSkip: () => false,
            element
          });
        }
      }
    }
    return substeps;
  };

  const screenDefinitions = [
    {
      id: 'documents',
      isAdvanced: false,
      shouldSkip: () => false,
      element: documentsScreen
    },
    {
      id: 'naming',
      isAdvanced: false,
      shouldSkip: () => false,
      element: namingScreen
    },
    {
      id: 'advanced',
      isAdvanced: false,
      shouldSkip: () => false,
      element: advancedScreen
    },
    {
      id: 'permissions',
      isAdvanced: false,
      shouldSkip: () => false,
      element: permissionsScreen
    },
    {
      id: 'distribution',
      isAdvanced: false,
      shouldSkip: () => false,
      element: distributionScreen
    },
    {
      id: 'search',
      isAdvanced: false,
      shouldSkip: () => false,
      element: searchScreen
    },
    {
      id: 'overview',
      isAdvanced: false,
      shouldSkip: () => false,
      element: overviewScreen
    },
    {
      id: 'export',
      isAdvanced: false,
      shouldSkip: () => false,
      element: exportScreen
    },
    ...getAllSubstepScreens(),
    ...infoScreenEntries.map(({ id, element }) => ({
      id,
      isAdvanced: false,
      shouldSkip: () => false,
      element
    }))
  ];

  const stepForms = {
    naming: namingForm,
    permissions: permissionsForm,
    distribution: distributionForm,
    advanced: advancedForm,
    registration: registrationForm
  };

  let activeScreens = [];
  let currentScreenId = STEP_SEQUENCE.includes(wizardState.active) ? wizardState.active : STEP_SEQUENCE[0];
  currentScreenId = resolveStepTargetId(currentScreenId);
  wizardState.active = currentScreenId;
  let lastSkippedSignature = null;

  // Initialize activeScreens early to prevent "No active screens available!" error
  function computeActiveScreens() {
    const skipped = [];
    const active = screenDefinitions.filter((definition) => {
      const skip = definition.shouldSkip(wizardState);
      const include = (!definition.isAdvanced || developerMode) && !skip;
      if (!include && developerMode && (definition.isAdvanced || skip)) {
        skipped.push(definition.id);
      }
      return include;
    });

    if (developerMode) {
      const signature = skipped.join('|');
      if (signature !== lastSkippedSignature) {
        lastSkippedSignature = signature;
        console.info('[Dash Token Wizard][dev] Skipped screens:', skipped);
      }
    }

    return active;
  }

  // Populate activeScreens immediately after screenDefinitions is ready
  activeScreens = computeActiveScreens();

  MANUAL_ACTION_DEFINITIONS.forEach((definition) => {
    let screen = null;
    switch (definition.key) {
      case 'manualMint':
        screen = manualMintScreen;
        break;
      case 'manualBurn':
        screen = manualBurnScreen;
        break;
      case 'manualFreeze':
        screen = manualFreezeScreen;
        break;
      case 'destroyFrozen':
        screen = destroyFrozenScreen;
        break;
      case 'emergencyAction':
        screen = emergencyActionScreen;
        break;
      case 'marketplaceTradeMode':
        screen = marketplaceTradeModeScreen;
        break;
      case 'directPricing':
        screen = directPricingScreen;
        break;
      case 'mainControl':
        screen = mainControlScreen;
        break;
      default:
        screen = null;
    }
    const ui = createManualActionUI(definition, screen);
    if (ui) {
      manualActionUIs[definition.key] = ui;
    }
  });


  ensureNamingFormState();
  initialisePermissionGroupsUI();
  initialiseLocalizationUI();
  initialiseUI();
  initialisePerpetualDistributionUI();
  initialisePreprogrammedDistributionUI();

  if (walletFileInput) {
    walletFileInput.addEventListener('change', handleWalletFileSelection);
  }
  if (walletMnemonicInput) {
    walletMnemonicInput.addEventListener('input', handleWalletMnemonicInput);
    // evaluateWallet does not accept args; drop stray object param
    walletMnemonicInput.addEventListener('blur', () => evaluateWallet());
  }
  if (identityRegisterButton) {
    identityRegisterButton.addEventListener('click', handleIdentityRegistration);
  }

  if (tokenNameInput) {
    tokenNameInput.addEventListener('input', handleNamingInput);
    // Blur: show field indicators but suppress error messages
    tokenNameInput.addEventListener('blur', () => evaluateNaming({
      touched: true,
      silent: true,
      showFieldIndicators: true
    }));
  }

  if (ownerIdentityInput) {
    ownerIdentityInput.addEventListener('input', handleNamingInput);
    ownerIdentityInput.addEventListener('blur', () => evaluateNaming({
      touched: true,
      silent: true,
      showFieldIndicators: true
    }));
  }

  // Plural field and capitalize checkbox
  if (tokenPluralInput) {
    tokenPluralInput.addEventListener('input', handleNamingInput);
    tokenPluralInput.addEventListener('blur', () => evaluateNaming({
      touched: true,
      silent: true,
      showFieldIndicators: true
    }));
  }
  if (tokenCapitalizeInput) {
    tokenCapitalizeInput.addEventListener('change', handleNamingInput);
  }

  // Auto-sync: Update English localization when token name fields change
  function syncToEnglishLocalization() {
    const singular = tokenNameInput ? tokenNameInput.value.trim() : '';
    const plural = tokenPluralInput ? tokenPluralInput.value.trim() : '';
    const shouldCapitalize = tokenCapitalizeInput ? tokenCapitalizeInput.checked : false;

    // Ensure naming structure exists
    if (!wizardState.form.naming) {
      wizardState.form.naming = { conventions: { localizations: {} }, rows: [] };
    }
    if (!wizardState.form.naming.conventions) {
      wizardState.form.naming.conventions = { localizations: {} };
    }
    if (!wizardState.form.naming.conventions.localizations) {
      wizardState.form.naming.conventions.localizations = {};
    }

    // Remove English localization if singular is empty, otherwise update it
    if (!singular) {
      delete wizardState.form.naming.conventions.localizations.en;
    } else {
      // Auto-update English localization (plural is required, no auto-generation)
      wizardState.form.naming.conventions.localizations.en = {
        singular_form: singular,
        plural_form: plural || '', // No auto-generation - user must provide plural
        should_capitalize: shouldCapitalize
      };
    }

    // Also update the English row's UI inputs if they exist
    updateEnglishLocalizationRowUI(singular, plural, shouldCapitalize);

    // Always persist the state (including deletions)
    if (typeof persistState === 'function') {
      persistState();
    }
  }

  // Update English localization row UI inputs to match token name fields
  function updateEnglishLocalizationRowUI(singular, plural, shouldCapitalize) {
    // Find the English row in localizationRows array
    if (typeof localizationRows !== 'undefined' && Array.isArray(localizationRows)) {
      const englishRow = localizationRows.find(row =>
        row.data && row.data.code && row.data.code.toLowerCase() === 'en'
      );
      if (englishRow && englishRow.elements) {
        // Update the input values
        if (englishRow.elements.singularInput) {
          englishRow.elements.singularInput.value = singular;
          englishRow.data.singularForm = singular;
        }
        if (englishRow.elements.pluralInput) {
          englishRow.elements.pluralInput.value = plural;
          englishRow.data.pluralForm = plural;
        }
        if (englishRow.elements.capitalizeInput) {
          englishRow.elements.capitalizeInput.checked = shouldCapitalize;
          englishRow.data.shouldCapitalize = shouldCapitalize;
        }
      }
    }
  }

  // Add auto-sync to all three fields
  if (tokenNameInput) {
    tokenNameInput.addEventListener('input', syncToEnglishLocalization);
  }
  if (tokenPluralInput) {
    tokenPluralInput.addEventListener('input', syncToEnglishLocalization);
  }
  if (tokenCapitalizeInput) {
    tokenCapitalizeInput.addEventListener('change', syncToEnglishLocalization);
  }

  /**
   * Sync naming UI inputs from wizard state.
   * Called when a template with custom values is applied.
   */
  function syncNamingUIFromState() {
    const state = window.wizardState;
    if (!state) return;

    // Update token name (singular) input
    if (tokenNameInput) {
      tokenNameInput.value = state.form.tokenName || '';
    }

    // Get English localization if it exists
    const enLoc = state.form.naming?.conventions?.localizations?.en;

    // Update plural input from English localization
    if (tokenPluralInput) {
      tokenPluralInput.value = enLoc?.plural_form || '';
    }

    // Update capitalize checkbox from English localization
    if (tokenCapitalizeInput) {
      tokenCapitalizeInput.checked = enLoc?.should_capitalize ?? false;
    }

    console.log('[Naming] UI synced from state:', {
      singular: state.form.tokenName,
      plural: enLoc?.plural_form,
      capitalize: enLoc?.should_capitalize
    });
  }

  // Expose globally for template loading
  window.syncNamingUIFromState = syncNamingUIFromState;

  if (registrationMethodsContainer) {
    registrationMethodsContainer.addEventListener('change', handleRegistrationSelection);
  }

  // Add event listener for Pre-Programmed distribution radio buttons
  const preprogrammedRadios = document.querySelectorAll('input[name="preprogrammed-enable"]');
  const preprogrammedEntriesContainer = document.getElementById('preprogrammed-entries-container');

  preprogrammedRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const enabled = event.target.value === 'yes';
      wizardState.form.distribution.enablePreProgrammed = enabled;

      // Get the rules card dynamically (in case it wasn't available at page load)
      const rulesCard = document.getElementById('preprogrammed-rules-card');

      // Show/hide the entries container and rules card
      if (preprogrammedEntriesContainer) {
        if (enabled) {
          // Remove collapsing class and hidden attribute
          preprogrammedEntriesContainer.classList.remove('collapsing');
          preprogrammedEntriesContainer.removeAttribute('hidden');
          // Show rules card when enabled
          if (rulesCard) {
            rulesCard.removeAttribute('hidden');
          }
          // Add first entry if enabling and no entries exist
          if (!wizardState.form.distribution.preProgrammed) {
            wizardState.form.distribution.preProgrammed = { entries: [] };
          }
          if (wizardState.form.distribution.preProgrammed.entries.length === 0) {
            addPreProgrammedEntry();
          }
        } else {
          // Add collapsing class for smooth animation
          preprogrammedEntriesContainer.classList.add('collapsing');
          // Wait for animation to complete before hiding
          setTimeout(() => {
            preprogrammedEntriesContainer.setAttribute('hidden', '');
            preprogrammedEntriesContainer.classList.remove('collapsing');
          }, 250);
          // Hide rules card when disabled
          if (rulesCard) {
            rulesCard.setAttribute('hidden', '');
          }
        }
      }

      persistState();
    });
  });

  // Add event listener for Add Distribution Entry button
  const addPreProgrammedEntryBtn = document.getElementById('add-preprogrammed-entry-btn');
  if (addPreProgrammedEntryBtn) {
    addPreProgrammedEntryBtn.addEventListener('click', () => {
      addPreProgrammedEntry();
    });
  }

  // Add event listener for Perpetual distribution radio buttons
  const perpetualRadios = document.querySelectorAll('input[name="perpetual-enable"]');
  const perpetualConfigContainer = document.getElementById('perpetual-config-container');

  perpetualRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const enabled = event.target.value === 'yes';
      wizardState.form.distribution.enablePerpetual = enabled;

      // Show/hide the config container with smooth animation
      if (perpetualConfigContainer) {
        if (enabled) {
          // Remove collapsing class and hidden attribute
          perpetualConfigContainer.classList.remove('collapsing');
          perpetualConfigContainer.removeAttribute('hidden');
          // Force reflow to ensure animation plays
          void perpetualConfigContainer.offsetHeight;
        } else {
          // Add collapsing class for smooth animation
          perpetualConfigContainer.classList.add('collapsing');
          // Wait for animation to complete before hiding
          setTimeout(() => {
            perpetualConfigContainer.setAttribute('hidden', '');
            perpetualConfigContainer.classList.remove('collapsing');
          }, 250);
        }
      }

      persistState();
    });
  });

  // Add event listeners for perpetual distribution safeguard checkboxes
  const perpetualSafeguardCheckboxes = [
    document.getElementById('perpetual-allow-change-authorized-to-none'),
    document.getElementById('perpetual-allow-change-admin-to-none'),
    document.getElementById('perpetual-allow-self-change-admin')
  ];

  perpetualSafeguardCheckboxes.forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        persistState();
      });
    }
  });

  // Add event listeners for perpetual distribution rule dropdowns
  const perpetualPerformActionSelect = document.getElementById('perpetual-perform-action');
  const perpetualChangeRulesSelect = document.getElementById('perpetual-change-rules');

  if (perpetualPerformActionSelect) {
    perpetualPerformActionSelect.addEventListener('change', () => {
      persistState();
    });
  }

  if (perpetualChangeRulesSelect) {
    perpetualChangeRulesSelect.addEventListener('change', () => {
      persistState();
    });
  }

  // Add event listeners for mint destination rules
  const mintDestinationPerformActionSelect = document.getElementById('mint-destination-perform-action');
  const mintDestinationChangeRulesSelect = document.getElementById('mint-destination-change-rules');
  const mintDestinationSafeguardCheckboxes = [
    document.getElementById('mint-destination-allow-change-authorized-to-none'),
    document.getElementById('mint-destination-allow-change-admin-to-none'),
    document.getElementById('mint-destination-allow-self-change-admin')
  ];

  if (mintDestinationPerformActionSelect) {
    mintDestinationPerformActionSelect.addEventListener('change', () => {
      persistState();
    });
  }

  if (mintDestinationChangeRulesSelect) {
    mintDestinationChangeRulesSelect.addEventListener('change', () => {
      persistState();
    });
  }

  mintDestinationSafeguardCheckboxes.forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        persistState();
      });
    }
  });

  // Add event listeners for allow choosing destination rules
  const allowChoosingPerformActionSelect = document.getElementById('allow-choosing-perform-action');
  const allowChoosingChangeRulesSelect = document.getElementById('allow-choosing-change-rules');
  const allowChoosingSafeguardCheckboxes = [
    document.getElementById('allow-choosing-allow-change-authorized-to-none'),
    document.getElementById('allow-choosing-allow-change-admin-to-none'),
    document.getElementById('allow-choosing-allow-self-change-admin')
  ];

  if (allowChoosingPerformActionSelect) {
    allowChoosingPerformActionSelect.addEventListener('change', () => {
      persistState();
    });
  }

  if (allowChoosingChangeRulesSelect) {
    allowChoosingChangeRulesSelect.addEventListener('change', () => {
      persistState();
    });
  }

  allowChoosingSafeguardCheckboxes.forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        persistState();
      });
    }
  });

  // Add event listeners for advanced contract settings
  const encryptionBoundedKeyInput = document.getElementById('encryption-bounded-key');
  const decryptionBoundedKeyInput = document.getElementById('decryption-bounded-key');
  const sizedIntegerTypesCheckbox = document.getElementById('sized-integer-types');

  if (encryptionBoundedKeyInput) {
    encryptionBoundedKeyInput.addEventListener('input', () => {
      persistState();
    });
  }

  if (decryptionBoundedKeyInput) {
    decryptionBoundedKeyInput.addEventListener('input', () => {
      persistState();
    });
  }

  if (sizedIntegerTypesCheckbox) {
    sizedIntegerTypesCheckbox.addEventListener('change', () => {
      persistState();
    });
  }

  // Add event listener for mint destination rules panel toggle
  const allowCustomDestinationCheckbox = document.getElementById('manual-mint-allow-custom-destination');
  const mintDestinationRulesPanel = document.getElementById('mint-destination-rules-panel');

  if (allowCustomDestinationCheckbox && mintDestinationRulesPanel) {
    allowCustomDestinationCheckbox.addEventListener('change', () => {
      if (allowCustomDestinationCheckbox.checked) {
        mintDestinationRulesPanel.removeAttribute('hidden');
      } else {
        mintDestinationRulesPanel.setAttribute('hidden', '');
      }
      persistState();
    });
  }

  // PROFESSIONAL REWRITE: Use event delegation on the wizard container to handle ALL form submissions
  const wizardContainer = document.querySelector('.wizard-shell');

  if (wizardContainer) {
    wizardContainer.addEventListener('submit', (event) => {
      // Check if the submitted element is a wizard form
      const form = event.target;
      if (!form || !form.classList.contains('wizard-form')) {
        return; // Not a wizard form, let it through
      }

      // This is a wizard form - prevent default submission
      event.preventDefault();
      event.stopPropagation();

      // Get the actual current screen from the DOM
      const activeScreen = document.querySelector('.wizard-screen--active');
      if (!activeScreen) {
        debug.error('No active screen found');
        return;
      }

      const currentSubstep = activeScreen.getAttribute('data-substep');
      const currentStep = activeScreen.getAttribute('data-step');
      const currentTab = activeScreen.getAttribute('data-tab');

      // Only navigate within the Token tab wizard flow
      if (currentTab !== 'token') {
        return;
      }

      // Validate before advancing
      const parentStep = getParentStep(currentSubstep) || currentSubstep;
      const validation = evaluateStep(parentStep, { touched: true });

      if (validation && !validation.valid) {
        announce(validation.message || 'Please complete this step before continuing.');
        return;
      }

      // Mark Distribution as valid when leaving Schedule substep
      if (currentSubstep === 'distribution' && validation && validation.valid) {
        wizardState.steps.distribution = wizardState.steps.distribution || {};
        wizardState.steps.distribution.validity = 'valid';
        wizardState.steps.distribution.touched = true;
        updateFurthestValidIndex();
      }

      // Find next substep
      const substepToUse = currentSubstep || currentStep;
      const nextSubstep = getNextSubstep(substepToUse);

      if (!nextSubstep) {
        return;
      }

      // Navigate to next substep
      showScreen(nextSubstep);
    }, true); // Use capture phase to ensure we catch it first
  } else {
    debug.error('Could not find wizard container');
  }

  const backButtons = Array.from(document.querySelectorAll('[data-step-back]'));
  backButtons.forEach((button) => {
    const explicitStepId = button.getAttribute('data-step-back');

    // FIX: If no explicit step ID, get the step from the parent screen element
    const getButtonStepId = () => {
      if (explicitStepId) {
        return explicitStepId;
      }
      // Fall back to parent screen's data-step attribute or current active screen
      const parentScreen = button.closest('.wizard-screen');
      return parentScreen?.getAttribute('data-step') || wizardState.active;
    };

    const stepId = getButtonStepId();
    if (stepId === STEP_SEQUENCE[0]) {
      button.setAttribute('tabindex', '-1');
      button.addEventListener('click', (event) => {
        event.preventDefault();
      });
      return;
    }
    // Use dynamic stepId resolution to handle empty data-step-back attributes
    button.addEventListener('click', () => goToPreviousScreen(getButtonStepId()));
  });

  const returnButtons = Array.from(document.querySelectorAll('[data-step-return]'));
  returnButtons.forEach((button) => {
    const targetStep = button.getAttribute('data-step-return');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!targetStep) {
        return;
      }
      manualNavigationActive = true;
      showScreen(targetStep, { force: true });
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.wizard-info-trigger');
    if (!trigger) {
      return;
    }
    const panelId = trigger.getAttribute('aria-controls');
    if (!panelId) {
      return;
    }
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      panel.setAttribute('hidden', '');
    } else {
      panel.removeAttribute('hidden');
    }
  });

  if (jsonShowButton) {
    jsonShowButton.addEventListener('click', () => {
      if (wizardState.form.registration.method !== 'det') {
        return;
      }
      renderJsonPreview();
      wizardState.form.registration.preflight.det.jsonDisplayed = Boolean(jsonPreviewContent.textContent && jsonPreviewContent.textContent.length > 0);
      evaluateRegistration({ touched: true });
      syncRegistrationPreflightUI();
    });
  }
  if (jsonCopyButton) {
    jsonCopyButton.addEventListener('click', copyJsonPayload);
  }
  if (copyJsonBtn && contractJsonPreview) {
    copyJsonBtn.addEventListener('click', () => {
      const text = contractJsonPreview.textContent;
      if (!text || text.trim() === '' || text.trim() === '{') {
        announce('No contract JSON to copy yet. Please complete the wizard first.');
        return;
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
          .then(() => {
            announce('Contract JSON copied to clipboard.');
            const originalText = copyJsonBtn.textContent;
            copyJsonBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyJsonBtn.textContent = originalText;
            }, 2000);
          })
          .catch(() => fallbackCopyToClipboard(text));
      } else {
        fallbackCopyToClipboard(text);
      }
    });
  }
  if (createTokenButton) {
    createTokenButton.addEventListener('click', () => handleStepAdvance('export'));
  }

  // Export to Documents buttons (footer button and main content button)
  if (exportToDocumentsButton) {
    exportToDocumentsButton.addEventListener('click', handleExportToDocuments);
  }
  const exportSaveBtn = document.getElementById('export-save-btn');
  if (exportSaveBtn) {
    exportSaveBtn.addEventListener('click', handleExportToDocuments);
  }

  if (overviewNextButton) {
    overviewNextButton.addEventListener('click', () => handleStepAdvance('overview'));
  }

  if (overviewBackButton) {
    overviewBackButton.addEventListener('click', () => goToPreviousScreen('overview'));
  }

  if (searchNextButton) {
    searchNextButton.addEventListener('click', () => {
      // Validate search step first
      const validation = evaluateSearch({ touched: true });
      if (!validation.valid) {
        announce(validation.message || 'Complete the search configuration to continue.');
        return;
      }

      // Show confirmation modal instead of direct navigation
      if (typeof window.showSettingsConfirmationModal === 'function') {
        window.showSettingsConfirmationModal();
      } else {
        // Fallback to direct navigation if modal not available
        handleStepAdvance('search');
      }
    });
  }

  if (searchKeywordsInput) {
    searchKeywordsInput.addEventListener('input', () => {
      wizardState.form.search.keywords = searchKeywordsInput.value.trim();
      evaluateSearch({ touched: true });
      updateKeywordsPreview();
    });
  }

  if (searchDescriptionInput) {
    searchDescriptionInput.addEventListener('input', () => {
      wizardState.form.search.description = searchDescriptionInput.value.trim();
      evaluateSearch({ touched: true });
    });
  }

  const readinessEvents = [
    [
      'json:ready',
      (ready) => {
        wizardState.form.registration.preflight.det.jsonDisplayed = ready;
        if (jsonPreview) {
          jsonPreview.hidden = !ready;
        }
      }
    ],
    [
      'identity:ready',
      (ready, detail) => {
        const identityId = ready && detail && detail.id ? String(detail.id) : '';
        wizardState.form.registration.identity.id = ready ? identityId || wizardState.form.registration.identity.id : '';
        syncIdentityUI();
      }
    ],
    [
      'privateKey:ready',
      (ready, detail) => {
        const wallet = wizardState.form.registration.wallet;
        wallet.privateKey = ready
          ? (detail && detail.privateKey ? String(detail.privateKey).trim() : wallet.privateKey)
          : '';
        if (ready) {
          wallet.mnemonic = '';
        }
        syncWalletInsights();
      }
    ]
  ];

  readinessEvents.forEach(([eventName, apply]) => {
    window.addEventListener(eventName, (event) => {
      const detail = event && typeof event === 'object' ? event.detail : undefined;
      const ready =
        detail && typeof detail.ready === 'boolean'
          ? Boolean(detail.ready)
          : true;
      apply(ready, detail || {});
      syncWizardReadiness({ refreshStatus: true });
      persistState();
      if (wizardState.steps.registration.touched) {
        evaluateRegistration({ touched: true, silent: false });
      }
    });
  });

  if (selfWarningCheckbox) {
    selfWarningCheckbox.addEventListener('change', () => {
      if (wizardState.form.registration.preflight.self.warningAcknowledged) {
        return;
      }
      syncRegistrationPreflightUI();
    });
  }
  if (selfWarningProceedButton) {
    selfWarningProceedButton.addEventListener('click', () => {
      if (wizardState.form.registration.method !== 'self') {
        return;
      }
      const identityId = (wizardState.form.registration.identity.id || '').trim();
      if (!identityId) {
        registrationMessage.textContent = 'Register an identity before proceeding.';
        return;
      }
      if (!selfWarningCheckbox || !selfWarningCheckbox.checked) {
        registrationMessage.textContent = 'Tick “I understand the risks” before proceeding.';
        return;
      }
      wizardState.form.registration.preflight.self.warningAcknowledged = true;
      evaluateRegistration({ touched: true });
      syncRegistrationPreflightUI();
    });
  }
  document.addEventListener('keydown', handleEscapeShortcut);
  window.addEventListener('unhandledrejection', handleChunkLoadRejection);
  window.addEventListener('error', handleChunkLoadError, true);
  window.addEventListener('evo:sdk-ready', () => {
    if (getPrimaryStepId(wizardState.active) === 'export') {
      validateExportContract();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Pre-Programmed Distribution UI
  // ═══════════════════════════════════════════════════════════════════════════

  let preprogrammedEntryIdCounter = 0;
  const preprogrammedEntries = [];

  function initialisePerpetualDistributionUI() {
    // Sync UI with state on initialization
    const yesRadio = document.querySelector('input[name="perpetual-enable"][value="yes"]');
    const noRadio = document.querySelector('input[name="perpetual-enable"][value="no"]');
    const configContainer = document.getElementById('perpetual-config-container');

    // Only run if the elements exist on the page
    if (!yesRadio || !noRadio || !configContainer) {
      return;
    }

    // Default to "No" (disabled) unless explicitly enabled in state
    if (wizardState.form.distribution.enablePerpetual) {
      yesRadio.checked = true;
      configContainer.removeAttribute('hidden');
    } else {
      noRadio.checked = true;
      configContainer.setAttribute('hidden', '');
    }
  }

  function initialisePreprogrammedDistributionUI() {
    // Sync UI with state on initialization
    const enabledRadio = document.querySelector('input[name="preprogrammed-enable"][value="yes"]');
    const disabledRadio = document.querySelector('input[name="preprogrammed-enable"][value="no"]');
    const entriesContainer = document.getElementById('preprogrammed-entries-container');
    const rulesCard = document.getElementById('preprogrammed-rules-card');

    // Only run if the elements exist on the page
    if (!enabledRadio || !disabledRadio || !entriesContainer) {
      return;
    }

    if (wizardState.form.distribution.enablePreProgrammed) {
      if (enabledRadio) {
        enabledRadio.checked = true;
      }
      if (entriesContainer) {
        entriesContainer.removeAttribute('hidden');
      }
      // Show rules card when enabled
      if (rulesCard) {
        rulesCard.removeAttribute('hidden');
      }
      // Restore entries from state
      if (wizardState.form.distribution.preProgrammed && wizardState.form.distribution.preProgrammed.entries) {
        wizardState.form.distribution.preProgrammed.entries.forEach(entry => {
          addPreProgrammedEntry(entry);
        });
      }
    } else {
      if (disabledRadio) {
        disabledRadio.checked = true;
      }
      if (entriesContainer) {
        entriesContainer.setAttribute('hidden', '');
      }
      // Hide rules card when disabled
      if (rulesCard) {
        rulesCard.setAttribute('hidden', '');
      }
    }
  }

  function addPreProgrammedEntry(initialData = null) {
    const entriesList = document.getElementById('preprogrammed-entries-list');
    if (!entriesList) return;

    preprogrammedEntryIdCounter += 1;
    const entryId = `preprogrammed-entry-${preprogrammedEntryIdCounter}`;

    const entry = {
      id: entryId,
      days: initialData?.days || 0,
      hours: initialData?.hours || 0,
      minutes: initialData?.minutes || 0,
      identity: initialData?.identity || '',
      amount: initialData?.amount || ''
    };

    const entryElement = createPreProgrammedEntryElement(entry);
    preprogrammedEntries.push({ id: entryId, element: entryElement, data: entry });
    entriesList.appendChild(entryElement);

    // Add to state
    if (!initialData) {
      if (!wizardState.form.distribution.preProgrammed) {
        wizardState.form.distribution.preProgrammed = { entries: [] };
      }
      wizardState.form.distribution.preProgrammed.entries.push(entry);
      persistState();
    }
  }

  function createPreProgrammedEntryElement(entry) {
    const container = document.createElement('div');
    container.className = 'preprogrammed-entry';
    container.dataset.entryId = entry.id;
    container.style.cssText = 'border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); background: var(--color-surface);';

    const entryNumber = preprogrammedEntries.length + 1;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
        <h4 style="margin: 0; font-size: 1rem; font-weight: 600;">Timestamp #${entryNumber}</h4>
        <button type="button" class="wizard-button wizard-button--secondary wizard-button--sm remove-preprogrammed-entry" data-entry-id="${entry.id}" style="padding: var(--space-1) var(--space-3);">Remove</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: var(--space-3);">
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-days">Days</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-days" value="${entry.days}" min="0" placeholder="0">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-hours">Hours</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-hours" value="${entry.hours}" min="0" max="23" placeholder="0">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-minutes">Minutes</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-minutes" value="${entry.minutes}" min="0" max="59" placeholder="0">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-3);">
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-identity">Identity</label>
          <input class="wizard-field__input" type="text" id="${entry.id}-identity" value="${entry.identity}" placeholder="Identity ID">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-amount">Amount</label>
          <input class="wizard-field__input" type="text" id="${entry.id}-amount" value="${entry.amount}" placeholder="Token amount">
        </div>
      </div>
    `;

    // Add event listeners for inputs
    const daysInput = container.querySelector(`#${entry.id}-days`);
    const hoursInput = container.querySelector(`#${entry.id}-hours`);
    const minutesInput = container.querySelector(`#${entry.id}-minutes`);
    const identityInput = container.querySelector(`#${entry.id}-identity`);
    const amountInput = container.querySelector(`#${entry.id}-amount`);
    const removeBtn = container.querySelector('.remove-preprogrammed-entry');

    [daysInput, hoursInput, minutesInput, identityInput, amountInput].forEach(input => {
      input.addEventListener('input', () => {
        updatePreProgrammedEntryData(entry.id, {
          days: parseInt(daysInput.value) || 0,
          hours: parseInt(hoursInput.value) || 0,
          minutes: parseInt(minutesInput.value) || 0,
          identity: identityInput.value,
          amount: amountInput.value
        });
      });
    });

    removeBtn.addEventListener('click', () => {
      removePreProgrammedEntry(entry.id);
    });

    return container;
  }

  function updatePreProgrammedEntryData(entryId, data) {
    if (!wizardState.form.distribution.preProgrammed) {
      wizardState.form.distribution.preProgrammed = { entries: [] };
    }
    const entryIndex = wizardState.form.distribution.preProgrammed.entries.findIndex(e => e.id === entryId);
    if (entryIndex !== -1) {
      wizardState.form.distribution.preProgrammed.entries[entryIndex] = {
        ...wizardState.form.distribution.preProgrammed.entries[entryIndex],
        ...data
      };
      persistState();
    }
  }

  function removePreProgrammedEntry(entryId) {
    const entryIndex = preprogrammedEntries.findIndex(e => e.id === entryId);
    if (entryIndex !== -1) {
      const entry = preprogrammedEntries[entryIndex];
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
      preprogrammedEntries.splice(entryIndex, 1);
    }

    // Remove from state
    if (wizardState.form.distribution.preProgrammed) {
      const stateIndex = wizardState.form.distribution.preProgrammed.entries.findIndex(e => e.id === entryId);
      if (stateIndex !== -1) {
        wizardState.form.distribution.preProgrammed.entries.splice(stateIndex, 1);
        persistState();
      }
    }
  }

  function initialiseUI() {
    hydrateFormsFromState();
    TRACKED_STEPS.forEach(updateStepStatusUI);
    // Re-evaluate all steps - only show Invalid if previously touched
    // Unvisited steps will show Pending
    STEP_SEQUENCE.forEach((stepId) => {
      const step = wizardState.steps[stepId];
      evaluateStep(stepId, {
        touched: step.touched,  // Only show Invalid if previously visited
        silent: true            // Suppress error messages on page load
      });
    });
    // FIX: Recalculate furthestValidIndex based on newly evaluated step validity
    wizardState.furthestValidIndex = computeFurthestValidIndexFromSteps(wizardState.steps);
    syncManualActionUIs({ announce: false });
    updateRegistrationPreviewVisibility();
    refreshFlow({ initial: true, suppressFocus: true });
    // P2: Initialize sidebar progress bar
    updateSidebarProgress();
  }

  function hydrateFormsFromState() {
    const walletState = wizardState.form.registration.wallet;
    const identityState = wizardState.form.registration.identity;
    if (walletMnemonicInput) {
      walletMnemonicInput.value = walletState.mnemonic || '';
    }
    if (identityIdOutput) {
      identityIdOutput.value = identityState.id || '';
    }

    syncWalletInsights();
    syncIdentityUI();

    tokenNameInput.value = wizardState.form.tokenName || '';
    if (ownerIdentityInput) {
      ownerIdentityInput.value = wizardState.form.ownerIdentityId || '';
    }

    ensureNamingFormState();
    renderLocalizationRows(wizardState.form.naming.rows);
    validateLocalizationRows({ silent: true });

    if (permissionsUI && typeof permissionsUI.setValues === 'function') {
      permissionsUI.setValues(wizardState.form.permissions);
    }
    ensurePermissionsGroupState();
    renderPermissionGroups();

    // Sync manual actions UI (show/hide controls based on enabled state)
    if (typeof syncManualActionUIs === 'function') {
      syncManualActionUIs({ announce: false });
    }

    // Sync transfer notes UI
    if (transferUI && typeof transferUI.load === 'function') {
      transferUI.load();
    }

    if (distributionUI && typeof distributionUI.setValues === 'function') {
      distributionUI.setValues(wizardState.form.distribution);
    }
    if (advancedUI && typeof advancedUI.setValues === 'function') {
      advancedUI.setValues(wizardState.form.advanced);
    }

    syncRegistrationSelection();
    syncRegistrationPreflightUI();

    // Update feature indicators in sidebar based on restored state
    if (window.updateFeatureIndicators) {
      window.updateFeatureIndicators();
    }
  }

  function getWalletCredentials() {
    const wallet = wizardState.form.registration.wallet;
    const mnemonic = (wallet.mnemonic || '').trim();
    const privateKey = (wallet.privateKey || '').trim();
    return { mnemonic, privateKey };
  }

  function computeWalletFingerprint({ mnemonic, privateKey }) {
    if (mnemonic) {
      return `mnemonic:${mnemonic}`;
    }
    if (privateKey) {
      return `privateKey:${privateKey}`;
    }
    return '';
  }

  function normalizeWalletBalance(rawBalance) {
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

  function formatWalletBalance(rawBalance) {
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

  function resetWalletRuntime() {
    wizardState.runtime.walletClient = null;
    wizardState.runtime.walletClientFingerprint = null;
    wizardState.runtime.walletInitializationError = '';
    wizardState.runtime.walletInfoLoading = false;
    walletClientInitializationPromise = null;
    walletClientInitializationFingerprint = null;
  }

  function resetIdentityState({ persist = false } = {}) {
    wizardState.form.registration.identity = cloneDefaultIdentityState();
    wizardState.form.registration.preflight.self.warningAcknowledged = false;
    if (identityIdOutput) {
      identityIdOutput.value = '';
    }
    if (identityMessage) {
      identityMessage.textContent = '';
    }
    if (selfWarningCheckbox) {
      selfWarningCheckbox.checked = false;
      selfWarningCheckbox.disabled = false;
    }
    if (selfWarningProceedButton) {
      selfWarningProceedButton.disabled = true;
    }
    if (persist) {
      persistState();
    }
    syncIdentityUI();
    const registrationTouched = wizardState.steps.registration.touched;
    evaluateRegistration({ touched: registrationTouched, silent: !registrationTouched });
  }

  function syncWalletInsights() {
    const wallet = wizardState.form.registration.wallet;
    if (walletAddressValue) {
      walletAddressValue.textContent = wallet.address || '—';
    }
    if (walletBalanceValue) {
      walletBalanceValue.textContent = formatWalletBalance(wallet.balance);
    }
    if (walletBalanceNote) {
      if (wizardState.runtime.walletInitializationError) {
        walletBalanceNote.textContent = wizardState.runtime.walletInitializationError;
      } else if (wizardState.runtime.walletInfoLoading) {
        walletBalanceNote.textContent = 'Fetching wallet details…';
      } else if (wallet.balance === null) {
        walletBalanceNote.textContent = 'Import a wallet to preview balance and address.';
      } else if (Number(wallet.balance) === 0) {
        walletBalanceNote.textContent = 'Balance is 0 DASH. Use the Dash testnet faucet before registering an identity.';
      } else {
        walletBalanceNote.textContent = 'Wallet ready. Identity registration requires a small spendable balance.';
      }
    }
    syncWizardReadiness();
  }

  function syncIdentityUI() {
    const wallet = wizardState.form.registration.wallet;
    const identity = wizardState.form.registration.identity;
    const method = wizardState.form.registration.method;
    const hasWalletCredentials = Boolean((wallet.mnemonic || '').trim() || (wallet.privateKey || '').trim());
    const walletValid = hasWalletCredentials;
    const loading = wizardState.runtime.walletInfoLoading;
    const hasError = Boolean(wizardState.runtime.walletInitializationError);
    const balance = wallet.balance;
    const balanceKnown = typeof balance === 'number' && Number.isFinite(balance);
    const hasSpendableBalance = balanceKnown && balance > 0;

    if (identityRegisterButton) {
      const shouldDisable = method !== 'self' || !walletValid || loading || hasError || (balanceKnown && !hasSpendableBalance);
      identityRegisterButton.disabled = shouldDisable;
    }

    if (identityGuidance) {
      if (!walletValid) {
        identityGuidance.textContent = 'Import a wallet before registering an identity.';
      } else if (hasError) {
        identityGuidance.textContent = wizardState.runtime.walletInitializationError;
      } else if (loading) {
        identityGuidance.textContent = 'Fetching wallet details…';
      } else if (balanceKnown && !hasSpendableBalance) {
        identityGuidance.textContent = 'Top up your Dash testnet wallet before continuing. Identity registration spends credits as fees.';
      } else {
        identityGuidance.textContent = identity.id
          ? 'Identity registered. Copy the identifier for future use.'
          : 'Identities enable interactions on Dash Platform. Registration spends a small portion of wallet balance.';
      }
    }
    syncWizardReadiness();
  }

  function handleWalletMnemonicInput() {
    if (!walletMnemonicInput) {
      return;
    }
    const rawValue = walletMnemonicInput.value || '';
    wizardState.form.registration.wallet.mnemonic = rawValue;
    if (rawValue.trim().length > 0) {
      wizardState.form.registration.wallet.privateKey = '';
    }
    evaluateWallet();
  }

  function extractWalletSecrets(source) {
    const result = { mnemonic: '', privateKey: '' };
    const stack = [source];
    const visited = new Set();
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') {
        continue;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      if (typeof current.mnemonic === 'string' && !result.mnemonic) {
        result.mnemonic = current.mnemonic.trim();
      }
      if (typeof current.privateKey === 'string' && !result.privateKey) {
        result.privateKey = current.privateKey.trim();
      }
      Object.keys(current).forEach((key) => {
        const value = current[key];
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      });
      if (result.mnemonic && result.privateKey) {
        break;
      }
    }
    return result;
  }

  function handleWalletFileSelection(event) {
    const input = event.target;
    const files = input && input.files ? Array.from(input.files) : [];
    if (!files.length) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const secrets = extractWalletSecrets(parsed);
        const wallet = wizardState.form.registration.wallet;
        if (secrets.mnemonic) {
          wallet.mnemonic = secrets.mnemonic;
          wallet.privateKey = '';
          if (walletMnemonicInput) {
            walletMnemonicInput.value = secrets.mnemonic;
          }
        } else if (secrets.privateKey) {
          wallet.privateKey = secrets.privateKey;
          wallet.mnemonic = '';
          if (walletMnemonicInput) {
            walletMnemonicInput.value = '';
          }
        } else {
          walletMessage.textContent = 'Wallet file must include a mnemonic or private key.';
          wallet.mnemonic = '';
          wallet.privateKey = '';
          evaluateWallet();
          return;
        }
        evaluateWallet();
      } catch (error) {
        console.debug('Wallet file parse error', error);
        walletMessage.textContent = 'Unable to read wallet file. Provide valid JSON.';
        const wallet = wizardState.form.registration.wallet;
        wallet.mnemonic = '';
        wallet.privateKey = '';
        evaluateWallet();
      } finally {
        if (input) {
          input.value = '';
        }
      }
    };
    reader.onerror = () => {
      walletMessage.textContent = 'Unable to read wallet file.';
      if (input) {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  function evaluateWallet() {
    const wallet = wizardState.form.registration.wallet;
    const previousFingerprint = wallet.fingerprint || '';
    const credentials = getWalletCredentials();
    let valid = false;
    let message = '';

    if (credentials.mnemonic) {
      const normalized = credentials.mnemonic.replace(/\s+/g, ' ').trim();
      const words = normalized.split(' ').filter(Boolean);
      if (words.length < 12 || words.length > 24) {
        message = 'Mnemonic must contain 12 to 24 words.';
      } else {
        wallet.mnemonic = normalized;
        wallet.privateKey = '';
        valid = true;
      }
    } else if (credentials.privateKey) {
      const normalizedKey = credentials.privateKey.trim();
      if (normalizedKey.length < 30) {
        message = 'Private key must be at least 30 characters.';
      } else {
        wallet.privateKey = normalizedKey;
        wallet.mnemonic = '';
        valid = true;
      }
    } else {
      message = 'Import a wallet file or enter a mnemonic to continue.';
    }

    if (walletMessage) {
      walletMessage.textContent = valid ? '' : message;
    }

    const validation = { valid, message };

    if (!valid) {
      wallet.fingerprint = '';
      wallet.address = '';
      wallet.balance = null;
      resetWalletRuntime();
      syncWalletInsights();
      syncIdentityUI();
      persistState();
      return validation;
    }

    const fingerprint = computeWalletFingerprint(getWalletCredentials());
    wallet.fingerprint = fingerprint;

    if (fingerprint && fingerprint !== previousFingerprint) {
      wallet.address = '';
      wallet.balance = null;
      resetWalletRuntime();
      resetIdentityState();
    }

    persistState();
    syncWalletInsights();
    syncIdentityUI();

    if (fingerprint) {
      initialiseWalletClientWithFingerprint(fingerprint);
    }

    evaluateRegistration({ touched: wizardState.steps.registration.touched, silent: true });
    return validation;
  }

  function initialiseWalletClientWithFingerprint(fingerprint) {
    if (!fingerprint) {
      return;
    }
    if (wizardState.runtime.walletClient && wizardState.runtime.walletClientFingerprint === fingerprint) {
      return;
    }
    if (walletClientInitializationPromise && walletClientInitializationFingerprint === fingerprint) {
      return;
    }

    const credentials = getWalletCredentials();
    const wallet = wizardState.form.registration.wallet;
    wizardState.runtime.walletInfoLoading = true;
    wizardState.runtime.walletInitializationError = '';
    syncWalletInsights();
    syncIdentityUI();

    walletClientInitializationFingerprint = fingerprint;
    walletClientInitializationPromise = (async () => {
      try {
        if (!window.Dash || typeof window.Dash.Client !== 'function') {
          throw new Error('Dash SDK is unavailable. Include the Dash JS client script.');
        }
        // Enable network by default so address/balance/identity work on testnet
        const options = {
          network: 'testnet',
          wallet: { offlineMode: false }
        };
        if (credentials.mnemonic) {
          options.wallet.mnemonic = credentials.mnemonic;
        }
        if (credentials.privateKey) {
          options.wallet.privateKey = credentials.privateKey;
        }

        const client = new window.Dash.Client(options);
        wizardState.runtime.walletClient = client;
        wizardState.runtime.walletClientFingerprint = fingerprint;

        let address = '';
        let balance = null;
        try {
          address = await client.wallet.getUnusedAddress();
        } catch (error) {
          console.debug('Unable to read wallet address', error);
        }
        try {
          const reportedBalance = await client.wallet.getBalance();
          balance = normalizeWalletBalance(reportedBalance);
        } catch (error) {
          console.debug('Unable to read wallet balance', error);
        }

        wallet.address = address || '';
        wallet.balance = balance;
        wizardState.runtime.walletInitializationError = '';
      } catch (error) {
        console.debug('Wallet client initialisation failed', error);
        wizardState.runtime.walletClient = null;
        wizardState.runtime.walletClientFingerprint = null;
        wallet.address = '';
        wallet.balance = null;
        wizardState.runtime.walletInitializationError = error && error.message ? String(error.message) : 'Unable to initialise wallet client.';
      } finally {
        wizardState.runtime.walletInfoLoading = false;
        walletClientInitializationPromise = null;
        walletClientInitializationFingerprint = null;
        persistState();
        syncWalletInsights();
        syncIdentityUI();
      }
    })();
  }

  async function handleIdentityRegistration(event) {
    event.preventDefault();
    const wallet = wizardState.form.registration.wallet;
    const hasWalletCredentials = Boolean((wallet.mnemonic || '').trim() || (wallet.privateKey || '').trim());
    if (!hasWalletCredentials) {
      announce('Import a wallet before registering an identity.');
      return;
    }
    const runtimeClient = wizardState.runtime.walletClient;
    if (!runtimeClient || typeof runtimeClient.platform !== 'object') {
      evaluateWallet();
      if (!wizardState.runtime.walletClient) {
        announce('Wallet client unavailable. Confirm the Dash SDK script is loaded.');
        return;
      }
    }

    const client = wizardState.runtime.walletClient;
    if (!client) {
      announce('Wallet client unavailable.');
      return;
    }

    // Performance Enhancement: Show loading state for identity registration
    if (identityRegisterButton) {
      setButtonLoading(identityRegisterButton);
    }
    if (identityMessage) {
      identityMessage.textContent = 'Registering identity…';
    }
    showLoadingOverlay('Registering identity on Dash Platform...');

    try {
      const identity = await client.platform.identities.register();
      const identityId = identity && typeof identity.getId === 'function'
        ? identity.getId().toString()
        : identity?.id?.toString?.() ?? '';
      if (!identityId) {
        throw new Error('Registration succeeded without returning an identity id.');
      }
      wizardState.form.registration.identity.id = identityId;
      if (identityIdOutput) {
        identityIdOutput.value = identityId;
      }
      if (identityMessage) {
        identityMessage.textContent = 'Identity registered successfully.';
      }
      wizardState.form.registration.preflight.self.warningAcknowledged = false;
      if (selfWarningCheckbox) {
        selfWarningCheckbox.checked = false;
        selfWarningCheckbox.disabled = false;
      }
      if (selfWarningProceedButton) {
        selfWarningProceedButton.disabled = true;
      }
      syncIdentityUI();
      evaluateRegistration({ touched: true });
      announce('Identity registration complete.');
    } catch (error) {
      debug.error('Identity registration failed', error);
      const reason = error && error.message ? String(error.message) : 'Identity registration failed.';
      if (identityMessage) {
        identityMessage.textContent = reason;
      }
      syncIdentityUI();
      evaluateRegistration({ touched: wizardState.steps.registration.touched, silent: true });
    } finally {
      // Performance Enhancement: Always hide loading overlay when operation completes
      hideLoadingOverlay();
      syncIdentityUI();
    }
  }

  function handleNamingInput() {
    // Save all naming fields to state (using token name as singular form)
    wizardState.form.naming.singular = tokenNameInput.value;
    wizardState.form.naming.plural = tokenPluralInput.value;
    wizardState.form.naming.capitalize = tokenCapitalizeInput.checked;

    const touched = tokenNameInput.value.length > 0 || wizardState.steps.naming.touched;
    const validation = evaluateNaming({ touched });
    if (validation.valid) {
      const method = wizardState.form.registration.method;
      if (method === 'det' && wizardState.form.registration.preflight.det.jsonDisplayed) {
        renderJsonPreview();
      }
    }
  }

  function evaluateNaming({ touched = false, silent = false, showFieldIndicators = false } = {}) {
    const rawValue = tokenNameInput.value;
    const nameResult = validateTokenName(rawValue);

    // Error messages: only show when NOT silent (Continue button click)
    if (!silent) {
      tokenNameMessage.textContent = nameResult.valid ? '' : nameResult.message;
    } else {
      tokenNameMessage.textContent = '';
    }

    // ADDED: Visual feedback for validation state
    if (rawValue.trim().length > 0) {
      if (nameResult.valid) {
        tokenNameInput.classList.remove('wizard-field__input--error');
        tokenNameInput.classList.add('wizard-field__input--valid');
      } else {
        tokenNameInput.classList.remove('wizard-field__input--valid');
        tokenNameInput.classList.add('wizard-field__input--error');
      }
    } else {
      tokenNameInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
    }

    wizardState.form.tokenName = rawValue;

    // Validate owner identity ID (optional - field may not exist in UI)
    let identityResult = { valid: true, message: '' };
    if (ownerIdentityInput) {
      const rawIdentity = ownerIdentityInput.value;
      identityResult = validateBase58Identity(rawIdentity);

      // Error messages: only show when NOT silent
      if (!silent) {
        if (ownerIdentityMessage) {
          ownerIdentityMessage.textContent = identityResult.valid ? '' : identityResult.message;
        }
      } else {
        if (ownerIdentityMessage) {
          ownerIdentityMessage.textContent = '';
        }
      }

      // Visual feedback for identity
      if (rawIdentity.trim().length > 0) {
        if (identityResult.valid) {
          ownerIdentityInput.classList.remove('wizard-field__input--error');
          ownerIdentityInput.classList.add('wizard-field__input--valid');
        } else {
          ownerIdentityInput.classList.remove('wizard-field__input--valid');
          ownerIdentityInput.classList.add('wizard-field__input--error');
        }
      } else {
        ownerIdentityInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }

      wizardState.form.ownerIdentityId = rawIdentity;
    } else {
      // Owner identity input not in UI, set to empty string
      wizardState.form.ownerIdentityId = '';
    }

    // Validate plural form (using token name as singular)
    const plural = tokenPluralInput.value.trim();
    let pluralValid = true;
    let pluralError = '';

    if (plural.length === 0) {
      pluralError = 'Enter a plural name.';
      pluralValid = false;
    } else if (plural.length < 3 || plural.length > 25) {
      pluralError = 'Must be 3-25 characters.';
      pluralValid = false;
    } else if (plural !== tokenPluralInput.value) {
      pluralError = 'Remove leading or trailing spaces.';
      pluralValid = false;
    }

    // Update plural UI - error messages only when NOT silent
    if (!silent) {
      tokenPluralMessage.textContent = pluralError;

      // Visual feedback for plural
      if (plural.length > 0) {
        if (pluralValid) {
          tokenPluralInput.classList.remove('wizard-field__input--error');
          tokenPluralInput.classList.add('wizard-field__input--valid');
        } else {
          tokenPluralInput.classList.remove('wizard-field__input--valid');
          tokenPluralInput.classList.add('wizard-field__input--error');
        }
      } else {
        tokenPluralInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Save singular/plural/capitalize to state (using token name as singular)
    wizardState.form.naming.singular = tokenNameInput.value;
    wizardState.form.naming.plural = tokenPluralInput.value;
    wizardState.form.naming.capitalize = tokenCapitalizeInput.checked;

    const localizationResult = validateLocalizationRows({ touched, silent });
    const isValid = nameResult.valid && identityResult.valid && pluralValid && localizationResult.valid;

    namingNextButton.disabled = !isValid;

    // Also control the localization substep Continue button
    if (namingLocalizationNextButton) {
      namingLocalizationNextButton.disabled = !localizationResult.valid;
    }

    updateStepStatusFromValidation('naming', { valid: isValid }, touched);

    persistState();
    return { valid: isValid };
  }

  function evaluatePermissions({ touched = false, silent = false, showFieldIndicators = false } = {}) {
    // FIXED: Return invalid if permissionsUI not initialized (don't default to valid)
    if (!permissionsUI || typeof permissionsUI.getValues !== 'function') {
      debug.warn('evaluatePermissions called but permissionsUI not initialized');
      return { valid: false, message: 'Permissions configuration not loaded' };
    }

    const values = permissionsUI.getValues();
    const keepsHistory = normalizeKeepsHistory(values.keepsHistory);
    const decimals = Number.parseInt(values.decimals, 10);

    let message = '';
    let valid = true;

    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 16) {
      message = 'Decimals must be between 0 and 16.';
      valid = false;
    }

    const normalizedBase = valid ? normalizeTokenAmount(values.baseSupply, decimals) : null;
    if (valid && normalizedBase === null) {
      message = 'Enter a numeric base supply (decimals allowed based on token decimals setting).';
      valid = false;
    }

    let normalizedMax = null;
    if (valid && values.useMaxSupply) {
      normalizedMax = normalizeTokenAmount(values.maxSupply, decimals);
      if (normalizedMax === null) {
        message = 'Enter a numeric max supply or disable the limit (decimals allowed).';
        valid = false;
      }
    }

    // FIXED: Use safe BigInt comparison with fallback for older browsers
    if (valid && normalizedMax !== null && normalizedBase !== null) {
      try {
        const comparison = safeBigIntCompare(normalizedMax, normalizedBase);
        if (comparison < 0) {
          message = 'Max supply must be greater than or equal to base supply.';
          valid = false;
        }
      } catch (error) {
        debug.error('Supply comparison error:', error);
        message = 'Unable to compare supply values.';
        valid = false;
      }
    }

    const result = valid ? { valid: true, message: '' } : { valid: false, message };

    // ADDED: Visual validation feedback for permissions inputs
    // FIXED: Use correct HTML IDs (not permissions- prefixed)
    const decimalsInput = document.getElementById('decimals');
    const baseSupplyInput = document.getElementById('base-supply');
    const maxSupplyInput = document.getElementById('max-supply');
    const maxSupplyMessage = document.getElementById('max-supply-message');

    // Decimals validation feedback
    if (decimalsInput) {
      const decimalsValid = Number.isInteger(decimals) && decimals >= 0 && decimals <= 16;
      const decimalsHasValue = values.decimals && values.decimals.trim().length > 0;
      if (decimalsHasValue) {
        if (decimalsValid) {
          decimalsInput.classList.remove('wizard-field__input--error');
          decimalsInput.classList.add('wizard-field__input--valid');
        } else {
          decimalsInput.classList.remove('wizard-field__input--valid');
          decimalsInput.classList.add('wizard-field__input--error');
        }
      } else {
        decimalsInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Base supply validation feedback
    if (baseSupplyInput) {
      const baseSupplyValid = normalizedBase !== null;
      const baseSupplyHasValue = values.baseSupply && values.baseSupply.trim().length > 0;
      if (baseSupplyHasValue) {
        if (baseSupplyValid) {
          baseSupplyInput.classList.remove('wizard-field__input--error');
          baseSupplyInput.classList.add('wizard-field__input--valid');
        } else {
          baseSupplyInput.classList.remove('wizard-field__input--valid');
          baseSupplyInput.classList.add('wizard-field__input--error');
        }
      } else {
        baseSupplyInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Max supply validation feedback (only if value is entered)
    let maxSupplyErrorMessage = '';
    if (maxSupplyInput) {
      const maxSupplyHasValue = values.maxSupply && values.maxSupply.trim().length > 0;

      if (maxSupplyHasValue) {
        let maxSupplyValid = true;

        // Check if max supply is a valid number
        if (normalizedMax === null) {
          maxSupplyValid = false;
          maxSupplyErrorMessage = 'Enter a valid numeric value.';
        }
        // Check if max supply >= initial supply
        else if (normalizedBase !== null) {
          try {
            const comparison = safeBigIntCompare(normalizedMax, normalizedBase);
            if (comparison < 0) {
              maxSupplyValid = false;
              maxSupplyErrorMessage = 'Maximum supply must be greater than or equal to initial supply.';
            }
          } catch (error) {
            maxSupplyValid = false;
            maxSupplyErrorMessage = 'Unable to compare supply values.';
          }
        }

        // Apply visual feedback
        if (maxSupplyValid) {
          maxSupplyInput.classList.remove('wizard-field__input--error');
          maxSupplyInput.classList.add('wizard-field__input--valid');
        } else {
          maxSupplyInput.classList.remove('wizard-field__input--valid');
          maxSupplyInput.classList.add('wizard-field__input--error');
        }
      } else {
        // No value entered - clear validation classes
        maxSupplyInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Display max supply error message - only when NOT silent
    if (maxSupplyMessage) {
      maxSupplyMessage.textContent = !silent ? maxSupplyErrorMessage : '';
    }

    // Error messages: only show when NOT silent
    permissionsMessage.textContent = !silent && !result.valid ? result.message : '';
    permissionsNextButton.disabled = !result.valid;

    ensurePermissionsGroupState();
    wizardState.form.permissions = {
      ...wizardState.form.permissions,
      decimals: Number.isInteger(decimals) ? decimals : wizardState.form.permissions.decimals,
      baseSupply: values.baseSupply,
      useMaxSupply: Boolean(values.useMaxSupply),
      maxSupply: values.useMaxSupply ? values.maxSupply : '',
      keepsHistory,
      startAsPaused: Boolean(values.startAsPaused),
      allowTransferToFrozenBalance: Boolean(values.allowTransferToFrozenBalance)
    };

    updateStepStatusFromValidation('permissions', result, touched);
    persistState();

    return result;
  }

  function evaluateDistribution({ touched = false, silent = false, showFieldIndicators = false } = {}) {
    if (!distributionUI || typeof distributionUI.getValues !== 'function') {
      // UI not ready - return valid but only update status if touched
      const result = { valid: true, message: '' };
      if (touched) {
        updateStepStatusFromValidation('distribution', result, touched);
      }
      return result;
    }

    const values = cloneDistributionValues(distributionUI.getValues());
    const currentSubstep = wizardState.active;
    const isScheduleSubstep = currentSubstep === 'distribution';
    const decimals = typeof wizardState.form.permissions?.decimals === 'number' ? wizardState.form.permissions.decimals : 0;

    // Validate Schedule only (always required)
    const scheduleValidation = validateDistributionValues(values, { skipEmissionValidation: true, decimals });

    if (isScheduleSubstep) {
      // ===== SCHEDULE SUBSTEP =====
      // Update sidebar status based on Schedule validation
      updateStepStatusFromValidation('distribution', scheduleValidation, touched);

      wizardState.form.distribution = values;
      if (!silent) {
        persistState();
      }

      return scheduleValidation;

    } else {
      // ===== EMISSION SUBSTEP =====
      // Emission is OPTIONAL - only validate if user selected an emission type
      const emissionType = values.emission && values.emission.type;
      let emissionValidation = { valid: true, message: '' };

      if (emissionType && emissionType !== '') {
        // User selected an emission type - validate it
        emissionValidation = validateDistributionValues(values, { skipEmissionValidation: false, decimals });
      }

      // Keep Distribution valid in sidebar if Schedule is still valid
      if (scheduleValidation.valid) {
        wizardState.steps.distribution = wizardState.steps.distribution || {};
        wizardState.steps.distribution.validity = 'valid';
        wizardState.steps.distribution.touched = touched || wizardState.steps.distribution.touched;
        updateStepStatusUI('distribution');
        updateFurthestValidIndex();
      } else {
        updateStepStatusFromValidation('distribution', scheduleValidation, touched);
      }

      wizardState.form.distribution = values;
      if (!silent) {
        persistState();
      }

      return emissionValidation;
    }
  }

  function evaluateAdvanced({ touched = false, silent = false, showFieldIndicators = false } = {}) {
    if (!advancedUI || typeof advancedUI.getValues !== 'function') {
      // UI removed - functionality moved to dedicated permission screens
      // Only update status if touched, otherwise stay Pending
      const result = { valid: true, message: '' };
      if (touched) {
        updateStepStatusFromValidation('advanced', result, touched);
      }
      return result;
    }

    const values = advancedUI.getValues();
    const changeControl = normalizeChangeControl(values.changeControl);
    // Trade mode is locked to NotTradeable (closed) until marketplace support ships
    const tradeMode = 'closed';

    wizardState.form.advanced = {
      tradeMode,
      changeControl
    };

    let message = '';
    let valid = true; // Always valid since change control toggles are all we validate now

    // FIXED: Don't require full configuration validation (which depends on distribution)
    // The advanced step should only validate its own fields
    const result = valid ? { valid: true, message: '' } : { valid: false, message };

    // Error messages: only show when NOT silent
    advancedMessage.textContent = !silent && !result.valid ? result.message : '';
    advancedNextButton.disabled = !result.valid;

    updateStepStatusFromValidation('advanced', result, touched);
    persistState();

    return result;
  }

  function handleRegistrationSelection(event) {
    if (!event.target || !event.target.matches('input[type="radio"][name="registration-method"]')) {
      return;
    }
    const nextValue = event.target.value || null;
    wizardState.form.registration.method = nextValue;
    syncRegistrationSelection();
    syncRegistrationPreflightUI();
    evaluateRegistration({ touched: true });
    refreshFlow({ suppressFocus: true });
  }

  function evaluateOverview({ touched = false, silent = false } = {}) {
    // Overview step is always valid - it's just a review screen
    const stepState = wizardState.steps.overview;
    stepState.touched = touched;
    stepState.validity = 'valid';

    if (!silent) {
      updateStepStatusUI('overview');
      persistState();
    }

    return { valid: true, message: '' };
  }

  function evaluateSearch({ touched = false, silent = false } = {}) {
    const stepState = wizardState.steps.search;
    stepState.touched = touched;

    // FIX: When user actively clicks Continue (touched=true), mark as valid for navigation
    // For initial page load (touched=false), only show valid if previous steps complete
    // This prevents sidebar showing checkmark before user reaches the step
    const distributionStep = wizardState.steps.distribution;
    const previousStepsComplete = distributionStep && distributionStep.validity === 'valid';

    // If user is actively interacting (touched), or previous steps are complete, mark valid
    // Otherwise keep as unknown to prevent premature checkmark in sidebar
    stepState.validity = (touched || previousStepsComplete) ? 'valid' : 'unknown';

    // Form is always valid (all fields optional)
    const result = { valid: true, message: '' };

    if (searchMessage) {
      searchMessage.textContent = '';
    }
    if (searchNextButton) {
      searchNextButton.disabled = false;  // Always enabled - fields are optional
    }

    if (!silent) {
      updateStepStatusUI('search');
      persistState();
    }

    return result;
  }

  function evaluateRegistration({ touched = false, silent = false, showFieldIndicators = false } = {}) {
    const refreshStatus =
      !silent &&
      touched &&
      registrationMessage &&
      (!registrationMessage.dataset.status || registrationMessage.dataset.status === 'info');

    const ready = syncWizardReadiness({
      refreshStatus: Boolean(refreshStatus)
    });

    let message = '';
    if (!ready) {
      const missing = [];
      if (!wizardReadiness.hasJson) {
        missing.push('Prepare the JSON payload.');
      }
      if (!wizardReadiness.hasIdentity) {
        missing.push('Register an identity.');
      }
      if (!wizardReadiness.hasPrivateKey) {
        missing.push('Import a private key.');
      }
      message = missing.join(' ') || readinessReminderMessage;
    }

    const result = ready ? { valid: true, message: '' } : { valid: false, message };

    updateStepStatusFromValidation('export', result, touched);
    persistState();
    return result;
  }

  function resetWizard() {
    manualNavigationActive = false;

    resetWalletRuntime();

    document.querySelectorAll('form').forEach((form) => {
      try {
        form.reset();
      } catch (error) {
        console.debug('Unable to reset form', error);
      }
    });

    const storagePrefixes = ['wizard:', 'token:'];
    const shouldClearStorageKey = (key) =>
      key === STATE_STORAGE_KEY || key === SENSITIVE_DATA_KEY || storagePrefixes.some((prefix) => key.startsWith(prefix));

    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && shouldClearStorageKey(key)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.debug('Unable to clear localStorage keys', error);
    }

    try {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key && shouldClearStorageKey(key)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.debug('Unable to clear sessionStorage keys', error);
    }

    document.querySelectorAll('[data-blob-url]').forEach((element) => {
      const blobUrl = element.getAttribute('data-blob-url');
      if (blobUrl && blobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.debug('Unable to revoke blob URL', error);
        }
      }
      element.removeAttribute('data-blob-url');
    });

    if (jsonPreviewContent) {
      jsonPreviewContent.textContent = '';
    }
    if (jsonPreview) {
      jsonPreview.hidden = true;
    }

    if (walletFileInput) {
      walletFileInput.value = '';
    }
    if (walletMnemonicInput) {
      walletMnemonicInput.value = '';
    }

    const freshState = createDefaultWizardState();

    wizardState.active = freshState.active;
    wizardState.furthestValidIndex = freshState.furthestValidIndex;

    TRACKED_STEPS.forEach((stepId) => {
      const defaults = freshState.steps[stepId];
      if (wizardState.steps[stepId]) {
        wizardState.steps[stepId].id = defaults.id;
        wizardState.steps[stepId].validity = defaults.validity;
        wizardState.steps[stepId].touched = defaults.touched;
      } else {
        wizardState.steps[stepId] = { ...defaults };
      }
    });
    Object.keys(wizardState.steps).forEach((stepId) => {
      if (!TRACKED_STEPS.includes(stepId)) {
        delete wizardState.steps[stepId];
      }
    });

    Object.assign(wizardState.runtime, freshState.runtime);

    wizardState.form.tokenName = freshState.form.tokenName;
    wizardState.form.naming = freshState.form.naming;
    wizardState.form.permissions = freshState.form.permissions;
    wizardState.form.distribution = freshState.form.distribution;
    wizardState.form.advanced = freshState.form.advanced;
    wizardState.form.registration = freshState.form.registration;

    resetIdentityState({ persist: false });

    currentScreenId = freshState.active;
    activeScreens = computeActiveScreens();
    wizardState.active = freshState.active;
    lastSkippedSignature = null;

    try {
      storage.removeItem(STATE_STORAGE_KEY);
      sessionStorage.removeItem(SENSITIVE_DATA_KEY);
    } catch (error) {
      console.debug('Unable to clear stored wizard state', error);
    }

    initialiseUI();

    persistState();
    wizardReadiness.hasJson = false;
    wizardReadiness.hasIdentity = false;
    wizardReadiness.hasPrivateKey = false;
    syncWizardReadiness({ refreshStatus: false });
  }

  function navigateToFirstStep() {
    if (typeof window.goToStep === 'function') {
      window.goToStep(1);
    } else if (window.router && typeof window.router.push === 'function') {
      window.router.push('/wizard/step-1');
    } else if (typeof showScreen === 'function') {
      showScreen(STEP_SEQUENCE[0], { suppressFocus: false });
    } else {
      window.location.assign('/wizard/step-1');
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      if (tokenNameInput && typeof tokenNameInput.focus === 'function') {
        tokenNameInput.focus();
        return;
      }
      const firstInteractive = document.querySelector(
        '#screen-naming input, #screen-naming button, #screen-naming select, #screen-naming textarea'
      );
      if (firstInteractive && typeof firstInteractive.focus === 'function') {
        firstInteractive.focus();
      }
    });
  }

  function evaluateStep(stepId, options = {}) {
    // FIXED: Map substeps to their parent step for validation
    const parentStep = getParentStep(stepId) || stepId;

    switch (parentStep) {
      case 'naming':
        return evaluateNaming(options);
      case 'permissions':
        return evaluatePermissions(options);
      case 'distribution':
        return evaluateDistribution(options);
      case 'advanced':
        return evaluateAdvanced(options);
      case 'overview':
        return evaluateOverview(options);
      case 'search':
        return evaluateSearch(options);
      case 'export':
        return evaluateRegistration(options);
      default:
        return undefined;
    }
  }

  function handleStepAdvance(substepId) {
    // FIXED: Handle substeps correctly - get parent step for validation
    const parentStep = getParentStep(substepId) || substepId;

    let validation;
    switch (parentStep) {
      case 'naming':
        // silent: false shows error messages when Continue is clicked
        validation = evaluateNaming({ touched: true, silent: false, showFieldIndicators: true });
        if (!validation.valid) {
          announce(validation.message || 'Complete the naming step to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'permissions':
        validation = evaluatePermissions({ touched: true, silent: false, showFieldIndicators: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'distribution':
        validation = evaluateDistribution({ touched: true, silent: false, showFieldIndicators: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'advanced':
        validation = evaluateAdvanced({ touched: true, silent: false, showFieldIndicators: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'overview':
        validation = evaluateOverview({ touched: true, silent: false });
        if (!validation.valid) {
          announce(validation.message || 'Review your configuration to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'search':
        validation = evaluateSearch({ touched: true, silent: false });
        if (!validation.valid) {
          announce(validation.message || 'Complete the search configuration to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'export':
        validation = evaluateRegistration({ touched: true, silent: false, showFieldIndicators: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        handleExportToDocuments();
        break;
      default:
        break;
    }
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function getStoredTheme() {
    try {
      const stored = storage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (error) {
      // ignore storage errors
    }
    return null; // No stored preference - will use system detection
  }

  function setTheme(preference, persist = true) {
    // If no preference provided, use system theme
    const theme = preference === 'light' || preference === 'dark'
      ? preference
      : getSystemTheme();
    document.documentElement.setAttribute('data-theme', theme);

    // Only persist if an explicit preference was given
    if (persist && preference) {
      try {
        storage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        debug.error('Failed to persist theme:', error);
      }
    }
    syncThemeControls(theme);
  }

  function syncThemeControls(theme) {
    if (!themeControls.length) {
      return;
    }
    themeControls.forEach((input) => {
      const option = input.closest('.theme-toggle__option');
      const isActive = input.value === theme;
      input.checked = isActive;
      if (option) {
        option.classList.toggle('theme-toggle__option--active', isActive);
      }
    });
  }

  function syncRegistrationPreflightUI() {
    syncRegistrationSelection();
    const method = wizardState.form.registration.method;

    Object.entries(registrationPanels).forEach(([key, panel]) => {
      if (!panel) {
        return;
      }
      const active = method === key;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });

    if (jsonShowButton) {
      jsonShowButton.disabled = method !== 'det';
    }

    if (jsonCopyButton) {
      const displayed = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
      jsonCopyButton.disabled = method !== 'det' || !displayed;
    }

    if (selfWarningCheckbox) {
      const acknowledged = Boolean(wizardState.form.registration.preflight.self.warningAcknowledged);
      if (method !== 'self' && !acknowledged) {
        selfWarningCheckbox.checked = false;
      } else if (method === 'self') {
        selfWarningCheckbox.checked = acknowledged;
      }
      selfWarningCheckbox.disabled = acknowledged;
    }

    if (selfWarningProceedButton) {
      const identityId = (wizardState.form.registration.identity.id || '').trim();
      const acknowledged = Boolean(wizardState.form.registration.preflight.self.warningAcknowledged);
      const checkboxConfirmed = Boolean(selfWarningCheckbox && selfWarningCheckbox.checked);
      const canProceed = method === 'self' && !acknowledged && checkboxConfirmed && identityId.length > 0;
      selfWarningProceedButton.disabled = !canProceed;
    }

    updateRegistrationPreviewVisibility();
    syncIdentityUI();
    syncWizardReadiness();
  }

  function setRegistrationValidationState({ variant = 'pending', title = '', message = '' } = {}) {
    if (!registrationValidationCard || !registrationValidationBody) {
      return;
    }
    registrationValidationCard.hidden = false;
    registrationValidationCard.classList.remove('form-card--error', 'form-card--highlight');

    if (variant === 'success') {
      registrationValidationCard.classList.add('form-card--highlight');
      registrationValidationBody.innerHTML = registrationValidationDefaultHTML;
      return;
    }

    if (variant === 'error') {
      registrationValidationCard.classList.add('form-card--error');
    } else {
      registrationValidationCard.classList.add('form-card--highlight');
    }

    registrationValidationBody.innerHTML = '';

    if (title) {
      const heading = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = title;
      heading.appendChild(strong);
      registrationValidationBody.appendChild(heading);
    }

    const paragraph = document.createElement('p');
    paragraph.style.marginBottom = '0';
    paragraph.textContent = message || 'Generating your contract and checking it with the Dash Evo SDK.';
    registrationValidationBody.appendChild(paragraph);
  }

  function getReadableErrorMessage(error, fallback = 'Unknown error.') {
    if (!error) {
      return fallback;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  async function validateRegistrationContract() {
    if (!registrationValidationCard || !registrationValidationBody) {
      return;
    }
    registrationValidationSequence += 1;
    const sequence = registrationValidationSequence;
    const pendingMessage = 'Generating your contract and checking it with the Dash Evo SDK.';
    setRegistrationValidationState({
      variant: 'pending',
      title: 'Validating contract…',
      message: pendingMessage
    });

    let contractJSON;
    try {
      contractJSON = generatePlatformContractJSON();
    } catch (error) {
      if (sequence === registrationValidationSequence) {
        const message = getReadableErrorMessage(error, 'Unable to generate your contract.');
        setRegistrationValidationState({
          variant: 'error',
          title: 'Contract generation failed',
          message
        });
      }
      return;
    }

    // Check for new SDK API (v2.x uses constructor instead of fromValue)
    if (!window.EvoSDK || !window.EvoSDK.DataContract) {
      if (sequence === registrationValidationSequence) {
        setRegistrationValidationState({
          variant: 'error',
          title: 'Validation unavailable',
          message: 'Dash Evo SDK is still loading. Reopen this step once the SDK finishes initializing.'
        });
      }
      return;
    }

    try {
      // WORKAROUND: wasm-dpp v2.1.3 has a bug where the DataContract constructor
      // hardcodes PlatformVersion::first() which only supports $format_version "0".
      // Token contracts require $format_version "1" on Dash Platform.
      // We'll validate basic structure here and show a warning about SDK limitation.

      // Try validation with $format_version "0" for partial validation
      const validationContract = {
        ...contractJSON,
        '$format_version': '0'  // Force V0 for SDK compatibility
      };

      // Also need to remove tokens since V0 doesn't support them
      const hasTokens = !!contractJSON.tokens && Object.keys(contractJSON.tokens).length > 0;

      if (hasTokens) {
        // For token contracts, skip SDK validation entirely
        // wasm-dpp v2.1.3 WASM bindings don't support DataContractV1 format

        // Perform manual token structure validation
        const tokenConfig = contractJSON.tokens?.[0] || contractJSON.tokens?.['0'];
        if (!tokenConfig) {
          throw new Error('Token configuration missing');
        }

        // Check required token fields
        const requiredFields = ['conventions', 'baseSupply', 'keepsHistory'];
        const missingFields = requiredFields.filter(f => tokenConfig[f] === undefined);
        if (missingFields.length > 0) {
          throw new Error(`Missing required token fields: ${missingFields.join(', ')}`);
        }

        // Validate conventions structure
        if (tokenConfig.conventions?.decimals === undefined) {
          throw new Error('Token conventions must include decimals');
        }

        // Validate contract has required base fields
        if (!contractJSON.id || !contractJSON.ownerId) {
          throw new Error('Contract missing required id or ownerId');
        }

        if (sequence !== registrationValidationSequence) {
          return;
        }
        // Show success with info about partial validation
        setRegistrationValidationState({
          variant: 'success',
          title: 'Contract structure valid',
          message: 'Token configuration validated. Full SDK validation for V1 contracts will be performed on-chain.'
        });
        return;

      } else {
        // No tokens - can do full validation with V0 format
        new window.EvoSDK.DataContract(validationContract);
      }
      if (sequence !== registrationValidationSequence) {
        return;
      }
      setRegistrationValidationState({ variant: 'success' });
    } catch (error) {
      if (sequence !== registrationValidationSequence) {
        return;
      }
      debug.error('Contract validation failed:', error);
      const message = getReadableErrorMessage(error, 'Dash Evo SDK reported a validation error.');
      setRegistrationValidationState({
        variant: 'error',
        title: 'Contract validation failed',
        message
      });
    }
  }

  function syncWizardReadiness({ refreshStatus = false } = {}) {
    wizardReadiness.hasJson = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
    wizardReadiness.hasIdentity = Boolean((wizardState.form.registration.identity.id || '').trim());
    wizardReadiness.hasPrivateKey = Boolean((wizardState.form.registration.wallet.privateKey || '').trim());

    const ready = isReadyToCreateNew(wizardReadiness);
    applyCreateTokenButtonState(ready);

    return ready;
  }

  function applyCreateTokenButtonState(isReady) {
    if (!createTokenButton) {
      return;
    }
    createTokenButton.disabled = !isReady;
    createTokenButton.setAttribute('aria-disabled', isReady ? 'false' : 'true');
  }

  function setRegistrationStatus(status, message) {
    if (!registrationMessage) {
      return;
    }
    const nextMessage = message || '';
    if ((registrationMessage.dataset.status || '') === (status || '') && registrationMessage.textContent === nextMessage) {
      return;
    }
    if (status) {
      registrationMessage.dataset.status = status;
    } else {
      delete registrationMessage.dataset.status;
    }
    registrationMessage.textContent = nextMessage;
  }

  function handleRegistrationNext() {
    const ready = syncWizardReadiness({ refreshStatus: false });
    if (!ready) {
      setRegistrationStatus('info', readinessReminderMessage);
      announce(readinessReminderMessage);
      return;
    }

    resetWizard();
    navigateToFirstStep();
    setRegistrationStatus('success', 'Started a new token.');
    announce('Started a new token.');
    updateFurthestValidIndex();
    persistState();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Export Step Functions (replaced Registration)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Updates the export preview with the generated JSON
   */
  function updateExportPreview() {
    const exportPreviewContent = document.getElementById('json-preview-content');
    if (!exportPreviewContent) return;

    try {
      const payload = generatePlatformContractJSON();
      const serialized = JSON.stringify(payload, null, 2);
      exportPreviewContent.textContent = serialized;
    } catch (error) {
      console.error('[Export] Error generating preview:', error);
      exportPreviewContent.textContent = '// Error generating contract JSON';
    }
  }

  /**
   * Updates the export screen UI with current token name
   */
  function updateExportScreenUI() {
    const tokenName = wizardState.form.tokenName || 'Token';
    const exportTokenNameEl = document.getElementById('export-token-name');
    if (exportTokenNameEl) {
      exportTokenNameEl.textContent = tokenName;
    }
    // Reset to ready state when entering export screen
    const readyState = document.getElementById('export-ready-state');
    const successState = document.getElementById('export-success-state');
    if (readyState) readyState.hidden = false;
    if (successState) successState.hidden = true;
  }

  /**
   * Handles exporting the token configuration to Documents
   * Automatically names the document based on token name
   * Uses window.documentStorage API which is exposed by the document storage IIFE
   */
  function handleExportToDocuments() {
    try {
      // Check if document storage is available
      if (!window.documentStorage || typeof window.documentStorage.createDocument !== 'function') {
        throw new Error('Document storage not initialized. Please try again.');
      }

      // Get token name for document naming
      const tokenName = wizardState.form.tokenName || 'Token';
      const sanitizedName = tokenName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
      const documentName = `${sanitizedName}_Config`;

      // Generate the contract JSON
      const payload = generatePlatformContractJSON();

      // Create document in storage via global API
      const doc = window.documentStorage.createDocument(
        documentName,
        `Token configuration for "${tokenName}" - Created ${new Date().toLocaleDateString()}`,
        payload
      );

      // Update documents UI
      window.documentStorage.render();

      // Update export screen to show success state
      const readyState = document.getElementById('export-ready-state');
      const successState = document.getElementById('export-success-state');
      const savedNameEl = document.getElementById('export-saved-name');
      if (readyState) readyState.hidden = true;
      if (successState) successState.hidden = false;
      if (savedNameEl) savedNameEl.textContent = `${documentName}.json`;

      // Show success message
      announce(`Token configuration saved as "${documentName}"`);

      // Show toast
      if (typeof window.showToast === 'function') {
        window.showToast({ type: 'success', title: `Configuration saved as "${documentName}.json"` });
      }

      // Navigate to Documents page after a brief delay to show success
      setTimeout(() => {
        if (typeof switchPage === 'function') {
          switchPage('documents');
        }
      }, 1500);

      console.log('[Export] Document saved:', doc);
    } catch (error) {
      console.error('[Export] Error saving document:', error);
      announce('Error saving configuration: ' + error.message);
      if (typeof window.showToast === 'function') {
        window.showToast({ type: 'error', title: 'Error saving configuration' });
      }
    }
  }

  function handleChunkLoadRejection(event) {
    const reason = event ? event.reason : null;
    if (isChunkLoadProblem(reason)) {
      attemptChunkRecovery(reason);
    }
  }

  function handleChunkLoadError(event) {
    const message =
      (event && event.error && event.error.message) ||
      (event && typeof event.message === 'string' ? event.message : '');
    if (isChunkLoadProblem(message)) {
      attemptChunkRecovery(event && event.error ? event.error : message);
    }
  }

  function isChunkLoadProblem(input) {
    if (!input) {
      return false;
    }
    const message =
      typeof input === 'string'
        ? input
        : typeof input.message === 'string'
          ? input.message
          : '';
    if (!message) {
      return false;
    }
    return CHUNK_ERROR_PATTERN.test(message);
  }

  function attemptChunkRecovery(reason) {
    if (chunkRecoveryScheduled || typeof window === 'undefined') {
      return;
    }
    chunkRecoveryScheduled = true;

    let alreadyPending = false;
    try {
      if (window.sessionStorage) {
        const current = window.sessionStorage.getItem(CHUNK_RECOVERY_FLAG);
        alreadyPending = current === 'pending';
        if (!alreadyPending) {
          window.sessionStorage.setItem(CHUNK_RECOVERY_FLAG, 'pending');
        }
      }
    } catch (error) {
      console.debug('Unable to persist chunk recovery flag', error);
    }

    if (alreadyPending) {
      return;
    }

    const message = 'A required resource failed to load. Attempting recovery…';
    setRegistrationStatus('loading', message);
    announce(message);

    (async () => {
      try {
        if (navigator.serviceWorker) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((registration) => registration.unregister().catch(() => { }))
          );
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key).catch(() => { })));
        }
      } catch (error) {
        debug.warn('Chunk recovery cleanup failed', error);
      } finally {
        try {
          window.location.reload();
        } catch (error) {
          debug.error('Unable to reload after chunk recovery attempt', error);
        }
      }
    })();
  }


  function handleEscapeShortcut(event) {
    if (event.key !== 'Escape') {
      return;
    }
    if (clearStepMessage(currentScreenId)) {
      announce('Validation message cleared');
    }
  }

  function validateTokenName(rawValue) {
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

  function validateBase58Identity(rawValue) {
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
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    if (!base58Pattern.test(trimmed)) {
      return { valid: false, message: 'Invalid Base58 format. Use only Base58 characters.' };
    }
    return { valid: true, message: '' };
  }

  function applyTokenNameValidation(result, options = {}) {
    const touched = options.touched ?? false;
    namingNextButton.disabled = !result.valid;
    if (!options.silent) {
      tokenNameMessage.textContent = result.message || '';
    }
    updateStepStatusFromValidation('naming', result, touched);
  }


  function ensureNamingFormState() {
    const naming = wizardState.form.naming;
    if (!naming || typeof naming !== 'object') {
      wizardState.form.naming = {
        conventions: { localizations: {} },
        rows: []
      };
      return;
    }
    if (!naming.conventions || typeof naming.conventions !== 'object') {
      naming.conventions = { localizations: {} };
    } else if (!naming.conventions.localizations || typeof naming.conventions.localizations !== 'object') {
      naming.conventions.localizations = {};
    }
    naming.conventions.localizations = limitLocalizationRecord(naming.conventions.localizations);

    if (!Array.isArray(naming.rows) || naming.rows.length === 0) {
      const record = naming.conventions.localizations || {};
      const nextRow = (() => {
        const [firstCode] = Object.keys(record);
        if (!firstCode) {
          return null;
        }
        const entry = record[firstCode];
        return normalizeLocalizationRowData({
          code: firstCode,
          shouldCapitalize: entry?.should_capitalize,
          singularForm: entry?.singular_form,
          pluralForm: entry?.plural_form
        });
      })();
      naming.rows = nextRow ? [nextRow] : [];
    }

    naming.rows = limitLocalizationRows(naming.rows);
    const [primaryRow] = naming.rows;
    naming.conventions.localizations = createLocalizationRecordFromRow(primaryRow);
  }

  function normalizeManualActionRecord(permissions, actionKey) {
    const defaults = createDefaultManualActionState();
    if (!permissions || typeof permissions !== 'object') {
      return createDefaultManualActionState();
    }

    const source = permissions[actionKey] && typeof permissions[actionKey] === 'object' ? permissions[actionKey] : {};
    const normalized = {
      ...defaults,
      ...source
    };

    const validTypes = new Set(['none', 'owner', 'identity', 'group', 'main-group']);
    normalized.enabled = Boolean(source.enabled);
    normalized.performerType = validTypes.has(source.performerType) ? source.performerType : defaults.performerType;
    normalized.performerReference = typeof source.performerReference === 'string' ? source.performerReference.trim() : '';
    normalized.ruleChangerType = validTypes.has(source.ruleChangerType) ? source.ruleChangerType : defaults.ruleChangerType;
    normalized.ruleChangerReference =
      typeof source.ruleChangerReference === 'string' ? source.ruleChangerReference.trim() : '';
    normalized.allowChangeAuthorizedToNone = Boolean(source.allowChangeAuthorizedToNone);
    normalized.allowChangeAdminToNone = Boolean(source.allowChangeAdminToNone);
    normalized.allowSelfChangeAdmin = Boolean(source.allowSelfChangeAdmin);

    const groups = Array.isArray(permissions.groups) ? permissions.groups : [];
    const groupIds = new Set(groups.map((group) => group.id));
    const mainGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);

    if (normalized.performerType === 'group') {
      if (!groupIds.has(normalized.performerReference)) {
        const fallbackGroup = groups[0];
        if (fallbackGroup) {
          normalized.performerReference = fallbackGroup.id;
        } else {
          normalized.performerType = 'none';
          normalized.performerReference = '';
        }
      }
    } else if (normalized.performerType === 'main-group') {
      if (mainGroupIndex < 0 || mainGroupIndex >= groups.length) {
        normalized.performerType = groups.length ? 'group' : 'none';
        normalized.performerReference = groups.length ? groups[0].id : '';
      }
    }

    if (normalized.ruleChangerType === 'group') {
      if (!groupIds.has(normalized.ruleChangerReference)) {
        const fallbackGroup = groups[0];
        if (fallbackGroup) {
          normalized.ruleChangerReference = fallbackGroup.id;
        } else {
          normalized.ruleChangerType = 'none';
          normalized.ruleChangerReference = '';
        }
      }
    } else if (normalized.ruleChangerType === 'main-group') {
      if (mainGroupIndex < 0 || mainGroupIndex >= groups.length) {
        normalized.ruleChangerType = groups.length ? 'group' : 'none';
        normalized.ruleChangerReference = groups.length ? groups[0].id : '';
      }
    }

    if (!normalized.enabled) {
      normalized.performerType = 'none';
      normalized.performerReference = '';
    } else if (normalized.performerType === 'none') {
      normalized.performerType = groups.length ? 'group' : 'owner';
      normalized.performerReference = groups.length ? groups[0].id : '';
    }

    // Keep ruleChangerType as 'none' when disabled - don't convert to 'owner'
    if (!normalized.enabled && normalized.ruleChangerType === 'none') {
      normalized.ruleChangerReference = '';
    }

    return normalized;
  }

  function ensureManualActionState(actionKey) {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    permissions[actionKey] = normalizeManualActionRecord(permissions, actionKey);
  }

  function ensureAllManualActionStates() {
    MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => ensureManualActionState(key));
  }

  function normalizeFreezeState(source) {
    const defaults = createDefaultFreezeState();
    const input = source && typeof source === 'object' ? source : {};
    const validTypes = new Set(['none', 'owner', 'identity']);

    const performSource = input.perform && typeof input.perform === 'object' ? input.perform : {};
    const changeSource = input.changeRules && typeof input.changeRules === 'object' ? input.changeRules : {};
    const flagsSource = input.flags && typeof input.flags === 'object' ? input.flags : {};

    const enabled = typeof input.enabled === 'boolean' ? input.enabled : defaults.enabled;
    const performType = validTypes.has(performSource.type) ? performSource.type : defaults.perform.type;
    const changeType = validTypes.has(changeSource.type) ? changeSource.type : defaults.changeRules.type;
    const performIdentity = typeof performSource.identity === 'string' ? performSource.identity.trim() : '';
    const changeIdentity = typeof changeSource.identity === 'string' ? changeSource.identity.trim() : '';

    return {
      enabled,
      perform: {
        type: performType,
        identity: performType === 'identity' ? performIdentity : ''
      },
      changeRules: {
        type: changeType,
        identity: changeType === 'identity' ? changeIdentity : ''
      },
      flags: {
        changeAuthorizedToNoOneAllowed: Boolean(flagsSource.changeAuthorizedToNoOneAllowed),
        changeAdminToNoOneAllowed: Boolean(flagsSource.changeAdminToNoOneAllowed),
        selfChangeAdminAllowed: Boolean(flagsSource.selfChangeAdminAllowed)
      }
    };
  }

  function ensureFreezeState() {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    permissions.freeze = normalizeFreezeState(permissions.freeze);
  }

  function ensurePermissionsGroupState() {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    ensureAllManualActionStates();
    ensureFreezeState();
    permissions.groups = normalisePermissionsGroups(permissions.groups);
    permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, permissions.groups.length);
  }

  function clonePermissionGroups(groups) {
    return normalisePermissionsGroups(groups).map((group) => ({
      id: group.id,
      requiredPower: group.requiredPower,
      members: group.members.map((member) => ({
        id: member.id,
        identity: member.identity,
        power: member.power
      }))
    }));
  }

  function createPermissionGroup(overrides = {}) {
    return {
      id: generateId('group'),
      name: '',
      requiredPower: '',
      members: [],
      ...overrides
    };
  }

  function createPermissionMember(overrides = {}) {
    return {
      id: generateId('member'),
      identity: '',
      power: '',
      ...overrides
    };
  }

  function renderPermissionGroups() {
    if (!groupListElement) {
      return;
    }

    ensurePermissionsGroupState();
    const { groups, mainControlGroupIndex } = wizardState.form.permissions;

    const emptyHint = groupEmptyHint || null;
    const openStates = new Map();
    if (groupListElement) {
      groupListElement.querySelectorAll('.wizard-group-card').forEach((existingCard) => {
        openStates.set(existingCard.dataset.groupId, existingCard.hasAttribute('open'));
      });
    }
    // PERFORMANCE: Use replaceChildren() for faster DOM cleanup
    // This is more efficient than the while-loop approach and also
    // removes all event listeners, preventing memory leaks
    groupListElement.replaceChildren();

    if (!groups.length) {
      if (groupMainPositionInput) {
        groupMainPositionInput.value = '';
        groupMainPositionInput.disabled = true;
        groupMainPositionInput.removeAttribute('min');
        groupMainPositionInput.removeAttribute('max');
      }
      if (emptyHint) {
        emptyHint.hidden = false;
        groupListElement.appendChild(emptyHint);
      }
      syncManualActionUIs({ announce: false });
      return;
    }

    if (groupMainPositionInput) {
      const maxIndex = groups.length - 1;
      const clamped = clampMainControlIndex(mainControlGroupIndex, groups.length);
      wizardState.form.permissions.mainControlGroupIndex = clamped;
      groupMainPositionInput.disabled = false;
      groupMainPositionInput.value = String(clamped + 1);
      groupMainPositionInput.setAttribute('min', '1');
      groupMainPositionInput.setAttribute('max', String(maxIndex + 1));
    }

    if (emptyHint) {
      emptyHint.hidden = true;
    }

    groups.forEach((group, index) => {
      const card = buildPermissionGroupCard(group, index, index === wizardState.form.permissions.mainControlGroupIndex);
      if (openStates.has(group.id)) {
        card.open = openStates.get(group.id);
      }
      groupListElement.appendChild(card);
    });

    syncManualActionUIs({ announce: false });
  }

  function buildGroupLabel(group, index) {
    // Use custom name if provided, otherwise use default "Group N" format
    if (group.name && group.name.trim()) {
      return group.name.trim();
    }
    return `Group ${index + 1}`;
  }

  function buildPermissionGroupCard(group, index, isPrimary) {
    const card = document.createElement('details');
    card.className = 'wizard-group-card';
    card.dataset.groupId = group.id;
    card.open = true;
    if (isPrimary) {
      card.classList.add('wizard-group-card--primary');
    }

    const summary = document.createElement('summary');
    summary.className = 'wizard-group-card__summary';
    const title = document.createElement('span');
    title.className = 'wizard-group-card__title';
    title.textContent = buildGroupLabel(group, index);
    summary.appendChild(title);
    if (isPrimary) {
      const badge = document.createElement('span');
      badge.className = 'wizard-group-card__badge';
      badge.textContent = 'Main control';
      summary.appendChild(badge);
    }
    const indicator = document.createElement('span');
    indicator.className = 'wizard-group-card__summary-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    summary.appendChild(indicator);
    card.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'wizard-group-card__body';

    // Group Name Field
    const nameField = document.createElement('div');
    nameField.className = 'wizard-field';
    const nameLabel = document.createElement('label');
    nameLabel.className = 'wizard-field__label';
    nameLabel.setAttribute('for', `group-name-${group.id}`);
    nameLabel.textContent = 'Group Name:';
    nameField.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.className = 'wizard-field__input';
    nameInput.id = `group-name-${group.id}`;
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g., Treasury Committee';
    nameInput.value = group.name || '';
    nameInput.dataset.groupAction = 'group-name';
    nameInput.dataset.groupId = group.id;
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    const requiredField = document.createElement('div');
    requiredField.className = 'wizard-field';
    const requiredLabelRow = document.createElement('div');
    requiredLabelRow.className = 'wizard-field__label-row';
    const requiredLabel = document.createElement('label');
    requiredLabel.className = 'wizard-field__label';
    requiredLabel.setAttribute('for', `group-required-${group.id}`);
    requiredLabel.textContent = 'Required Power:';
    const requiredInfoId = `group-required-info-${group.id}`;
    const requiredInfoButton = createInfoButton(requiredInfoId, 'More information about required power');
    requiredLabelRow.append(requiredLabel, requiredInfoButton);
    requiredField.appendChild(requiredLabelRow);
    requiredField.appendChild(createInfoPanel(requiredInfoId, 'Specify how much cumulative power this group must supply to approve an action. Compare against the sum of member power values.'));
    const requiredInput = document.createElement('input');
    requiredInput.className = 'wizard-field__input wizard-group-card__required-power';
    requiredInput.id = `group-required-${group.id}`;
    requiredInput.type = 'number';
    requiredInput.min = '0';
    requiredInput.step = '1';
    requiredInput.max = String(MAX_U32);
    requiredInput.placeholder = '0';
    requiredInput.value = group.requiredPower || '';
    requiredInput.dataset.groupAction = 'required-power';
    requiredInput.dataset.groupId = group.id;
    const requiredInputWrapper = document.createElement('div');
    requiredInputWrapper.className = 'wizard-field__inline';
    requiredInputWrapper.appendChild(requiredInput);
    requiredField.appendChild(requiredInputWrapper);
    body.appendChild(requiredField);

    const membersWrapper = document.createElement('div');
    membersWrapper.className = 'wizard-group-card__members';
    const membersHeadingRow = document.createElement('div');
    membersHeadingRow.className = 'wizard-field__label-row';
    const membersHeading = document.createElement('h3');
    membersHeading.className = 'wizard-group-card__members-title';
    membersHeading.textContent = 'Members:';
    const membersInfoId = `group-members-info-${group.id}`;
    const membersInfoButton = createInfoButton(membersInfoId, 'More information about group members');
    membersHeadingRow.append(membersHeading, membersInfoButton);
    membersWrapper.appendChild(membersHeadingRow);
    membersWrapper.appendChild(createInfoPanel(membersInfoId, 'Add each identity or address that participates in this group. Assign a power value (u32) to reflect their voting weight.'));

    const membersContainer = document.createElement('div');
    membersContainer.className = 'wizard-group-card__members-list';
    membersContainer.dataset.groupId = group.id;
    if (!group.members.length) {
      const empty = document.createElement('p');
      empty.className = 'wizard-subsection__hint';
      empty.textContent = 'No members added yet.';
      membersContainer.appendChild(empty);
    } else {
      group.members.forEach((member, memberIndex) => {
        membersContainer.appendChild(buildPermissionMemberRow(group, member, memberIndex));
      });
    }
    membersWrapper.appendChild(membersContainer);

    const addMemberButton = document.createElement('button');
    addMemberButton.type = 'button';
    addMemberButton.className = 'wizard-button wizard-button--secondary wizard-button--sm';
    addMemberButton.dataset.groupAction = 'add-member';
    addMemberButton.dataset.groupId = group.id;
    addMemberButton.textContent = 'Add Member';
    membersWrapper.appendChild(addMemberButton);
    body.appendChild(membersWrapper);

    const cardActions = document.createElement('div');
    cardActions.className = 'wizard-group-card__actions';
    const removeGroupButton = document.createElement('button');
    removeGroupButton.type = 'button';
    removeGroupButton.className = 'wizard-button wizard-button--ghost wizard-button--sm';
    removeGroupButton.dataset.groupAction = 'remove-group';
    removeGroupButton.dataset.groupId = group.id;
    removeGroupButton.textContent = 'Remove Group';
    cardActions.appendChild(removeGroupButton);
    body.appendChild(cardActions);

    card.appendChild(body);
    return card;
  }

  function buildPermissionMemberRow(group, member, memberIndex = 0) {
    const row = document.createElement('div');
    row.className = 'wizard-group-card__member-row';
    row.dataset.groupId = group.id;
    row.dataset.memberId = member.id;

    const identityInputId = `group-${group.id}-member-${member.id}-identity`;
    const powerInputId = `group-${group.id}-member-${member.id}-power`;

    const memberLabel = document.createElement('label');
    memberLabel.className = 'wizard-group-card__member-label';
    memberLabel.setAttribute('for', identityInputId);
    memberLabel.textContent = `Member ${memberIndex + 1}`;
    row.appendChild(memberLabel);

    const identityInput = document.createElement('input');
    identityInput.className = 'wizard-field__input wizard-group-card__member-select';
    identityInput.type = 'text';
    identityInput.setAttribute('list', 'wizard-permissions-member-options');
    identityInput.placeholder = 'Select address or identity';
    identityInput.id = identityInputId;
    identityInput.value = member.identity || '';
    identityInput.dataset.groupAction = 'member-identity';
    identityInput.dataset.groupId = group.id;
    identityInput.dataset.memberId = member.id;
    row.appendChild(identityInput);

    const powerField = document.createElement('div');
    powerField.className = 'wizard-group-card__member-power-field';
    const powerLabel = document.createElement('label');
    powerLabel.className = 'wizard-group-card__member-power-label';
    powerLabel.setAttribute('for', powerInputId);
    powerLabel.textContent = 'Power (u32):';
    const powerInput = document.createElement('input');
    powerInput.className = 'wizard-field__input wizard-group-card__member-power';
    powerInput.id = powerInputId;
    powerInput.type = 'number';
    powerInput.min = '0';
    powerInput.step = '1';
    powerInput.max = String(MAX_U32);
    powerInput.placeholder = '0';
    powerInput.value = member.power || '';
    powerInput.dataset.groupAction = 'member-power';
    powerInput.dataset.groupId = group.id;
    powerInput.dataset.memberId = member.id;
    powerField.append(powerLabel, powerInput);
    row.appendChild(powerField);

    const actions = document.createElement('div');
    actions.className = 'wizard-group-card__member-actions';
    const removeMemberButton = document.createElement('button');
    removeMemberButton.type = 'button';
    removeMemberButton.className = 'wizard-button wizard-button--ghost wizard-button--sm';
    removeMemberButton.dataset.groupAction = 'remove-member';
    removeMemberButton.dataset.groupId = group.id;
    removeMemberButton.dataset.memberId = member.id;
    removeMemberButton.textContent = 'Remove Member';
    actions.appendChild(removeMemberButton);
    row.appendChild(actions);

    return row;
  }

  function focusGroupRequiredField(groupId) {
    if (!groupListElement) {
      return;
    }
    requestAnimationFrame(() => {
      const card = groupListElement.querySelector(`.wizard-group-card[data-group-id="${groupId}"]`);
      if (card && !card.open) {
        card.open = true;
      }
      const input = groupListElement.querySelector(
        `[data-group-action="required-power"][data-group-id="${groupId}"]`
      );
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    });
  }

  function focusGroupMemberIdentity(groupId, memberId) {
    if (!groupListElement) {
      return;
    }
    requestAnimationFrame(() => {
      const card = groupListElement.querySelector(`.wizard-group-card[data-group-id="${groupId}"]`);
      if (card && !card.open) {
        card.open = true;
      }
      const input = groupListElement.querySelector(
        `[data-group-action="member-identity"][data-group-id="${groupId}"][data-member-id="${memberId}"]`
      );
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    });
  }

  function initialisePermissionGroupsUI() {
    ensurePermissionsGroupState();
    renderPermissionGroups();

    if (groupAddButton) {
      groupAddButton.addEventListener('click', () => {
        addPermissionGroup();
      });
    }

    if (groupMainPositionInput) {
      const handlePositionChange = () => {
        ensurePermissionsGroupState();
        const groups = wizardState.form.permissions.groups;
        if (!groups.length) {
          groupMainPositionInput.value = '';
          groupMainPositionInput.disabled = true;
          return;
        }
        let value = parseInt(groupMainPositionInput.value, 10);
        if (!Number.isInteger(value) || value < 1) {
          value = 1;
        }
        const zeroBased = clampMainControlIndex(value - 1, groups.length);
        wizardState.form.permissions.mainControlGroupIndex = zeroBased;
        groupMainPositionInput.value = String(zeroBased + 1);
        groupMainPositionInput.disabled = false;
        renderPermissionGroups();
        persistState();
      };
      groupMainPositionInput.addEventListener('input', handlePositionChange);
      groupMainPositionInput.addEventListener('blur', handlePositionChange);
    }

    if (groupListElement) {
      groupListElement.addEventListener('click', handleGroupListClick);
      groupListElement.addEventListener('input', handleGroupListInput);
    }
  }

  function handleGroupListClick(event) {
    const trigger = event.target.closest('[data-group-action]');
    if (!trigger) {
      return;
    }
    const action = trigger.dataset.groupAction;
    const groupId = trigger.dataset.groupId;
    const memberId = trigger.dataset.memberId;

    switch (action) {
      case 'add-member':
        addGroupMember(groupId);
        break;
      case 'remove-group':
        removePermissionGroup(groupId);
        break;
      case 'remove-member':
        removeGroupMember(groupId, memberId);
        break;
      default:
        break;
    }
  }

  function handleGroupListInput(event) {
    const input = event.target.closest('[data-group-action]');
    if (!input) {
      return;
    }
    const action = input.dataset.groupAction;
    const groupId = input.dataset.groupId;
    const memberId = input.dataset.memberId;

    switch (action) {
      case 'group-name': {
        updateGroupName(groupId, input.value);
        break;
      }
      case 'required-power': {
        updateGroupRequiredPower(groupId, input.value);
        input.value = normaliseUnsignedValue(input.value);
        break;
      }
      case 'member-identity':
        updateGroupMemberField(groupId, memberId, 'identity', input.value);
        break;
      case 'member-power':
        updateGroupMemberField(groupId, memberId, 'power', input.value);
        input.value = normaliseUnsignedValue(input.value);
        break;
      default:
        break;
    }
  }

  function addPermissionGroup() {
    ensurePermissionsGroupState();
    const permissions = wizardState.form.permissions;
    const newGroup = createPermissionGroup();
    const groups = [...permissions.groups, newGroup];
    permissions.groups = groups;
    if (groups.length === 1) {
      permissions.mainControlGroupIndex = 0;
    } else {
      permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);
    }
    renderPermissionGroups();
    focusGroupRequiredField(newGroup.id);
    persistState();
  }

  function removePermissionGroup(groupId) {
    ensurePermissionsGroupState();
    const permissions = wizardState.form.permissions;
    const index = permissions.groups.findIndex((group) => group.id === groupId);
    if (index === -1) {
      return;
    }
    permissions.groups.splice(index, 1);
    permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, permissions.groups.length);
    renderPermissionGroups();
    persistState();
  }

  function addGroupMember(groupId) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const member = createPermissionMember();
    group.members.push(member);
    renderPermissionGroups();
    focusGroupMemberIdentity(groupId, member.id);
    persistState();
  }

  function removeGroupMember(groupId, memberId) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const index = group.members.findIndex((member) => member.id === memberId);
    if (index === -1) {
      return;
    }
    group.members.splice(index, 1);
    renderPermissionGroups();
    persistState();
  }

  function updateGroupName(groupId, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    group.name = typeof value === 'string' ? value : '';
    persistState();
    // Re-render groups to update the card title with the new name
    renderPermissionGroups();
  }

  function updateGroupRequiredPower(groupId, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    group.requiredPower = normaliseUnsignedValue(value);
    persistState();
  }

  function updateGroupMemberField(groupId, memberId, field, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const member = group.members.find((entry) => entry.id === memberId);
    if (!member) {
      return;
    }
    if (field === 'identity') {
      member.identity = typeof value === 'string' ? value.trim() : '';
    } else if (field === 'power') {
      member.power = normaliseUnsignedValue(value);
    }
    persistState();
  }

  function initialiseLocalizationUI() {
    if (!localizationList) {
      return;
    }
    ensureNamingFormState();
    const rowsData = Array.isArray(wizardState.form.naming.rows)
      ? wizardState.form.naming.rows
      : [];
    renderLocalizationRows(limitLocalizationRows(rowsData));
    validateLocalizationRows({ silent: true });
    if (localizationAddButton && localizationWrapper) {
      localizationAddButton.setAttribute('aria-controls', localizationWrapper.id);
    }
    const registerAddHandler = (button) => {
      if (!button) {
        return;
      }
      button.addEventListener('click', () => {
        addLocalizationRow(createEmptyLocalizationRowData());
      });
    };
    registerAddHandler(localizationAddButton);
    // ADDED: Wire up the "+ Add language" button that appears after first language
    const localizationAddMoreButton = document.getElementById('localization-add-more');
    registerAddHandler(localizationAddMoreButton);

    // ADDED: Event listener for remove buttons (using event delegation)
    if (localizationList) {
      localizationList.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-remove-localization')) {
          const rowId = e.target.getAttribute('data-remove-localization');
          removeLocalizationRow(rowId);
        }
      });
    }

    syncLocalizationVisibility();
  }

  function renderLocalizationRows(rowsData) {
    if (!localizationList) {
      return;
    }
    localizationList.innerHTML = '';
    localizationRows = [];
    localizationRowIdCounter = 0;
    const entries = limitLocalizationRows(Array.isArray(rowsData) ? rowsData : []);

    // For English rows, use the token name fields as the source of truth
    const tokenName = tokenNameInput ? tokenNameInput.value.trim() : '';
    const tokenPlural = tokenPluralInput ? tokenPluralInput.value.trim() : '';
    const tokenCapitalize = tokenCapitalizeInput ? tokenCapitalizeInput.checked : false;

    entries.forEach((entry) => {
      // If this is an English row, sync values from token name fields
      if (entry.code && entry.code.toLowerCase() === 'en' && tokenName) {
        entry.singularForm = tokenName;
        entry.pluralForm = tokenPlural;
        entry.shouldCapitalize = tokenCapitalize;
      }
      addLocalizationRow(entry, { focus: false, evaluate: false });
    });
    syncLocalizationVisibility();
  }

  function addLocalizationRow(initialData = createEmptyLocalizationRowData(), options = {}) {
    if (!localizationList) {
      return null;
    }
    // REMOVED LIMITATION: Allow multiple localization rows (one per language)
    // Original code prevented adding more than 1 language - now unlimited
    localizationRowIdCounter += 1;
    const rowId = `localization-${localizationRowIdCounter}`;
    const normalized = normalizeLocalizationRowData(initialData);
    const row = createLocalizationRow(rowId, normalized);
    localizationRows.push(row);
    localizationList.appendChild(row.elements.container);
    syncLocalizationVisibility();
    if (options.focus !== false) {
      row.elements.codeInput.focus();
    }
    if (options.evaluate !== false) {
      evaluateNaming({ touched: true });
    }
    return row;
  }

  // ADDED: Function to remove a localization row
  /**
   * Performance Enhancement: Proper cleanup when removing localization rows
   * Removes event listeners and DOM elements to prevent memory leaks
   * I7: Enhanced with exit animation before removal
   */
  function removeLocalizationRow(rowId) {
    const index = localizationRows.findIndex(row => row.id === rowId);
    if (index === -1) {
      return;
    }
    const row = localizationRows[index];
    const container = row.elements?.container;

    // I7: Add exit animation before removing
    if (container && container.parentNode) {
      container.classList.add('localization-row--removing');

      // Wait for animation to complete before removing
      setTimeout(() => {
        // Performance Enhancement: Clear references to help garbage collection
        if (row.elements) {
          Object.keys(row.elements).forEach(key => {
            row.elements[key] = null;
          });
        }

        // Remove from DOM
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }

        // Remove from array
        const currentIndex = localizationRows.findIndex(r => r.id === rowId);
        if (currentIndex !== -1) {
          localizationRows.splice(currentIndex, 1);
        }

        // Update UI and validation
        syncLocalizationVisibility();
        evaluateNaming({ touched: true });
      }, 250); // Match CSS animation duration
    } else {
      // Fallback: immediate removal if no container
      if (row.elements) {
        Object.keys(row.elements).forEach(key => {
          row.elements[key] = null;
        });
      }
      localizationRows.splice(index, 1);
      syncLocalizationVisibility();
      evaluateNaming({ touched: true });
    }
  }

  function createLocalizationRow(rowId, data) {
    const container = document.createElement('div');
    container.className = 'localization-row';
    container.dataset.localizationRow = rowId;

    const header = document.createElement('div');
    header.className = 'localization-row__header';

    const codeField = document.createElement('div');
    codeField.className = 'wizard-field localization-row__field localization-row__field--code';
    const codeLabel = document.createElement('label');
    codeLabel.className = 'wizard-field__label';
    codeLabel.setAttribute('for', `${rowId}-code`);
    codeLabel.textContent = 'Language code';

    // Use input with datalist for selecting or typing custom language codes
    const codeInput = document.createElement('input');
    codeInput.className = 'wizard-field__input';
    codeInput.id = `${rowId}-code`;
    codeInput.name = `${rowId}-code`;
    codeInput.type = 'text';
    codeInput.setAttribute('list', `${rowId}-languages`);
    codeInput.placeholder = 'Select or type code (e.g., en, es, fr)';
    codeInput.maxLength = 2;
    codeInput.value = data.code || '';
    codeInput.pattern = '[a-z]{2}';

    // Create datalist with most common languages
    const datalist = document.createElement('datalist');
    datalist.id = `${rowId}-languages`;

    const languages = [
      { code: 'es', name: 'Spanish (Español)' },
      { code: 'zh', name: 'Chinese (中文)' },
      { code: 'fr', name: 'French (Français)' },
      { code: 'de', name: 'German (Deutsch)' },
      { code: 'pt', name: 'Portuguese (Português)' },
      { code: 'ru', name: 'Russian (Русский)' },
      { code: 'ja', name: 'Japanese (日本語)' },
      { code: 'ar', name: 'Arabic (العربية)' },
      { code: 'hi', name: 'Hindi (हिन्दी)' },
      { code: 'it', name: 'Italian (Italiano)' }
    ];

    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      datalist.appendChild(option);
    });

    codeField.appendChild(datalist);

    const codeHint = document.createElement('p');
    codeHint.className = 'wizard-field__hint';
    codeHint.id = `${rowId}-code-hint`;
    codeHint.textContent = '2-letter ISO 639-1 code • Select from list or type your own (e.g., ko, tr, nl)';
    const codeMessage = document.createElement('p');
    codeMessage.className = 'wizard-field__message';
    codeMessage.id = `${rowId}-code-message`;
    codeMessage.setAttribute('role', 'status');
    codeMessage.setAttribute('aria-live', 'polite');
    codeInput.setAttribute('aria-describedby', `${codeHint.id} ${codeMessage.id}`);
    codeField.append(codeLabel, codeInput, codeHint, codeMessage);

    header.append(codeField);

    // Translation fields container (shown when language is selected)
    const translationFields = document.createElement('div');
    translationFields.className = 'localization-row__fields';
    translationFields.id = `${rowId}-fields`;
    translationFields.hidden = !data.code; // Hide if no language selected

    // Singular form field
    const singularField = document.createElement('div');
    singularField.className = 'wizard-field';
    const singularLabel = document.createElement('label');
    singularLabel.className = 'wizard-field__label';
    singularLabel.setAttribute('for', `${rowId}-singular`);
    singularLabel.textContent = 'Singular form';
    const singularInput = document.createElement('input');
    singularInput.className = 'wizard-field__input';
    singularInput.type = 'text';
    singularInput.id = `${rowId}-singular`;
    singularInput.name = `${rowId}-singular`;
    singularInput.placeholder = 'Token';
    singularInput.value = data.singularForm || '';
    singularInput.maxLength = 25;
    const singularMessage = document.createElement('p');
    singularMessage.className = 'wizard-field__message';
    singularMessage.id = `${rowId}-singular-message`;
    singularMessage.setAttribute('role', 'status');
    singularMessage.setAttribute('aria-live', 'polite');
    singularField.append(singularLabel, singularInput, singularMessage);

    // Plural form field
    const pluralField = document.createElement('div');
    pluralField.className = 'wizard-field';
    const pluralLabel = document.createElement('label');
    pluralLabel.className = 'wizard-field__label';
    pluralLabel.setAttribute('for', `${rowId}-plural`);
    pluralLabel.textContent = 'Plural form';
    const pluralInput = document.createElement('input');
    pluralInput.className = 'wizard-field__input';
    pluralInput.type = 'text';
    pluralInput.id = `${rowId}-plural`;
    pluralInput.name = `${rowId}-plural`;
    pluralInput.placeholder = 'Tokens';
    pluralInput.value = data.pluralForm || '';
    pluralInput.maxLength = 25;
    const pluralMessage = document.createElement('p');
    pluralMessage.className = 'wizard-field__message';
    pluralMessage.id = `${rowId}-plural-message`;
    pluralMessage.setAttribute('role', 'status');
    pluralMessage.setAttribute('aria-live', 'polite');
    pluralField.append(pluralLabel, pluralInput, pluralMessage);

    // Capitalize checkbox field
    const capitalizeField = document.createElement('div');
    capitalizeField.className = 'wizard-field';
    const capitalizeLabel = document.createElement('label');
    capitalizeLabel.className = 'wizard-checkbox';
    capitalizeLabel.setAttribute('for', `${rowId}-capitalize`);
    const capitalizeInput = document.createElement('input');
    capitalizeInput.className = 'wizard-checkbox__input';
    capitalizeInput.type = 'checkbox';
    capitalizeInput.id = `${rowId}-capitalize`;
    capitalizeInput.name = `${rowId}-capitalize`;
    capitalizeInput.checked = data.shouldCapitalize !== false;
    const capitalizeLabelText = document.createElement('span');
    capitalizeLabelText.className = 'wizard-checkbox__label';
    capitalizeLabelText.textContent = 'Capitalize';
    capitalizeLabel.append(capitalizeInput, capitalizeLabelText);
    capitalizeField.append(capitalizeLabel);

    translationFields.append(singularField, pluralField, capitalizeField);

    // ADDED: Remove button for each localization row
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'wizard-button wizard-button--danger wizard-button--small';
    removeButton.setAttribute('data-remove-localization', rowId);
    removeButton.textContent = 'Remove';
    removeButton.style.marginTop = 'var(--space-3)';
    // FIXED: Add ARIA label for accessibility
    const langLabel = data.code ? ` (${data.code})` : '';
    removeButton.setAttribute('aria-label', `Remove localization${langLabel}`);

    container.append(header, translationFields, removeButton);

    const row = {
      id: rowId,
      elements: {
        container,
        codeInput,
        codeMessage,
        translationFields,
        singularInput,
        singularMessage,
        pluralInput,
        pluralMessage,
        capitalizeInput,
        removeButton
      },
      data: {
        code: codeInput.value,
        singularForm: singularInput.value,
        pluralForm: pluralInput.value,
        shouldCapitalize: capitalizeInput.checked
      }
    };

    // Event listeners
    codeInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'code', codeInput.value));
    codeInput.addEventListener('change', () => handleLocalizationFieldInput(row, 'code', codeInput.value));
    singularInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'singular', singularInput.value));
    pluralInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'plural', pluralInput.value));
    capitalizeInput.addEventListener('change', () => handleLocalizationFieldInput(row, 'capitalize', capitalizeInput.checked));

    return row;
  }

  function showLocalizationForm() {
    if (localizationWrapper) {
      localizationWrapper.hidden = false;
    }
    if (localizationEmptyState) {
      // FIXED: Hide empty state when there are localizations
      localizationEmptyState.hidden = true;
    }
    if (localizationGuidance) {
      localizationGuidance.hidden = true;
      localizationGuidance.setAttribute('aria-hidden', 'true');
    }
    if (localizationAddButton) {
      localizationAddButton.setAttribute('aria-expanded', 'true');
    }
  }

  function hideLocalizationForm() {
    if (localizationWrapper) {
      localizationWrapper.hidden = true;
    }
    if (localizationEmptyState) {
      localizationEmptyState.hidden = false;
    }
    if (localizationGuidance) {
      localizationGuidance.hidden = false;
      localizationGuidance.removeAttribute('aria-hidden');
    }
    if (localizationGlobalMessage) {
      localizationGlobalMessage.textContent = '';
    }
    if (localizationAddButton) {
      localizationAddButton.setAttribute('aria-expanded', 'false');
    }
  }

  function syncLocalizationVisibility() {
    const hasRows = localizationRows.length > 0;
    if (hasRows) {
      showLocalizationForm();
    } else {
      hideLocalizationForm();
    }
  }

  function handleLocalizationFieldInput(row, field, value) {
    if (!row || !row.elements) {
      return;
    }
    if (field === 'code') {
      const normalized = (value || '').toLowerCase();
      row.data.code = normalized;
      if (row.elements.codeInput.value !== normalized) {
        row.elements.codeInput.value = normalized;
      }
      // Show/hide translation fields based on whether a language is selected
      if (row.elements.translationFields) {
        row.elements.translationFields.hidden = !normalized;
      }
    } else if (field === 'singular') {
      row.data.singularForm = value;
    } else if (field === 'plural') {
      row.data.pluralForm = value;
    } else if (field === 'capitalize') {
      row.data.shouldCapitalize = Boolean(value);
    }
    evaluateNaming({ touched: true });
  }

  function handleLocalizationCheckboxChange(row, checked) {
    if (!row) {
      return;
    }
    row.data.shouldCapitalize = Boolean(checked);
    evaluateNaming({ touched: true });
  }

  function applyLocalizationRowErrors(row, errors, visibility = {}) {
    const showCode = visibility.showCode ?? true;
    const showSingular = visibility.showSingular ?? true;
    const showPlural = visibility.showPlural ?? true;
    if (row.elements.codeMessage) {
      row.elements.codeMessage.textContent = showCode ? errors.code || '' : '';
    }
    toggleAriaInvalid(row.elements.codeInput, showCode && Boolean(errors.code));
    if (row.elements.singularMessage) {
      row.elements.singularMessage.textContent = showSingular ? errors.singular || '' : '';
    }
    toggleAriaInvalid(row.elements.singularInput, showSingular && Boolean(errors.singular));
    if (row.elements.pluralMessage) {
      row.elements.pluralMessage.textContent = showPlural ? errors.plural || '' : '';
    }
    toggleAriaInvalid(row.elements.pluralInput, showPlural && Boolean(errors.plural));
  }

  function toggleAriaInvalid(element, isInvalid) {
    if (!element) {
      return;
    }
    if (isInvalid) {
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('aria-invalid');
    }
  }

  function validateLocalizationRows({ touched = false, silent = false } = {}) {
    if (!localizationList) {
      return { valid: false, record: {}, reasons: ['Add at least one localization.'] };
    }

    // Get singular/plural from main token name form
    const mainSingular = wizardState.form.naming.singular || '';
    const mainPlural = wizardState.form.naming.plural || '';

    let rowsData = localizationRows.map((row) => {
      const data = {
        code: row.elements.codeInput.value || '',
        singularForm: row.elements.singularInput?.value || '',
        pluralForm: row.elements.pluralInput?.value || '',
        shouldCapitalize: row.elements.capitalizeInput?.checked !== false
      };
      row.data = data;
      return data;
    });

    rowsData = limitLocalizationRows(rowsData);
    localizationRows.slice(0, rowsData.length).forEach((row, index) => {
      row.data = rowsData[index];
    });

    const reasons = [];
    const record = {};
    let hasValidEntry = false;
    const hasAnyInput = rowsData.some((data) => {
      return data.code.trim().length > 0;
    });

    rowsData.forEach((data, index) => {
      const row = localizationRows[index];
      if (!row) {
        return;
      }
      const trimmedCode = data.code.trim();
      const trimmedSingular = (data.singularForm || '').trim();
      const trimmedPlural = (data.pluralForm || '').trim();
      const errors = { code: '', singular: '', plural: '' };
      const showRowErrors = touched || hasAnyInput;

      // Validate language code
      if (trimmedCode.length === 0) {
        if (showRowErrors) {
          errors.code = 'Select a language code.';
        }
      } else if (!LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
        errors.code = 'Use a 2-letter lowercase code.';
        reasons.push(`Localization ${index + 1} language code: Select a valid ISO 639-1 language.`);
      }

      // If language code is entered, validate singular and plural forms
      if (trimmedCode.length > 0 && LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
        if (trimmedSingular.length === 0) {
          errors.singular = 'Enter singular form.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Enter a singular form.`);
          }
        } else if (trimmedSingular.length < 3 || trimmedSingular.length > 25) {
          errors.singular = 'Must be 3-25 characters.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Singular form must be 3-25 characters.`);
          }
        }

        if (trimmedPlural.length === 0) {
          errors.plural = 'Enter plural form.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Enter a plural form.`);
          }
        } else if (trimmedPlural.length < 3 || trimmedPlural.length > 25) {
          errors.plural = 'Must be 3-25 characters.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Plural form must be 3-25 characters.`);
          }
        }
      }

      if (!silent) {
        applyLocalizationRowErrors(row, errors, {
          showCode: showRowErrors,
          showSingular: showRowErrors,
          showPlural: showRowErrors
        });
      }

      // Only add to record if all fields are valid
      if (!errors.code && !errors.singular && !errors.plural && trimmedCode.length > 0) {
        hasValidEntry = true;
        record[trimmedCode] = {
          should_capitalize: Boolean(data.shouldCapitalize),
          singular_form: trimmedSingular,
          plural_form: trimmedPlural
        };
      }
    });

    const sortedRecord = {};
    Object.keys(record)
      .sort()
      .forEach((key) => {
        sortedRecord[key] = record[key];
      });

    ensureNamingFormState();
    wizardState.form.naming.rows = rowsData.map((data) => ({
      code: data.code,
      singularForm: data.singularForm || '',
      pluralForm: data.pluralForm || '',
      shouldCapitalize: Boolean(data.shouldCapitalize)
    }));
    wizardState.form.naming.rows = limitLocalizationRows(wizardState.form.naming.rows);

    // Preserve auto-synced 'en' entry when updating from manual localization rows
    const existingEn = wizardState.form.naming.conventions.localizations?.en;
    wizardState.form.naming.conventions.localizations = limitLocalizationRecord(sortedRecord);
    // Restore 'en' entry if it existed, has valid data, and wasn't in manual rows
    if (existingEn && !sortedRecord.en && existingEn.singular_form) {
      wizardState.form.naming.conventions.localizations.en = existingEn;
    }

    if (localizationGlobalMessage) {
      // FIXED: Update message to reflect that localization is optional
      if (!hasValidEntry && hasAnyInput && (touched || hasAnyInput)) {
        localizationGlobalMessage.textContent = 'Complete all fields for each localization or remove incomplete entries.';
      } else if (hasValidEntry || !hasAnyInput) {
        localizationGlobalMessage.textContent = '';
      }
    }

    syncLocalizationVisibility();

    // FIXED: Make localization optional - only require validation if user has started adding localizations
    // If no rows exist or all rows are empty, that's valid (localization is optional)
    // Only fail validation if there are partial entries with errors
    if (!hasValidEntry && hasAnyInput) {
      reasons.push('Complete the localization entries or remove them.');
    }

    const uniqueReasons = Array.from(new Set(reasons));
    // Valid if: (no input at all) OR (has valid entry AND no errors)
    const valid = !hasAnyInput || (hasValidEntry && uniqueReasons.length === 0);
    const rowsForServer = rowsData.map((data) => ({
      code: data.code,
      should_capitalize: Boolean(data.shouldCapitalize),
      singular_form: data.singularForm || '',
      plural_form: data.pluralForm || ''
    }));

    return {
      valid,
      record: sortedRecord,
      reasons: uniqueReasons,
      rows: rowsForServer
    };
  }

  function showScreen(screenId, { suppressFocus = false, force = false, isManualNavigation = false } = {}) {
    const requestedScreenId = screenId;

    // If a transition is in progress, queue this one
    if (isTransitioning) {
      pendingTransition = { screenId, suppressFocus, force, isManualNavigation };
      return;
    }

    isTransitioning = true;

    // FIX: Deactivate standalone pages (groups, templates) before showing wizard screens
    // These pages are not in screenDefinitions, so they must be handled separately
    const standalonePagesIds = ['screen-groups-page', 'screen-templates-page'];
    standalonePagesIds.forEach(pageId => {
      const page = document.getElementById(pageId);
      if (page && page.classList.contains('wizard-screen--active')) {
        page.classList.remove('wizard-screen--active');
      }
    });

    // FIX: Check if screenId is a valid substep to allow forced navigation to substeps
    const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps =>
      substeps.includes(screenId)
    );

    if (!force) {
      screenId = resolveStepTargetId(screenId);
    } else if (!STEP_SEQUENCE.includes(screenId) && !isValidSubstep) {
      // Only resolve if not a main step AND not a valid substep
      screenId = resolveStepTargetId(screenId);
    }

    if (!activeScreens.some((definition) => definition.id === screenId)) {
      if (activeScreens.length === 0) {
        debug.error('No active screens available');
        isTransitioning = false; // Unlock before returning
        return;
      }
      screenId = activeScreens[0].id;
      if (force && screenId !== requestedScreenId) {
        manualNavigationActive = false;
      }
      screenId = resolveStepTargetId(screenId);
    }

    currentScreenId = screenId;

    // OPTIMIZED: Single pass DOM operations to reduce reflows
    // Pre-calculate direction and target screen outside loop
    const allScreenIds = screenDefinitions.map(d => d.id);
    const previousActiveScreen = document.querySelector('.wizard-screen--active');
    let targetDefinition = null;
    let direction = 'forward';

    // Find target and calculate direction
    for (const definition of screenDefinitions) {
      const isActiveDefinition = activeScreens.some((active) => active.id === definition.id);
      const shouldShow = isActiveDefinition && definition.id === screenId;
      if (shouldShow) {
        targetDefinition = definition;
        if (previousActiveScreen && previousActiveScreen !== definition.element) {
          const prevIndex = allScreenIds.indexOf(previousActiveScreen.id.replace('screen-', ''));
          const newIndex = allScreenIds.indexOf(definition.id);
          direction = newIndex >= prevIndex ? 'forward' : 'backward';
        }
        break;
      }
    }

    // Single pass: update all screens in one iteration
    screenDefinitions.forEach((definition) => {
      if (!definition.element) return;

      // Remove hidden attribute if present
      if (definition.element.hasAttribute('hidden')) {
        definition.element.removeAttribute('hidden');
      }

      // Remove direction classes from all screens
      definition.element.classList.remove('wizard-screen--enter-forward', 'wizard-screen--enter-backward');

      const isActiveDefinition = activeScreens.some((active) => active.id === definition.id);
      const shouldShow = isActiveDefinition && definition.id === screenId;

      if (shouldShow) {
        // Add direction class for animation
        definition.element.classList.add(direction === 'forward' ? 'wizard-screen--enter-forward' : 'wizard-screen--enter-backward');
        // Make this screen active
        definition.element.classList.add('wizard-screen--active');

        // Focus handling
        if (!suppressFocus) {
          const targetHeading = definition.element.querySelector('h1');
          if (targetHeading) {
            setTimeout(() => targetHeading.focus({ preventScroll: false }), 220);
          }
        }
      } else {
        // Remove active class - CSS will handle fade out
        definition.element.classList.remove('wizard-screen--active');
      }
    });

    // DEFENSIVE: Verify only one screen is active (catch any future bugs)
    const activeScreenElements = document.querySelectorAll('.wizard-screen--active');
    if (activeScreenElements.length !== 1) {
      // Only log error if we have multiple (not zero) - zero can happen during tab switches
      if (activeScreenElements.length > 1) {
        debug.error('Multiple active screens detected:', activeScreenElements.length);
      }
      // Force-fix: Remove active class from all except the current one
      activeScreenElements.forEach((el) => {
        if (el.id !== 'screen-' + screenId) {
          el.classList.remove('wizard-screen--active');
        }
      });
      // If no screen is active, try to activate the target screen directly
      if (activeScreenElements.length === 0) {
        const targetScreen = document.getElementById('screen-' + screenId);
        if (targetScreen) {
          targetScreen.classList.add('wizard-screen--active');
        }
      }
    }

    // FIXED: Track previous parent step from current active screen
    const previousActiveStepId = wizardState.active;
    const previousParentStep = previousActiveStepId ? getPrimaryStepId(previousActiveStepId) : null;
    const currentParentStep = getPrimaryStepId(screenId);
    const parentStepChanged = previousParentStep !== currentParentStep;

    if (wizardState.active !== screenId) {
      wizardState.active = screenId;
      persistState();
    }

    wizardElement.dataset.activeStep = screenId;

    // Update progress indicator
    updateProgressIndicator(getPrimaryStepId(screenId));

    // OPTIMIZED: Consolidate all screen-specific updates into a single RAF call
    requestAnimationFrame(() => {
      const primaryStep = getPrimaryStepId(screenId);

      // Update configuration overview when showing overview step
      if (screenId === 'overview' || primaryStep === 'overview') {
        if (typeof updateConfigurationOverview === 'function') {
          updateConfigurationOverview();
        }
      }

      // Restore preset selection when showing permissions screen
      if (screenId === 'permissions' || primaryStep === 'permissions') {
        if (typeof window.restorePresetSelection === 'function') {
          window.restorePresetSelection();
        }
      }

      // Sync search form when showing search screen
      if (screenId === 'search' || primaryStep === 'search') {
        syncSearchUI();
      }

      // Update export preview and UI when showing export step
      if (screenId === 'export' || primaryStep === 'export') {
        updateExportPreview();
        updateExportScreenUI();
      }

      // Distribution screen updates
      if (screenId === 'distribution-perpetual' || screenId === 'distribution-preprogrammed' || primaryStep === 'distribution') {
        // Update recipient visibility for perpetual
        if (screenId === 'distribution-perpetual') {
          if (distributionUI && typeof distributionUI.updateRecipientVisibility === 'function') {
            distributionUI.updateRecipientVisibility();
          }
        }

        // Sync preprogrammed distribution form
        if (screenId === 'distribution-preprogrammed' || primaryStep === 'distribution') {
          const preprogrammedYes = document.querySelector('input[name="preprogrammed-enable"][value="yes"]');
          const preprogrammedNo = document.querySelector('input[name="preprogrammed-enable"][value="no"]');
          const preprogrammedContainer = document.getElementById('preprogrammed-entries-container');

          if (wizardState.form.distribution.enablePreProgrammed) {
            if (preprogrammedYes) preprogrammedYes.checked = true;
            if (preprogrammedContainer) preprogrammedContainer.removeAttribute('hidden');
          } else {
            if (preprogrammedNo) preprogrammedNo.checked = true;
            if (preprogrammedContainer) preprogrammedContainer.setAttribute('hidden', '');
          }
        }

        // Sync perpetual distribution form
        if (screenId === 'distribution-perpetual' || primaryStep === 'distribution') {
          const perpetualYes = document.querySelector('input[name="perpetual-enable"][value="yes"]');
          const perpetualNo = document.querySelector('input[name="perpetual-enable"][value="no"]');
          const perpetualContainer = document.getElementById('perpetual-config-container');

          if (wizardState.form.distribution.enablePerpetual) {
            if (perpetualYes) perpetualYes.checked = true;
            if (perpetualContainer) perpetualContainer.removeAttribute('hidden');
          } else {
            if (perpetualNo) perpetualNo.checked = true;
            if (perpetualContainer) perpetualContainer.setAttribute('hidden', '');
          }
        }
      }
    });

    // FIXED: Never fold sections on manual navigation - only on Continue/Back between parent steps
    const shouldFoldSections = false;  // Manual clicks don't fold anything
    const shouldAutoExpandOnSwitch = !isManualNavigation && parentStepChanged;  // Continue/Back auto-expands
    updateSidebarNavState(screenId, previousParentStep, shouldFoldSections, shouldAutoExpandOnSwitch);
    // FIXED: Get parent step for substeps when checking state
    const stepForState = getParentStep(screenId) || screenId;
    // Mark step as touched when user navigates to it - this triggers Invalid/Valid display
    evaluateStep(screenId, {
      touched: true,           // Always mark as touched when visiting
      silent: true,            // Suppress error messages on navigation
      showFieldIndicators: true
    });

    // Unlock transitions after animation completes
    setTimeout(() => {
      isTransitioning = false;

      // Process pending transition if any
      if (pendingTransition) {
        const pending = pendingTransition;
        pendingTransition = null;
        showScreen(pending.screenId, {
          suppressFocus: pending.suppressFocus,
          force: pending.force,
          isManualNavigation: pending.isManualNavigation
        });
      }
    }, 250); // Slightly longer than animation duration for safety
  }

  // P2 FIX: Renamed from updateProgressIndicator to avoid shadowing the progress bar function
  function updateSidebarNavState(activeStepId, previousParentStep = null, shouldFoldSections = false, shouldAutoExpandOnSwitch = false) {
    const resolvedActiveId = getPrimaryStepId(activeStepId);

    progressItems.forEach((item) => {
      const step = item.getAttribute('data-step');
      const status = getStepStatus(step);
      const hasChildren = Boolean(item.getAttribute('data-toggle'));
      const userCollapsed = item.dataset.userCollapsed === 'true';
      const shouldOpen = hasChildren && step === resolvedActiveId;

      item.removeAttribute('aria-current');
      item.setAttribute('aria-disabled', 'false');
      item.classList.remove('is-active', 'is-complete', 'is-future');

      if (hasChildren) {
        // FIXED: Auto-expand on Continue/Back when switching to new parent step
        // Keep all previously visited sections expanded
        if (shouldAutoExpandOnSwitch && shouldOpen) {
          // Continue/Back switched to this parent step - auto-expand it
          item.classList.add('is-open');
          delete item.dataset.userCollapsed;
        } else if (shouldOpen && !userCollapsed) {
          // Navigating within same section or manual click - keep current section open
          item.classList.add('is-open');
        }

        const isOpen = item.classList.contains('is-open');
        item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        // Also update parent .sidebar-step wrapper for CSS styling
        const sidebarStep = item.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        const nestedList = item.querySelector('.wizard-subpath');
        if (nestedList) {
          if (isOpen) {
            nestedList.removeAttribute('hidden');
          } else {
            nestedList.setAttribute('hidden', '');
          }
        }
      }

      if (step === resolvedActiveId) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'step');
      } else if (status === 'valid') {
        item.classList.add('is-complete');
      } else {
        item.classList.add('is-future');
      }
    });

    // FIXED: Use data-substep attribute for substep navigation items
    subpathItems.forEach((item) => {
      const subStep = item.getAttribute('data-substep');
      if (subStep === activeStepId) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('is-active');
        item.removeAttribute('aria-current');
      }
    });

    // FIXED: Also handle new sidebar navigation (.wizard-nav-item--expandable)
    const navExpandableButtons = document.querySelectorAll('.wizard-nav-item--expandable');
    navExpandableButtons.forEach((button) => {
      const step = button.getAttribute('data-step');
      const submenuId = button.getAttribute('data-toggle');
      const submenu = submenuId ? document.getElementById(submenuId) : null;
      const shouldExpand = step === resolvedActiveId;
      const sidebarStep = button.closest('.sidebar-step');

      // FIXED: Auto-expand on Continue/Back when switching to new section
      // Keep all previously visited sections expanded
      if (shouldAutoExpandOnSwitch && shouldExpand) {
        // Continue/Back switched to this parent step - auto-expand it
        button.setAttribute('aria-expanded', 'true');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
        if (submenu) {
          submenu.hidden = false;
        }
      } else if (shouldExpand) {
        // Navigating within same section - keep current section open
        const currentExpanded = button.getAttribute('aria-expanded') === 'true';
        if (!currentExpanded) {
          button.setAttribute('aria-expanded', 'true');
          if (sidebarStep) {
            sidebarStep.setAttribute('aria-expanded', 'true');
          }
          if (submenu) {
            submenu.hidden = false;
          }
        }
      }
    });
  }

  function syncRegistrationSelection() {
    const selectedValue = wizardState.form.registration.method;
    registrationMethodInputs.forEach((input) => {
      input.checked = input.value === selectedValue;
    });
    registrationOptionLabels.forEach((label) => {
      const input = label.querySelector('input[name="registration-method"]');
      const isSelected = Boolean(input && input.value === selectedValue);
      if (input) {
        input.checked = isSelected;
      }
      label.classList.toggle('wizard-option--selected', isSelected);
      label.setAttribute('aria-checked', String(isSelected));
    });
  }

  function syncSearchUI() {
    if (searchKeywordsInput) {
      searchKeywordsInput.value = wizardState.form.search.keywords || '';
    }
    if (searchDescriptionInput) {
      searchDescriptionInput.value = wizardState.form.search.description || '';
    }
    updateKeywordsPreview();
  }

  function updateKeywordsPreview() {
    const previewContainer = document.getElementById('search-keywords-preview');
    const tagContainer = document.getElementById('search-keywords-tag-container');

    if (!searchKeywordsInput || !previewContainer || !tagContainer) {
      return;
    }

    const keywords = searchKeywordsInput.value.trim();

    if (!keywords) {
      previewContainer.style.display = 'none';
      tagContainer.innerHTML = '';
      return;
    }

    const tags = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (tags.length === 0) {
      previewContainer.style.display = 'none';
      tagContainer.innerHTML = '';
      return;
    }

    previewContainer.style.display = 'block';
    tagContainer.innerHTML = tags.map(tag => `
      <span class="keyword-tag">${tag}</span>
    `).join('');
  }

  function updateRegistrationPreviewVisibility() {
    const method = wizardState.form.registration.method;
    const jsonReady = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
    if (jsonPreview) {
      if (method === 'det' && jsonReady) {
        jsonPreview.hidden = false;
        renderJsonPreview();
      } else {
        jsonPreview.hidden = true;
        jsonPreviewContent.textContent = '';
      }
    }
  }

  function updateConfigurationOverview() {
    // Update token name
    const tokenNameEl = document.getElementById('overview-token-name');
    if (tokenNameEl) {
      const tokenName = wizardState.form.tokenName?.trim() || 'Not set';
      tokenNameEl.textContent = tokenName;
    }

    // Update decimals
    const decimalsEl = document.getElementById('overview-decimals');
    if (decimalsEl) {
      const decimals = wizardState.form.permissions?.decimals || '—';
      decimalsEl.textContent = decimals;
    }

    // Update base supply
    const baseSupplyEl = document.getElementById('overview-base-supply');
    if (baseSupplyEl) {
      const baseSupply = wizardState.form.permissions?.baseSupply || '0';
      baseSupplyEl.textContent = parseInt(baseSupply, 10).toLocaleString();
    }

    // Update max supply
    const maxSupplyEl = document.getElementById('overview-max-supply');
    if (maxSupplyEl) {
      const useMaxSupply = wizardState.form.permissions?.useMaxSupply;
      const maxSupply = wizardState.form.permissions?.maxSupply;
      if (useMaxSupply && maxSupply) {
        maxSupplyEl.textContent = parseInt(maxSupply, 10).toLocaleString();
      } else {
        maxSupplyEl.textContent = 'Unlimited';
      }
    }

    // Update action preset
    const actionPresetEl = document.getElementById('overview-action-preset');
    if (actionPresetEl) {
      const selectedPreset = wizardState.form.permissions?.selectedPreset;
      if (selectedPreset) {
        // Map preset keys to human-readable names
        const presetNames = {
          'custom': 'Custom',
          'most-restrictive': 'Most Restrictive',
          'emergency-only': 'Only Emergency Action',
          'mint-burn': 'Minting and Burning',
          'advanced': 'Advanced Actions',
          'all-allowed': 'All Allowed'
        };
        actionPresetEl.textContent = presetNames[selectedPreset] || selectedPreset;
      } else {
        actionPresetEl.textContent = 'Custom';
      }
    }

    // Update localizations
    const localizationsEl = document.getElementById('overview-localizations');
    if (localizationsEl) {
      const localizations = wizardState.form.naming?.conventions?.localizations || {};
      const count = Object.keys(localizations).length;
      if (count > 0) {
        const codes = Object.keys(localizations).join(', ').toUpperCase();
        localizationsEl.textContent = `${count} language${count !== 1 ? 's' : ''} (${codes})`;
      } else {
        localizationsEl.textContent = 'None';
      }
    }

    // Update document types
    const documentTypesEl = document.getElementById('overview-document-types');
    if (documentTypesEl) {
      const documentTypes = wizardState.form.documentTypes || {};
      const count = Object.keys(documentTypes).length;
      if (count > 0) {
        const names = Object.keys(documentTypes).join(', ');
        documentTypesEl.textContent = `${count} type${count !== 1 ? 's' : ''} (${names})`;
        documentTypesEl.style.fontWeight = '700';
        documentTypesEl.style.color = 'var(--color-success)';
      } else {
        documentTypesEl.textContent = 'None';
        documentTypesEl.style.fontWeight = '';
        documentTypesEl.style.color = '';
      }
    }

    // Update groups
    const groupsEl = document.getElementById('overview-groups');
    if (groupsEl) {
      const groupsEnabled = wizardState.form.group?.enabled;
      const members = wizardState.form.group?.members || [];
      const validMembers = members.filter(m => m.identityId).length;
      if (groupsEnabled && validMembers > 0) {
        const threshold = wizardState.form.group?.threshold || 0;
        groupsEl.textContent = `${validMembers} member${validMembers !== 1 ? 's' : ''}, ${threshold} required`;
      } else {
        groupsEl.textContent = 'None';
      }
    }

    // Update distribution
    const distributionEl = document.getElementById('overview-distribution');
    if (distributionEl) {
      const emission = wizardState.form.distribution?.emission;
      const preProgrammed = wizardState.form.distribution?.preProgrammed?.entries || [];

      if (emission && emission.type) {
        const cadence = wizardState.form.distribution?.cadence?.type || '';
        distributionEl.textContent = `${emission.type}${cadence ? ' + ' + cadence : ''}`;
      } else if (preProgrammed.length > 0) {
        distributionEl.textContent = `${preProgrammed.length} pre-programmed distribution${preProgrammed.length !== 1 ? 's' : ''}`;
      } else {
        distributionEl.textContent = 'None';
      }
    }
  }

  function getStepState(stepId) {
    return wizardState.steps[stepId];
  }

  function getStepStatus(stepId) {
    const step = getStepState(stepId);
    return step ? step.validity : 'unknown';
  }

  function updateStepState(stepId, updates) {
    const step = getStepState(stepId);
    if (!step) {
      return;
    }

    const previousValidity = step.validity;
    const previousTouched = step.touched;

    if (typeof updates.validity === 'string') {
      step.validity = updates.validity;
    }

    if (updates.touched) {
      step.touched = true;
    }

    const validityChanged = step.validity !== previousValidity;
    const touchedChanged = step.touched !== previousTouched;

    if (validityChanged) {
      updateFurthestValidIndex();
      if (step.validity !== 'valid') {
        const currentIndex = getStepIndex(currentScreenId);
        const invalidIndex = getStepIndex(stepId);
        if (invalidIndex !== -1 && currentIndex !== -1 && invalidIndex < currentIndex) {
          showScreen(stepId);
        }
      }
    }

    if (validityChanged) {
      document.dispatchEvent(new CustomEvent('status-changed', {
        detail: { stepId, validity: step.validity }
      }));
    }

    if (validityChanged || touchedChanged) {
      updateStepStatusUI(stepId);
      updateProgressIndicator(currentScreenId);
    }
  }

  function updateStepStatusUI(stepId) {
    const element = stepStatusElements[stepId];
    if (!element) {
      return;
    }
    const status = getStepStatus(stepId);
    const label = STEP_LABELS[stepId] || stepId;

    element.classList.remove('valid', 'invalid', 'pending');

    let text = '';
    let ariaLabel = '';
    let ariaHidden = true;
    let className = '';

    if (status === 'valid') {
      text = 'Valid';
      ariaLabel = `${label} step status: Valid`;
      ariaHidden = false;
      className = 'valid';
    } else if (status === 'invalid') {
      text = 'Invalid';
      ariaLabel = `${label} step status: Invalid`;
      ariaHidden = false;
      className = 'invalid';
    } else {
      // 'unknown' or any other state shows as Pending
      text = 'Pending';
      ariaLabel = `${label} step status: Pending`;
      ariaHidden = false;
      className = 'pending';
    }

    if (element.textContent !== text) {
      element.textContent = text;
    }

    if (className) {
      element.classList.add(className);
    }

    if (ariaHidden) {
      element.removeAttribute('aria-label');
      element.setAttribute('aria-hidden', 'true');
      element.hidden = true;
    } else {
      element.setAttribute('aria-label', ariaLabel);
      element.setAttribute('aria-hidden', 'false');
      element.hidden = false;
    }

    element.dataset.status = status;
  }

  function updateStepStatusFromValidation(stepId, validation, touched) {
    const step = getStepState(stepId);
    const nextTouched = touched || (step && step.touched);

    let nextValidity = step ? step.validity : 'unknown';
    if (validation.valid) {
      nextValidity = 'valid';
    } else if (nextTouched) {
      // Only show 'invalid' if user has visited/touched the step
      nextValidity = 'invalid';
    } else {
      // Unvisited steps stay 'unknown' (shows as Pending)
      nextValidity = 'unknown';
    }
    updateStepState(stepId, { validity: nextValidity, touched: nextTouched });
  }

  function clearStepMessage(stepId) {
    switch (stepId) {
      case 'naming':
        if (tokenNameMessage.textContent) {
          tokenNameMessage.textContent = '';
          return true;
        }
        break;
      case 'permissions':
        if (permissionsMessage.textContent) {
          permissionsMessage.textContent = '';
          return true;
        }
        break;
      case 'distribution':
        // Distribution message element removed - no-op
        break;
      case 'advanced':
        if (advancedMessage.textContent) {
          advancedMessage.textContent = '';
          return true;
        }
        break;
      case 'export':
        if (exportMessage && exportMessage.textContent) {
          exportMessage.textContent = '';
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  }

  function loadState() {
    const fallback = createDefaultWizardState();
    try {
      const stored = storage.getItem(STATE_STORAGE_KEY);
      if (!stored) {
        return fallback;
      }
      const parsed = JSON.parse(stored);
      const state = createDefaultWizardState();
      let storedFurthestIndex = null;

      if (parsed && typeof parsed === 'object') {
        // Validate active step/substep - ensure it exists in either STEP_SEQUENCE or SUBSTEP_SEQUENCES
        if (typeof parsed.active === 'string') {
          const isValidMainStep = STEP_SEQUENCE.includes(parsed.active);
          const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps => substeps.includes(parsed.active));

          if (isValidMainStep || isValidSubstep) {
            state.active = parsed.active;
          } else {
            debug.warn('Invalid active step in storage:', parsed.active, '- resetting to default');
            state.active = 'naming'; // Reset to first step if invalid
          }
        }
        // FIX: Don't restore furthestValidIndex - it will be recalculated
        // based on actual step validity after initialiseUI() re-evaluates all steps
        // (storedFurthestIndex stays null, so computed value will be used)

        // FIX: Only restore 'touched' status, NOT validity
        // Validity will be recalculated in initialiseUI() based on actual form data
        // This prevents steps from appearing valid after refresh when form data is incomplete
        TRACKED_STEPS.forEach((stepId) => {
          const persisted = parsed.steps && parsed.steps[stepId];
          const legacyStatus = parsed.stepStatus && parsed.stepStatus[stepId];
          const stepState = state.steps[stepId];

          if (persisted && typeof persisted === 'object') {
            // Don't restore validity - let it be recalculated from form data
            // stepState.validity stays as 'unknown' (default)
            if (typeof persisted.touched === 'boolean') {
              stepState.touched = persisted.touched;
            }
          } else if (legacyStatus === 'valid' || legacyStatus === 'invalid') {
            // Legacy migration: mark as touched but don't restore validity
            stepState.touched = true;
          }
        });

        const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};

        if (typeof form.tokenName === 'string') {
          state.form.tokenName = form.tokenName;
        }
        if (typeof form.ownerIdentityId === 'string') {
          state.form.ownerIdentityId = form.ownerIdentityId;
        }

        if (form.naming && typeof form.naming === 'object') {
          const namingForm = form.naming;
          if (Array.isArray(namingForm.rows)) {
            const normalizedRows = namingForm.rows.map((row) => ({
              code: typeof row.code === 'string' ? row.code : '',
              shouldCapitalize:
                typeof row.shouldCapitalize === 'boolean'
                  ? row.shouldCapitalize
                  : Boolean(row.should_capitalize),
              singular:
                typeof row.singular === 'string'
                  ? row.singular
                  : typeof row.singular_form === 'string'
                    ? row.singular_form
                    : '',
              plural:
                typeof row.plural === 'string'
                  ? row.plural
                  : typeof row.plural_form === 'string'
                    ? row.plural_form
                    : ''
            }));
            state.form.naming.rows = limitLocalizationRows(normalizedRows);
          }
          const namingConventions =
            namingForm.conventions && typeof namingForm.conventions === 'object'
              ? namingForm.conventions
              : null;
          const localizationSource =
            (namingConventions && namingConventions.localizations) ||
            (namingForm.localizations && typeof namingForm.localizations === 'object' ? namingForm.localizations : null);
          if (localizationSource && typeof localizationSource === 'object') {
            const record = {};
            Object.keys(localizationSource).forEach((code) => {
              const entry = localizationSource[code];
              if (!entry || typeof entry !== 'object') {
                return;
              }
              const singular = typeof entry.singular_form === 'string'
                ? entry.singular_form
                : typeof entry.singular === 'string'
                  ? entry.singular
                  : '';
              const plural = typeof entry.plural_form === 'string'
                ? entry.plural_form
                : typeof entry.plural === 'string'
                  ? entry.plural
                  : '';
              record[code] = {
                should_capitalize: Boolean(entry.should_capitalize ?? entry.shouldCapitalize),
                singular_form: singular,
                plural_form: plural
              };
            });
            state.form.naming.conventions.localizations = record;
          }
        }

        if (form.permissions && typeof form.permissions === 'object') {
          const permissions = form.permissions;
          if (Number.isInteger(permissions.decimals)) {
            state.form.permissions.decimals = permissions.decimals;
          }
          if (typeof permissions.baseSupply === 'string') {
            state.form.permissions.baseSupply = permissions.baseSupply;
          }
          state.form.permissions.useMaxSupply = Boolean(permissions.useMaxSupply);
          if (typeof permissions.maxSupply === 'string') {
            state.form.permissions.maxSupply = permissions.maxSupply;
          }
          state.form.permissions.keepsHistory = normalizeKeepsHistory(permissions.keepsHistory);
          state.form.permissions.startAsPaused = Boolean(permissions.startAsPaused);
          state.form.permissions.allowTransferToFrozenBalance = Boolean(permissions.allowTransferToFrozenBalance);
          if (Array.isArray(permissions.groups)) {
            state.form.permissions.groups = normalisePermissionsGroups(permissions.groups);
          }
          state.form.permissions.mainControlGroupIndex = clampMainControlIndex(
            permissions.mainControlGroupIndex,
            state.form.permissions.groups.length
          );
          MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => {
            if (permissions[key] && typeof permissions[key] === 'object') {
              state.form.permissions[key] = {
                ...state.form.permissions[key],
                ...permissions[key]
              };
            }
            state.form.permissions[key] = normalizeManualActionRecord(state.form.permissions, key);
          });
          state.form.permissions.freeze = normalizeFreezeState(permissions.freeze);
        }

        if (form.distribution && typeof form.distribution === 'object' &&
          (form.distribution.cadence || form.distribution.emission)) {
          state.form.distribution = cloneDistributionValues(form.distribution);
        }

        if (form.advanced && typeof form.advanced === 'object') {
          if (typeof form.advanced.tradeMode === 'string') {
            state.form.advanced.tradeMode = form.advanced.tradeMode;
          }
          state.form.advanced.changeControl = normalizeChangeControl(form.advanced.changeControl);
        }

        if (state.form.advanced.tradeMode !== 'closed') {
          debug.warn('Only NotTradeable trade mode is supported; forcing saved value to closed.');
          state.form.advanced.tradeMode = 'closed';
        }

        const registrationFormData = form.registration && typeof form.registration === 'object' ? form.registration : {};
        const walletSource = registrationFormData.wallet && typeof registrationFormData.wallet === 'object'
          ? registrationFormData.wallet
          : (form.wallet && typeof form.wallet === 'object' ? form.wallet : null);
        if (walletSource) {
          const wallet = state.form.registration.wallet;
          wallet.mnemonic = '';
          wallet.privateKey = '';
          if (typeof walletSource.address === 'string') {
            wallet.address = walletSource.address;
          }
          if (typeof walletSource.balance === 'number' && Number.isFinite(walletSource.balance)) {
            wallet.balance = walletSource.balance;
          } else if (typeof walletSource.balance === 'string') {
            const parsedBalance = Number.parseFloat(walletSource.balance);
            if (Number.isFinite(parsedBalance)) {
              wallet.balance = parsedBalance;
            }
          }
          wallet.fingerprint = '';
        }

        const identitySource = registrationFormData.identity && typeof registrationFormData.identity === 'object'
          ? registrationFormData.identity
          : (form.identity && typeof form.identity === 'object' ? form.identity : null);
        if (identitySource && typeof identitySource.id === 'string') {
          state.form.registration.identity.id = identitySource.id;
        }

        if (typeof registrationFormData.method === 'string') {
          const methodValue = registrationFormData.method.trim();
          state.form.registration.method = methodValue ? methodValue : null;
        } else if (registrationFormData.method === null) {
          state.form.registration.method = null;
        }
        const preflight = registrationFormData.preflight;
        if (preflight && typeof preflight === 'object') {
          state.form.registration.preflight = {
            det: {
              jsonDisplayed: Boolean(
                preflight.det && (
                  (typeof preflight.det.jsonDisplayed !== 'undefined'
                    ? preflight.det.jsonDisplayed
                    : preflight.det.jsonPreviewed)
                )
              )
            },
            self: {
              warningAcknowledged: Boolean(preflight.self && preflight.self.warningAcknowledged)
            }
          };
        } else if (typeof parsed.registrationMethod === 'string') {
          const legacyMethod = parsed.registrationMethod.trim();
          state.form.registration.method = legacyMethod ? legacyMethod : null;
        }
      }


      if (!state.form.naming || typeof state.form.naming !== 'object') {
        state.form.naming = {
          conventions: { localizations: {} },
          rows: []
        };
      }

      if (!state.form.naming.conventions || typeof state.form.naming.conventions !== 'object') {
        state.form.naming.conventions = { localizations: {} };
      }
      if (!state.form.naming.conventions.localizations || typeof state.form.naming.conventions.localizations !== 'object') {
        state.form.naming.conventions.localizations = {};
      }

      state.form.naming.conventions.localizations = limitLocalizationRecord(state.form.naming.conventions.localizations);
      const record = state.form.naming.conventions.localizations;

      if (!Array.isArray(state.form.naming.rows) || state.form.naming.rows.length === 0) {
        const [firstCode] = Object.keys(record);
        if (firstCode) {
          const entry = record[firstCode];
          state.form.naming.rows = limitLocalizationRows([
            {
              code: firstCode,
              should_capitalize: entry?.should_capitalize,
              singular: entry?.singular_form,
              plural: entry?.plural_form
            }
          ]);
        } else {
          state.form.naming.rows = limitLocalizationRows([]);
        }
      } else {
        state.form.naming.rows = limitLocalizationRows(state.form.naming.rows);
      }

      const [loadedRow] = state.form.naming.rows;
      state.form.naming.conventions.localizations = createLocalizationRecordFromRow(loadedRow);

      const computedFurthest = computeFurthestValidIndexFromSteps(state.steps);
      state.furthestValidIndex = storedFurthestIndex === null
        ? computedFurthest
        : Math.max(computedFurthest, storedFurthestIndex);

      // Hybrid storage: Restore sensitive identities from sessionStorage
      try {
        const sensitiveJson = sessionStorage.getItem(SENSITIVE_DATA_KEY);
        if (sensitiveJson) {
          const sensitiveData = JSON.parse(sensitiveJson);

          // Restore owner identity
          if (sensitiveData.ownerIdentityId) {
            state.form.ownerIdentityId = sensitiveData.ownerIdentityId;
          }

          // Restore group member identities
          if (Array.isArray(sensitiveData.groups) && Array.isArray(state.form.permissions.groups)) {
            state.form.permissions.groups = state.form.permissions.groups.map((group, groupIndex) => {
              const savedGroup = sensitiveData.groups[groupIndex];
              if (!savedGroup) return group;

              return {
                ...group,
                members: (group.members || []).map((member, memberIndex) => {
                  const savedMember = savedGroup.members?.[memberIndex];
                  return {
                    ...member,
                    identityId: savedMember?.identityId || ''
                  };
                })
              };
            });
          }

          // Restore manual action performer identities
          if (sensitiveData.manualActions) {
            MANUAL_ACTION_DEFINITIONS.forEach(def => {
              const savedIdentities = sensitiveData.manualActions[def.key];
              const action = state.form.permissions[def.key];
              if (savedIdentities && action?.allowAuthorized && Array.isArray(action.authorizedPerformers)) {
                action.authorizedPerformers = action.authorizedPerformers.map((p, index) => ({
                  ...p,
                  identityId: savedIdentities[index] || ''
                }));
              }
            });
          }

          // Restore distribution recipient identity
          if (sensitiveData.distributionRecipient && state.form.distribution?.preprogrammed?.recipient) {
            state.form.distribution.preprogrammed.recipient.identityId = sensitiveData.distributionRecipient;
          }

          // Restore pre-programmed distribution entry identities
          if (Array.isArray(sensitiveData.preProgrammedEntries) && Array.isArray(state.form.distribution?.preProgrammed?.entries)) {
            state.form.distribution.preProgrammed.entries = state.form.distribution.preProgrammed.entries.map((entry, index) => {
              const savedEntry = sensitiveData.preProgrammedEntries.find(e => e.id === entry.id);
              if (savedEntry) {
                return {
                  ...entry,
                  identity: savedEntry.identity || ''
                };
              }
              return entry;
            });
          }

          // Restore registration identity
          if (sensitiveData.registrationIdentity && state.form.registration?.identity) {
            state.form.registration.identity.id = sensitiveData.registrationIdentity;
          }
        }
      } catch (sessionError) {
        debug.warn('Unable to restore sensitive data from sessionStorage:', sessionError);
      }

      return state;
    } catch (error) {
      debug.warn('Unable to read wizard state:', error);
      return fallback;
    }
  }

  /**
   * Extract sensitive identity data from snapshot
   * Returns object containing all identity IDs for session storage
   */
  function extractSensitiveData(snapshot) {
    const sensitive = {
      ownerIdentityId: snapshot.form.ownerIdentityId || '',
      groups: [],
      manualActions: {},
      distributionRecipient: '',
      preProgrammedEntries: [],
      registrationIdentity: snapshot.form.registration?.identity?.id || ''
    };

    // Extract group member identities
    if (Array.isArray(snapshot.form.permissions?.groups)) {
      sensitive.groups = snapshot.form.permissions.groups.map(group => ({
        name: group.name || '',
        members: (group.members || []).map(member => ({
          identityId: member.identityId || ''
        }))
      }));
    }

    // Extract manual action performer identities
    MANUAL_ACTION_DEFINITIONS.forEach(def => {
      const action = snapshot.form.permissions?.[def.key];
      if (action && action.allowAuthorized && Array.isArray(action.authorizedPerformers)) {
        sensitive.manualActions[def.key] = action.authorizedPerformers.map(p => p.identityId || '');
      }
    });

    // Extract distribution recipient identity
    if (snapshot.form.distribution?.preprogrammed?.recipient?.identityId) {
      sensitive.distributionRecipient = snapshot.form.distribution.preprogrammed.recipient.identityId;
    }

    // Extract pre-programmed distribution entry identities
    if (Array.isArray(snapshot.form.distribution?.preProgrammed?.entries)) {
      sensitive.preProgrammedEntries = snapshot.form.distribution.preProgrammed.entries.map(entry => ({
        id: entry.id || '',
        identity: entry.identity || ''
      }));
    }

    return sensitive;
  }

  /**
   * Remove sensitive identity data from snapshot
   * Returns sanitized snapshot safe for localStorage
   */
  function sanitizeSnapshot(snapshot) {
    const sanitized = structuredClone(snapshot);

    // Clear owner identity
    sanitized.form.ownerIdentityId = '';

    // Clear group member identities
    if (Array.isArray(sanitized.form.permissions?.groups)) {
      sanitized.form.permissions.groups = sanitized.form.permissions.groups.map(group => ({
        ...group,
        members: (group.members || []).map(member => ({
          ...member,
          identityId: ''
        }))
      }));
    }

    // Clear manual action performer identities
    MANUAL_ACTION_DEFINITIONS.forEach(def => {
      const action = sanitized.form.permissions?.[def.key];
      if (action && action.allowAuthorized && Array.isArray(action.authorizedPerformers)) {
        action.authorizedPerformers = action.authorizedPerformers.map(p => ({
          ...p,
          identityId: ''
        }));
      }
    });

    // Clear distribution recipient identity
    if (sanitized.form.distribution?.preprogrammed?.recipient) {
      sanitized.form.distribution.preprogrammed.recipient.identityId = '';
    }

    // Clear pre-programmed distribution entry identities
    if (Array.isArray(sanitized.form.distribution?.preProgrammed?.entries)) {
      sanitized.form.distribution.preProgrammed.entries = sanitized.form.distribution.preProgrammed.entries.map(entry => ({
        ...entry,
        identity: ''
      }));
    }

    // Clear registration identity
    if (sanitized.form.registration?.identity) {
      sanitized.form.registration.identity.id = '';
    }

    return sanitized;
  }

  /**
   * Merge sensitive data back into restored snapshot
   */
  function mergeSensitiveData(snapshot, sensitiveData) {
    if (!sensitiveData) return snapshot;

    const merged = structuredClone(snapshot);

    // Restore owner identity
    if (sensitiveData.ownerIdentityId) {
      merged.form.ownerIdentityId = sensitiveData.ownerIdentityId;
    }

    // Restore group member identities
    if (Array.isArray(sensitiveData.groups) && Array.isArray(merged.form.permissions?.groups)) {
      merged.form.permissions.groups = merged.form.permissions.groups.map((group, groupIndex) => {
        const savedGroup = sensitiveData.groups[groupIndex];
        if (!savedGroup) return group;

        return {
          ...group,
          members: (group.members || []).map((member, memberIndex) => {
            const savedMember = savedGroup.members?.[memberIndex];
            return {
              ...member,
              identityId: savedMember?.identityId || ''
            };
          })
        };
      });
    }

    // Restore manual action performer identities
    if (sensitiveData.manualActions) {
      MANUAL_ACTION_DEFINITIONS.forEach(def => {
        const savedIdentities = sensitiveData.manualActions[def.key];
        const action = merged.form.permissions?.[def.key];
        if (savedIdentities && action?.allowAuthorized && Array.isArray(action.authorizedPerformers)) {
          action.authorizedPerformers = action.authorizedPerformers.map((p, index) => ({
            ...p,
            identityId: savedIdentities[index] || ''
          }));
        }
      });
    }

    // Restore distribution recipient identity
    if (sensitiveData.distributionRecipient && merged.form.distribution?.preprogrammed?.recipient) {
      merged.form.distribution.preprogrammed.recipient.identityId = sensitiveData.distributionRecipient;
    }

    // Restore registration identity
    if (sensitiveData.registrationIdentity && merged.form.registration?.identity) {
      merged.form.registration.identity.id = sensitiveData.registrationIdentity;
    }

    return merged;
  }

  /**
   * Performance Enhancement: Internal function for immediate state persistence
   * This performs the actual save operation without debouncing
   */
  function _persistStateNow() {
    // BLOCK ALL STATE PERSISTENCE IF IN RESET MODE
    if (window.__WIZARD_RESET_MODE__) {
      console.log('[App] persistState BLOCKED - reset mode active');
      return;
    }
    try {
      const limitedRows = limitLocalizationRows(
        Array.isArray(wizardState.form.naming?.rows) ? wizardState.form.naming.rows : []
      );
      const limitedRecord = limitLocalizationRecord(wizardState.form.naming?.conventions?.localizations);
      wizardState.form.naming.rows = limitedRows;
      if (!wizardState.form.naming.conventions || typeof wizardState.form.naming.conventions !== 'object') {
        wizardState.form.naming.conventions = { localizations: {} };
      }
      wizardState.form.naming.conventions.localizations = limitedRecord;

      const manualActionSnapshot = MANUAL_ACTION_DEFINITIONS.reduce((accumulator, definition) => {
        accumulator[definition.key] = normalizeManualActionRecord(wizardState.form.permissions, definition.key);
        return accumulator;
      }, {});
      const freezeSnapshot = normalizeFreezeState(wizardState.form.permissions.freeze);

      const snapshot = {
        active: wizardState.active,
        furthestValidIndex: wizardState.furthestValidIndex,
        steps: TRACKED_STEPS.reduce((accumulator, stepId) => {
          const step = wizardState.steps[stepId];
          accumulator[stepId] = {
            id: stepId,
            validity: step.validity,
            touched: step.touched
          };
          return accumulator;
        }, {}),
        form: {
          tokenName: wizardState.form.tokenName,
          ownerIdentityId: wizardState.form.ownerIdentityId,
          naming: {
            rows: limitedRows.map((row) => ({
              code: row.code || '',
              shouldCapitalize: Boolean(row.shouldCapitalize),
              singular: row.singular || '',
              plural: row.plural || ''
            })),
            conventions: {
              localizations: cloneLocalizationsRecord(limitedRecord)
            }
          },
          permissions: {
            decimals: wizardState.form.permissions.decimals,
            baseSupply: wizardState.form.permissions.baseSupply,
            useMaxSupply: wizardState.form.permissions.useMaxSupply,
            maxSupply: wizardState.form.permissions.maxSupply,
            keepsHistory: normalizeKeepsHistory(wizardState.form.permissions.keepsHistory),
            startAsPaused: Boolean(wizardState.form.permissions.startAsPaused),
            allowTransferToFrozenBalance: Boolean(wizardState.form.permissions.allowTransferToFrozenBalance),
            groups: clonePermissionGroups(wizardState.form.permissions.groups),
            mainControlGroupIndex: clampMainControlIndex(
              wizardState.form.permissions.mainControlGroupIndex,
              wizardState.form.permissions.groups.length
            ),
            freeze: freezeSnapshot,
            ...manualActionSnapshot
          },
          distribution: cloneDistributionValues(wizardState.form.distribution),
          advanced: {
            tradeMode: wizardState.form.advanced.tradeMode,
            changeControl: normalizeChangeControl(wizardState.form.advanced.changeControl)
          },
          registration: {
            wallet: {
              // Never persist secrets; only mark presence
              mnemonic: wizardState.form.registration.wallet.mnemonic ? '__present__' : '',
              privateKey: wizardState.form.registration.wallet.privateKey ? '__present__' : '',
              address: wizardState.form.registration.wallet.address,
              balance: wizardState.form.registration.wallet.balance,
              fingerprint: ''
            },
            identity: {
              id: wizardState.form.registration.identity.id
            },
            method: wizardState.form.registration.method,
            preflight: {
              det: { jsonDisplayed: Boolean(wizardState.form.registration.preflight.det.jsonDisplayed) },
              self: { warningAcknowledged: Boolean(wizardState.form.registration.preflight.self.warningAcknowledged) }
            }
          }
        }
      };

      // Hybrid storage: Extract sensitive identities for sessionStorage
      const sensitiveData = extractSensitiveData(snapshot);
      const sanitizedSnapshot = sanitizeSnapshot(snapshot);

      // Save non-sensitive config to localStorage (persists forever)
      storage.setItem(STATE_STORAGE_KEY, JSON.stringify(sanitizedSnapshot));

      // Save sensitive identities to sessionStorage (clears on browser close)
      try {
        sessionStorage.setItem(SENSITIVE_DATA_KEY, JSON.stringify(sensitiveData));
      } catch (sessionError) {
        debug.warn('Unable to save sensitive data to sessionStorage:', sessionError);
      }
    } catch (error) {
      debug.warn('Unable to persist wizard state:', error);
    }
  }

  /**
   * Performance Enhancement: Debounced state persistence wrapper
   * This is now the main persistence function that schedules debounced saves.
   * Use persistState.now() for immediate saves when needed (e.g., before navigation away)
   */
  function persistState() {
    scheduleAutoSave();
  }

  // Add immediate save method for critical operations
  persistState.now = function() {
    // Cancel any pending auto-save
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    _persistStateNow();
    showAutoSaveIndicator();
  };

  /**
   * Performance Enhancement: Debounced auto-save functionality
   * Schedules an automatic save after a period of inactivity to reduce
   * localStorage write operations and improve performance.
   * Uses requestIdleCallback when available for better performance.
   */
  function scheduleAutoSave() {
    // Clear any existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Schedule new save with requestIdleCallback for better performance
    autoSaveTimer = setTimeout(() => {
      // PERFORMANCE: Use requestIdleCallback to save during browser idle time
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          _persistStateNow();
          showAutoSaveIndicator();
          debug.log('Auto-saved wizard state (idle)');
        }, { timeout: 2000 }); // Max 2 seconds wait
      } else {
        // Fallback for browsers without requestIdleCallback
        _persistStateNow();
        showAutoSaveIndicator();
        debug.log('Auto-saved wizard state');
      }
    }, AUTO_SAVE_DELAY_MS);
  }

  /**
   * Performance Enhancement: Visual feedback for auto-save
   * Shows a brief "Saved" indicator in the header to confirm state persistence
   */
  function showAutoSaveIndicator() {
    // Show "Saved" message in progress bar area
    const progressBar = document.querySelector('.wizard-progress');
    if (!progressBar) return;

    // Add saving class to trigger animation
    progressBar.classList.add('wizard-progress--saving');

    // Remove class after 1.5 seconds to restore progress display
    setTimeout(() => {
      progressBar.classList.remove('wizard-progress--saving');
    }, 1500);
  }

  function renderJsonPreview() {
    if (wizardState.form.registration.method !== 'det') {
      return;
    }

    const payload = generatePlatformContractJSON();
    const serialized = JSON.stringify(payload, null, 2);
    jsonPreviewContent.textContent = serialized;
  }

  function copyJsonPayload() {
    if (wizardState.form.registration.method !== 'det') {
      return;
    }

    if (!jsonPreviewContent.textContent) {
      renderJsonPreview();
    }

    const serialized = jsonPreviewContent.textContent || '';
    if (!serialized) {
      announce('Nothing to copy yet.');
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(serialized)
        .then(() => {
          announce('JSON payload copied to clipboard.');
          if (jsonCopyButton) {
            const originalText = jsonCopyButton.textContent;
            jsonCopyButton.textContent = '✓ Copied!';
            setTimeout(() => {
              jsonCopyButton.textContent = originalText;
            }, 2000);
          }
        })
        .catch(() => fallbackCopyToClipboard(serialized));
    } else {
      fallbackCopyToClipboard(serialized);
    }
  }

  function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      announce(successful ? 'JSON payload copied to clipboard.' : 'Unable to copy JSON automatically.');
    } catch (error) {
      announce('Unable to copy JSON automatically.');
    } finally {
      textarea.remove();
    }
  }

  // FIXED: New function to work with existing HTML inputs (not dynamically created)
  function createPermissionsUIFromHTML(form) {
    if (!form) {
      return null;
    }

    // Use the existing HTML input IDs
    const decimalsInput = document.getElementById('decimals');
    const baseSupplyInput = document.getElementById('base-supply');
    const maxSupplyInput = document.getElementById('max-supply');

    // Get checkbox elements
    const historyTransfersInput = document.getElementById('history-transfers');
    const historyMintsInput = document.getElementById('history-mints');
    const historyBurnsInput = document.getElementById('history-burns');
    const historyFreezesInput = document.getElementById('history-freezes');
    const historyPurchasesInput = document.getElementById('history-purchases');
    const historyDirectPricingInput = document.getElementById('history-direct-pricing');
    const startPausedInput = document.getElementById('permissions-start-paused');
    const allowFrozenInput = document.getElementById('permissions-allow-frozen');

    const keepsHistoryInputs = {
      transfers: historyTransfersInput,
      mints: historyMintsInput,
      burns: historyBurnsInput,
      freezes: historyFreezesInput,
      purchases: historyPurchasesInput,
      directPricing: historyDirectPricingInput
    };

    if (!decimalsInput || !baseSupplyInput) {
      return null;
    }

    // Get supply mode elements
    const baseSupplyModeSelector = document.getElementById('base-supply-mode-selector');
    const baseSupplyModeToken = document.getElementById('base-supply-mode-token');
    const baseSupplyModeBase = document.getElementById('base-supply-mode-base');
    const baseSupplyLabel = document.getElementById('base-supply-label');
    const baseSupplyHint = document.getElementById('base-supply-hint');
    const baseSupplyConversion = document.getElementById('base-supply-conversion');
    const baseSupplyConversionValue = document.getElementById('base-supply-conversion-value');
    const baseSupplyConversionUnit = document.getElementById('base-supply-conversion-unit');

    const maxSupplyModeSelector = document.getElementById('max-supply-mode-selector');
    const maxSupplyModeToken = document.getElementById('max-supply-mode-token');
    const maxSupplyModeBase = document.getElementById('max-supply-mode-base');
    const maxSupplyLabel = document.getElementById('max-supply-label');
    const maxSupplyHint = document.getElementById('max-supply-hint');
    const maxSupplyConversion = document.getElementById('max-supply-conversion');
    const maxSupplyConversionValue = document.getElementById('max-supply-conversion-value');
    const maxSupplyConversionUnit = document.getElementById('max-supply-conversion-unit');

    // Store current supply mode in state
    if (!wizardState.form.permissions.baseSupplyMode) {
      wizardState.form.permissions.baseSupplyMode = 'token';
    }
    if (!wizardState.form.permissions.maxSupplyMode) {
      wizardState.form.permissions.maxSupplyMode = 'token';
    }

    // Function to update supply UI based on decimals
    function updateSupplyUI() {
      const decimals = parseInt(decimalsInput.value, 10);
      const hasDecimals = Number.isInteger(decimals) && decimals > 0;

      // Show/hide mode selectors
      if (baseSupplyModeSelector) {
        baseSupplyModeSelector.hidden = !hasDecimals;
      }
      if (maxSupplyModeSelector) {
        maxSupplyModeSelector.hidden = !hasDecimals;
      }

      // Update base supply
      updateSupplyConversion('base', decimals);
      // Update max supply
      updateSupplyConversion('max', decimals);
    }

    // Function to convert and display supply values
    function updateSupplyConversion(type, decimals) {
      const isBase = type === 'base';
      const input = isBase ? baseSupplyInput : maxSupplyInput;
      const modeToken = isBase ? baseSupplyModeToken : maxSupplyModeToken;
      const modeBase = isBase ? baseSupplyModeBase : maxSupplyModeBase;
      const label = isBase ? baseSupplyLabel : maxSupplyLabel;
      const hint = isBase ? baseSupplyHint : maxSupplyHint;
      const conversion = isBase ? baseSupplyConversion : maxSupplyConversion;
      const conversionValue = isBase ? baseSupplyConversionValue : maxSupplyConversionValue;
      const conversionUnit = isBase ? baseSupplyConversionUnit : maxSupplyConversionUnit;

      if (!input) return;

      const value = input.value.trim();
      const hasDecimals = Number.isInteger(decimals) && decimals > 0;
      const isTokenMode = modeToken && modeToken.checked;

      // Update labels and hints based on mode
      if (label) {
        label.textContent = isBase ? 'Initial Supply' : 'Maximum Supply';
      }

      if (!hasDecimals) {
        // No decimals - hide conversion, simple mode
        if (conversion) conversion.hidden = true;
        if (hint) {
          hint.textContent = isBase
            ? 'Enter the number of tokens to create'
            : 'Optional • Leave blank for no limit • Must be ≥ initial supply';
        }
        return;
      }

      // Has decimals - show conversion
      if (value === '') {
        if (conversion) conversion.hidden = true;
        return;
      }

      try {
        let displayValue, displayUnit;

        if (isTokenMode) {
          // Token mode: show base units
          if (!/^\d+(\.\d+)?$/.test(value)) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const parts = value.split('.');
          const integerPart = parts[0] || '0';
          const decimalPart = parts[1] || '';

          if (decimalPart.length > decimals) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const paddedDecimal = decimalPart.padEnd(decimals, '0');
          const baseValue = integerPart + paddedDecimal;
          const stripped = baseValue.replace(/^0+(?=\d)/, '');
          displayValue = stripped || '0';
          displayUnit = 'base units';

          if (hint) {
            hint.textContent = `Enter token amount (up to ${decimals} decimal places)`;
          }
        } else {
          // Base mode: show token amount
          if (!/^\d+$/.test(value)) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const baseValueBig = BigInt(value);
          const divisor = BigInt(10) ** BigInt(decimals);
          const wholePart = baseValueBig / divisor;
          const fractionalPart = baseValueBig % divisor;

          if (fractionalPart === 0n) {
            displayValue = wholePart.toString();
          } else {
            const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
            const trimmed = fractionalStr.replace(/0+$/, '');
            displayValue = `${wholePart}.${trimmed}`;
          }
          displayUnit = 'tokens';

          if (hint) {
            hint.textContent = 'Enter base units (smallest indivisible unit)';
          }
        }

        if (conversionValue) conversionValue.textContent = displayValue;
        if (conversionUnit) conversionUnit.textContent = displayUnit;
        if (conversion) conversion.hidden = false;

      } catch (e) {
        if (conversion) conversion.hidden = true;
      }
    }

    // Debounced validation for smoother real-time feedback while typing
    let permissionsValidationTimer = null;
    function debouncedEvaluatePermissions() {
      if (permissionsValidationTimer) {
        clearTimeout(permissionsValidationTimer);
      }
      permissionsValidationTimer = setTimeout(() => {
        evaluatePermissions({ touched: true });
      }, 300);
    }

    // Add event listeners for validation
    [decimalsInput, baseSupplyInput, maxSupplyInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        updateSupplyUI();
        debouncedEvaluatePermissions(); // Use debounced validation for smoother UX
      });
      // Immediate validation on blur for final feedback
      input.addEventListener('blur', () => {
        if (permissionsValidationTimer) {
          clearTimeout(permissionsValidationTimer);
        }
        evaluatePermissions({ touched: true });
      });
    });

    // Add event listeners for decimals changes
    if (decimalsInput) {
      decimalsInput.addEventListener('change', () => {
        updateSupplyUI();
      });
    }

    // Add event listeners for mode switches
    if (baseSupplyModeToken) {
      baseSupplyModeToken.addEventListener('change', () => {
        if (baseSupplyModeToken.checked) {
          wizardState.form.permissions.baseSupplyMode = 'token';
          updateSupplyUI();
        }
      });
    }
    if (baseSupplyModeBase) {
      baseSupplyModeBase.addEventListener('change', () => {
        if (baseSupplyModeBase.checked) {
          wizardState.form.permissions.baseSupplyMode = 'base';
          updateSupplyUI();
        }
      });
    }
    if (maxSupplyModeToken) {
      maxSupplyModeToken.addEventListener('change', () => {
        if (maxSupplyModeToken.checked) {
          wizardState.form.permissions.maxSupplyMode = 'token';
          updateSupplyUI();
        }
      });
    }
    if (maxSupplyModeBase) {
      maxSupplyModeBase.addEventListener('change', () => {
        if (maxSupplyModeBase.checked) {
          wizardState.form.permissions.maxSupplyMode = 'base';
          updateSupplyUI();
        }
      });
    }

    // Change Max Supply Enable/Disable Radio Buttons
    const changeMaxSupplyEnabledRadios = document.getElementsByName('change-max-supply-enabled');
    changeMaxSupplyEnabledRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.enabled = radio.value === 'enabled';
        persistState();
      });
    });

    // Change Max Supply Governance Checkboxes
    const changeMaxSupplyAllowAuthorizedNone = document.getElementById('change-max-supply-allow-authorized-none');
    const changeMaxSupplyAllowAdminNone = document.getElementById('change-max-supply-allow-admin-none');
    const changeMaxSupplyAllowSelfChange = document.getElementById('change-max-supply-allow-self-change');

    if (changeMaxSupplyAllowAuthorizedNone) {
      changeMaxSupplyAllowAuthorizedNone.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowChangeAuthorizedToNone = changeMaxSupplyAllowAuthorizedNone.checked;
        persistState();
      });
    }
    if (changeMaxSupplyAllowAdminNone) {
      changeMaxSupplyAllowAdminNone.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowChangeAdminToNone = changeMaxSupplyAllowAdminNone.checked;
        persistState();
      });
    }
    if (changeMaxSupplyAllowSelfChange) {
      changeMaxSupplyAllowSelfChange.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowSelfChangeAdmin = changeMaxSupplyAllowSelfChange.checked;
        persistState();
      });
    }

    // Change Max Supply Permission (perform action) Select Dropdown
    const changeMaxSupplyPermissionSelect = document.getElementById('change-max-supply-permission');
    if (changeMaxSupplyPermissionSelect) {
      changeMaxSupplyPermissionSelect.addEventListener('change', () => {
        const value = changeMaxSupplyPermissionSelect.value;
        if (!wizardState.form.permissions.changeMaxSupply.perform) {
          wizardState.form.permissions.changeMaxSupply.perform = {};
        }
        if (value === 'owner') {
          wizardState.form.permissions.changeMaxSupply.perform.type = 'owner';
          wizardState.form.permissions.changeMaxSupply.perform.identityId = '';
          wizardState.form.permissions.changeMaxSupply.perform.groupId = null;
        } else if (value === 'identity') {
          wizardState.form.permissions.changeMaxSupply.perform.type = 'identity';
        } else if (value === 'group') {
          wizardState.form.permissions.changeMaxSupply.perform.type = 'group';
        } else if (value === 'no-one') {
          wizardState.form.permissions.changeMaxSupply.perform.type = 'none';
          wizardState.form.permissions.changeMaxSupply.perform.identityId = '';
          wizardState.form.permissions.changeMaxSupply.perform.groupId = null;
        }
        persistState();
      });
    }

    // Change Max Supply Identity ID Input
    const changeMaxSupplyIdentityIdInput = document.getElementById('change-max-supply-identity-id');
    if (changeMaxSupplyIdentityIdInput) {
      changeMaxSupplyIdentityIdInput.addEventListener('input', () => {
        if (!wizardState.form.permissions.changeMaxSupply.perform) {
          wizardState.form.permissions.changeMaxSupply.perform = {};
        }
        wizardState.form.permissions.changeMaxSupply.perform.identityId = changeMaxSupplyIdentityIdInput.value.trim();
        persistState();
      });
    }

    // Change Max Supply Group Select
    const changeMaxSupplyGroupSelect = document.getElementById('change-max-supply-group-id');
    if (changeMaxSupplyGroupSelect) {
      changeMaxSupplyGroupSelect.addEventListener('change', () => {
        if (!wizardState.form.permissions.changeMaxSupply.perform) {
          wizardState.form.permissions.changeMaxSupply.perform = {};
        }
        wizardState.form.permissions.changeMaxSupply.perform.groupId = parseInt(changeMaxSupplyGroupSelect.value, 10) || null;
        persistState();
      });
    }

    // Change Max Supply Rule Changer (admin) Select Dropdown
    const changeMaxSupplyRuleChangerSelect = document.getElementById('change-max-supply-change-rules');
    if (changeMaxSupplyRuleChangerSelect) {
      changeMaxSupplyRuleChangerSelect.addEventListener('change', () => {
        const value = changeMaxSupplyRuleChangerSelect.value;
        if (!wizardState.form.permissions.changeMaxSupply.changeRules) {
          wizardState.form.permissions.changeMaxSupply.changeRules = {};
        }
        if (value === 'owner') {
          wizardState.form.permissions.changeMaxSupply.changeRules.type = 'owner';
          wizardState.form.permissions.changeMaxSupply.changeRules.identityId = '';
          wizardState.form.permissions.changeMaxSupply.changeRules.groupId = null;
        } else if (value === 'identity') {
          wizardState.form.permissions.changeMaxSupply.changeRules.type = 'identity';
        } else if (value === 'group') {
          wizardState.form.permissions.changeMaxSupply.changeRules.type = 'group';
        } else if (value === 'no-one') {
          wizardState.form.permissions.changeMaxSupply.changeRules.type = 'none';
          wizardState.form.permissions.changeMaxSupply.changeRules.identityId = '';
          wizardState.form.permissions.changeMaxSupply.changeRules.groupId = null;
        }
        persistState();
      });
    }

    // Change Max Supply Rule Identity ID Input
    const changeMaxSupplyRuleIdentityIdInput = document.getElementById('change-max-supply-rules-identity-id');
    if (changeMaxSupplyRuleIdentityIdInput) {
      changeMaxSupplyRuleIdentityIdInput.addEventListener('input', () => {
        if (!wizardState.form.permissions.changeMaxSupply.changeRules) {
          wizardState.form.permissions.changeMaxSupply.changeRules = {};
        }
        wizardState.form.permissions.changeMaxSupply.changeRules.identityId = changeMaxSupplyRuleIdentityIdInput.value.trim();
        persistState();
      });
    }

    // Change Max Supply Rule Group Select
    const changeMaxSupplyRuleGroupSelect = document.getElementById('change-max-supply-rules-group-id');
    if (changeMaxSupplyRuleGroupSelect) {
      changeMaxSupplyRuleGroupSelect.addEventListener('change', () => {
        if (!wizardState.form.permissions.changeMaxSupply.changeRules) {
          wizardState.form.permissions.changeMaxSupply.changeRules = {};
        }
        wizardState.form.permissions.changeMaxSupply.changeRules.groupId = parseInt(changeMaxSupplyRuleGroupSelect.value, 10) || null;
        persistState();
      });
    }

    /**
     * Centralized automation for wizard-choice radio buttons (Yes/No toggles)
     * When Yes/Enabled: Sets both dropdowns to "Contract Owner"
     * When No/Disabled: Resets both dropdowns to "No One" and clears references
     */
    function initWizardChoiceAutomation() {
      WIZARD_CHOICE_AUTOMATION.forEach(config => {
        const radios = document.getElementsByName(config.radioName);
        const performDropdown = document.getElementById(config.performDropdown);
        const ruleChangerDropdown = document.getElementById(config.ruleChangerDropdown);

        if (!radios.length) return;

        radios.forEach(radio => {
          radio.addEventListener('change', () => {
            const isEnabled = radio.value === 'enabled';
            const stateObj = wizardState.form.permissions[config.stateKey];

            if (!stateObj) return;

            // Update enabled state
            stateObj.enabled = isEnabled;

            if (isEnabled) {
              // YES: Set to Contract Owner
              stateObj.performerType = 'owner';
              stateObj.ruleChangerType = 'owner';
              if (performDropdown) performDropdown.value = 'owner';
              if (ruleChangerDropdown) ruleChangerDropdown.value = 'owner';
            } else {
              // NO: Reset to No One
              stateObj.performerType = 'none';
              stateObj.ruleChangerType = 'none';
              stateObj.performerReference = '';
              stateObj.ruleChangerReference = '';
              if (performDropdown) performDropdown.value = 'no-one';
              if (ruleChangerDropdown) ruleChangerDropdown.value = 'no-one';
            }

            persistState();
            // Note: Removed hydrateAuthorizationDropdowns() call - dropdowns are already set directly
            // and the call was resetting values. Panel visibility is handled by dropdown change events.
          });
        });
      });
    }

    // Initialize wizard-choice automation for all enabled/disabled toggles
    // Handles: Mint, Burn, Freeze, Unfreeze, DestroyFrozen, Emergency, UpdateNames, ChangeMaxSupply
    initWizardChoiceAutomation();

    // Freeze System Enable/Disable Radio Buttons
    const freezeEnabledRadios = document.getElementsByName('freeze-enabled');
    freezeEnabledRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        wizardState.form.permissions.freeze.enabled = radio.value === 'enabled';
        persistState();
      });
    });

    // Unfreeze Governance Checkboxes
    const unfreezeAllowAuthorizedNone = document.getElementById('unfreeze-allow-authorized-none');
    const unfreezeAllowAdminNone = document.getElementById('unfreeze-allow-admin-none');
    const unfreezeAllowSelfChange = document.getElementById('unfreeze-allow-self-change');

    if (unfreezeAllowAuthorizedNone) {
      unfreezeAllowAuthorizedNone.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowChangeAuthorizedToNone = unfreezeAllowAuthorizedNone.checked;
        persistState();
      });
    }
    if (unfreezeAllowAdminNone) {
      unfreezeAllowAdminNone.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowChangeAdminToNone = unfreezeAllowAdminNone.checked;
        persistState();
      });
    }
    if (unfreezeAllowSelfChange) {
      unfreezeAllowSelfChange.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowSelfChangeAdmin = unfreezeAllowSelfChange.checked;
        persistState();
      });
    }

    // Freeze Governance Checkboxes
    const freezeAllowAuthorizedNone = document.getElementById('freeze-allow-authorized-none');
    const freezeAllowAdminNone = document.getElementById('freeze-allow-admin-none');
    const freezeAllowSelfChange = document.getElementById('freeze-allow-self-change');

    if (freezeAllowAuthorizedNone) {
      freezeAllowAuthorizedNone.addEventListener('change', () => {
        wizardState.form.permissions.manualFreeze.allowChangeAuthorizedToNone = freezeAllowAuthorizedNone.checked;
        persistState();
      });
    }
    if (freezeAllowAdminNone) {
      freezeAllowAdminNone.addEventListener('change', () => {
        wizardState.form.permissions.manualFreeze.allowChangeAdminToNone = freezeAllowAdminNone.checked;
        persistState();
      });
    }
    if (freezeAllowSelfChange) {
      freezeAllowSelfChange.addEventListener('change', () => {
        wizardState.form.permissions.manualFreeze.allowSelfChangeAdmin = freezeAllowSelfChange.checked;
        persistState();
      });
    }

    // Allow Frozen Balance Transfers Checkbox + Safeguards Panel Toggle
    const allowFrozenCheckbox = document.getElementById('permissions-allow-frozen');
    const allowFrozenSafeguardsPanel = document.getElementById('allow-frozen-safeguards-panel');

    if (allowFrozenCheckbox) {
      allowFrozenCheckbox.addEventListener('change', () => {
        wizardState.form.permissions.allowTransferToFrozenBalance = allowFrozenCheckbox.checked;

        // Toggle safeguards panel visibility
        if (allowFrozenSafeguardsPanel) {
          if (allowFrozenCheckbox.checked) {
            allowFrozenSafeguardsPanel.removeAttribute('hidden');
          } else {
            allowFrozenSafeguardsPanel.setAttribute('hidden', '');
          }
        }

        persistState();
      });
    }

    // Allow Frozen Balance Transfer Governance Checkboxes
    const allowFrozenAllowChangeAuthorizedNone = document.getElementById('allow-frozen-allow-change-authorized-none');
    const allowFrozenAllowChangeAdminNone = document.getElementById('allow-frozen-allow-change-admin-none');
    const allowFrozenAllowSelfChange = document.getElementById('allow-frozen-allow-self-change');

    if (allowFrozenAllowChangeAuthorizedNone) {
      allowFrozenAllowChangeAuthorizedNone.addEventListener('change', () => {
        if (!wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules) {
          wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules = {};
        }
        wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules.allowChangeAuthorizedToNone = allowFrozenAllowChangeAuthorizedNone.checked;
        persistState();
      });
    }
    if (allowFrozenAllowChangeAdminNone) {
      allowFrozenAllowChangeAdminNone.addEventListener('change', () => {
        if (!wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules) {
          wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules = {};
        }
        wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules.allowChangeAdminToNone = allowFrozenAllowChangeAdminNone.checked;
        persistState();
      });
    }
    if (allowFrozenAllowSelfChange) {
      allowFrozenAllowSelfChange.addEventListener('change', () => {
        if (!wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules) {
          wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules = {};
        }
        wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules.allowSelfChangeAdmin = allowFrozenAllowSelfChange.checked;
        persistState();
      });
    }

    // Unfreeze Permission Select Dropdown
    const unfreezePermissionSelect = document.getElementById('manual-unfreeze-permission');
    if (unfreezePermissionSelect) {
      unfreezePermissionSelect.addEventListener('change', () => {
        const value = unfreezePermissionSelect.value;
        if (value === 'owner') {
          wizardState.form.permissions.unfreeze.performerType = 'owner';
          wizardState.form.permissions.unfreeze.performerReference = '';
        } else if (value === 'identity') {
          wizardState.form.permissions.unfreeze.performerType = 'identity';
          // performerReference will be set by the identity input field
        } else if (value === 'group') {
          wizardState.form.permissions.unfreeze.performerType = 'group';
          // performerReference will be set by the group select
        } else if (value === 'no-one') {
          wizardState.form.permissions.unfreeze.performerType = 'none';
          wizardState.form.permissions.unfreeze.performerReference = '';
        }
        persistState();
      });
    }

    // Destroy Frozen Permission Select Dropdown
    const destroyFrozenPermissionSelect = document.getElementById('destroy-frozen-permission');
    if (destroyFrozenPermissionSelect) {
      destroyFrozenPermissionSelect.addEventListener('change', () => {
        const value = destroyFrozenPermissionSelect.value;
        if (value === 'owner') {
          wizardState.form.permissions.destroyFrozen.performerType = 'owner';
          wizardState.form.permissions.destroyFrozen.performerReference = '';
        } else if (value === 'identity') {
          wizardState.form.permissions.destroyFrozen.performerType = 'identity';
          // performerReference will be set by the identity input field
        } else if (value === 'group') {
          wizardState.form.permissions.destroyFrozen.performerType = 'group';
          // performerReference will be set by the group select
        } else if (value === 'no-one') {
          wizardState.form.permissions.destroyFrozen.performerType = 'none';
          wizardState.form.permissions.destroyFrozen.performerReference = '';
        }
        persistState();
      });
    }

    // Initialize UI
    setTimeout(() => {
      // Restore mode from state
      if (baseSupplyModeToken && wizardState.form.permissions.baseSupplyMode === 'token') {
        baseSupplyModeToken.checked = true;
      } else if (baseSupplyModeBase && wizardState.form.permissions.baseSupplyMode === 'base') {
        baseSupplyModeBase.checked = true;
      }
      if (maxSupplyModeToken && wizardState.form.permissions.maxSupplyMode === 'token') {
        maxSupplyModeToken.checked = true;
      } else if (maxSupplyModeBase && wizardState.form.permissions.maxSupplyMode === 'base') {
        maxSupplyModeBase.checked = true;
      }

      // Restore change max supply governance checkboxes
      if (changeMaxSupplyAllowAuthorizedNone) {
        changeMaxSupplyAllowAuthorizedNone.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowChangeAuthorizedToNone);
      }
      if (changeMaxSupplyAllowAdminNone) {
        changeMaxSupplyAllowAdminNone.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowChangeAdminToNone);
      }
      if (changeMaxSupplyAllowSelfChange) {
        changeMaxSupplyAllowSelfChange.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowSelfChangeAdmin);
      }

      // Restore unfreeze governance checkboxes
      if (unfreezeAllowAuthorizedNone) {
        unfreezeAllowAuthorizedNone.checked = Boolean(wizardState.form.permissions.unfreeze?.allowChangeAuthorizedToNone);
      }
      if (unfreezeAllowAdminNone) {
        unfreezeAllowAdminNone.checked = Boolean(wizardState.form.permissions.unfreeze?.allowChangeAdminToNone);
      }
      if (unfreezeAllowSelfChange) {
        unfreezeAllowSelfChange.checked = Boolean(wizardState.form.permissions.unfreeze?.allowSelfChangeAdmin);
      }

      // Restore freeze governance checkboxes
      if (freezeAllowAuthorizedNone) {
        freezeAllowAuthorizedNone.checked = Boolean(wizardState.form.permissions.manualFreeze?.allowChangeAuthorizedToNone);
      }
      if (freezeAllowAdminNone) {
        freezeAllowAdminNone.checked = Boolean(wizardState.form.permissions.manualFreeze?.allowChangeAdminToNone);
      }
      if (freezeAllowSelfChange) {
        freezeAllowSelfChange.checked = Boolean(wizardState.form.permissions.manualFreeze?.allowSelfChangeAdmin);
      }

      // Restore allow-frozen governance checkboxes
      if (allowFrozenAllowChangeAuthorizedNone) {
        allowFrozenAllowChangeAuthorizedNone.checked = Boolean(wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules?.allowChangeAuthorizedToNone);
      }
      if (allowFrozenAllowChangeAdminNone) {
        allowFrozenAllowChangeAdminNone.checked = Boolean(wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules?.allowChangeAdminToNone);
      }
      if (allowFrozenAllowSelfChange) {
        allowFrozenAllowSelfChange.checked = Boolean(wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules?.allowSelfChangeAdmin);
      }

      // Restore allow-frozen panel visibility
      if (allowFrozenSafeguardsPanel && allowFrozenCheckbox) {
        if (allowFrozenCheckbox.checked) {
          allowFrozenSafeguardsPanel.removeAttribute('hidden');
        } else {
          allowFrozenSafeguardsPanel.setAttribute('hidden', '');
        }
      }

      updateSupplyUI();
      evaluatePermissions({ touched: false });
    }, 100);

    // Add event listeners for history tracking checkboxes
    Object.values(keepsHistoryInputs).forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => evaluatePermissions({ touched: true }));
    });

    // Add event listeners for other permission checkboxes
    if (startPausedInput) {
      startPausedInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }
    if (allowFrozenInput) {
      allowFrozenInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }

    return {
      setValues(values = {}) {
        if (decimalsInput) {
          const storedDecimals = Number.isInteger(values.decimals) ? values.decimals : '';
          decimalsInput.value = storedDecimals === '' ? '' : String(storedDecimals);
        }
        if (baseSupplyInput) {
          baseSupplyInput.value = typeof values.baseSupply === 'string' ? values.baseSupply : '';
        }
        if (maxSupplyInput) {
          maxSupplyInput.value = typeof values.maxSupply === 'string' ? values.maxSupply : '';
        }

        // Hydrate history tracking checkboxes
        if (values.keepsHistory) {
          if (historyTransfersInput) historyTransfersInput.checked = Boolean(values.keepsHistory.transfers);
          if (historyMintsInput) historyMintsInput.checked = Boolean(values.keepsHistory.mints);
          if (historyBurnsInput) historyBurnsInput.checked = Boolean(values.keepsHistory.burns);
          if (historyFreezesInput) historyFreezesInput.checked = Boolean(values.keepsHistory.freezes);
          if (historyPurchasesInput) historyPurchasesInput.checked = Boolean(values.keepsHistory.purchases);
          if (historyDirectPricingInput) historyDirectPricingInput.checked = Boolean(values.keepsHistory.directPricing);
        }

        // Hydrate other checkboxes
        if (startPausedInput) {
          startPausedInput.checked = Boolean(values.startAsPaused);
        }
        if (allowFrozenInput) {
          allowFrozenInput.checked = Boolean(values.allowTransferToFrozenBalance);
        }

        // Refresh supply UI after setting values
        if (typeof updateSupplyUI === 'function') {
          updateSupplyUI();
        }
      },
      getValues() {
        const maxSupplyValue = maxSupplyInput ? maxSupplyInput.value.trim() : '';
        return {
          decimals: decimalsInput ? decimalsInput.value : '',
          baseSupply: baseSupplyInput ? baseSupplyInput.value.trim() : '',
          useMaxSupply: maxSupplyValue.length > 0, // True if user entered a value
          maxSupply: maxSupplyValue,
          keepsHistory: {
            transfers: Boolean(historyTransfersInput && historyTransfersInput.checked),
            mints: Boolean(historyMintsInput && historyMintsInput.checked),
            burns: Boolean(historyBurnsInput && historyBurnsInput.checked),
            freezes: Boolean(historyFreezesInput && historyFreezesInput.checked),
            purchases: Boolean(historyPurchasesInput && historyPurchasesInput.checked),
            directPricing: Boolean(historyDirectPricingInput && historyDirectPricingInput.checked)
          },
          startAsPaused: Boolean(startPausedInput && startPausedInput.checked),
          allowTransferToFrozenBalance: Boolean(allowFrozenInput && allowFrozenInput.checked)
        };
      }
    };
  }

  function createPermissionsUI(form) {
    if (!form) {
      return null;
    }
    const fieldset = form.querySelector('.wizard-fieldset');
    if (!fieldset) {
      return null;
    }

    fieldset.innerHTML = `
      <legend class="wizard-field__label">Token supply controls</legend>
      <div class="wizard-field">
        <label class="wizard-field__label" for="permissions-decimals">Decimals</label>
        <input class="wizard-field__input" id="permissions-decimals" name="permissions-decimals" type="number" min="0" max="18" step="1" required>
        <p class="wizard-field__hint">0-18 decimal places supported.</p>
      </div>
      <div class="wizard-field">
        <label class="wizard-field__label" for="permissions-base-supply">Base supply</label>
        <input class="wizard-field__input" id="permissions-base-supply" name="permissions-base-supply" type="text" inputmode="numeric" pattern="\\d*" placeholder="100000" autocomplete="off" required>
        <p class="wizard-field__hint">Whole token amount created at genesis.</p>
      </div>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-use-max">
          <input class="wizard-checkbox__input" id="permissions-use-max" type="checkbox">
          <span class="wizard-checkbox__label">Limit total supply</span>
        </label>
      </div>
      <div class="wizard-field" id="permissions-max-field">
        <label class="wizard-field__label" for="permissions-max-supply">Max supply</label>
        <input class="wizard-field__input" id="permissions-max-supply" name="permissions-max-supply" type="text" inputmode="numeric" pattern="\\d*" placeholder="500000" autocomplete="off">
        <p class="wizard-field__hint">Leave blank to allow unlimited growth.</p>
      </div>
      <fieldset class="wizard-fieldset wizard-fieldset--nested" id="permissions-history">
        <legend class="wizard-field__label">History tracking</legend>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-transfers">
            <input class="wizard-checkbox__input" id="permissions-history-transfers" type="checkbox">
            <span class="wizard-checkbox__label">Track transfers</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-mints">
            <input class="wizard-checkbox__input" id="permissions-history-mints" type="checkbox">
            <span class="wizard-checkbox__label">Track mints</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-burns">
            <input class="wizard-checkbox__input" id="permissions-history-burns" type="checkbox">
            <span class="wizard-checkbox__label">Track burns</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-freezes">
            <input class="wizard-checkbox__input" id="permissions-history-freezes" type="checkbox">
            <span class="wizard-checkbox__label">Track freezes</span>
          </label>
        </div>
      </fieldset>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-start-paused">
          <input class="wizard-checkbox__input" id="permissions-start-paused" type="checkbox">
          <span class="wizard-checkbox__label">Start the token paused</span>
        </label>
      </div>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-allow-frozen">
          <input class="wizard-checkbox__input" id="permissions-allow-frozen" type="checkbox">
          <span class="wizard-checkbox__label">Allow transfers to frozen balances</span>
        </label>
      </div>
    `;

    const decimalsInput = form.querySelector('#permissions-decimals');
    const baseSupplyInput = form.querySelector('#permissions-base-supply');
    const maxSupplyToggle = form.querySelector('#permissions-use-max');
    const maxSupplyField = form.querySelector('#permissions-max-field');
    const maxSupplyInput = form.querySelector('#permissions-max-supply');
    const startPausedInput = form.querySelector('#permissions-start-paused');
    const allowFrozenInput = form.querySelector('#permissions-allow-frozen');
    const keepsHistoryInputs = {
      transfers: form.querySelector('#history-transfers'),
      mints: form.querySelector('#history-mints'),
      burns: form.querySelector('#history-burns'),
      freezes: form.querySelector('#history-freezes'),
      purchases: form.querySelector('#history-purchases')
    };

    function syncMaxSupplyVisibility(checked) {
      if (!maxSupplyField || !maxSupplyInput) {
        return;
      }
      if (checked) {
        maxSupplyField.removeAttribute('hidden');
        maxSupplyInput.removeAttribute('disabled');
      } else {
        maxSupplyField.setAttribute('hidden', '');
        maxSupplyInput.value = '';
        maxSupplyInput.setAttribute('disabled', '');
      }
    }

    const inputs = [decimalsInput, baseSupplyInput, maxSupplyInput];
    inputs.forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => evaluatePermissions({ touched: true }));
    });

    Object.values(keepsHistoryInputs).forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => evaluatePermissions({ touched: true }));
    });

    if (maxSupplyToggle) {
      maxSupplyToggle.addEventListener('change', () => {
        syncMaxSupplyVisibility(maxSupplyToggle.checked);
        evaluatePermissions({ touched: true });
      });
    }

    if (startPausedInput) {
      startPausedInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }
    if (allowFrozenInput) {
      allowFrozenInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }

    syncMaxSupplyVisibility(Boolean(maxSupplyToggle && maxSupplyToggle.checked));

    return {
      setValues(values = {}) {
        if (decimalsInput) {
          const storedDecimals = Number.isInteger(values.decimals) ? values.decimals : '';
          decimalsInput.value = storedDecimals === '' ? '' : String(storedDecimals);
        }
        if (baseSupplyInput) {
          baseSupplyInput.value = typeof values.baseSupply === 'string' ? values.baseSupply : '';
        }
        const useMax = Boolean(values.useMaxSupply);
        if (maxSupplyToggle) {
          maxSupplyToggle.checked = useMax;
        }
        if (maxSupplyInput) {
          maxSupplyInput.value = useMax && typeof values.maxSupply === 'string' ? values.maxSupply : '';
        }
        syncMaxSupplyVisibility(useMax);

        const history = normalizeKeepsHistory(values.keepsHistory);
        Object.entries(keepsHistoryInputs).forEach(([key, input]) => {
          if (input) {
            input.checked = Boolean(history[key]);
          }
        });

        if (startPausedInput) {
          startPausedInput.checked = Boolean(values.startAsPaused);
        }
        if (allowFrozenInput) {
          allowFrozenInput.checked = Boolean(values.allowTransferToFrozenBalance);
        }
      },
      getValues() {
        const keepsHistory = {};
        Object.entries(keepsHistoryInputs).forEach(([key, input]) => {
          keepsHistory[key] = Boolean(input && input.checked);
        });
        return {
          decimals: decimalsInput ? decimalsInput.value : '',
          baseSupply: baseSupplyInput ? baseSupplyInput.value.trim() : '',
          useMaxSupply: Boolean(maxSupplyToggle && maxSupplyToggle.checked),
          maxSupply: maxSupplyInput ? maxSupplyInput.value.trim() : '',
          keepsHistory,
          startAsPaused: Boolean(startPausedInput && startPausedInput.checked),
          allowTransferToFrozenBalance: Boolean(allowFrozenInput && allowFrozenInput.checked)
        };
      }
    };
  }

  function createTransferUI(form) {
    if (!form) {
      return null;
    }

    const notesEnabledRadios = Array.from(form.querySelectorAll('input[name="transfer-notes-enabled"]'));
    const notesTypesPanel = form.querySelector('#transfer-notes-types-panel');
    const publicCheckbox = form.querySelector('#transfer-note-type-public');
    const sharedCheckbox = form.querySelector('#transfer-note-type-shared');
    const privateCheckbox = form.querySelector('#transfer-note-type-private');

    function updatePanelVisibility() {
      const enabled = notesEnabledRadios.find(r => r.checked && r.value === 'enabled');
      if (enabled && notesTypesPanel) {
        notesTypesPanel.removeAttribute('hidden');
      } else if (notesTypesPanel) {
        notesTypesPanel.setAttribute('hidden', '');
      }
    }

    notesEnabledRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        updatePanelVisibility();
        saveTransferSettings();
      });
    });

    [publicCheckbox, sharedCheckbox, privateCheckbox].forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', () => saveTransferSettings());
      }
    });

    function saveTransferSettings() {
      const notesEnabled = notesEnabledRadios.find(r => r.checked && r.value === 'enabled');
      wizardState.form.permissions.transferNotesEnabled = Boolean(notesEnabled);
      wizardState.form.permissions.transferNoteTypes = {
        public: Boolean(publicCheckbox && publicCheckbox.checked),
        sharedEncrypted: Boolean(sharedCheckbox && sharedCheckbox.checked),
        privateEncrypted: Boolean(privateCheckbox && privateCheckbox.checked)
      };

      if (transferNextButton) {
        transferNextButton.disabled = false; // Always valid (optional)
      }
    }

    function loadTransferSettings() {
      const settings = wizardState.form.permissions;
      const enabledRadio = notesEnabledRadios.find(r => r.value === (settings.transferNotesEnabled ? 'enabled' : 'disabled'));
      if (enabledRadio) {
        enabledRadio.checked = true;
      }

      if (publicCheckbox) publicCheckbox.checked = Boolean(settings.transferNoteTypes.public);
      if (sharedCheckbox) sharedCheckbox.checked = Boolean(settings.transferNoteTypes.sharedEncrypted);
      if (privateCheckbox) privateCheckbox.checked = Boolean(settings.transferNoteTypes.privateEncrypted);

      updatePanelVisibility();
      if (transferNextButton) {
        transferNextButton.disabled = false; // Always valid
      }
    }

    form.addEventListener('submit', (event) => event.preventDefault());

    updatePanelVisibility();
    loadTransferSettings();

    return {
      load: loadTransferSettings,
      save: saveTransferSettings
    };
  }



  function createManualActionUI(definition, screen) {
    if (!definition || !screen) {
      return null;
    }
    const { key, stepId, domPrefix } = definition;
    const form = screen.querySelector(`#${domPrefix}-form`);
    if (!form) {
      return null;
    }

    const selector = (suffix) => `#${domPrefix}-${suffix}`;
    const dataSelector = (role) => `[data-${domPrefix}-identity="${role}"]`;

    const enabledRadios = Array.from(form.querySelectorAll(`input[name="${domPrefix}-enabled"]`));
    const performerSelect = form.querySelector(selector('performer'));
    const performerIdentityWrapper = form.querySelector(dataSelector('performer'));
    const performerIdentityInput = form.querySelector(selector('performer-identity'));
    const ruleChangerSelect = form.querySelector(selector('rule-changer'));
    const ruleChangerIdentityWrapper = form.querySelector(dataSelector('changer'));
    const ruleChangerIdentityInput = form.querySelector(selector('rule-changer-identity'));
    const allowAuthorizedNoneInput = form.querySelector(selector('allow-authorized-none'));
    const allowAdminNoneInput = form.querySelector(selector('allow-admin-none'));
    const allowSelfChangeInput = form.querySelector(selector('allow-self-change'));
    const controlsPanel = form.querySelector(`[data-${domPrefix}-controls]`);
    const messageElement = form.querySelector(selector('message'));
    const performerIdentityMount = createConditionalFieldMount(performerIdentityWrapper);
    const ruleChangerIdentityMount = createConditionalFieldMount(ruleChangerIdentityWrapper);

    let touched = Boolean(getStepState(stepId)?.touched);

    const actionState = () => {
      ensurePermissionsGroupState();
      ensureManualActionState(key);
      return wizardState.form.permissions[key];
    };

    function encodeActorValue(type, reference = '') {
      switch (type) {
        case 'owner':
          return 'owner';
        case 'identity':
          return `identity:${reference || ''}`;
        case 'group':
          return `group:${reference || ''}`;
        case 'main-group':
          return 'main-group';
        case 'none':
        default:
          return 'none';
      }
    }

    function decodeActorValue(value) {
      if (value && value.startsWith('group:')) {
        return { type: 'group', reference: value.slice(6) };
      }
      if (value && value.startsWith('identity:')) {
        return { type: 'identity', reference: value.slice(9) };
      }
      if (value === 'owner') {
        return { type: 'owner', reference: '' };
      }
      if (value === 'main-group') {
        return { type: 'main-group', reference: '' };
      }
      return { type: 'none', reference: '' };
    }

    function buildActorOptions() {
      const options = [];
      options.push({ value: 'none', label: 'No one' });
      options.push({ value: 'owner', label: 'Contract owner' });

      const permissions = wizardState.form.permissions;
      const groups = Array.isArray(permissions.groups) ? permissions.groups : [];
      const mainIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);

      if (groups.length) {
        groups.forEach((group, index) => {
          options.push({ value: encodeActorValue('group', group.id), label: buildGroupLabel(group, index) });
        });
      }

      if (mainIndex >= 0 && mainIndex < groups.length) {
        options.push({ value: 'main-group', label: 'Main control group' });
      }

      options.push({ value: 'identity:', label: 'Specific Identity' });

      if (!groups.length) {
        options.push({ value: '__groups-missing__', label: '(No groups added yet)', disabled: true });
      }

      return options;
    }

    function populateSelect(select, options, requestedValue) {
      if (!select) {
        return '';
      }
      const previousValue = select.value;
      select.innerHTML = '';
      let fallbackValue = '';
      options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.disabled) {
          opt.disabled = true;
        } else if (!fallbackValue) {
          fallbackValue = option.value;
        }
        select.appendChild(opt);
      });

      let nextValue = requestedValue;
      if (!options.some((option) => option.value === requestedValue && !option.disabled)) {
        nextValue = fallbackValue || '';
      }

      select.value = nextValue;
      if (select.value !== nextValue && nextValue) {
        select.value = nextValue;
      }

      if (!select.value && previousValue && select.value !== previousValue) {
        select.value = previousValue;
      }

      return select.value;
    }

    function setControlsDisabled(disabled) {
      const controlElements = [
        performerSelect,
        ruleChangerSelect,
        performerIdentityInput,
        ruleChangerIdentityInput,
        allowAuthorizedNoneInput,
        allowAdminNoneInput,
        allowSelfChangeInput
      ];
      controlElements.forEach((element) => {
        if (element) {
          element.disabled = disabled;
        }
      });
      if (controlsPanel) {
        controlsPanel.classList.toggle('is-disabled', disabled);
        controlsPanel.setAttribute('aria-disabled', String(Boolean(disabled)));
      }
    }

    function syncIdentityField(type, mount, input, enabled, reference) {
      if (!mount || !input) {
        return;
      }
      if (type === 'identity' && enabled) {
        mount.show();
        input.disabled = false;
        input.value = reference || '';
      } else {
        mount.hide();
        input.disabled = true;
      }
    }

    function validate(state) {
      if (!state.enabled) {
        return { valid: true, message: '' };
      }
      if (state.performerType === 'none') {
        return { valid: false, message: 'Choose who may perform this action when it is enabled.' };
      }
      if (state.performerType === 'identity' && !state.performerReference) {
        return { valid: false, message: 'Enter the identity ID allowed to perform this action.' };
      }
      if (state.performerType === 'group' && !state.performerReference) {
        return { valid: false, message: 'Select a permission group allowed to perform this action.' };
      }
      if (state.ruleChangerType === 'identity' && !state.ruleChangerReference) {
        return { valid: false, message: 'Enter the identity ID allowed to change the rules.' };
      }
      if (state.ruleChangerType === 'group' && !state.ruleChangerReference) {
        return { valid: false, message: 'Select a permission group allowed to change the rules.' };
      }
      return { valid: true, message: '' };
    }

    function applyValidation(state, { silent = false } = {}) {
      const validation = validate(state);
      if (messageElement) {
        if (!validation.valid && (touched || state.enabled)) {
          messageElement.textContent = validation.message;
        } else {
          messageElement.textContent = '';
        }
      }
      updateStepStatusFromValidation(stepId, validation, touched || state.enabled);
      if (!validation.valid && !silent && validation.message) {
        announce(validation.message);
      }
      return validation;
    }

    function commit(partial, { markTouched = true, silent = false } = {}) {
      const permissions = wizardState.form.permissions;
      permissions[key] = {
        ...permissions[key],
        ...partial
      };
      permissions[key] = normalizeManualActionRecord(permissions, key);
      persistState();
      if (markTouched) {
        touched = true;
      }
      applyValidation(permissions[key], { silent });
    }

    function sync({ announce = true } = {}) {
      const state = actionState();
      const options = buildActorOptions();

      const performerValue = encodeActorValue(state.performerType, state.performerReference);
      const resolvedPerformerValue = populateSelect(performerSelect, options, performerValue);
      const performerActor = decodeActorValue(resolvedPerformerValue);
      if (performerActor.type !== state.performerType || performerActor.reference !== state.performerReference) {
        commit({ performerType: performerActor.type, performerReference: performerActor.reference }, { markTouched: false, silent: true });
      }

      const ruleValue = encodeActorValue(state.ruleChangerType, state.ruleChangerReference);
      const resolvedRuleValue = populateSelect(ruleChangerSelect, options, ruleValue);
      const ruleActor = decodeActorValue(resolvedRuleValue);
      if (ruleActor.type !== state.ruleChangerType || ruleActor.reference !== state.ruleChangerReference) {
        commit({ ruleChangerType: ruleActor.type, ruleChangerReference: ruleActor.reference }, { markTouched: false, silent: true });
      }

      const updatedState = actionState();
      const enableRadio = updatedState.enabled ? 'enabled' : 'disabled';
      enabledRadios.forEach((input) => {
        input.checked = input.value === enableRadio;
      });

      setControlsDisabled(!updatedState.enabled);
      syncIdentityField(
        updatedState.performerType,
        performerIdentityMount,
        performerIdentityInput,
        updatedState.enabled,
        updatedState.performerReference
      );
      syncIdentityField(
        updatedState.ruleChangerType,
        ruleChangerIdentityMount,
        ruleChangerIdentityInput,
        updatedState.enabled,
        updatedState.ruleChangerReference
      );

      if (allowAuthorizedNoneInput) {
        allowAuthorizedNoneInput.checked = Boolean(updatedState.allowChangeAuthorizedToNone);
      }
      if (allowAdminNoneInput) {
        allowAdminNoneInput.checked = Boolean(updatedState.allowChangeAdminToNone);
      }
      if (allowSelfChangeInput) {
        allowSelfChangeInput.checked = Boolean(updatedState.allowSelfChangeAdmin);
      }

      applyValidation(updatedState, { silent: !announce });
    }

    enabledRadios.forEach((input) => {
      input.addEventListener('change', () => {
        const enable = input.value === 'enabled';
        commit({ enabled: enable }, { silent: true });
        if (!enable) {
          commit(
            {
              performerType: 'none',
              performerReference: '',
              allowChangeAuthorizedToNone: false,
              allowChangeAdminToNone: false,
              allowSelfChangeAdmin: false
            },
            { markTouched: false, silent: true }
          );
        } else {
          // Auto-set performerType and ruleChangerType to 'owner' when enabling
          // Only if they're currently 'none' (preserves user customizations)
          const state = actionState();
          const updates = {};
          if (state.performerType === 'none') {
            updates.performerType = 'owner';
          }
          if (state.ruleChangerType === 'none') {
            updates.ruleChangerType = 'owner';
          }
          if (Object.keys(updates).length) {
            commit(updates, { markTouched: false, silent: true });
          }
        }
        sync({ announce: false });
      });
    });

    if (performerSelect) {
      performerSelect.addEventListener('change', () => {
        const actor = decodeActorValue(performerSelect.value);
        commit({ performerType: actor.type, performerReference: actor.reference });
        sync({ announce: false });
      });
    }

    if (ruleChangerSelect) {
      ruleChangerSelect.addEventListener('change', () => {
        const actor = decodeActorValue(ruleChangerSelect.value);
        commit({ ruleChangerType: actor.type, ruleChangerReference: actor.reference });
        sync({ announce: false });
      });
    }

    if (performerIdentityInput) {
      performerIdentityInput.addEventListener('input', () => {
        commit({ performerReference: performerIdentityInput.value.trim() });
      });
    }

    if (ruleChangerIdentityInput) {
      ruleChangerIdentityInput.addEventListener('input', () => {
        commit({ ruleChangerReference: ruleChangerIdentityInput.value.trim() });
      });
    }

    if (allowAuthorizedNoneInput) {
      allowAuthorizedNoneInput.addEventListener('change', () => {
        commit({ allowChangeAuthorizedToNone: Boolean(allowAuthorizedNoneInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    if (allowAdminNoneInput) {
      allowAdminNoneInput.addEventListener('change', () => {
        commit({ allowChangeAdminToNone: Boolean(allowAdminNoneInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    if (allowSelfChangeInput) {
      allowSelfChangeInput.addEventListener('change', () => {
        commit({ allowSelfChangeAdmin: Boolean(allowSelfChangeInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    // Special handling for manualMint destination fields
    if (key === 'manualMint') {
      const destinationRadios = Array.from(form.querySelectorAll('input[name="manual-mint-destination"]'));
      const destinationIdentityInput = form.querySelector('#manual-mint-destination-id');
      const allowCustomDestinationCheckbox = form.querySelector('#manual-mint-allow-custom-destination');

      if (destinationRadios.length > 0) {
        destinationRadios.forEach((radio) => {
          radio.addEventListener('change', () => {
            const destinationType = radio.value; // 'contract-owner' or 'default-identity'
            commit({ destinationType }, { silent: true });
          });
        });
      }

      if (destinationIdentityInput) {
        destinationIdentityInput.addEventListener('input', () => {
          commit({ destinationIdentity: destinationIdentityInput.value.trim() });
        });
      }

      if (allowCustomDestinationCheckbox) {
        allowCustomDestinationCheckbox.addEventListener('change', () => {
          commit({ allowCustomDestination: Boolean(allowCustomDestinationCheckbox.checked) }, { silent: true });
        });
      }

      // Sync destination fields to UI
      const state = actionState();
      if (state.destinationType) {
        const destinationRadio = destinationRadios.find(r => r.value === state.destinationType);
        if (destinationRadio) {
          destinationRadio.checked = true;
        }
      }
      if (destinationIdentityInput && state.destinationIdentity) {
        destinationIdentityInput.value = state.destinationIdentity;
      }
      if (allowCustomDestinationCheckbox) {
        allowCustomDestinationCheckbox.checked = Boolean(state.allowCustomDestination);
      }
    }

    return {
      sync
    };
  }

  function syncManualActionUIs({ announce = false } = {}) {
    MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => {
      const ui = manualActionUIs[key];
      if (ui && typeof ui.sync === 'function') {
        ui.sync({ announce });
      }
    });

    // Update feature indicators when manual actions are synced
    if (window.updateFeatureIndicators) {
      window.updateFeatureIndicators();
    }
  }

  function createDistributionUI(form) {
    if (!form) {
      return null;
    }

    // NOTE: HTML is now defined in index.html, not generated dynamically
    // This function just sets up event listeners for existing elements

    /* COMMENTED OUT - HTML now in index.html
    const fieldset = form.querySelector('.wizard-fieldset');
    if (!fieldset) {
      return null;
    }

    fieldset.innerHTML = `
      <legend class="wizard-field__label">Emission schedule</legend>
      <div class="wizard-field">
        <label class="wizard-field__label" for="distribution-emission-type">Emission type</label>
        <select class="wizard-field__input" id="distribution-emission-type" name="distribution-emission-type">
          <option value="BlockBasedDistribution">Block based</option>
          <option value="TimeBasedDistribution">Time based</option>
          <option value="EpochBasedDistribution">Epoch based</option>
        </select>
      </div>
      <div class="wizard-field" data-cadence-field="BlockBasedDistribution">
        <label class="wizard-field__label" for="distribution-interval-blocks">Blocks per emission</label>
        <input class="wizard-field__input" id="distribution-interval-blocks" type="number" min="1" step="1" placeholder="10">
        <p class="wizard-field__hint">Number of blocks between emissions.</p>
        <label class="wizard-field__label wizard-field__label--secondary" for="distribution-start-block">Start block (optional)</label>
        <input class="wizard-field__input" id="distribution-start-block" type="number" min="0" step="1" placeholder="0">
      </div>
      <div class="wizard-field" data-cadence-field="TimeBasedDistribution">
        <label class="wizard-field__label" for="distribution-interval-seconds">Seconds per emission</label>
        <input class="wizard-field__input" id="distribution-interval-seconds" type="number" min="1" step="1" placeholder="60">
        <p class="wizard-field__hint">Time between emissions.</p>
        <label class="wizard-field__label wizard-field__label--secondary" for="distribution-start-timestamp">Start timestamp (ISO, optional)</label>
        <input class="wizard-field__input" id="distribution-start-timestamp" type="text" placeholder="2025-01-01T00:00:00Z">
      </div>
      <div class="wizard-field" data-cadence-field="EpochBasedDistribution">
        <label class="wizard-field__label" for="distribution-epoch">Epoch identifier</label>
        <input class="wizard-field__input" id="distribution-epoch" type="text" placeholder="monthly">
        <p class="wizard-field__hint">Name of the epoch cadence (e.g. weekly, monthly).</p>
      </div>
      <div class="wizard-field">
        <label class="wizard-field__label" for="distribution-function-type">Emission function</label>
        <select class="wizard-field__input" id="distribution-function-type" name="distribution-function-type">
          <option value="FixedAmount">Fixed amount</option>
          <option value="Random">Random amount</option>
          <option value="StepDecreasingAmount">Step decreasing amount</option>
        </select>
      </div>
      <div class="wizard-field-group" data-function-field="FixedAmount">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-fixed-amount">Amount per emission</label>
          <input class="wizard-field__input" id="distribution-fixed-amount" type="text" inputmode="numeric" pattern="\\d*" placeholder="100">
        </div>
      </div>
      <div class="wizard-field-group" data-function-field="Random">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-random-min">Minimum amount</label>
          <input class="wizard-field__input" id="distribution-random-min" type="text" inputmode="numeric" pattern="\\d*" placeholder="10">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-random-max">Maximum amount</label>
          <input class="wizard-field__input" id="distribution-random-max" type="text" inputmode="numeric" pattern="\\d*" placeholder="100">
        </div>
      </div>
      <div class="wizard-field-group" data-function-field="StepDecreasingAmount">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-count">Step count</label>
          <input class="wizard-field__input" id="distribution-step-count" type="number" min="1" step="1" placeholder="4">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-numerator">Decrease numerator</label>
          <input class="wizard-field__input" id="distribution-step-numerator" type="number" min="0" step="1" placeholder="1">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-denominator">Decrease denominator</label>
          <input class="wizard-field__input" id="distribution-step-denominator" type="number" min="1" step="1" placeholder="2">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-start">Start amount</label>
          <input class="wizard-field__input" id="distribution-step-start" type="text" inputmode="numeric" pattern="\\d*" placeholder="500">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-trailing">Trailing interval amount</label>
          <input class="wizard-field__input" id="distribution-step-trailing" type="text" inputmode="numeric" pattern="\\d*" placeholder="50">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-offset">Start offset (optional)</label>
          <input class="wizard-field__input" id="distribution-step-offset" type="number" min="0" step="1" placeholder="0">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-max-interval">Max intervals (optional)</label>
          <input class="wizard-field__input" id="distribution-step-max-interval" type="number" min="1" step="1" placeholder="128">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-min-value">Minimum value (optional)</label>
          <input class="wizard-field__input" id="distribution-step-min-value" type="number" min="0" step="1" placeholder="0">
        </div>
      </div>
    `; */

    // Use HTML elements that are already in index.html
    const typeRadios = Array.from(document.querySelectorAll('input[name="distribution-type"]'));
    const functionRadios = Array.from(document.querySelectorAll('input[name="emission-type"]'));
    const recipientRadios = Array.from(document.querySelectorAll('input[name="recipient-type"], input[name="recipient-type-perpetual"]'));

    // FIXED: Helper functions to get selected radio button value and map to correct type names
    const getSelectedTypeValue = () => {
      const checked = typeRadios.find(r => r.checked);
      if (!checked) return 'BlockBasedDistribution';
      // Map radio values to API type names
      const typeMap = {
        'block': 'BlockBasedDistribution',
        'time': 'TimeBasedDistribution',
        'epoch': 'EpochBasedDistribution'
      };
      return typeMap[checked.value] || 'BlockBasedDistribution';
    };
    const getSelectedFunctionValue = () => {
      const checked = functionRadios.find(r => r.checked);
      if (!checked) return '';
      // Map radio values to API type names
      const functionMap = {
        'fixed': 'FixedAmount',
        'exponential': 'Exponential',
        'linear': 'Linear',
        'random': 'Random',
        'step-decreasing': 'StepDecreasingAmount',
        'stepwise': 'Stepwise',
        'polynomial': 'Polynomial',
        'logarithmic': 'Logarithmic',
        'inverted-logarithmic': 'InvertedLogarithmic'
      };
      return functionMap[checked.value] || '';
    };

    const cadenceContainers = Array.from(form.querySelectorAll('[data-cadence-field]'));
    const functionContainers = Array.from(form.querySelectorAll('[data-function-field]'));

    // FIXED: Use actual element IDs from index.html
    const blockIntervalInput = document.querySelector('#dist-block-interval');
    const blockStartInput = document.querySelector('#dist-block-start');
    const timeIntervalInput = document.querySelector('#dist-time-interval');  // This is in HOURS, not seconds
    const timeStartInput = document.querySelector('#dist-time-start');
    const epochInput = document.querySelector('#dist-epoch-interval');

    // FIXED: Use actual element IDs from emission substep
    const fixedAmountInput = document.querySelector('#emission-fixed-amount');
    const randomMinInput = document.querySelector('#emission-random-min');
    const randomMaxInput = document.querySelector('#emission-random-max');
    const stepCountInput = form.querySelector('#distribution-step-count');
    const stepNumeratorInput = form.querySelector('#distribution-step-numerator');
    const stepDenominatorInput = form.querySelector('#distribution-step-denominator');
    const stepStartInput = form.querySelector('#distribution-step-start');
    const stepTrailingInput = form.querySelector('#distribution-step-trailing');
    const stepOffsetInput = form.querySelector('#distribution-step-offset');
    const stepMaxIntervalInput = form.querySelector('#distribution-step-max-interval');
    const stepMinValueInput = form.querySelector('#distribution-step-min-value');

    function syncCadence() {
      const active = getSelectedTypeValue();
      cadenceContainers.forEach((container) => {
        if (!container) return;
        const target = container.getAttribute('data-cadence-field');
        container.toggleAttribute('hidden', target !== active);
      });
    }

    function syncFunctionFields() {
      const active = getSelectedFunctionValue();
      functionContainers.forEach((container) => {
        if (!container) return;
        const target = container.getAttribute('data-function-field');
        container.toggleAttribute('hidden', target !== active);
      });
    }

    // FIXED: Add event listeners to radio buttons instead of select elements
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        syncCadence();
        evaluateDistribution({ touched: true });
      });
    });

    functionRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        syncFunctionFields();
        evaluateDistribution({ touched: true });
      });
    });

    // Update recipient options visibility based on cadence type
    function updateRecipientOptionsVisibility(cadenceType) {
      // Handle both emission page and perpetual page evonodes options
      const evonodesChoice = document.getElementById('recipient-evonodes-choice');
      const evonodesChoicePerpetual = document.getElementById('recipient-evonodes-choice-perpetual');
      const evonodesRadios = Array.from(document.querySelectorAll('input[value="evonodes-by-participation"]'));

      // If cadenceType not provided, get it from wizard state or currently selected radio
      if (!cadenceType) {
        cadenceType = wizardState.form.distribution?.cadence?.type || getSelectedTypeValue();
      }

      if (cadenceType === 'EpochBasedDistribution') {
        // Show evonodes option for epoch-based on both pages
        if (evonodesChoice) {
          evonodesChoice.removeAttribute('hidden');
        }
        if (evonodesChoicePerpetual) {
          evonodesChoicePerpetual.removeAttribute('hidden');
        }
        evonodesRadios.forEach(radio => {
          if (radio) radio.removeAttribute('disabled');
        });
      } else {
        // Hide evonodes option for block/time-based on both pages
        if (evonodesChoice) {
          evonodesChoice.setAttribute('hidden', '');
        }
        if (evonodesChoicePerpetual) {
          evonodesChoicePerpetual.setAttribute('hidden', '');
        }
        evonodesRadios.forEach(radio => {
          if (radio) radio.setAttribute('disabled', '');
        });

        // Reset to owner if evonodes was selected (check both pages)
        evonodesRadios.forEach(evonodesRadio => {
          if (evonodesRadio && evonodesRadio.checked) {
            // Find the corresponding owner radio on the same page
            const ownerRadio = document.querySelector(
              `input[name="${evonodesRadio.name}"][value="contract-owner"]`
            );
            if (ownerRadio) {
              ownerRadio.checked = true;
              ownerRadio.dispatchEvent(new Event('change'));
            }
          }
        });
      }
    }

    // Wire up recipient radio changes
    recipientRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        evaluateDistribution({ touched: true });
      });
    });

    // Update recipient visibility when cadence changes
    typeRadios.forEach(radio => {
      const originalListener = radio.onchange;
      radio.addEventListener('change', () => {
        const cadenceType = getSelectedTypeValue();
        updateRecipientOptionsVisibility(cadenceType);
      });
    });

    // Initialize recipient visibility on load
    updateRecipientOptionsVisibility(getSelectedTypeValue());

    const watchedInputs = [
      blockIntervalInput,
      blockStartInput,
      timeIntervalInput,
      timeStartInput,
      epochInput,
      fixedAmountInput,
      randomMinInput,
      randomMaxInput,
      stepCountInput,
      stepNumeratorInput,
      stepDenominatorInput,
      stepStartInput,
      stepTrailingInput,
      stepOffsetInput,
      stepMaxIntervalInput,
      stepMinValueInput
    ];

    watchedInputs.forEach((input) => {
      if (!input) return;
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => evaluateDistribution({ touched: true }));
    });

    syncCadence();
    syncFunctionFields();

    return {
      setValues(values = {}) {
        // FIXED: Set radio button checked state with proper type mapping
        if (values.cadence && typeof values.cadence.type === 'string') {
          // Map API type names back to radio values
          const reverseTypeMap = {
            'BlockBasedDistribution': 'block',
            'TimeBasedDistribution': 'time',
            'EpochBasedDistribution': 'epoch'
          };
          const radioValue = reverseTypeMap[values.cadence.type] || 'block';
          const typeRadio = typeRadios.find(r => r.value === radioValue);
          if (typeRadio) typeRadio.checked = true;
        }
        if (values.emission && typeof values.emission.type === 'string') {
          // Map API type names back to radio values
          const reverseFunctionMap = {
            'FixedAmount': 'fixed',
            'Exponential': 'exponential',
            'Linear': 'linear',
            'Random': 'random',
            'StepDecreasingAmount': 'step-decreasing',
            'Stepwise': 'stepwise',
            'Polynomial': 'polynomial',
            'Logarithmic': 'logarithmic',
            'InvertedLogarithmic': 'inverted-logarithmic'
          };
          const radioValue = reverseFunctionMap[values.emission.type];
          if (radioValue) {
            const functionRadio = functionRadios.find(r => r.value === radioValue);
            if (functionRadio) functionRadio.checked = true;
          }
        }

        if (values.cadence) {
          if (blockIntervalInput) {
            blockIntervalInput.value = values.cadence.intervalBlocks || '';
          }
          if (blockStartInput) {
            blockStartInput.value = values.cadence.startBlock || '';
          }
          // FIXED: Convert seconds to hours for display
          if (timeIntervalInput && values.cadence.intervalSeconds) {
            const seconds = parseInt(values.cadence.intervalSeconds, 10);
            if (!isNaN(seconds) && seconds > 0) {
              timeIntervalInput.value = String(Math.floor(seconds / 3600)); // Convert seconds to hours
            } else {
              timeIntervalInput.value = '';
            }
          } else if (timeIntervalInput) {
            timeIntervalInput.value = '';
          }
          if (timeStartInput) {
            timeStartInput.value = values.cadence.startTimestamp || '';
          }
          if (epochInput) {
            epochInput.value = values.cadence.epoch || '';
          }
        }

        if (values.emission) {
          if (fixedAmountInput) {
            fixedAmountInput.value = values.emission.amount || '';
          }
          if (randomMinInput) {
            randomMinInput.value = values.emission.min || '';
          }
          if (randomMaxInput) {
            randomMaxInput.value = values.emission.max || '';
          }
          if (stepCountInput) {
            stepCountInput.value = values.emission.stepCount || '';
          }
          if (stepNumeratorInput) {
            stepNumeratorInput.value = values.emission.decreasePerIntervalNumerator || '';
          }
          if (stepDenominatorInput) {
            stepDenominatorInput.value = values.emission.decreasePerIntervalDenominator || '';
          }
          if (stepStartInput) {
            stepStartInput.value = values.emission.distributionStartAmount || '';
          }
          if (stepTrailingInput) {
            stepTrailingInput.value = values.emission.trailingDistributionIntervalAmount || '';
          }
          if (stepOffsetInput) {
            stepOffsetInput.value = values.emission.startDecreasingOffset || '';
          }
          if (stepMaxIntervalInput) {
            stepMaxIntervalInput.value = values.emission.maxIntervalCount || '';
          }
          if (stepMinValueInput) {
            stepMinValueInput.value = values.emission.minValue || '';
          }
        }

        syncCadence();
        syncFunctionFields();
      },
      getValues() {
        // FIXED: Convert hours to seconds for time-based distribution
        let intervalSecondsValue = '';
        if (timeIntervalInput && timeIntervalInput.value.trim()) {
          const hours = parseInt(timeIntervalInput.value.trim(), 10);
          if (!isNaN(hours) && hours > 0) {
            intervalSecondsValue = String(hours * 3600); // Convert hours to seconds
          }
        }

        // Collect recipient information from both pages
        const checkedRecipientRadio = recipientRadios.find(r => r.checked);
        const recipientType = checkedRecipientRadio ? checkedRecipientRadio.value : 'contract-owner';

        // Get identity ID from either page
        const identityIdInput = document.querySelector('#recipient-identity-id') ||
                                document.querySelector('#recipient-identity-id-perpetual');
        const identityId = identityIdInput ? identityIdInput.value.trim() : '';

        // Collect perpetual distribution rules
        const performAction = document.getElementById('perpetual-perform-action')?.value || 'no-one';
        const changeRules = document.getElementById('perpetual-change-rules')?.value || 'no-one';

        // Collect safeguard checkbox states
        const safeguards = {
          performAction: performAction,
          changeRules: changeRules,
          allowChangeAuthorizedToNone: document.getElementById('perpetual-allow-change-authorized-to-none')?.checked || false,
          allowChangeAdminToNone: document.getElementById('perpetual-allow-change-admin-to-none')?.checked || false,
          allowSelfChangeAdmin: document.getElementById('perpetual-allow-self-change-admin')?.checked || false
        };

        // Pre-programmed distribution rules - read from UI
        const preProgrammedRules = {
          performAction: document.getElementById('preprogrammed-perform-action')?.value || 'no-one',
          changeRules: document.getElementById('preprogrammed-change-rules')?.value || 'no-one',
          performIdentityId: document.getElementById('preprogrammed-identity-id')?.value || '',
          performGroupId: document.getElementById('preprogrammed-group-id')?.value || '',
          changeRulesIdentityId: document.getElementById('preprogrammed-rule-identity-id')?.value || '',
          changeRulesGroupId: document.getElementById('preprogrammed-rule-group-id')?.value || '',
          allowChangeAuthorizedToNone: document.getElementById('preprogrammed-allow-authorized-none')?.checked || false,
          allowChangeAdminToNone: document.getElementById('preprogrammed-allow-admin-none')?.checked || false,
          allowSelfChangeAdmin: document.getElementById('preprogrammed-allow-self-change')?.checked || false
        };

        // Collect new tokens destination identity rules
        const mintDestinationRules = {
          performAction: document.getElementById('mint-destination-perform-action')?.value || 'no-one',
          changeRules: document.getElementById('mint-destination-change-rules')?.value || 'no-one',
          allowChangeAuthorizedToNone: document.getElementById('mint-destination-allow-change-authorized-to-none')?.checked || false,
          allowChangeAdminToNone: document.getElementById('mint-destination-allow-change-admin-to-none')?.checked || false,
          allowSelfChangeAdmin: document.getElementById('mint-destination-allow-self-change-admin')?.checked || false
        };

        // Collect allow choosing destination rules
        const allowChoosingRules = {
          performAction: document.getElementById('allow-choosing-perform-action')?.value || 'no-one',
          changeRules: document.getElementById('allow-choosing-change-rules')?.value || 'no-one',
          allowChangeAuthorizedToNone: document.getElementById('allow-choosing-allow-change-authorized-to-none')?.checked || false,
          allowChangeAdminToNone: document.getElementById('allow-choosing-allow-change-admin-to-none')?.checked || false,
          allowSelfChangeAdmin: document.getElementById('allow-choosing-allow-self-change-admin')?.checked || false
        };

        return {
          cadence: {
            type: getSelectedTypeValue(),
            intervalBlocks: blockIntervalInput ? blockIntervalInput.value.trim() : '',
            startBlock: blockStartInput ? blockStartInput.value.trim() : '',
            intervalSeconds: intervalSecondsValue,
            startTimestamp: timeStartInput ? timeStartInput.value.trim() : '',
            epoch: epochInput ? epochInput.value.trim() : ''
          },
          emission: {
            type: getSelectedFunctionValue(),
            amount: fixedAmountInput ? fixedAmountInput.value.trim() : '',
            min: randomMinInput ? randomMinInput.value.trim() : '',
            max: randomMaxInput ? randomMaxInput.value.trim() : '',
            stepCount: stepCountInput ? stepCountInput.value.trim() : '',
            decreasePerIntervalNumerator: stepNumeratorInput ? stepNumeratorInput.value.trim() : '',
            decreasePerIntervalDenominator: stepDenominatorInput ? stepDenominatorInput.value.trim() : '',
            distributionStartAmount: stepStartInput ? stepStartInput.value.trim() : '',
            trailingDistributionIntervalAmount: stepTrailingInput ? stepTrailingInput.value.trim() : '',
            startDecreasingOffset: stepOffsetInput ? stepOffsetInput.value.trim() : '',
            maxIntervalCount: stepMaxIntervalInput ? stepMaxIntervalInput.value.trim() : '',
            minValue: stepMinValueInput ? stepMinValueInput.value.trim() : ''
          },
          recipient: {
            type: recipientType,
            identityId: identityId
          },
          safeguards: safeguards,
          preProgrammedRules: preProgrammedRules,
          mintDestinationRules: mintDestinationRules,
          allowChoosingRules: allowChoosingRules
        };
      },
      updateRecipientVisibility() {
        updateRecipientOptionsVisibility();
      }
    };
  }

  function createAdvancedUI(form) {
    // REMOVED: Change-control toggles section - functionality moved to dedicated permission screens
    return null;
  }

  function normalizeTokenAmount(value, decimals = 0) {
    if (value === null || value === undefined) {
      return null;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return null;
    }

    // Allow decimal notation (e.g., "5.5")
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }

    // If decimals are allowed and value contains a decimal point
    if (decimals > 0 && normalized.includes('.')) {
      const parts = normalized.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      // Check if decimal part exceeds allowed decimals
      if (decimalPart.length > decimals) {
        return null;
      }

      // Convert to smallest unit: e.g., "5.5" with 8 decimals becomes "550000000"
      const paddedDecimal = decimalPart.padEnd(decimals, '0');
      const combined = integerPart + paddedDecimal;
      const stripped = combined.replace(/^0+(?=\d)/, '');
      return stripped.length ? stripped : '0';
    }

    // If no decimals or value is a whole number, treat as smallest unit
    // e.g., "1000000" with decimals=8 stays as "1000000" (represents 0.01000000 tokens)
    // But if user enters "5", it should be treated as 5 whole tokens = 500000000 (if decimals=8)
    if (decimals > 0 && !normalized.includes('.')) {
      // Multiply by 10^decimals to convert whole tokens to smallest unit
      const multiplier = '1' + '0'.repeat(decimals);
      try {
        const result = (BigInt(normalized) * BigInt(multiplier)).toString();
        return result;
      } catch (e) {
        return null;
      }
    }

    // No decimals, return as-is (whole number)
    const stripped = normalized.replace(/^0+(?=\d)/, '');
    return stripped.length ? stripped : '0';
  }

  function normalizeKeepsHistory(input) {
    const defaults = { ...DEFAULT_KEEP_HISTORY };
    if (!input || typeof input !== 'object') {
      return defaults;
    }
    const result = {};
    Object.keys(defaults).forEach((key) => {
      result[key] = Boolean(input[key]);
    });
    return result;
  }

  function normalizeChangeControl(input) {
    const defaults = { ...DEFAULT_CHANGE_CONTROL_FLAGS };
    if (!input || typeof input !== 'object') {
      return defaults;
    }
    const result = {};
    Object.keys(defaults).forEach((key) => {
      result[key] = key in input ? Boolean(input[key]) : defaults[key];
    });
    return result;
  }

  function cloneDistributionValues(values = {}) {
    const cadence = values.cadence && typeof values.cadence === 'object' ? values.cadence : {};
    const emission = values.emission && typeof values.emission === 'object' ? values.emission : {};
    const preProgrammed = values.preProgrammed && typeof values.preProgrammed === 'object' ? values.preProgrammed : {};

    const cloned = {
      cadence: {
        type: typeof cadence.type === 'string' ? cadence.type : 'BlockBasedDistribution',
        intervalBlocks: typeof cadence.intervalBlocks === 'string' ? cadence.intervalBlocks : '',
        startBlock: typeof cadence.startBlock === 'string' ? cadence.startBlock : '',
        intervalSeconds: typeof cadence.intervalSeconds === 'string' ? cadence.intervalSeconds : '',
        startTimestamp: typeof cadence.startTimestamp === 'string' ? cadence.startTimestamp : '',
        epoch: typeof cadence.epoch === 'string' ? cadence.epoch : ''
      },
      emission: {
        type: typeof emission.type === 'string' ? emission.type : '',
        amount: typeof emission.amount === 'string' ? emission.amount : '',
        min: typeof emission.min === 'string' ? emission.min : '',
        max: typeof emission.max === 'string' ? emission.max : '',
        stepCount: typeof emission.stepCount === 'string' ? emission.stepCount : '',
        decreasePerIntervalNumerator: typeof emission.decreasePerIntervalNumerator === 'string' ? emission.decreasePerIntervalNumerator : '',
        decreasePerIntervalDenominator: typeof emission.decreasePerIntervalDenominator === 'string' ? emission.decreasePerIntervalDenominator : '',
        distributionStartAmount: typeof emission.distributionStartAmount === 'string' ? emission.distributionStartAmount : '',
        trailingDistributionIntervalAmount: typeof emission.trailingDistributionIntervalAmount === 'string' ? emission.trailingDistributionIntervalAmount : '',
        startDecreasingOffset: typeof emission.startDecreasingOffset === 'string' ? emission.startDecreasingOffset : '',
        maxIntervalCount: typeof emission.maxIntervalCount === 'string' ? emission.maxIntervalCount : '',
        minValue: typeof emission.minValue === 'string' ? emission.minValue : ''
      }
    };

    // Include preProgrammed entries if they exist
    if (Array.isArray(preProgrammed.entries)) {
      cloned.preProgrammed = {
        entries: preProgrammed.entries.map(entry => ({
          id: entry.id || '',
          days: typeof entry.days === 'number' ? entry.days : 0,
          hours: typeof entry.hours === 'number' ? entry.hours : 0,
          minutes: typeof entry.minutes === 'number' ? entry.minutes : 0,
          identity: typeof entry.identity === 'string' ? entry.identity : '',
          amount: typeof entry.amount === 'string' ? entry.amount : ''
        }))
      };
    }

    return cloned;
  }

  function parsePositiveInt(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number) || number <= 0) {
      return null;
    }
    return number;
  }

  function parseNonNegativeInt(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number) || number < 0) {
      return null;
    }
    return number;
  }

  function validateDistributionValues(values, { skipEmissionValidation = false, decimals = 0 } = {}) {
    if (!values || typeof values !== 'object') {
      return { valid: false, message: 'Configure distribution settings.' };
    }

    const cadenceType = values.cadence && values.cadence.type;
    const allowedCadence = ['BlockBasedDistribution', 'TimeBasedDistribution', 'EpochBasedDistribution'];
    if (!allowedCadence.includes(cadenceType)) {
      return { valid: false, message: 'Select a release schedule.' };
    }

    if (cadenceType === 'BlockBasedDistribution') {
      if (parsePositiveInt(values.cadence.intervalBlocks) === null) {
        return { valid: false, message: 'Enter blocks per emission.' };
      }
      if (values.cadence.startBlock && parseNonNegativeInt(values.cadence.startBlock) === null) {
        return { valid: false, message: 'Start block must be zero or a positive integer.' };
      }
    }
    if (cadenceType === 'TimeBasedDistribution') {
      if (parsePositiveInt(values.cadence.intervalSeconds) === null) {
        return { valid: false, message: 'Enter seconds per emission.' };
      }
      if (values.cadence.startTimestamp) {
        const timestamp = values.cadence.startTimestamp;
        const isoCandidate = typeof timestamp === 'string' ? timestamp.trim() : '';
        const parsed = Date.parse(isoCandidate);
        if (!isoCandidate || Number.isNaN(parsed)) {
          return { valid: false, message: 'Start timestamp must be ISO-8601 (e.g., 2025-01-01T00:00:00Z).' };
        }
      }
    }
    if (cadenceType === 'EpochBasedDistribution') {
      if (!values.cadence.epoch) {
        return { valid: false, message: 'Provide an epoch identifier.' };
      }
    }

    // FIXED: Skip emission validation if we're only validating cadence (Schedule substep)
    if (skipEmissionValidation) {
      return { valid: true, message: '' };
    }

    const functionType = values.emission && values.emission.type;
    const allowedFunction = ['FixedAmount', 'Random', 'StepDecreasingAmount', 'Stepwise', 'Linear', 'Exponential', 'Polynomial', 'Logarithmic', 'InvertedLogarithmic'];

    // FIXED: Emission is optional - if no emission type is set, that's valid (user can skip)
    if (!functionType || functionType === '') {
      return { valid: true, message: '' };
    }

    // If emission type is set, it must be valid
    if (!allowedFunction.includes(functionType)) {
      return { valid: false, message: 'Select a valid emission function.' };
    }

    if (functionType === 'FixedAmount') {
      if (normalizeTokenAmount(values.emission.amount, decimals) === null) {
        return { valid: false, message: 'Enter an emission amount.' };
      }
    }

    if (functionType === 'Random') {
      const min = normalizeTokenAmount(values.emission.min, decimals);
      const max = normalizeTokenAmount(values.emission.max, decimals);
      if (min === null || max === null) {
        return { valid: false, message: 'Enter minimum and maximum emission amounts.' };
      }
      try {
        if (BigInt(min) > BigInt(max)) {
          return { valid: false, message: 'Random min must be less than or equal to max.' };
        }
      } catch (error) {
        return { valid: false, message: 'Random bounds must be numeric.' };
      }
    }

    if (functionType === 'StepDecreasingAmount') {
      if (parsePositiveInt(values.emission.stepCount) === null) {
        return { valid: false, message: 'Enter a step count greater than zero.' };
      }
      if (parseNonNegativeInt(values.emission.decreasePerIntervalNumerator) === null) {
        return { valid: false, message: 'Enter a decrease numerator.' };
      }
      if (parsePositiveInt(values.emission.decreasePerIntervalDenominator) === null) {
        return { valid: false, message: 'Enter a decrease denominator greater than zero.' };
      }
      if (normalizeTokenAmount(values.emission.distributionStartAmount, decimals) === null) {
        return { valid: false, message: 'Enter a starting distribution amount.' };
      }
      if (normalizeTokenAmount(values.emission.trailingDistributionIntervalAmount, decimals) === null) {
        return { valid: false, message: 'Enter a trailing interval amount.' };
      }
      if (values.emission.startDecreasingOffset && parseNonNegativeInt(values.emission.startDecreasingOffset) === null) {
        return { valid: false, message: 'Start offset must be zero or a positive integer.' };
      }
      if (values.emission.maxIntervalCount && parsePositiveInt(values.emission.maxIntervalCount) === null) {
        return { valid: false, message: 'Max intervals must be greater than zero.' };
      }
      if (values.emission.minValue && parseNonNegativeInt(values.emission.minValue) === null) {
        return { valid: false, message: 'Minimum value must be zero or positive.' };
      }
    }

    if (functionType === 'Stepwise') {
      if (!values.emission.stepwise || !Array.isArray(values.emission.stepwise) || values.emission.stepwise.length === 0) {
        return { valid: false, message: 'Add at least one stepwise entry.' };
      }
      for (const entry of values.emission.stepwise) {
        if (parseNonNegativeInt(entry.interval) === null) {
          return { valid: false, message: 'All stepwise intervals must be non-negative integers.' };
        }
        if (normalizeTokenAmount(entry.amount, decimals) === null) {
          return { valid: false, message: 'All stepwise amounts must be valid token amounts.' };
        }
      }
    }

    if (functionType === 'Linear') {
      if (normalizeTokenAmount(values.emission.linearStart, decimals) === null) {
        return { valid: false, message: 'Enter a starting amount for linear emission.' };
      }
      if (!values.emission.linearChange || values.emission.linearChange.trim() === '') {
        return { valid: false, message: 'Enter a change per period for linear emission.' };
      }
    }

    if (functionType === 'Exponential') {
      if (normalizeTokenAmount(values.emission.exponentialInitial, decimals) === null) {
        return { valid: false, message: 'Enter an initial amount for exponential emission.' };
      }
      if (!values.emission.exponentialRate || isNaN(parseFloat(values.emission.exponentialRate))) {
        return { valid: false, message: 'Enter a valid rate for exponential emission.' };
      }
    }

    if (functionType === 'Polynomial') {
      if (!values.emission.polyA || isNaN(parseInt(values.emission.polyA))) {
        return { valid: false, message: 'Enter coefficient a for polynomial.' };
      }
      if (parsePositiveInt(values.emission.polyD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.polyM || isNaN(parseInt(values.emission.polyM))) {
        return { valid: false, message: 'Enter exponent m for polynomial.' };
      }
      if (!values.emission.polyN || isNaN(parseInt(values.emission.polyN))) {
        return { valid: false, message: 'Enter coefficient n for polynomial.' };
      }
      if (!values.emission.polyO || isNaN(parseInt(values.emission.polyO))) {
        return { valid: false, message: 'Enter divisor o for polynomial.' };
      }
      if (normalizeTokenAmount(values.emission.polyB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for polynomial.' };
      }
    }

    if (functionType === 'Logarithmic') {
      if (!values.emission.logA || isNaN(parseInt(values.emission.logA))) {
        return { valid: false, message: 'Enter coefficient a for logarithmic.' };
      }
      if (parsePositiveInt(values.emission.logD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.logM || isNaN(parseInt(values.emission.logM))) {
        return { valid: false, message: 'Enter multiplier m for logarithmic.' };
      }
      if (!values.emission.logN || isNaN(parseInt(values.emission.logN))) {
        return { valid: false, message: 'Enter coefficient n for logarithmic.' };
      }
      if (!values.emission.logO || isNaN(parseInt(values.emission.logO))) {
        return { valid: false, message: 'Enter divisor o for logarithmic.' };
      }
      if (normalizeTokenAmount(values.emission.logB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for logarithmic.' };
      }
    }

    if (functionType === 'InvertedLogarithmic') {
      if (!values.emission.invlogA || isNaN(parseInt(values.emission.invlogA))) {
        return { valid: false, message: 'Enter coefficient a for inverted logarithmic.' };
      }
      if (parsePositiveInt(values.emission.invlogD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.invlogM || isNaN(parseInt(values.emission.invlogM))) {
        return { valid: false, message: 'Enter multiplier m for inverted logarithmic.' };
      }
      if (!values.emission.invlogN || isNaN(parseInt(values.emission.invlogN))) {
        return { valid: false, message: 'Enter coefficient n for inverted logarithmic.' };
      }
      if (!values.emission.invlogO || isNaN(parseInt(values.emission.invlogO))) {
        return { valid: false, message: 'Enter divisor o for inverted logarithmic.' };
      }
      if (normalizeTokenAmount(values.emission.invlogB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for inverted logarithmic.' };
      }
    }

    // Validate recipient if specified
    if (values.recipient) {
      if ((values.recipient.type === 'identity' || values.recipient.type === 'specific-identity') && !values.recipient.identityId) {
        return { valid: false, message: 'Enter a recipient identity ID.' };
      }
    }

    return { valid: true, message: '' };
  }

  function buildDistributionRulesForConfiguration() {
    const distribution = wizardState.form.distribution;
    if (!distribution) {
      return null;
    }
    const decimals = typeof wizardState.form.permissions?.decimals === 'number' ? wizardState.form.permissions.decimals : 0;
    const cadence = buildCadencePayload(distribution.cadence);
    const emission = buildEmissionPayload(distribution.emission, decimals);
    if (!cadence || !emission) {
      return null;
    }

    // Determine recipient based on form state
    let recipientPayload = { type: 'ContractOwner' };
    if (distribution.recipient) {
      if (distribution.recipient.type === 'evonodes-by-participation') {
        recipientPayload = { type: 'EvonodesByParticipation' };
      } else if ((distribution.recipient.type === 'identity' || distribution.recipient.type === 'specific-identity') && distribution.recipient.identityId) {
        recipientPayload = { type: 'Identity', id: distribution.recipient.identityId };
      }
    }

    return {
      perpetual: [
        {
          id: 'primary',
          recipient: recipientPayload,
          cadence,
          emission
        }
      ],
      preProgrammed: []
    };
  }

  function buildCadencePayload(cadence) {
    if (!cadence || typeof cadence !== 'object') {
      return null;
    }
    switch (cadence.type) {
      case 'BlockBasedDistribution': {
        const intervalBlocks = parsePositiveInt(cadence.intervalBlocks);
        if (intervalBlocks === null) {
          return null;
        }
        const payload = { type: 'BlockBasedDistribution', intervalBlocks };
        const startBlock = parseNonNegativeInt(cadence.startBlock);
        if (startBlock !== null) {
          payload.startBlock = startBlock;
        }
        return payload;
      }
      case 'TimeBasedDistribution': {
        const intervalSeconds = parsePositiveInt(cadence.intervalSeconds);
        if (intervalSeconds === null) {
          return null;
        }
        const payload = { type: 'TimeBasedDistribution', intervalSeconds };
        if (cadence.startTimestamp) {
          payload.startTimestamp = cadence.startTimestamp;
        }
        return payload;
      }
      case 'EpochBasedDistribution':
        if (!cadence.epoch) {
          return null;
        }
        return { type: 'EpochBasedDistribution', epoch: cadence.epoch };
      default:
        return null;
    }
  }

  function buildEmissionPayload(emission, decimals = 0) {
    if (!emission || typeof emission !== 'object') {
      return null;
    }
    switch (emission.type) {
      case 'FixedAmount': {
        const amount = normalizeTokenAmount(emission.amount, decimals);
        if (amount === null) {
          return null;
        }
        return { type: 'FixedAmount', amount };
      }
      case 'Random': {
        const min = normalizeTokenAmount(emission.min, decimals);
        const max = normalizeTokenAmount(emission.max, decimals);
        if (min === null || max === null) {
          return null;
        }
        try {
          if (BigInt(min) > BigInt(max)) {
            return null;
          }
        } catch (error) {
          return null;
        }
        return { type: 'Random', min, max };
      }
      case 'StepDecreasingAmount': {
        const stepCount = parsePositiveInt(emission.stepCount);
        const numerator = parseNonNegativeInt(emission.decreasePerIntervalNumerator);
        const denominator = parsePositiveInt(emission.decreasePerIntervalDenominator);
        const distributionStartAmount = normalizeTokenAmount(emission.distributionStartAmount, decimals);
        const trailingAmount = normalizeTokenAmount(emission.trailingDistributionIntervalAmount, decimals);
        if (stepCount === null || numerator === null || denominator === null || distributionStartAmount === null || trailingAmount === null) {
          return null;
        }
        const payload = {
          type: 'StepDecreasingAmount',
          stepCount,
          decreasePerIntervalNumerator: numerator,
          decreasePerIntervalDenominator: denominator,
          distributionStartAmount,
          trailingDistributionIntervalAmount: trailingAmount
        };
        const offset = parseNonNegativeInt(emission.startDecreasingOffset);
        if (offset !== null) {
          payload.startDecreasingOffset = offset;
        }
        const maxIntervalCount = parsePositiveInt(emission.maxIntervalCount);
        if (maxIntervalCount !== null) {
          payload.maxIntervalCount = maxIntervalCount;
        }
        const minValue = parseNonNegativeInt(emission.minValue);
        if (minValue !== null) {
          payload.minValue = minValue;
        }
        return payload;
      }
      default:
        return null;
    }
  }

  function cloneLocalizationsRecord(source) {
    if (!source || typeof source !== 'object') {
      return {};
    }
    const sorted = {};
    Object.keys(source)
      .sort()
      .slice(0, 1)
      .forEach((code) => {
        const value = source[code];
        if (!value || typeof value !== 'object') {
          return;
        }
        const singular = typeof value.singular_form === 'string'
          ? value.singular_form
          : typeof value.singular === 'string'
            ? value.singular
            : '';
        const plural = typeof value.plural_form === 'string'
          ? value.plural_form
          : typeof value.plural === 'string'
            ? value.plural
            : '';
        sorted[code] = {
          should_capitalize: Boolean(value.should_capitalize ?? value.shouldCapitalize),
          singular_form: singular,
          plural_form: plural
        };
      });
    return sorted;
  }

  function deriveTokenDisplayName(name) {
    const trimmed = (name || '').trim();
    return trimmed || 'Token';
  }

  function deriveTokenSymbol(name) {
    const upper = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upper.length >= 3) {
      return upper.slice(0, 6);
    }
    if (upper.length > 0) {
      return (upper + 'XXX').slice(0, 3);
    }
    return 'TKN';
  }

  function buildMarketplaceRules(tradeMode) {
    if (tradeMode && tradeMode !== 'closed') {
      debug.warn('Only NotTradeable tokens are supported; forcing trade mode to closed.');
    }
    return {
      tradeMode: 'closed',
      allowSecondaryMarkets: false,
      allowAtomicSwaps: false
    };
  }

  // Dead code removed - buildAdvancedConfiguration and related functions
  // were using incorrect {kind: 'NoOne'} enum format and were never called.
  // The correct implementation is in generatePlatformContractJSON() below.

  function refreshFlow({ initial = false, suppressFocus = false } = {}) {
    const previousId = currentScreenId;
    activeScreens = computeActiveScreens();

    if (!activeScreens.some((definition) => definition.id === previousId)) {
      currentScreenId = activeScreens.length ? activeScreens[0].id : previousId;
    }

    currentScreenId = resolveStepTargetId(currentScreenId);
    showScreen(currentScreenId, { suppressFocus: initial || suppressFocus });
  }

  // ADDED: Helper function to get the parent step of a substep
  function getParentStep(substepId) {
    // Check if it's already a main step
    if (STEP_SEQUENCE.includes(substepId)) {
      return substepId;
    }
    // Look for it in the substep sequences
    for (const [parentStep, substeps] of Object.entries(SUBSTEP_SEQUENCES)) {
      if (substeps.includes(substepId)) {
        return parentStep;
      }
    }
    return null;
  }

  // Get the next substep in the wizard flow
  function getNextSubstep(currentSubstep) {
    const parentStep = getParentStep(currentSubstep);

    if (!parentStep) {
      // Try to find a valid step to navigate to
      const indexInMain = STEP_SEQUENCE.indexOf(currentSubstep);
      if (indexInMain !== -1 && indexInMain < STEP_SEQUENCE.length - 1) {
        const nextMain = STEP_SEQUENCE[indexInMain + 1];
        return SUBSTEP_SEQUENCES[nextMain]?.[0] || nextMain;
      }
      // Fallback to first valid step
      const firstStep = STEP_SEQUENCE[0];
      return SUBSTEP_SEQUENCES[firstStep]?.[0] || firstStep;
    }

    const substeps = SUBSTEP_SEQUENCES[parentStep];
    if (!substeps) {
      return null;
    }

    const currentIndex = substeps.indexOf(currentSubstep);
    if (currentIndex === -1) {
      return null;
    }

    // Check if there's a next substep in the same parent
    if (currentIndex < substeps.length - 1) {
      return substeps[currentIndex + 1];
    }

    // No more substeps, go to next main step
    const mainStepIndex = STEP_SEQUENCE.indexOf(parentStep);
    if (mainStepIndex === -1 || mainStepIndex >= STEP_SEQUENCE.length - 1) {
      return null;
    }

    const nextMainStep = STEP_SEQUENCE[mainStepIndex + 1];
    const nextSubsteps = SUBSTEP_SEQUENCES[nextMainStep];
    return nextSubsteps && nextSubsteps.length > 0 ? nextSubsteps[0] : nextMainStep;
  }

  function goToNextScreen(fromId) {
    const wasManualNavigation = manualNavigationActive;
    manualNavigationActive = false;

    // FIXED: Use substep navigation instead of main step navigation
    const nextSubstep = getNextSubstep(fromId);
    if (!nextSubstep) {
      return;
    }

    // Validate the parent step before advancing
    const parentStep = getParentStep(fromId);
    const step = wizardState.steps[parentStep];
    if (!step || step.validity !== 'valid') {
      return;
    }

    showScreen(nextSubstep, { isManualNavigation: wasManualNavigation });
  }

  // ADDED: Get the previous substep or previous main step
  function getPreviousSubstep(currentSubstep) {
    const parentStep = getParentStep(currentSubstep);
    if (!parentStep) {
      return null;
    }

    const substeps = SUBSTEP_SEQUENCES[parentStep];
    if (!substeps) {
      return null;
    }

    const currentIndex = substeps.indexOf(currentSubstep);
    if (currentIndex === -1) {
      return null;
    }

    // Check if there's a previous substep in the same parent
    if (currentIndex > 0) {
      return substeps[currentIndex - 1];
    }

    // No more substeps, go to previous main step
    const mainStepIndex = STEP_SEQUENCE.indexOf(parentStep);
    if (mainStepIndex <= 0) {
      return null;
    }

    const prevMainStep = STEP_SEQUENCE[mainStepIndex - 1];
    const prevSubsteps = SUBSTEP_SEQUENCES[prevMainStep];
    // Go to the last substep of the previous main step
    return prevSubsteps && prevSubsteps.length > 0 ? prevSubsteps[prevSubsteps.length - 1] : prevMainStep;
  }

  function goToPreviousScreen(fromId) {
    manualNavigationActive = false;

    // FIXED: Use substep navigation for Back button
    const prevSubstep = getPreviousSubstep(fromId);
    if (!prevSubstep) {
      return;
    }

    showScreen(prevSubstep);
  }

  function resolveStepTargetId(desiredStepId) {
    const defaultStep = STEP_SEQUENCE[0];
    const isInfoStep = INFO_STEPS.includes(desiredStepId);
    const isPrimaryStep = STEP_SEQUENCE.includes(desiredStepId);

    // FIXED: Check if desiredStepId is a valid substep
    const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps =>
      substeps.includes(desiredStepId)
    );

    // FIXED: Allow substeps to pass through without modification
    if (isValidSubstep) {
      // Still validate that parent step is accessible
      const parentStep = getParentStep(desiredStepId);
      if (parentStep) {
        const parentIndex = getStepIndex(parentStep);
        const maxAccessibleIndex = Math.min(
          STEP_SEQUENCE.length - 1,
          Math.max(-1, wizardState.furthestValidIndex) + 1
        );

        // Allow access to substeps if parent step is accessible
        if (parentIndex <= maxAccessibleIndex) {
          return desiredStepId;
        }
      }
    }

    if (manualNavigationActive && (isPrimaryStep || isInfoStep)) {
      return desiredStepId;
    }

    let stepId = isPrimaryStep ? desiredStepId : getPrimaryStepId(desiredStepId);
    if (!STEP_SEQUENCE.includes(stepId)) {
      stepId = defaultStep;
    }

    const firstInvalid = getFirstInvalidStepId();
    const desiredIndex = getStepIndex(stepId);
    const maxAccessibleIndex = Math.min(
      STEP_SEQUENCE.length - 1,
      Math.max(-1, wizardState.furthestValidIndex) + 1
    );

    if (firstInvalid) {
      const firstInvalidIndex = getStepIndex(firstInvalid);
      if (desiredIndex > firstInvalidIndex) {
        stepId = firstInvalid;
      }
    }

    let resolvedIndex = getStepIndex(stepId);
    if (resolvedIndex === -1) {
      resolvedIndex = 0;
    }

    if (resolvedIndex > maxAccessibleIndex) {
      resolvedIndex = maxAccessibleIndex;
    }

    const resolvedStepId = STEP_SEQUENCE[resolvedIndex] || defaultStep;

    // FIXED: Return first substep if the resolved step has substeps
    if (SUBSTEP_SEQUENCES[resolvedStepId] && SUBSTEP_SEQUENCES[resolvedStepId].length > 0) {
      return SUBSTEP_SEQUENCES[resolvedStepId][0];
    }

    return resolvedStepId;
  }

  function getFirstInvalidStepId() {
    for (let index = 0; index < STEP_SEQUENCE.length; index += 1) {
      const id = STEP_SEQUENCE[index];
      const step = wizardState.steps[id];
      if (!step || step.validity !== 'valid') {
        return id;
      }
    }
    return null;
  }

  function updateFurthestValidIndex() {
    wizardState.furthestValidIndex = computeFurthestValidIndexFromSteps(wizardState.steps);
  }

  function announce(message) {
    if (!message) return;
    globalLiveRegion.textContent = '';
    requestAnimationFrame(() => {
      globalLiveRegion.textContent = message;
    });
  }

  function createTokenNamePattern() {
    try {
      return new RegExp('^[\\p{L}\\p{N}_\\-\\s\\p{Extended_Pictographic}]+$', 'u');
    } catch (error) {
      debug.warn('Unicode property escapes not supported, falling back to basic pattern');
      return /^[A-Za-z0-9_\-\s]+$/;
    }
  }

  function slugifyTokenName(name) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-]+/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    if (slug) {
      return slug;
    }

    const fallback = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]+/g, '');

    return fallback || `token-${Date.now()}`;
  }

  function registrationStubFor(method) {
    switch (method) {
      case 'det':
        return { channel: 'json', tooling: 'det', status: 'export-ready' };
      case 'self':
        return { channel: 'library', caution: 'not_recommended', status: 'manual' };
      default:
        return { channel: 'json', tooling: 'det', status: 'export-ready' };
    }
  }

  function getRegistrationPayload() {
    const rawName = wizardState.form.tokenName || '';
    const tokenName = rawName.trim() || 'Unnamed Token';
    const registrationMethod = wizardState.form.registration.method || 'det';

    // Build complete token configuration
    const payload = {
      tokenName,
      tokenId: slugifyTokenName(tokenName),
      conventions: {
        name: tokenName,
        symbol: tokenName.substring(0, 5).toUpperCase(),
        decimals: wizardState.form.permissions.decimals || 2,
        localizations: wizardState.form.naming.conventions.localizations || {}
      },
      supply_rules: {
        base_supply: wizardState.form.permissions.baseSupply || '0',
        max_supply: wizardState.form.permissions.useMaxSupply ? wizardState.form.permissions.maxSupply : null
      },
      permissions: {
        keepsHistory: wizardState.form.permissions.keepsHistory || {},
        startAsPaused: wizardState.form.permissions.startAsPaused || false,
        allowTransferToFrozenBalance: wizardState.form.permissions.allowTransferToFrozenBalance || false
      },
      registration: {
        method: registrationMethod,
        details: registrationStubFor(registrationMethod)
      }
    };

    // Add distribution rules if configured
    if (wizardState.form.distribution) {
      const dist = wizardState.form.distribution;
      if (dist.cadence && dist.cadence.type) {
        payload.distribution_rules = {
          cadence: {
            type: dist.cadence.type,
            interval_blocks: dist.cadence.intervalBlocks || undefined,
            interval_seconds: dist.cadence.intervalSeconds || undefined,
            epoch: dist.cadence.epoch || undefined,
            start_block: dist.cadence.startBlock || undefined,
            start_timestamp: dist.cadence.startTimestamp || undefined
          }
        };

        // Add emission if configured
        if (dist.emission && dist.emission.type) {
          payload.distribution_rules.emission = {
            type: dist.emission.type
          };
          // Add emission-specific fields based on type
          if (dist.emission.type === 'FixedAmount' && dist.emission.amount) {
            payload.distribution_rules.emission.amount = dist.emission.amount;
          } else if (dist.emission.type === 'Random') {
            payload.distribution_rules.emission.min = dist.emission.min;
            payload.distribution_rules.emission.max = dist.emission.max;
          }
          // Add other emission types as needed
        }
      }
    }

    // Add advanced settings
    if (wizardState.form.advanced) {
      payload.marketplace = {
        trade_mode: 'closed'
      };
      payload.change_control = wizardState.form.advanced.changeControl || {};
    }

    // Add document types if any
    if (wizardState.form.documentTypes && Object.keys(wizardState.form.documentTypes).length > 0) {
      payload.document_types = wizardState.form.documentTypes;
    }

    // Add group configuration if enabled
    if (wizardState.form.group && wizardState.form.group.enabled) {
      payload.group = {
        name: wizardState.form.group.name,
        threshold: wizardState.form.group.threshold,
        members: wizardState.form.group.members
          .filter(m => m.identityId)
          .map(m => ({
            identity: m.identityId,
            power: parseInt(m.power, 10) || 1
          })),
        permissions: wizardState.form.group.permissions
      };
    }

    if (registrationMethod !== 'det') {
      payload.registration.requestedAt = new Date().toISOString();
    }

    return payload;
  }

  /**
   * Generate Platform-compatible data contract JSON
   * This function transforms wizard state into the exact format expected by Dash Platform
   */
  function generatePlatformContractJSON() {
    const rawName = wizardState.form.tokenName || '';
    const tokenName = rawName.trim() || 'Unnamed Token';

    // Helper: Encode AuthorizedActionTakers value into expected JSON shape
    // Rust enum serialization: unit variants (NoOne, ContractOwner, MainGroup) serialize as STRINGS
    // Tuple variants (Identity, Group) serialize as { "VariantName": data }
    // Accepts: 'NoOne' | 'ContractOwner' | 'MainGroup' | number (group index) | identity string
    function encodeAuthorizedActionTaker(actor) {
      // Already in correct tuple variant format (Group or Identity with data)
      if (typeof actor === 'object' && actor !== null) {
        if (actor.Group !== undefined || actor.Identity !== undefined) {
          return actor;
        }
        // Convert object format to string for unit variants
        if (actor.NoOne !== undefined) return 'NoOne';
        if (actor.ContractOwner !== undefined) return 'ContractOwner';
        if (actor.MainGroup !== undefined) return 'MainGroup';
      }

      // Unit variants - serialize as STRINGS (not objects!)
      if (!actor && actor !== 0) return 'NoOne';
      if (actor === 'NoOne') return 'NoOne';
      if (actor === 'ContractOwner') return 'ContractOwner';
      if (actor === 'MainGroup') return 'MainGroup';

      // Group index - serialize as { "Group": index }
      if (typeof actor === 'number' && Number.isFinite(actor)) {
        return { Group: actor };
      }

      // Identity id string - serialize as { "Identity": identifier }
      if (typeof actor === 'string' && actor.length > 0) {
        return { Identity: actor };
      }

      return 'NoOne';
    }

    // Helper: Convert change control boolean to ChangeControlRules object
    // Uses externally tagged V0 wrapper with snake_case fields (per Rust serde defaults)
    function createRuleV0(isEnabled, actionTaker = 'ContractOwner', governanceFlags = {}) {
      // Default governance flags to false if not provided
      const changingAuthorizedToNoOneAllowed = governanceFlags.allowChangeAuthorizedToNone !== undefined
        ? Boolean(governanceFlags.allowChangeAuthorizedToNone)
        : false;
      const changingAdminToNoOneAllowed = governanceFlags.allowChangeAdminToNone !== undefined
        ? Boolean(governanceFlags.allowChangeAdminToNone)
        : false;
      const selfChangingAdminAllowed = governanceFlags.allowSelfChangeAdmin !== undefined
        ? Boolean(governanceFlags.allowSelfChangeAdmin)
        : false;

      return {
        V0: {
          authorized_to_make_change: encodeAuthorizedActionTaker(isEnabled ? actionTaker : 'NoOne'),
          admin_action_takers: encodeAuthorizedActionTaker(isEnabled ? actionTaker : 'NoOne'),
          changing_authorized_action_takers_to_no_one_allowed: changingAuthorizedToNoOneAllowed,
          changing_admin_action_takers_to_no_one_allowed: changingAdminToNoOneAllowed,
          self_changing_admin_action_takers_allowed: selfChangingAdminAllowed
        }
      };
    }

    // Helper: Convert permission change state to V0 rule with proper authorization
    function createPermissionChangeRule(changeState) {
      if (!changeState || !changeState.enabled) {
        return createRuleV0(false);
      }

      // Determine action taker from perform authorization
      let authorizedToMakeChange = 'NoOne';
      if (changeState.perform) {
        if (changeState.perform.type === 'owner') {
          authorizedToMakeChange = 'ContractOwner';
        } else if (changeState.perform.type === 'identity' && changeState.perform.identityId) {
          authorizedToMakeChange = { Identity: changeState.perform.identityId };
        } else if (changeState.perform.type === 'group' && changeState.perform.groupId) {
          // Group ID should be a number (group index)
          authorizedToMakeChange = { Group: (parseInt(changeState.perform.groupId, 10) || 0) };
        } else if (changeState.perform.type === 'main-group') {
          authorizedToMakeChange = 'MainGroup';
        }
      }

      // Determine admin action takers from changeRules authorization
      let adminActionTakers = 'NoOne';
      if (changeState.changeRules) {
        if (changeState.changeRules.type === 'owner') {
          adminActionTakers = 'ContractOwner';
        } else if (changeState.changeRules.type === 'identity' && changeState.changeRules.identityId) {
          adminActionTakers = { Identity: changeState.changeRules.identityId };
        } else if (changeState.changeRules.type === 'group' && changeState.changeRules.groupId) {
          adminActionTakers = { Group: (parseInt(changeState.changeRules.groupId, 10) || 0) };
        } else if (changeState.changeRules.type === 'main-group') {
          adminActionTakers = 'MainGroup';
        }
      }

      // Get governance flags from state (default to false if not present)
      const changingAuthorizedToNoOneAllowed = changeState.allowChangeAuthorizedToNone !== undefined
        ? Boolean(changeState.allowChangeAuthorizedToNone)
        : false;
      const changingAdminToNoOneAllowed = changeState.allowChangeAdminToNone !== undefined
        ? Boolean(changeState.allowChangeAdminToNone)
        : false;
      const selfChangingAdminAllowed = changeState.allowSelfChangeAdmin !== undefined
        ? Boolean(changeState.allowSelfChangeAdmin)
        : false;

      return {
        V0: {
          authorized_to_make_change: encodeAuthorizedActionTaker(authorizedToMakeChange),
          admin_action_takers: encodeAuthorizedActionTaker(adminActionTakers),
          changing_authorized_action_takers_to_no_one_allowed: changingAuthorizedToNoOneAllowed,
          changing_admin_action_takers_to_no_one_allowed: changingAdminToNoOneAllowed,
          self_changing_admin_action_takers_allowed: selfChangingAdminAllowed
        }
      };
    }

    // Helper: Convert new format state (performerType/ruleChangerType) to ChangeControlRules
    function createPermissionChangeRuleFromNewFormat(state) {
      if (!state) {
        return createRuleV0(false);
      }

      const authorizedToMakeChange = getActorFromPerformer(state.performerType, state.performerReference);
      const adminActionTakers = getActorFromPerformer(state.ruleChangerType, state.ruleChangerReference);

      return {
        V0: {
          authorized_to_make_change: encodeAuthorizedActionTaker(authorizedToMakeChange),
          admin_action_takers: encodeAuthorizedActionTaker(adminActionTakers),
          changing_authorized_action_takers_to_no_one_allowed: Boolean(state.allowChangeAuthorizedToNone),
          changing_admin_action_takers_to_no_one_allowed: Boolean(state.allowChangeAdminToNone),
          self_changing_admin_action_takers_allowed: Boolean(state.allowSelfChangeAdmin)
        }
      };
    }

    // Helper: Convert authorization state to actor
    function getActorFromAuthorization(authState) {
      if (!authState || !authState.type) {
        return 'NoOne';
      }

      if (authState.type === 'owner') {
        return 'ContractOwner';
      } else if (authState.type === 'identity' && authState.identityId) {
        return { Identity: authState.identityId };
      } else if (authState.type === 'group' && (authState.groupId !== undefined && authState.groupId !== null)) {
        const gid = typeof authState.groupId === 'number' ? authState.groupId : (parseInt(authState.groupId, 10) || 0);
        return { Group: gid };
      } else if (authState.type === 'main-group') {
        return 'MainGroup';
      }

      return 'NoOne';
    }

    function getActorFromPerformer(performerType, performerReference) {
      if (!performerType || performerType === 'none') {
        return 'NoOne';
      }

      if (performerType === 'owner') {
        return 'ContractOwner';
      } else if (performerType === 'identity' && performerReference) {
        return { Identity: performerReference };
      } else if (performerType === 'group' && performerReference) {
        return { Group: (parseInt(performerReference, 10) || 0) };
      } else if (performerType === 'main-group') {
        return 'MainGroup';
      }

      return 'NoOne';
    }

    // Helper: Convert keepsHistory to Platform format
    function transformKeepsHistory(keepsHistory) {
      return {
        $format_version: '0',
        keepsTransferHistory: Boolean(keepsHistory.transfers),
        keepsMintingHistory: Boolean(keepsHistory.mints),
        keepsBurningHistory: Boolean(keepsHistory.burns),
        keepsFreezingHistory: Boolean(keepsHistory.freezes),
        keepsDirectPricingHistory: Boolean(keepsHistory.directPricing),
        keepsDirectPurchaseHistory: Boolean(keepsHistory.purchases)
      };
    }

    // Helper: Transform localizations to Platform format (camelCase)
    function transformLocalizations(localizations) {
      const result = {};
      for (const [langCode, loc] of Object.entries(localizations)) {
        result[langCode] = {
          $format_version: '0',
          shouldCapitalize: Boolean(loc.should_capitalize ?? loc.shouldCapitalize),
          singularForm: String(loc.singular_form || loc.singularForm || loc.singular || ''),
          pluralForm: String(loc.plural_form || loc.pluralForm || loc.plural || '')
        };
      }
      return result;
    }

    // Helper: Transform distribution rules
    function transformDistributionRules() {
      const dist = wizardState.form.distribution;
      if (!dist) return null;

      // Get minting destination configuration
      const manualMint = wizardState.form.permissions?.manualMint;
      const mintDestinationType = manualMint?.destinationType || 'contract-owner';
      const mintDestinationIdentity = manualMint?.destinationIdentity || '';
      const allowCustomDestination = Boolean(manualMint?.allowCustomDestination);

      // Get distribution rule configurations
      const perpetualSafeguards = wizardState.form.distribution?.safeguards || {};
      const preProgrammedRules = wizardState.form.distribution?.preProgrammedRules || {};
      const mintDestinationRules = wizardState.form.distribution?.mintDestinationRules || {};
      const allowChoosingRules = wizardState.form.distribution?.allowChoosingRules || {};

      // Map dropdown values to expected format, with optional identity/group ID
      const mapActorValueWithId = (value, identityId, groupId) => {
        switch (value) {
          case 'no-one': return 'NoOne';
          case 'owner': return 'ContractOwner';
          case 'main-group': return 'MainGroup';
          case 'identity': return identityId ? identityId : 'NoOne';
          case 'group': return groupId ? parseInt(groupId, 10) : 'NoOne';
          default: return 'ContractOwner';
        }
      };

      // Simple map without identity/group (for backwards compatibility)
      const mapActorValue = (value) => mapActorValueWithId(value, null, null);

      // Helper to build rule V0 structure from rule config
      const buildRuleV0 = (ruleConfig) => {
        const performActor = mapActorValueWithId(
          ruleConfig.performAction || 'no-one',
          ruleConfig.performIdentityId,
          ruleConfig.performGroupId
        );
        const changeRulesActor = mapActorValueWithId(
          ruleConfig.changeRules || 'no-one',
          ruleConfig.changeRulesIdentityId,
          ruleConfig.changeRulesGroupId
        );

        return {
          V0: {
            authorized_to_make_change: encodeAuthorizedActionTaker(performActor),
            admin_action_takers: encodeAuthorizedActionTaker(changeRulesActor),
            changing_authorized_action_takers_to_no_one_allowed: Boolean(ruleConfig.allowChangeAuthorizedToNone),
            changing_admin_action_takers_to_no_one_allowed: Boolean(ruleConfig.allowChangeAdminToNone),
            self_changing_admin_action_takers_allowed: Boolean(ruleConfig.allowSelfChangeAdmin)
          }
        };
      };

      const performActor = mapActorValue(perpetualSafeguards.performAction || 'no-one');
      const changeRulesActor = mapActorValue(perpetualSafeguards.changeRules || 'no-one');

      const distributionRules = {
        $format_version: '0',
        perpetualDistribution: null,
        perpetualDistributionRules: {
          V0: {
            authorized_to_make_change: encodeAuthorizedActionTaker(performActor),
            admin_action_takers: encodeAuthorizedActionTaker(changeRulesActor),
            changing_authorized_action_takers_to_no_one_allowed: Boolean(perpetualSafeguards.allowChangeAuthorizedToNone),
            changing_admin_action_takers_to_no_one_allowed: Boolean(perpetualSafeguards.allowChangeAdminToNone),
            self_changing_admin_action_takers_allowed: Boolean(perpetualSafeguards.allowSelfChangeAdmin)
          }
        },
        preProgrammedDistribution: null,
        preProgrammedDistributionRules: buildRuleV0(preProgrammedRules),
        newTokensDestinationIdentity: mintDestinationType === 'default-identity' && mintDestinationIdentity ? mintDestinationIdentity : null,
        newTokensDestinationIdentityRules: buildRuleV0(mintDestinationRules),
        mintingAllowChoosingDestination: allowCustomDestination,
        mintingAllowChoosingDestinationRules: buildRuleV0(allowChoosingRules),
        changeDirectPurchasePricingRules: createPermissionChangeRuleFromNewFormat(wizardState.form.advanced.directPricing)
      };

      const hasEmission = Boolean(dist.emission && dist.emission.type);
      const hasPreProgrammed = Boolean(dist.preProgrammed && Array.isArray(dist.preProgrammed.entries) && dist.preProgrammed.entries.length > 0);

      if (!hasEmission && !hasPreProgrammed) {
        return null;
      }

      // Build perpetual distribution if emission is configured
      if (hasEmission) {
        let distributionType = {};
        const cadence = dist.cadence;

        // Determine distribution type (Block, Time, or Epoch based)
        if (cadence.type === 'BlockBasedDistribution') {
          const interval = parseInt(cadence.intervalBlocks, 10) || 100;
          distributionType.BlockBasedDistribution = {
            interval: interval,
            function: buildEmissionFunction(dist.emission)
          };
        } else if (cadence.type === 'TimeBasedDistribution') {
          // Platform expects milliseconds (TimestampMillisInterval)
          const interval = (parseInt(cadence.intervalSeconds, 10) || 3600) * 1000;
          distributionType.TimeBasedDistribution = {
            interval: interval,
            function: buildEmissionFunction(dist.emission)
          };
        } else if (cadence.type === 'EpochBasedDistribution') {
          // Expect numeric epoch interval; coerce strings (e.g., 'quarterly') to default 1
          const interval = Number.isFinite(parseInt(cadence.epoch, 10)) ? parseInt(cadence.epoch, 10) : 1;
          distributionType.EpochBasedDistribution = {
            interval,
            function: buildEmissionFunction(dist.emission)
          };
        }

        // Determine recipient
        let recipient;
        if (dist.recipient?.type === 'evonodes-by-participation') {
          recipient = 'EvonodesByParticipation';
        } else if ((dist.recipient?.type === 'identity' || dist.recipient?.type === 'specific-identity') && dist.recipient.identityId) {
          recipient = { Identity: dist.recipient.identityId };
        } else {
          recipient = 'ContractOwner';
        }

        distributionRules.perpetualDistribution = {
          $format_version: '0',
          distributionType: distributionType,
          distributionRecipient: recipient
        };
        // Don't overwrite perpetualDistributionRules - it was already set above with safeguards
      }

      // Build pre-programmed distribution if configured
      if (hasPreProgrammed) {
        // Emit plain object with numeric string keys; rs-dpp accepts stringified numeric keys
        const distributions = {};
        dist.preProgrammed.entries.forEach(entry => {
          if (entry.timestamp && entry.identityId && entry.amount) {
            let ts;
            if (typeof entry.timestamp === 'number') {
              ts = entry.timestamp;
            } else {
              const parsed = Date.parse(entry.timestamp);
              ts = Number.isFinite(parsed) ? parsed : null;
            }
            if (ts === null) return;
            const k = String(ts);
            if (!distributions[k]) {
              distributions[k] = {};
            }
            distributions[k][entry.identityId] = parseInt(entry.amount, 10) || 0;
          }
        });

        const hasAny = Object.keys(distributions).length > 0;
        if (hasAny) {
          distributionRules.preProgrammedDistribution = {
            $format_version: '0',
            distributions
          };
          distributionRules.preProgrammedDistributionRules = createRuleV0(true);
        }
      }

      return distributionRules;
    }

    // Helper: Build emission function based on type
    function buildEmissionFunction(emission) {
      const type = emission.type;

      // FixedAmount: Constant emission per period
      if (type === 'FixedAmount') {
        return {
          FixedAmount: {
            amount: parseInt(emission.amount, 10) || 0
          }
        };
      }

      // Random: Random amount between min and max
      else if (type === 'Random') {
        return {
          Random: {
            min: parseInt(emission.min, 10) || 0,
            max: parseInt(emission.max, 10) || 100
          }
        };
      }

      // StepDecreasing: Bitcoin-style halving
      else if (type === 'StepDecreasing') {
        const stepObj = {
          step_count: parseInt(emission.stepCount, 10) || 1,
          decrease_per_interval_numerator: parseInt(emission.decreasePerIntervalNumerator, 10) || 1,
          decrease_per_interval_denominator: parseInt(emission.decreasePerIntervalDenominator, 10) || 2,
          distribution_start_amount: parseInt(emission.distributionStartAmount, 10) || 100,
          trailing_distribution_interval_amount: parseInt(emission.trailingDistributionIntervalAmount, 10) || 0
        };

        // Add optional fields if provided
        if (emission.stepOffset && emission.stepOffset !== '' && emission.stepOffset !== 'None') {
          stepObj.start_decreasing_offset = parseInt(emission.stepOffset, 10);
        }
        if (emission.stepMinValue && emission.stepMinValue !== '' && emission.stepMinValue !== 'None') {
          stepObj.min_value = parseInt(emission.stepMinValue, 10);
        }
        if (emission.stepMaxInterval && emission.stepMaxInterval !== '' && emission.stepMaxInterval !== 'None') {
          stepObj.max_interval_count = parseInt(emission.stepMaxInterval, 10);
        }

        return { StepDecreasingAmount: stepObj };
      }

      // Linear: f(x) = (a * (x - s) / d) + b
      else if (type === 'Linear') {
        const linearObj = {
          a: parseInt(emission.linearSlopeNumerator, 10) || 0,
          d: parseInt(emission.linearSlopeDivisor, 10) || 1,
          starting_amount: parseInt(emission.linearStartingAmount, 10) || 0
        };

        // Add optional fields if provided
        if (emission.linearStartStep && emission.linearStartStep !== '' && emission.linearStartStep !== 'None') {
          linearObj.start_step = parseInt(emission.linearStartStep, 10);
        }
        if (emission.linearMinValue && emission.linearMinValue !== '' && emission.linearMinValue !== 'None') {
          linearObj.min_value = parseInt(emission.linearMinValue, 10);
        }
        if (emission.linearMaxValue && emission.linearMaxValue !== '' && emission.linearMaxValue !== 'None') {
          linearObj.max_value = parseInt(emission.linearMaxValue, 10);
        }

        return { Linear: linearObj };
      }

      // Exponential: f(x) = (a * (x - s + o)^(m / n)) / d + b
      else if (type === 'Exponential') {
        const expObj = {
          a: parseInt(emission.expA, 10) || 0,
          m: parseInt(emission.expM, 10) || 2,
          n: parseInt(emission.expN, 10) || 1,
          d: parseInt(emission.expD, 10) || 1,
          o: parseInt(emission.expO, 10) || 0,
          b: parseInt(emission.expB, 10) || 0
        };

        // Add optional fields if provided
        if (emission.expS && emission.expS !== '' && emission.expS !== 'None') {
          expObj.start_moment = parseInt(emission.expS, 10);
        }
        if (emission.expMinValue && emission.expMinValue !== '' && emission.expMinValue !== 'None') {
          expObj.min_value = parseInt(emission.expMinValue, 10);
        }
        if (emission.expMaxValue && emission.expMaxValue !== '' && emission.expMaxValue !== 'None') {
          expObj.max_value = parseInt(emission.expMaxValue, 10);
        }

        return { Exponential: expObj };
      }

      // Polynomial: f(x) = (a * (x - s + o)^(m / n)) / d + b
      else if (type === 'Polynomial') {
        const polyObj = {
          a: parseInt(emission.polyA, 10) || 0,
          m: parseInt(emission.polyM, 10) || 2,
          n: parseInt(emission.polyN, 10) || 1,
          d: parseInt(emission.polyD, 10) || 1,
          o: parseInt(emission.polyO, 10) || 0,
          b: parseInt(emission.polyB, 10) || 0
        };

        // Add optional fields if provided
        if (emission.polyS && emission.polyS !== '' && emission.polyS !== 'None') {
          polyObj.start_moment = parseInt(emission.polyS, 10);
        }
        if (emission.polyMinValue && emission.polyMinValue !== '' && emission.polyMinValue !== 'None') {
          polyObj.min_value = parseInt(emission.polyMinValue, 10);
        }
        if (emission.polyMaxValue && emission.polyMaxValue !== '' && emission.polyMaxValue !== 'None') {
          polyObj.max_value = parseInt(emission.polyMaxValue, 10);
        }

        return { Polynomial: polyObj };
      }

      // Logarithmic: f(x) = (a * ln((m * (x - s + o)) / n)) / d + b
      else if (type === 'Logarithmic') {
        const logObj = {
          a: parseInt(emission.logA, 10) || 0,
          d: parseInt(emission.logD, 10) || 1,
          m: parseInt(emission.logM, 10) || 1,
          n: parseInt(emission.logN, 10) || 1,
          o: parseInt(emission.logO, 10) || 0,
          b: parseInt(emission.logB, 10) || 0
        };

        // Add optional fields if provided
        if (emission.logS && emission.logS !== '' && emission.logS !== 'None') {
          logObj.start_moment = parseInt(emission.logS, 10);
        }
        if (emission.logMinValue && emission.logMinValue !== '' && emission.logMinValue !== 'None') {
          logObj.min_value = parseInt(emission.logMinValue, 10);
        }
        if (emission.logMaxValue && emission.logMaxValue !== '' && emission.logMaxValue !== 'None') {
          logObj.max_value = parseInt(emission.logMaxValue, 10);
        }

        return { Logarithmic: logObj };
      }

      // InvertedLogarithmic: f(x) = (a * ln(n / (m * (x - s + o)))) / d + b
      else if (type === 'InvertedLogarithmic') {
        const invlogObj = {
          a: parseInt(emission.invlogA, 10) || 0,
          d: parseInt(emission.invlogD, 10) || 1,
          m: parseInt(emission.invlogM, 10) || 1,
          n: parseInt(emission.invlogN, 10) || 1,
          o: parseInt(emission.invlogO, 10) || 0,
          b: parseInt(emission.invlogB, 10) || 0
        };

        // Add optional fields if provided
        if (emission.invlogS && emission.invlogS !== '' && emission.invlogS !== 'None') {
          invlogObj.start_moment = parseInt(emission.invlogS, 10);
        }
        if (emission.invlogMinValue && emission.invlogMinValue !== '' && emission.invlogMinValue !== 'None') {
          invlogObj.min_value = parseInt(emission.invlogMinValue, 10);
        }
        if (emission.invlogMaxValue && emission.invlogMaxValue !== '' && emission.invlogMaxValue !== 'None') {
          invlogObj.max_value = parseInt(emission.invlogMaxValue, 10);
        }

        return { InvertedLogarithmic: invlogObj };
      }

      // Stepwise: Custom step-based schedule
      else if (type === 'Stepwise' && Array.isArray(emission.stepwise) && emission.stepwise.length > 0) {
        // Emit plain object with numeric string keys; rs-dpp accepts stringified numeric keys
        const stepsMap = {};
        emission.stepwise.forEach(step => {
          const k = String(parseInt(step.period, 10) || 0);
          stepsMap[k] = parseInt(step.amount, 10) || 0;
        });
        return { Stepwise: stepsMap };
      }

      // Default fallback to FixedAmount
      return { FixedAmount: { amount: 100 } };
    }

    // Helper: Transform marketplace rules
    function transformMarketplaceRules() {
      const tradeMode = wizardState.form.advanced?.tradeMode;
      if (tradeMode && tradeMode !== 'closed') {
        debug.warn('Only NotTradeable trade mode is supported; forcing closed.');
      }

      return {
        $format_version: '0',
        tradeMode: 'NotTradeable',  // Unit enum variants serialize as strings
        tradeModeChangeRules: createPermissionChangeRuleFromNewFormat(wizardState.form.advanced.marketplaceTradeMode)
      };
    }

    // Helper: Transform transfer notes configuration
    function transformTransferNotesConfig() {
      const transferConfig = wizardState.form.permissions;
      if (!transferConfig.transferNotesEnabled) {
        return null; // No transfer notes configured
      }

      const allowedTypes = [];
      if (transferConfig.transferNoteTypes?.public) {
        allowedTypes.push('Public');
      }
      if (transferConfig.transferNoteTypes?.sharedEncrypted) {
        allowedTypes.push('SharedEncrypted');
      }
      if (transferConfig.transferNoteTypes?.privateEncrypted) {
        allowedTypes.push('PrivateEncrypted');
      }

      if (allowedTypes.length === 0) {
        return null; // No note types enabled
      }

      return {
        allowedNoteTypes: allowedTypes
      };
    }

    // Build token configuration (to be wrapped in tokens.0)
    const tokenConfig = {
      $format_version: '0',
      conventions: {
        $format_version: '0',
        localizations: transformLocalizations(
          wizardState.form.naming.conventions.localizations || {}
        ),
        decimals: parseInt(wizardState.form.permissions.decimals, 10) || 2
      },
      conventionsChangeRules: createPermissionChangeRuleFromNewFormat(wizardState.form.naming.updateNames),
      baseSupply: parseInt(wizardState.form.permissions.baseSupply, 10) || 0,
      maxSupply: wizardState.form.permissions.useMaxSupply
        ? parseInt(wizardState.form.permissions.maxSupply, 10) || null
        : null,
      keepsHistory: transformKeepsHistory(wizardState.form.permissions.keepsHistory || {}),
      startAsPaused: Boolean(wizardState.form.permissions.startAsPaused),
      allowTransferToFrozenBalance: Boolean(wizardState.form.permissions.allowTransferToFrozenBalance),
      allowTransferToFrozenBalanceChangeRules: createRuleV0(
        Boolean(wizardState.form.permissions.allowTransferToFrozenBalance),
        'ContractOwner',
        wizardState.form.permissions.allowTransferToFrozenBalanceChangeRules || {}
      ),
      maxSupplyChangeRules: createPermissionChangeRule(wizardState.form.permissions.changeMaxSupply),
      manualMintingRules: createRuleV0(
        Boolean(wizardState.form.permissions.manualMint?.enabled),
        getActorFromPerformer(
          wizardState.form.permissions.manualMint?.performerType,
          wizardState.form.permissions.manualMint?.performerReference
        ),
        wizardState.form.permissions.manualMint || {}
      ),
      manualBurningRules: createRuleV0(
        Boolean(wizardState.form.permissions.manualBurn?.enabled),
        getActorFromPerformer(
          wizardState.form.permissions.manualBurn?.performerType,
          wizardState.form.permissions.manualBurn?.performerReference
        ),
        wizardState.form.permissions.manualBurn || {}
      ),
      freezeRules: createRuleV0(
        Boolean(wizardState.form.permissions.manualFreeze?.enabled),
        getActorFromPerformer(
          wizardState.form.permissions.manualFreeze?.performerType,
          wizardState.form.permissions.manualFreeze?.performerReference
        ),
        wizardState.form.permissions.manualFreeze || {}
      ),
      unfreezeRules: createRuleV0(
        Boolean(wizardState.form.permissions.unfreeze?.enabled),
        getActorFromPerformer(
          wizardState.form.permissions.unfreeze?.performerType,
          wizardState.form.permissions.unfreeze?.performerReference
        ),
        wizardState.form.permissions.unfreeze || {}
      ),
      destroyFrozenFundsRules: createRuleV0(
        Boolean(wizardState.form.permissions.destroyFrozen?.enabled),
        getActorFromPerformer(
          wizardState.form.permissions.destroyFrozen?.performerType,
          wizardState.form.permissions.destroyFrozen?.performerReference
        ),
        wizardState.form.permissions.destroyFrozen || {}
      ),
      emergencyActionRules: createRuleV0(
        Boolean(wizardState.form.advanced?.changeControl?.emergency),
        getActorFromPerformer(
          wizardState.form.permissions.emergencyAction?.performerType,
          wizardState.form.permissions.emergencyAction?.performerReference
        ),
        wizardState.form.permissions.emergencyAction || {}
      ),
      mainControlGroup: null,
      mainControlGroupCanBeModified: wizardState.form.advanced.mainControl?.performerType && wizardState.form.advanced.mainControl?.performerType !== 'none'
        ? encodeAuthorizedActionTaker(getActorFromPerformer(wizardState.form.advanced.mainControl.performerType, wizardState.form.advanced.mainControl.performerReference))
        : 'NoOne'  // Unit enum variants serialize as strings
    };

    // Add distribution rules if configured
    const distributionRules = transformDistributionRules();
    if (distributionRules) {
      tokenConfig.distributionRules = distributionRules;
    }

    // Add marketplace rules
    tokenConfig.marketplaceRules = transformMarketplaceRules();

    // Note: transferNotesConfig is not supported by rs-dpp token configuration; omit it

    // Add description if user provided one, otherwise generate from token name
    const userDescription = wizardState.form.search.description?.trim();
    if (userDescription && userDescription.length >= 3) {
      tokenConfig.description = userDescription.substring(0, 200); // Max 200 chars
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      const description = `Token: ${tokenName}`;
      tokenConfig.description = description.substring(0, 100); // Max 100 chars
    }

    // Build groups at root level (if enabled)
    const groups = {};
    if (wizardState.form.group?.enabled && wizardState.form.group.members?.length > 0) {
      const memberPairs = wizardState.form.group.members
        .filter(m => m.identityId)
        .map(m => [m.identityId, parseInt(m.power, 10) || 1]);

      if (memberPairs.length > 0) {
        const membersMap = {};
        memberPairs.forEach(([id, power]) => { membersMap[id] = power; });
        groups['0'] = {
          $format_version: '0',
          members: membersMap,
          required_power: parseInt(wizardState.form.group.threshold, 10) || 2
        };
        // Update mainControlGroup in token if group is defined
        tokenConfig.mainControlGroup = 0;
        tokenConfig.mainControlGroupCanBeModified = wizardState.form.advanced.mainControl?.performerType && wizardState.form.advanced.mainControl?.performerType !== 'none'
          ? encodeAuthorizedActionTaker(getActorFromPerformer(wizardState.form.advanced.mainControl.performerType, wizardState.form.advanced.mainControl.performerReference))
          : 'NoOne';  // Unit enum variants serialize as strings
      }
    }

    // Build Platform contract structure
    // Generate valid 32-byte identifiers using Evo SDK if available, otherwise use placeholder
    let contractId = 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9';
    let ownerIdentity = wizardState.form.ownerIdentityId?.trim() || 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p';

    // If EvoSDK is loaded, generate proper random identifiers for validation
    if (window.EvoSDK && window.EvoSDK.Identifier && window.EvoSDK.Identifier.generate) {
      try {
        contractId = window.EvoSDK.Identifier.generate().toString();
        // Only use generated ID for owner if no user-provided ID
        if (!wizardState.form.ownerIdentityId?.trim()) {
          ownerIdentity = window.EvoSDK.Identifier.generate().toString();
        }
      } catch (e) {
        // Fallback to hardcoded placeholders if SDK generation fails
      }
    }

    const platformContract = {
      $format_version: '1',  // String "1" for DataContractV1 which supports tokens
      id: contractId,  // Platform generates actual ID during registration
      ownerId: ownerIdentity,           // User-provided owner identity ID
      version: 1,
      config: {
        $format_version: '0',  // String "0" for serde tagged enum
        canBeDeleted: false,
        readonly: false,
        keepsHistory: false,
        documentsKeepHistoryContractDefault: false,
        documentsMutableContractDefault: true,
        documentsCanBeDeletedContractDefault: false,
        requiresIdentityEncryptionBoundedKey: (() => {
          const val = document.getElementById('encryption-bounded-key')?.value;
          return (val && val.trim() !== '') ? parseInt(val, 10) : null;
        })(),
        requiresIdentityDecryptionBoundedKey: (() => {
          const val = document.getElementById('decryption-bounded-key')?.value;
          return (val && val.trim() !== '') ? parseInt(val, 10) : null;
        })(),
        sizedIntegerTypes: document.getElementById('sized-integer-types')?.checked ?? true
      },
      schemaDefs: {},  // Reusable schema definitions for document types
      documentSchemas: {},  // Will be populated if document types are defined
      tokens: {
        0: tokenConfig  // Token at position 0 (numeric key)
      }
    };

    // Add document schemas if any have been defined
    if (wizardState.form.documentTypes && Object.keys(wizardState.form.documentTypes).length > 0) {
      platformContract.documentSchemas = wizardState.form.documentTypes;
    }

    // Add groups if any
    if (Object.keys(groups).length > 0) {
      platformContract.groups = groups;
    }

    // Add keywords - use user-provided keywords if available, otherwise generate from token name
    const userKeywordsText = wizardState.form.search.keywords?.trim();
    const userKeywords = userKeywordsText ? userKeywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];
    if (userKeywords && userKeywords.length > 0) {
      platformContract.keywords = userKeywords.slice(0, 50); // Max 50 keywords
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      platformContract.keywords = [tokenName.toLowerCase()];
    }

    // Add description - use user-provided description if available, otherwise generate from token name
    if (userDescription && userDescription.length >= 3) {
      platformContract.description = userDescription.substring(0, 100);
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      platformContract.description = `Data contract for ${tokenName}`;
    }

    return platformContract;
  }

  /**
   * Testing utility - Generate test contracts for verification
   * Call from console: testPlatformContracts()
   */
  function testPlatformContracts() {
    console.group('🧪 Platform Contract Testing');

    // Test 1: Simple fixed-supply token
    console.group('Test 1: Simple Fixed-Supply Token');
    const test1State = createTestState({
      tokenName: 'SimpleToken',
      decimals: 8,
      baseSupply: 1000000,
      maxSupply: 10000000,
      localizations: {
        en: { shouldCapitalize: true, singular: 'token', plural: 'tokens' }
      }
    });
    console.log('Test State:', test1State);
    const test1Output = generateTestContract(test1State);
    console.log('Generated Contract:', test1Output);
    console.log('✅ Checks:');
    console.log('- Has $format_version:', test1Output.$format_version === 0);
    console.log('- Has tokens[0]:', Boolean(test1Output.tokens[0]));
    console.log('- baseSupply is number:', typeof test1Output.tokens[0].baseSupply === 'number');
    console.log('- Uses camelCase:', Boolean(test1Output.tokens[0].conventions.localizations.en.shouldCapitalize !== undefined));
    console.groupEnd();

    // Test 2: Bitcoin-style halving token
    console.group('Test 2: Bitcoin-Style Halving Token');
    const test2State = createTestState({
      tokenName: 'HalvingCoin',
      decimals: 8,
      baseSupply: 0,
      maxSupply: 21000000,
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'StepDecreasing',
          stepCount: 210000,
          decreasePerIntervalNumerator: 1,
          decreasePerIntervalDenominator: 2,
          distributionStartAmount: 50,
          trailingDistributionIntervalAmount: 0
        }
      },
      localizations: {
        en: { shouldCapitalize: false, singular: 'coin', plural: 'coins' }
      }
    });
    const test2Output = generateTestContract(test2State);
    console.log('Generated Contract:', test2Output);
    console.log('✅ Checks:');
    console.log('- Has distributionRules:', Boolean(test2Output.tokens['0'].distributionRules));
    console.log('- Has perpetualDistribution:', Boolean(test2Output.tokens['0'].distributionRules?.perpetualDistribution));
    console.log('- Emission is StepDecreasingAmount:', Boolean(test2Output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.StepDecreasingAmount));
    console.groupEnd();

    // Test 3: Token with groups
    console.group('Test 3: Token with Groups');
    const test3State = createTestState({
      tokenName: 'GroupToken',
      decimals: 2,
      baseSupply: 1000,
      groups: {
        enabled: true,
        members: [
          { identityId: 'identity1', power: 2 },
          { identityId: 'identity2', power: 1 }
        ],
        threshold: 2
      },
      localizations: {
        en: { shouldCapitalize: true, singular: 'share', plural: 'shares' }
      }
    });
    const test3Output = generateTestContract(test3State);
    console.log('Generated Contract:', test3Output);
    console.log('✅ Checks:');
    console.log('- Has groups at root:', Boolean(test3Output.groups));
    console.log('- Groups has position 0:', Boolean(test3Output.groups['0']));
    console.log('- Token references mainControlGroup:', test3Output.tokens['0'].mainControlGroup === 0);
    console.log('- Members have power:', Object.values(test3Output.groups['0'].members || {}).every(p => typeof p === 'number'));
    console.groupEnd();

    // Test 4: All emission types
    console.group('Test 4: Emission Function Types');
    const emissionTypes = ['FixedAmount', 'Random', 'StepDecreasing', 'Linear', 'Exponential', 'Polynomial', 'Logarithmic', 'InvertedLogarithmic'];
    emissionTypes.forEach(type => {
      console.log(`Testing ${type}...`);
      const testState = createTestState({
        tokenName: `${type}Token`,
        distribution: {
          type: 'BlockBasedDistribution',
          intervalBlocks: 100,
          emission: { type }
        }
      });
      const output = generateTestContract(testState);
      const propertyName = type === 'StepDecreasing' ? 'StepDecreasingAmount' : type;
      const hasEmission = Boolean(output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.[propertyName]);
      console.log(`  ${hasEmission ? '✅' : '❌'} ${type} emission function`);
    });
    console.groupEnd();

    // Test 5: Transfer notes
    console.group('Test 5: Transfer Notes Configuration');
    const test5State = createTestState({
      tokenName: 'NotesToken',
      transferNotes: {
        enabled: true,
        types: { public: true, sharedEncrypted: true, privateEncrypted: false }
      }
    });
    const test5Output = generateTestContract(test5State);
    console.log('Generated Contract:', test5Output);
    console.log('✅ Checks:');
    console.log('ℹ️ transferNotesConfig omitted in rs-dpp token configuration');
    console.groupEnd();

    // Test 6: Critical Platform Schema Fields
    console.group('Test 6: Critical Platform Schema Fields');
    const test6State = createTestState({
      tokenName: 'SchemaCompliantToken',
      allowTransferToFrozenBalance: true,
      startAsPaused: true
    });
    const test6Output = generateTestContract(test6State);
    console.log('Generated Contract:', test6Output);
    console.log('✅ Checks:');
    console.log('- Has allowTransferToFrozenBalance:', 'allowTransferToFrozenBalance' in test6Output.tokens['0']);
    console.log('- allowTransferToFrozenBalance is boolean:', typeof test6Output.tokens['0'].allowTransferToFrozenBalance === 'boolean');
    console.log('- allowTransferToFrozenBalance value:', test6Output.tokens['0'].allowTransferToFrozenBalance);
    console.log('- Has startAsPaused:', 'startAsPaused' in test6Output.tokens['0']);
    console.log('- startAsPaused is boolean:', typeof test6Output.tokens['0'].startAsPaused === 'boolean');
    console.log('- startAsPaused value:', test6Output.tokens['0'].startAsPaused);
    console.groupEnd();

    // Test 7: StepDecreasingAmount with max_interval_count
    console.group('Test 7: StepDecreasingAmount with max_interval_count');
    const test7State = createTestState({
      tokenName: 'HalvingToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 210000,
        emission: {
          type: 'StepDecreasing',
          stepCount: 210000,
          decreasePerIntervalNumerator: 1,
          decreasePerIntervalDenominator: 2,
          distributionStartAmount: 50,
          trailingDistributionIntervalAmount: 0,
          maxIntervalCount: 500
        }
      }
    });
    const test7Output = generateTestContract(test7State);
    console.log('Generated Contract:', test7Output);
    const stepDecreasing = test7Output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.StepDecreasingAmount;
    console.log('✅ Checks:');
    console.log('- Has StepDecreasingAmount:', Boolean(stepDecreasing));
    console.log('- Has max_interval_count:', 'max_interval_count' in stepDecreasing);
    console.log('- max_interval_count value:', stepDecreasing?.max_interval_count);
    console.log('- max_interval_count is BigInt:', typeof stepDecreasing?.max_interval_count === 'bigint');
    console.groupEnd();

    // Test 8: Emission functions with min/max values
    console.group('Test 8: Emission Functions with min/max Constraints');

    // Test Linear with constraints
    const linearState = createTestState({
      tokenName: 'LinearToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'Linear',
          linearSlopeNumerator: 1,
          linearSlopeDivisor: 1,
          linearStartingAmount: 1000,
          linearMinValue: 100,
          linearMaxValue: 10000
        }
      }
    });
    const linearOutput = generateTestContract(linearState);
    const linearEmission = linearOutput.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.Linear;
    console.log('Linear Emission Checks:');
    console.log('  - Has min_value:', 'min_value' in linearEmission);
    console.log('  - Has max_value:', 'max_value' in linearEmission);
    console.log('  - min_value:', linearEmission?.min_value);
    console.log('  - max_value:', linearEmission?.max_value);

    // Test Exponential with constraints
    const expState = createTestState({
      tokenName: 'ExpToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'Exponential',
          expA: 1,
          expM: 2,
          expN: 1,
          expD: 1,
          expO: 0,
          expB: 100,
          expMinValue: 50,
          expMaxValue: 5000
        }
      }
    });
    const expOutput = generateTestContract(expState);
    const expEmission = expOutput.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.Exponential;
    console.log('Exponential Emission Checks:');
    console.log('  - Has min_value:', 'min_value' in expEmission);
    console.log('  - Has max_value:', 'max_value' in expEmission);
    console.log('  - min_value:', expEmission?.min_value);
    console.log('  - max_value:', expEmission?.max_value);
    console.groupEnd();

    console.log('\n📊 Test Summary:');
    console.log('All structural tests completed. Review console output above for details.');
    console.log('\n🎯 New Features Tested:');
    console.log('  ✅ allowTransferToFrozenBalance field');
    console.log('  ✅ startAsPaused field');
    console.log('  ✅ StepDecreasingAmount max_interval_count');
    console.log('  ✅ Linear emission min/max values');
    console.log('  ✅ Exponential emission min/max values');
    console.log('  ✅ Transfer notes configuration');

    // Test 9: Owner Identity ID (NEW - Required field)
    console.group('Test 9: Owner Identity ID Validation');
    console.log('Testing default owner identity...');
    const test9State = createTestState({
      tokenName: 'IdentityToken'
    });
    const test9Output = generateTestContract(test9State);
    console.log('Generated Contract:', test9Output);
    console.log('✅ Checks:');
    console.log('- Has ownerId at root:', 'ownerId' in test9Output);
    console.log('- ownerId is string:', typeof test9Output.ownerId === 'string');
    console.log('- ownerId value:', test9Output.ownerId);
    console.log('- ownerId length (should be 43-44):', test9Output.ownerId?.length);
    console.log('- ownerId is valid Base58:', /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43,44}$/.test(test9Output.ownerId));

    // Test custom owner identity
    console.log('\nTesting custom owner identity...');
    const customOwnerId = 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9';
    const test9CustomState = createTestState({
      tokenName: 'CustomOwnerToken',
      ownerId: customOwnerId
    });
    const test9CustomOutput = generateTestContract(test9CustomState);
    console.log('✅ Custom Owner Checks:');
    console.log('- Custom ownerId matches input:', test9CustomOutput.ownerId === customOwnerId);
    console.log('- Custom ownerId value:', test9CustomOutput.ownerId);
    console.groupEnd();

    console.log('  ✅ Owner Identity ID validation');
    console.groupEnd();
  }

  function createTestState(config) {
    const defaultState = createDefaultWizardState();

    // Apply test configuration
    if (config.tokenName) {
      defaultState.form.tokenName = config.tokenName;
    }

    // Set owner identity (required field)
    if (config.ownerId) {
      defaultState.form.ownerIdentityId = config.ownerId;
    } else {
      // Use a valid test identity ID (Base58, 43-44 chars)
      defaultState.form.ownerIdentityId = 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p';
    }

    if (config.decimals !== undefined) {
      defaultState.form.permissions.decimals = config.decimals;
    }

    if (config.baseSupply !== undefined) {
      defaultState.form.permissions.baseSupply = String(config.baseSupply);
    }

    if (config.maxSupply !== undefined) {
      defaultState.form.permissions.useMaxSupply = true;
      defaultState.form.permissions.maxSupply = String(config.maxSupply);
    }

    if (config.localizations) {
      Object.keys(config.localizations).forEach(lang => {
        const loc = config.localizations[lang];
        defaultState.form.naming.conventions.localizations[lang] = {
          should_capitalize: loc.shouldCapitalize,
          singular_form: loc.singular,
          plural_form: loc.plural
        };
      });
    }

    if (config.distribution) {
      defaultState.form.distribution.cadence.type = config.distribution.type || 'BlockBasedDistribution';
      defaultState.form.distribution.cadence.intervalBlocks = String(config.distribution.intervalBlocks || 100);

      if (config.distribution.emission) {
        const emission = config.distribution.emission;
        defaultState.form.distribution.emission.type = emission.type;

        // Add emission-specific fields
        if (emission.type === 'FixedAmount') {
          defaultState.form.distribution.emission.amount = String(emission.amount || 100);
        }
        else if (emission.type === 'Random') {
          defaultState.form.distribution.emission.min = String(emission.min || 10);
          defaultState.form.distribution.emission.max = String(emission.max || 100);
        }
        else if (emission.type === 'StepDecreasing') {
          defaultState.form.distribution.emission.stepCount = String(emission.stepCount || 1);
          defaultState.form.distribution.emission.decreasePerIntervalNumerator = String(emission.decreasePerIntervalNumerator || 1);
          defaultState.form.distribution.emission.decreasePerIntervalDenominator = String(emission.decreasePerIntervalDenominator || 2);
          defaultState.form.distribution.emission.stepOffset = String(emission.stepOffset || '');
          defaultState.form.distribution.emission.distributionStartAmount = String(emission.distributionStartAmount || 100);
          defaultState.form.distribution.emission.stepMinValue = String(emission.stepMinValue || '');
          defaultState.form.distribution.emission.stepMaxInterval = String(emission.stepMaxInterval || '');
          defaultState.form.distribution.emission.trailingDistributionIntervalAmount = String(emission.trailingDistributionIntervalAmount || 0);
        }
        else if (emission.type === 'Linear') {
          defaultState.form.distribution.emission.linearSlopeNumerator = String(emission.linearSlopeNumerator || 0);
          defaultState.form.distribution.emission.linearSlopeDivisor = String(emission.linearSlopeDivisor || 1);
          defaultState.form.distribution.emission.linearStartStep = String(emission.linearStartStep || '');
          defaultState.form.distribution.emission.linearStartingAmount = String(emission.linearStartingAmount || 0);
          defaultState.form.distribution.emission.linearMinValue = String(emission.linearMinValue || '');
          defaultState.form.distribution.emission.linearMaxValue = String(emission.linearMaxValue || '');
        }
        else if (emission.type === 'Exponential') {
          defaultState.form.distribution.emission.expA = String(emission.expA || 0);
          defaultState.form.distribution.emission.expM = String(emission.expM || 2);
          defaultState.form.distribution.emission.expN = String(emission.expN || 1);
          defaultState.form.distribution.emission.expD = String(emission.expD || 1);
          defaultState.form.distribution.emission.expS = String(emission.expS || '');
          defaultState.form.distribution.emission.expO = String(emission.expO || 0);
          defaultState.form.distribution.emission.expB = String(emission.expB || 0);
          defaultState.form.distribution.emission.expMinValue = String(emission.expMinValue || '');
          defaultState.form.distribution.emission.expMaxValue = String(emission.expMaxValue || '');
        }
        else if (emission.type === 'Polynomial') {
          defaultState.form.distribution.emission.polyA = String(emission.polyA || 0);
          defaultState.form.distribution.emission.polyM = String(emission.polyM || 2);
          defaultState.form.distribution.emission.polyN = String(emission.polyN || 1);
          defaultState.form.distribution.emission.polyD = String(emission.polyD || 1);
          defaultState.form.distribution.emission.polyS = String(emission.polyS || '');
          defaultState.form.distribution.emission.polyO = String(emission.polyO || 0);
          defaultState.form.distribution.emission.polyB = String(emission.polyB || 0);
          defaultState.form.distribution.emission.polyMinValue = String(emission.polyMinValue || '');
          defaultState.form.distribution.emission.polyMaxValue = String(emission.polyMaxValue || '');
        }
        else if (emission.type === 'Logarithmic') {
          defaultState.form.distribution.emission.logA = String(emission.logA || 0);
          defaultState.form.distribution.emission.logD = String(emission.logD || 1);
          defaultState.form.distribution.emission.logM = String(emission.logM || 1);
          defaultState.form.distribution.emission.logN = String(emission.logN || 1);
          defaultState.form.distribution.emission.logS = String(emission.logS || '');
          defaultState.form.distribution.emission.logO = String(emission.logO || 0);
          defaultState.form.distribution.emission.logB = String(emission.logB || 0);
          defaultState.form.distribution.emission.logMinValue = String(emission.logMinValue || '');
          defaultState.form.distribution.emission.logMaxValue = String(emission.logMaxValue || '');
        }
        else if (emission.type === 'InvertedLogarithmic') {
          defaultState.form.distribution.emission.invlogA = String(emission.invlogA || 0);
          defaultState.form.distribution.emission.invlogD = String(emission.invlogD || 1);
          defaultState.form.distribution.emission.invlogM = String(emission.invlogM || 1);
          defaultState.form.distribution.emission.invlogN = String(emission.invlogN || 1);
          defaultState.form.distribution.emission.invlogS = String(emission.invlogS || '');
          defaultState.form.distribution.emission.invlogO = String(emission.invlogO || 0);
          defaultState.form.distribution.emission.invlogB = String(emission.invlogB || 0);
          defaultState.form.distribution.emission.invlogMinValue = String(emission.invlogMinValue || '');
          defaultState.form.distribution.emission.invlogMaxValue = String(emission.invlogMaxValue || '');
        }
        else if (emission.type === 'Stepwise') {
          defaultState.form.distribution.emission.stepwise = emission.stepwise || [
            { period: '0', amount: '100' },
            { period: '1000', amount: '50' }
          ];
        }
      }
    }

    if (config.groups?.enabled) {
      defaultState.form.group.enabled = true;
      defaultState.form.group.members = config.groups.members.map(m => ({
        identityId: m.identityId,
        power: String(m.power)
      }));
      defaultState.form.group.threshold = config.groups.threshold || 2;
    }

    if (config.transferNotes?.enabled) {
      defaultState.form.permissions.transferNotesEnabled = true;
      defaultState.form.permissions.transferNoteTypes = config.transferNotes.types || {};
    }

    if (config.allowTransferToFrozenBalance !== undefined) {
      defaultState.form.permissions.allowTransferToFrozenBalance = config.allowTransferToFrozenBalance;
    }

    if (config.startAsPaused !== undefined) {
      defaultState.form.permissions.startAsPaused = config.startAsPaused;
    }

    if (config.distribution?.emission?.maxIntervalCount !== undefined) {
      defaultState.form.distribution.emission.stepMaxInterval = String(config.distribution.emission.maxIntervalCount);
    }

    return defaultState;
  }

  function generateTestContract(testState) {
    // Create a temporary test function that uses the test state
    const originalState = {
      active: wizardState.active,
      furthestValidIndex: wizardState.furthestValidIndex,
      steps: { ...wizardState.steps },
      form: { ...wizardState.form },
      runtime: { ...wizardState.runtime }
    };

    // Temporarily replace wizardState properties
    Object.assign(wizardState, testState);

    const output = generatePlatformContractJSON();

    // Restore original state
    Object.assign(wizardState, originalState);

    return output;
  }

  window.getRegistrationPayload = getRegistrationPayload;
  window.generatePlatformContractJSON = generatePlatformContractJSON;
  window.testPlatformContracts = testPlatformContracts;
  window.createTestState = createTestState;
  window.generateTestContract = generateTestContract;
  window.showScreen = showScreen;
  window.hydrateFormsFromState = hydrateFormsFromState;
  window.announce = announce;
  window.wizardState = wizardState;
  window.resetWizard = resetWizard;

  // Expose validation functions for template system
  window.evaluateNaming = evaluateNaming;
  window.evaluatePermissions = evaluatePermissions;
  window.evaluateAdvanced = evaluateAdvanced;
  window.evaluateDistribution = evaluateDistribution;
  window.evaluateSearch = evaluateSearch;
  window.computeFurthestValidIndexFromSteps = computeFurthestValidIndexFromSteps;
  window.updateStepStatusUI = updateStepStatusUI;
  window.TRACKED_STEPS = TRACKED_STEPS;

  // ========================================
  // Tab Navigation Event Listener
  // ========================================
  // The HTML switchTab() in index.html dispatches 'navigate-to-step' events
  // This listener connects those events to showScreen() for actual navigation
  document.addEventListener('navigate-to-step', (event) => {
    const { step, substep } = event.detail;
    const targetScreen = substep || step;
    if (targetScreen) {
      showScreen(targetScreen, { force: true, isManualNavigation: true });
    }
  });

  // ========================================
  // Live Contract Preview System
  // ========================================

  /**
   * Updates the contract preview JSON AND features in real-time
   * Called automatically when the preview modal is open and form changes occur
   */
  function updateLiveContractPreview() {
    const jsonElement = document.getElementById('contract-preview-json');
    const featuresElement = document.getElementById('contract-preview-features');
    const modal = document.getElementById('contract-preview-modal');
    const registrationJsonPreview = document.getElementById('json-preview');
    const registrationJsonContent = document.getElementById('json-preview-content');

    // Check if modal is visible
    const modalVisible = modal && !modal.hasAttribute('hidden');

    // Check if registration JSON preview is visible
    const registrationJsonVisible = registrationJsonPreview &&
      !registrationJsonPreview.hasAttribute('hidden') &&
      wizardState.form.registration.method === 'det';

    // Only update if something is visible
    if (!modalVisible && !registrationJsonVisible) {
      return;
    }

    try {
      const contract = typeof generatePlatformContractJSON === 'function' ? generatePlatformContractJSON() : null;

      if (contract) {
        const contractJSON = JSON.stringify(contract, null, 2);

        // Update modal JSON if modal is visible
        if (modalVisible && jsonElement) {
          jsonElement.textContent = contractJSON;
        }

        // Update registration screen JSON if it's visible
        if (registrationJsonVisible && registrationJsonContent) {
          registrationJsonContent.textContent = contractJSON;
        }

        // Update features checklist (modal only)
        if (modalVisible && featuresElement && typeof window.wizardState !== 'undefined') {
          const state = structuredClone(window.wizardState.form);
          featuresElement.innerHTML = generateFeaturesHTML(state);
        }

        console.log('Live preview updated (JSON + features)');
      }
    } catch (error) {
      console.error('Error updating live preview:', error);
      if (modalVisible && jsonElement) {
        jsonElement.textContent = `Error generating contract: ${error.message}`;
      }
      if (registrationJsonVisible && registrationJsonContent) {
        registrationJsonContent.textContent = `Error generating contract: ${error.message}`;
      }
    }
  }

  /**
   * Generate features checklist HTML from wizard state
   */
  function generateFeaturesHTML(state) {
    const categories = [];

    // Token Name
    const tokenName = [];
    if (state.tokenName) {
      tokenName.push({ name: 'Token Name', value: state.tokenName });
    }
    if (state.permissions?.decimals !== undefined) {
      tokenName.push({ name: 'Decimals', value: state.permissions.decimals });
    }
    if (tokenName.length > 0) {
      categories.push({ title: '📋 Token Name', items: tokenName, type: 'info' });
    }

    // Token Supply
    const tokenSupply = [];
    if (state.permissions?.baseSupply) {
      tokenSupply.push({ name: 'Base Supply', value: state.permissions.baseSupply });
    }
    if (state.permissions?.maxSupply) {
      tokenSupply.push({ name: 'Max Supply', value: state.permissions.maxSupply });
    }
    if (tokenSupply.length > 0) {
      categories.push({ title: '💰 Token Supply', items: tokenSupply, type: 'info' });
    }

    // Minting
    if (state.permissions?.manualMint?.enabled) {
      categories.push({ title: '🔨 Minting', items: [{ name: 'Minting Enabled', enabled: true }], type: 'toggle' });
    }

    // Burning
    if (state.permissions?.manualBurn?.enabled) {
      categories.push({ title: '🔥 Burning', items: [{ name: 'Burning Enabled', enabled: true }], type: 'toggle' });
    }

    // Freezing
    if (state.permissions?.manualFreeze?.enabled) {
      categories.push({ title: '❄️ Freezing', items: [{ name: 'Freezing Enabled', enabled: true }], type: 'toggle' });
    }

    // Launch Settings
    if (state.permissions?.startAsPaused) {
      categories.push({ title: '🚀 Launch Settings', items: [{ name: 'Start as Paused', enabled: true }], type: 'toggle' });
    }

    // Distribution
    if (state.distribution?.emission?.type) {
      categories.push({ title: '💨 Emission', items: [{ name: 'Emission Type', value: state.distribution.emission.type }], type: 'info' });
    }

    // Render categories
    return categories.map(category => {
      let itemsHTML = '';

      if (category.type === 'info') {
        itemsHTML = category.items.map(item => `
          <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light);">
            <span style="color: var(--color-text-secondary); font-size: 0.9375rem;">${item.name}</span>
            <span style="color: var(--color-text); font-weight: 500; font-size: 0.9375rem;">${item.value}</span>
          </div>
        `).join('');
      } else {
        itemsHTML = category.items.map(item => `
          <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0;">
            <span style="font-size: 1rem; color: #10b981; font-weight: bold; width: 20px;">✓</span>
            <span style="color: var(--color-text); font-size: 0.9375rem;">${item.name}</span>
          </div>
        `).join('');
      }

      return `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3);">
          <h4 style="font-size: 1rem; font-weight: 600; margin: 0 0 var(--space-3) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2);">
            ${category.title}
          </h4>
          <div style="margin: 0;">
            ${itemsHTML}
          </div>
        </div>
      `;
    }).join('');
  }

  // Debounce function to limit update frequency
  let livePreviewDebounceTimer = null;
  function debouncedLivePreviewUpdate() {
    if (livePreviewDebounceTimer) {
      clearTimeout(livePreviewDebounceTimer);
    }
    livePreviewDebounceTimer = setTimeout(updateLiveContractPreview, 300); // 300ms delay
  }

  // Watch for changes to any form input across the entire wizard
  function initializeLivePreview() {
    console.log('Initializing live contract preview...');

    // Listen to all input changes globally
    document.addEventListener('input', function (event) {
      const target = event.target;

      // Check if the input is part of a wizard form
      if (target.matches('input, select, textarea')) {
        const isWizardInput = target.closest('.wizard-form') !== null;

        if (isWizardInput) {
          // Trigger debounced preview update
          debouncedLivePreviewUpdate();
        }
      }
    });

    // Also listen to change events for checkboxes and radios
    document.addEventListener('change', function (event) {
      const target = event.target;

      if (target.matches('input[type="checkbox"], input[type="radio"]')) {
        const isWizardInput = target.closest('.wizard-form') !== null;

        if (isWizardInput) {
          // Immediate update for toggle changes
          debouncedLivePreviewUpdate();

          // Update feature indicators if this is a feature-related toggle
          const targetName = target.name || target.id || '';
          const isFeatureToggle =
            targetName.includes('manual-mint') ||
            targetName.includes('manual-burn') ||
            targetName.includes('manual-freeze') ||
            targetName.includes('transfer-notes') ||
            targetName.includes('perpetual') ||
            targetName.includes('keeps-history') ||
            targetName.includes('enable-perpetual');

          if (isFeatureToggle && window.updateFeatureIndicators) {
            // Debounce to avoid excessive updates
            setTimeout(() => {
              window.updateFeatureIndicators();
            }, 100);
          }
        }
      }
    });

    console.log('Live contract preview initialized');
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLivePreview);
  } else {
    initializeLivePreview();
  }

  // Expose the update function globally for manual triggers
  window.updateLiveContractPreview = updateLiveContractPreview;

  // Performance Enhancement: Cleanup and save on page unload
  // Ensures any pending auto-save is executed before the page closes
  window.addEventListener('beforeunload', () => {
    // Cancel any pending auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    // Perform immediate save if there are unsaved changes
    // Note: This must be synchronous as async operations may not complete
    try {
      _persistStateNow();
    } catch (error) {
      console.warn('Unable to save state on unload:', error);
    }
  });

  // Initialize mobile menu
  initMobileMenu();
  console.log('✓ Mobile menu initialized');
  console.log('✓ Performance enhancements: Auto-save, DOM caching, event cleanup');
})();

// Export Configuration Screen - Button Handlers and Live Preview
(function () {
  'use strict';

  function initializeExportScreen() {
    // Wire up alternative export buttons
    const exportContractBtnAlt = document.getElementById('export-contract-json-btn-alt');
    const exportFullConfigBtnAlt = document.getElementById('export-full-config-btn-alt');
    const copyContractPreviewBtn = document.getElementById('copy-contract-preview');
    const exportContractPreview = document.getElementById('export-contract-preview');

    // Download Contract JSON (alternative button)
    if (exportContractBtnAlt) {
      exportContractBtnAlt.addEventListener('click', async () => {
        try {
          const contractJSON = generatePlatformContractJSON();

          // Validate contract JSON using Evo SDK (if available)
          if (window.EvoSDK && window.EvoSDK.DataContract) {
            try {
              // For token contracts, skip SDK validation due to V0/V1 limitation
              const hasTokens = !!contractJSON.tokens && Object.keys(contractJSON.tokens).length > 0;
              if (hasTokens) {
                console.log('✓ Token contract - SDK validation skipped (V1 not supported in WASM bindings)');
              } else {
                const validationContract = { ...contractJSON, '$format_version': '0' };
                // Add dummy document if no documents exist
                if (!validationContract.documentSchemas || Object.keys(validationContract.documentSchemas).length === 0) {
                  validationContract.documentSchemas = {
                    _validationPlaceholder: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false }
                  };
                }
                new window.EvoSDK.DataContract(validationContract);
                console.log('✓ Contract JSON validated successfully with Evo SDK');
              }
            } catch (validationError) {
              console.warn('Contract validation warning:', validationError.message);
              // Continue anyway - user may want to see/edit the JSON
            }
          }

          // Download as JSON file for DET
          const contractJSONString = JSON.stringify(contractJSON, null, 2);
          const blob = new Blob([contractJSONString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-contract.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Contract JSON downloaded successfully!');
        } catch (error) {
          console.error('Export error:', error);
          announce(`Error exporting contract: ${error.message}`);
        }
      });
    }

    // Download Full Configuration (alternative button)
    if (exportFullConfigBtnAlt) {
      exportFullConfigBtnAlt.addEventListener('click', () => {
        try {
          const fullConfig = JSON.stringify(wizardState, null, 2);
          const blob = new Blob([fullConfig], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-full-config.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Full configuration downloaded successfully!');
        } catch (error) {
          console.error('Export error:', error);
          announce('Error exporting configuration.');
        }
      });
    }

    // DET Export Contract Button
    const detExportContractBtn = document.getElementById('det-export-contract-btn');
    if (detExportContractBtn) {
      detExportContractBtn.addEventListener('click', async () => {
        try {
          const contractJSON = generatePlatformContractJSON();

          // Validate contract JSON using Evo SDK (if available)
          if (window.EvoSDK && window.EvoSDK.DataContract) {
            try {
              // For token contracts, skip SDK validation due to V0/V1 limitation
              const hasTokens = !!contractJSON.tokens && Object.keys(contractJSON.tokens).length > 0;
              if (hasTokens) {
                console.log('✓ Token contract - SDK validation skipped (V1 not supported in WASM bindings)');
              } else {
                const validationContract = { ...contractJSON, '$format_version': '0' };
                // Add dummy document if no documents exist
                if (!validationContract.documentSchemas || Object.keys(validationContract.documentSchemas).length === 0) {
                  validationContract.documentSchemas = {
                    _validationPlaceholder: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false }
                  };
                }
                new window.EvoSDK.DataContract(validationContract);
                console.log('✓ Contract JSON validated successfully with Evo SDK');
              }
            } catch (validationError) {
              console.error('Contract validation warning:', validationError.message);
              // Continue anyway - user may want to see/edit the JSON
            }
          }

          // Download as JSON file for DET
          const contractJSONString = JSON.stringify(contractJSON, null, 2);
          const blob = new Blob([contractJSONString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-contract.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Contract JSON downloaded successfully!');
        } catch (error) {
          console.error('DET export error:', error);
          announce('Error exporting contract. Please check your configuration.');
        }
      });
    }

    // DET Export Full Config Button
    const detExportFullConfigBtn = document.getElementById('det-export-full-config-btn');
    if (detExportFullConfigBtn) {
      detExportFullConfigBtn.addEventListener('click', () => {
        try {
          const fullConfig = JSON.stringify(wizardState, null, 2);
          const blob = new Blob([fullConfig], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-full-config.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Full configuration downloaded successfully!');
        } catch (error) {
          console.error('DET export error:', error);
          announce('Error exporting configuration.');
        }
      });
    }

    // Copy Contract Preview
    if (copyContractPreviewBtn && exportContractPreview) {
      copyContractPreviewBtn.addEventListener('click', () => {
        try {
          const text = exportContractPreview.textContent;
          navigator.clipboard.writeText(text).then(() => {
            announce('Contract JSON copied to clipboard!');
            copyContractPreviewBtn.textContent = '✅ Copied!';
            setTimeout(() => {
              copyContractPreviewBtn.textContent = '📋 Copy';
            }, 2000);
          }).catch(err => {
            console.error('Copy failed:', err);
            announce('Failed to copy to clipboard');
          });
        } catch (error) {
          console.error('Copy error:', error);
          announce('Failed to copy to clipboard');
        }
      });
    }

    // Update live preview whenever state changes
    function updateExportPreview() {
      if (!exportContractPreview) return;

      try {
        const contract = generatePlatformContractJSON();
        const contractJSON = JSON.stringify(contract, null, 2);
        exportContractPreview.textContent = contractJSON;
      } catch (error) {
        console.error('Preview update error:', error);
        exportContractPreview.textContent = '{\n  "error": "Unable to generate preview"\n}';
      }
    }

    // Initial preview update
    updateExportPreview();

    // Listen for state changes and update preview
    const originalPersistState = window.persistState;
    if (typeof originalPersistState === 'function') {
      window.persistState = function () {
        originalPersistState.apply(this, arguments);
        updateExportPreview();
      };
    }

    // Also update when navigating to the export screen
    const exportNavLink = document.querySelector('[data-substep="registration-export"]');
    if (exportNavLink) {
      exportNavLink.addEventListener('click', updateExportPreview);
    }

    // Update on any form input change (comprehensive coverage)
    document.addEventListener('change', updateExportPreview);
    document.addEventListener('input', debounce(updateExportPreview, 500));
  }

  // Debounce helper
  function debounce(func, wait) {
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

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExportScreen);
  } else {
    initializeExportScreen();
  }
})();

// ========================================
// NEW EMISSION FUNCTIONS - EVENT LISTENERS
// ========================================

(function initializeNewEmissionFunctions() {
  // Stepwise dynamic entries
  const stepwiseContainer = document.getElementById('stepwise-entries');
  const addStepwiseBtn = document.getElementById('add-stepwise-entry');

  if (addStepwiseBtn && stepwiseContainer) {
    let stepwiseIndex = 1;
    addStepwiseBtn.addEventListener('click', function () {
      const entry = document.createElement('div');
      entry.className = 'field-group stepwise-entry';
      entry.setAttribute('data-entry-index', stepwiseIndex);
      entry.innerHTML = `
        <label class="wizard-field__label">
          At interval <input class="wizard-field__input" type="number" name="stepwise-interval" placeholder="0" min="0" style="width: 120px; display: inline-block; margin: 0 var(--space-2);">
          emit <input class="wizard-field__input" type="text" name="stepwise-amount" placeholder="1000" style="width: 120px; display: inline-block; margin: 0 var(--space-2);"> tokens
        </label>
        <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-stepwise style="margin-left: var(--space-2);">Remove</button>
      `;
      stepwiseContainer.appendChild(entry);
      stepwiseIndex++;
    });

    stepwiseContainer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-stepwise')) {
        const entry = e.target.closest('.stepwise-entry');
        if (stepwiseContainer.querySelectorAll('.stepwise-entry').length > 1) {
          entry.remove();
        }
      }
    });
  }

  // Pre-programmed dynamic entries
  const preprogrammedContainer = document.getElementById('preprogrammed-entries');
  const addPreprogrammedBtn = document.getElementById('add-preprogrammed-entry');

  if (addPreprogrammedBtn && preprogrammedContainer) {
    let preprogrammedIndex = 1;
    addPreprogrammedBtn.addEventListener('click', function () {
      const entry = document.createElement('div');
      entry.className = 'field-group preprogrammed-entry';
      entry.setAttribute('data-entry-index', preprogrammedIndex);
      entry.style.cssText = 'padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';
      entry.innerHTML = `
        <div class="field-group">
          <label class="wizard-field__label">Release timestamp</label>
          <input class="wizard-field__input" type="datetime-local" name="preprogrammed-timestamp" placeholder="2025-01-01T00:00">
          <span class="field-hint">When tokens should be available for claim</span>
        </div>
        <div class="field-group">
          <label class="wizard-field__label">Recipient Identity ID</label>
          <input class="wizard-field__input" type="text" name="preprogrammed-identity" placeholder="e.g., 4hKFP3mFB9vku8VJKcZvwVN123...">
        </div>
        <div class="field-group">
          <label class="wizard-field__label">Token amount</label>
          <input class="wizard-field__input" type="text" name="preprogrammed-amount" placeholder="e.g., 1000000">
        </div>
        <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-preprogrammed style="margin-top: var(--space-2);">Remove</button>
      `;
      preprogrammedContainer.appendChild(entry);
      preprogrammedIndex++;
    });

    preprogrammedContainer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-preprogrammed')) {
        const entry = e.target.closest('.preprogrammed-entry');
        if (preprogrammedContainer.querySelectorAll('.preprogrammed-entry').length > 1) {
          entry.remove();
        }
      }
    });
  }

  // Panel toggle functionality for radio buttons with data-toggle-panel
  document.addEventListener('change', function (e) {
    if (e.target.type === 'radio') {
      const radioName = e.target.name;
      const allRadios = document.querySelectorAll(`input[name="${radioName}"]`);

      // First, hide all panels in the same radio group
      allRadios.forEach(radio => {
        const otherPanelId = radio.getAttribute('data-toggle-panel');
        if (otherPanelId) {
          const otherPanel = document.getElementById(otherPanelId);
          if (otherPanel) {
            otherPanel.hidden = true;
          }
        }
      });

      // Then, if the selected radio has a panel, show it
      if (e.target.hasAttribute('data-toggle-panel')) {
        const panelId = e.target.getAttribute('data-toggle-panel');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.hidden = !e.target.checked;
        }
      }
    }
  });

  // Initialize panel visibility on page load
  document.querySelectorAll('input[type="radio"][data-toggle-panel]').forEach(radio => {
    if (radio.checked) {
      const panelId = radio.getAttribute('data-toggle-panel');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = false;
      }
    }
  });

  console.log('New emission functions initialized');
})();

// ========================================
// AUTHORIZATION DROPDOWN PANEL TOGGLE
// ========================================

// Panel toggle functionality for authorization select dropdowns
(function initializeAuthorizationDropdownPanels() {
  // Map of select IDs to their associated panel IDs
  const authorizationDropdowns = [
    // Naming step
    { selectId: 'update-names-permission', identityPanel: 'update-names-panel-identity', groupPanel: 'update-names-panel-group' },
    { selectId: 'update-names-rule-changer', identityPanel: 'update-names-rule-panel-identity', groupPanel: 'update-names-rule-panel-group' },
    // Permissions step - Change Max Supply
    { selectId: 'change-max-supply-permission', identityPanel: 'change-max-supply-panel-identity', groupPanel: 'change-max-supply-panel-group' },
    { selectId: 'change-max-supply-change-rules', identityPanel: 'change-max-supply-rules-identity-panel', groupPanel: 'change-max-supply-rules-group-panel' },
    // Permissions step - Manual Mint
    { selectId: 'manual-mint-permission', identityPanel: 'manual-mint-panel-identity', groupPanel: 'manual-mint-panel-group' },
    { selectId: 'manual-mint-change-rules', identityPanel: 'manual-mint-rules-identity-panel', groupPanel: 'manual-mint-rules-group-panel' },
    // Permissions step - Manual Burn
    { selectId: 'manual-burn-permission', identityPanel: 'manual-burn-panel-identity', groupPanel: 'manual-burn-panel-group' },
    { selectId: 'manual-burn-change-rules', identityPanel: 'manual-burn-rules-identity-panel', groupPanel: 'manual-burn-rules-group-panel' },
    // Permissions step - Manual Freeze
    { selectId: 'manual-freeze-permission', identityPanel: 'manual-freeze-panel-identity', groupPanel: 'manual-freeze-panel-group' },
    { selectId: 'manual-freeze-change-rules', identityPanel: 'manual-freeze-rules-identity-panel', groupPanel: 'manual-freeze-rules-group-panel' },
    // Permissions step - Manual Unfreeze
    { selectId: 'manual-unfreeze-permission', identityPanel: 'manual-unfreeze-panel-identity', groupPanel: 'manual-unfreeze-panel-group' },
    { selectId: 'manual-unfreeze-change-rules', identityPanel: 'manual-unfreeze-rules-identity-panel', groupPanel: 'manual-unfreeze-rules-group-panel' },
    // Permissions step - Destroy Frozen
    { selectId: 'destroy-frozen-permission', identityPanel: 'destroy-frozen-panel-identity', groupPanel: 'destroy-frozen-panel-group' },
    { selectId: 'destroy-frozen-change-rules', identityPanel: 'destroy-frozen-rules-identity-panel', groupPanel: 'destroy-frozen-rules-group-panel' },
    // Permissions step - Emergency
    { selectId: 'emergency-permission', identityPanel: 'emergency-panel-identity', groupPanel: 'emergency-panel-group' },
    { selectId: 'emergency-change-rules', identityPanel: 'emergency-rules-identity-panel', groupPanel: 'emergency-rules-group-panel' },
    // Advanced step - Marketplace Trade Mode
    { selectId: 'marketplace-trade-mode-perform', identityPanel: 'marketplace-trade-mode-perform-identity-panel', groupPanel: 'marketplace-trade-mode-perform-group-panel' },
    { selectId: 'marketplace-trade-mode-change-rules', identityPanel: 'marketplace-trade-mode-rules-identity-panel', groupPanel: 'marketplace-trade-mode-rules-group-panel' },
    // Advanced step - Direct Pricing
    { selectId: 'direct-pricing-perform', identityPanel: 'direct-pricing-perform-identity-panel', groupPanel: 'direct-pricing-perform-group-panel' },
    { selectId: 'direct-pricing-change-rules', identityPanel: 'direct-pricing-rules-identity-panel', groupPanel: 'direct-pricing-rules-group-panel' },
    // Advanced step - Main Control
    { selectId: 'main-control-perform', identityPanel: 'main-control-perform-identity-panel', groupPanel: 'main-control-perform-group-panel' },
    { selectId: 'main-control-change-rules', identityPanel: 'main-control-rules-identity-panel', groupPanel: 'main-control-rules-group-panel' },
    // Distribution step - Pre-Programmed Distribution Rules
    { selectId: 'preprogrammed-perform-action', identityPanel: 'preprogrammed-panel-identity', groupPanel: 'preprogrammed-panel-group' },
    { selectId: 'preprogrammed-change-rules', identityPanel: 'preprogrammed-rule-panel-identity', groupPanel: 'preprogrammed-rule-panel-group' }
  ];

  // Function to toggle panels based on select value
  function toggleAuthorizationPanels(selectId, value) {
    const config = authorizationDropdowns.find(d => d.selectId === selectId);
    if (!config) return;

    const identityPanel = document.getElementById(config.identityPanel);
    const groupPanel = document.getElementById(config.groupPanel);

    if (identityPanel) {
      identityPanel.hidden = value !== 'identity';
    }
    if (groupPanel) {
      groupPanel.hidden = value !== 'group';
    }
  }

  // Add event listeners to all authorization dropdowns
  authorizationDropdowns.forEach(config => {
    const select = document.getElementById(config.selectId);
    if (select) {
      select.addEventListener('change', function() {
        toggleAuthorizationPanels(config.selectId, this.value);
      });

      // Initialize panels on page load based on current value
      toggleAuthorizationPanels(config.selectId, select.value);
    }
  });

  console.log('Authorization dropdown panel toggle initialized');
})();

// ========================================
// AUTHORIZATION DROPDOWN STATE MANAGEMENT
// ========================================

// State management for authorization select dropdowns - updates wizardState when values change
(function initializeAuthorizationDropdownStateManagement() {
  const wizardState = window.wizardState;
  if (!wizardState) {
    console.warn('wizardState not available for authorization dropdown state management');
    return;
  }

  // Helper function to persist state
  function persistState() {
    if (typeof window.persistState === 'function') {
      window.persistState();
    }
  }

  // Helper to get or create nested state object
  function ensureStateObject(path) {
    const parts = path.split('.');
    let current = wizardState;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    return current;
  }

  // Configuration for all authorization dropdowns that need state management
  const authorizationStateConfig = [
    // Naming step - Update Names Permission
    {
      selectId: 'update-names-permission',
      statePath: 'form.naming.updateNames',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'update-names-identity-id',
      groupSelectId: 'update-names-group-id'
    },
    {
      selectId: 'update-names-rule-changer',
      statePath: 'form.naming.updateNames',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'update-names-rule-identity-id',
      groupSelectId: 'update-names-rule-group-id'
    },
    // Permissions step - Manual Mint
    {
      selectId: 'manual-mint-permission',
      statePath: 'form.permissions.manualMint',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'manual-mint-identity-id',
      groupSelectId: 'manual-mint-group-id'
    },
    {
      selectId: 'manual-mint-change-rules',
      statePath: 'form.permissions.manualMint',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'manual-mint-rules-identity-id',
      groupSelectId: 'manual-mint-rules-group-id'
    },
    // Permissions step - Manual Burn
    {
      selectId: 'manual-burn-permission',
      statePath: 'form.permissions.manualBurn',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'manual-burn-identity-id',
      groupSelectId: 'manual-burn-group-id'
    },
    {
      selectId: 'manual-burn-change-rules',
      statePath: 'form.permissions.manualBurn',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'manual-burn-rules-identity-id',
      groupSelectId: 'manual-burn-rules-group-id'
    },
    // Permissions step - Manual Freeze
    {
      selectId: 'manual-freeze-permission',
      statePath: 'form.permissions.manualFreeze',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'manual-freeze-identity-id',
      groupSelectId: 'manual-freeze-group-id'
    },
    {
      selectId: 'manual-freeze-change-rules',
      statePath: 'form.permissions.manualFreeze',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'manual-freeze-rules-identity-id',
      groupSelectId: 'manual-freeze-rules-group-id'
    },
    // Permissions step - Manual Unfreeze
    {
      selectId: 'manual-unfreeze-permission',
      statePath: 'form.permissions.unfreeze',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'manual-unfreeze-identity-id',
      groupSelectId: 'manual-unfreeze-group-id'
    },
    {
      selectId: 'manual-unfreeze-change-rules',
      statePath: 'form.permissions.unfreeze',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'manual-unfreeze-rules-identity-id',
      groupSelectId: 'manual-unfreeze-rules-group-id'
    },
    // Permissions step - Destroy Frozen
    {
      selectId: 'destroy-frozen-permission',
      statePath: 'form.permissions.destroyFrozen',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'destroy-frozen-identity-id',
      groupSelectId: 'destroy-frozen-group-id'
    },
    {
      selectId: 'destroy-frozen-change-rules',
      statePath: 'form.permissions.destroyFrozen',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'destroy-frozen-rules-identity-id',
      groupSelectId: 'destroy-frozen-rules-group-id'
    },
    // Permissions step - Emergency Actions
    {
      selectId: 'emergency-permission',
      statePath: 'form.permissions.emergencyAction',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'emergency-identity-id',
      groupSelectId: 'emergency-group-id'
    },
    {
      selectId: 'emergency-change-rules',
      statePath: 'form.permissions.emergencyAction',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'emergency-rules-identity-id',
      groupSelectId: 'emergency-rules-group-id'
    },
    // Advanced step - Marketplace Trade Mode
    {
      selectId: 'marketplace-trade-mode-perform',
      statePath: 'form.advanced.marketplaceTradeMode',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'marketplace-trade-mode-perform-identity-id',
      groupSelectId: 'marketplace-trade-mode-perform-group-id'
    },
    {
      selectId: 'marketplace-trade-mode-change-rules',
      statePath: 'form.advanced.marketplaceTradeMode',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'marketplace-trade-mode-rules-identity-id',
      groupSelectId: 'marketplace-trade-mode-rules-group-id'
    },
    // Advanced step - Direct Purchase Pricing
    {
      selectId: 'direct-pricing-perform',
      statePath: 'form.advanced.directPricing',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'direct-pricing-perform-identity-id',
      groupSelectId: 'direct-pricing-perform-group-id'
    },
    {
      selectId: 'direct-pricing-change-rules',
      statePath: 'form.advanced.directPricing',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'direct-pricing-rules-identity-id',
      groupSelectId: 'direct-pricing-rules-group-id'
    },
    // Advanced step - Main Control Group
    {
      selectId: 'main-control-perform',
      statePath: 'form.advanced.mainControl',
      stateKey: 'performerType',
      referenceKey: 'performerReference',
      identityInputId: 'main-control-perform-identity-id',
      groupSelectId: 'main-control-perform-group-id'
    },
    {
      selectId: 'main-control-change-rules',
      statePath: 'form.advanced.mainControl',
      stateKey: 'ruleChangerType',
      referenceKey: 'ruleChangerReference',
      identityInputId: 'main-control-rules-identity-id',
      groupSelectId: 'main-control-rules-group-id'
    }
  ];

  // Add event listeners for each authorization dropdown
  authorizationStateConfig.forEach(config => {
    const select = document.getElementById(config.selectId);
    if (!select) return;

    // Handler for select dropdown changes
    select.addEventListener('change', () => {
      const value = select.value;
      const stateObj = ensureStateObject(config.statePath);

      // Map select value to state type
      let typeValue = value;
      if (value === 'no-one') {
        typeValue = 'none';
      }

      stateObj[config.stateKey] = typeValue;

      // Clear reference when switching to owner or none
      if (value === 'owner' || value === 'no-one') {
        stateObj[config.referenceKey] = '';
      }

      persistState();
    });

    // Handler for identity input
    if (config.identityInputId) {
      const identityInput = document.getElementById(config.identityInputId);
      if (identityInput) {
        identityInput.addEventListener('input', () => {
          const stateObj = ensureStateObject(config.statePath);
          stateObj[config.referenceKey] = identityInput.value.trim();
          persistState();
        });
      }
    }

    // Handler for group select
    if (config.groupSelectId) {
      const groupSelect = document.getElementById(config.groupSelectId);
      if (groupSelect) {
        groupSelect.addEventListener('change', () => {
          const stateObj = ensureStateObject(config.statePath);
          stateObj[config.referenceKey] = groupSelect.value;
          persistState();
        });
      }
    }
  });

  // Hydrate dropdowns from state on page load
  function hydrateAuthorizationDropdowns() {
    authorizationStateConfig.forEach(config => {
      const select = document.getElementById(config.selectId);
      if (!select) return;

      // Get the current state value
      const parts = config.statePath.split('.');
      let stateObj = wizardState;
      for (const part of parts) {
        if (!stateObj || !stateObj[part]) {
          stateObj = null;
          break;
        }
        stateObj = stateObj[part];
      }

      if (stateObj) {
        // Get type value and convert to select value
        let typeValue = stateObj[config.stateKey] || 'none';
        if (typeValue === 'none') {
          typeValue = 'no-one';
        }

        // Set the select value
        select.value = typeValue;

        // Also hydrate identity input if present
        if (config.identityInputId && stateObj[config.referenceKey]) {
          const identityInput = document.getElementById(config.identityInputId);
          if (identityInput && typeValue === 'identity') {
            identityInput.value = stateObj[config.referenceKey];
          }
        }

        // Also hydrate group select if present
        if (config.groupSelectId && stateObj[config.referenceKey]) {
          const groupSelect = document.getElementById(config.groupSelectId);
          if (groupSelect && typeValue === 'group') {
            groupSelect.value = stateObj[config.referenceKey];
          }
        }
      }
    });
  }

  // Expose hydration function globally for use by other initialization code
  window.hydrateAuthorizationDropdowns = hydrateAuthorizationDropdowns;

  // Hydrate on initial load (after a short delay to ensure DOM is ready)
  setTimeout(hydrateAuthorizationDropdowns, 200);

  console.log('Authorization dropdown state management initialized');
})();

// ========================================
// UPDATE NAMES & MAIN CONTROL GOVERNANCE SAFEGUARDS
// ========================================

(function initializeGovernanceSafeguardCheckboxes() {
  const wizardState = window.wizardState;
  if (!wizardState) {
    console.warn('wizardState not available for governance safeguard initialization');
    return;
  }

  // Update Names Governance Checkboxes
  const updateNamesAllowAuthorizedNone = document.getElementById('update-names-allow-authorized-none');
  const updateNamesAllowAdminNone = document.getElementById('update-names-allow-admin-none');
  const updateNamesAllowSelfChange = document.getElementById('update-names-allow-self-change');

  if (updateNamesAllowAuthorizedNone) {
    updateNamesAllowAuthorizedNone.addEventListener('change', () => {
      if (!wizardState.form.naming.updateNames) {
        wizardState.form.naming.updateNames = {};
      }
      wizardState.form.naming.updateNames.allowChangeAuthorizedToNone = updateNamesAllowAuthorizedNone.checked;
      persistState();
    });
  }
  if (updateNamesAllowAdminNone) {
    updateNamesAllowAdminNone.addEventListener('change', () => {
      if (!wizardState.form.naming.updateNames) {
        wizardState.form.naming.updateNames = {};
      }
      wizardState.form.naming.updateNames.allowChangeAdminToNone = updateNamesAllowAdminNone.checked;
      persistState();
    });
  }
  if (updateNamesAllowSelfChange) {
    updateNamesAllowSelfChange.addEventListener('change', () => {
      if (!wizardState.form.naming.updateNames) {
        wizardState.form.naming.updateNames = {};
      }
      wizardState.form.naming.updateNames.allowSelfChangeAdmin = updateNamesAllowSelfChange.checked;
      persistState();
    });
  }

  // Main Control Governance Checkboxes
  const mainControlAllowAuthorizedNone = document.getElementById('main-control-allow-authorized-none');
  const mainControlAllowAdminNone = document.getElementById('main-control-allow-admin-none');
  const mainControlAllowSelfChange = document.getElementById('main-control-allow-self-change');

  if (mainControlAllowAuthorizedNone) {
    mainControlAllowAuthorizedNone.addEventListener('change', () => {
      if (!wizardState.form.advanced.mainControl) {
        wizardState.form.advanced.mainControl = {};
      }
      wizardState.form.advanced.mainControl.allowChangeAuthorizedToNone = mainControlAllowAuthorizedNone.checked;
      persistState();
    });
  }
  if (mainControlAllowAdminNone) {
    mainControlAllowAdminNone.addEventListener('change', () => {
      if (!wizardState.form.advanced.mainControl) {
        wizardState.form.advanced.mainControl = {};
      }
      wizardState.form.advanced.mainControl.allowChangeAdminToNone = mainControlAllowAdminNone.checked;
      persistState();
    });
  }
  if (mainControlAllowSelfChange) {
    mainControlAllowSelfChange.addEventListener('change', () => {
      if (!wizardState.form.advanced.mainControl) {
        wizardState.form.advanced.mainControl = {};
      }
      wizardState.form.advanced.mainControl.allowSelfChangeAdmin = mainControlAllowSelfChange.checked;
      persistState();
    });
  }

  // Hydrate checkboxes from state on page load
  function hydrateGovernanceSafeguardCheckboxes() {
    // Update Names checkboxes
    if (updateNamesAllowAuthorizedNone && wizardState.form.naming.updateNames) {
      updateNamesAllowAuthorizedNone.checked = wizardState.form.naming.updateNames.allowChangeAuthorizedToNone || false;
    }
    if (updateNamesAllowAdminNone && wizardState.form.naming.updateNames) {
      updateNamesAllowAdminNone.checked = wizardState.form.naming.updateNames.allowChangeAdminToNone || false;
    }
    if (updateNamesAllowSelfChange && wizardState.form.naming.updateNames) {
      updateNamesAllowSelfChange.checked = wizardState.form.naming.updateNames.allowSelfChangeAdmin || false;
    }

    // Main Control checkboxes
    if (mainControlAllowAuthorizedNone && wizardState.form.advanced.mainControl) {
      mainControlAllowAuthorizedNone.checked = wizardState.form.advanced.mainControl.allowChangeAuthorizedToNone || false;
    }
    if (mainControlAllowAdminNone && wizardState.form.advanced.mainControl) {
      mainControlAllowAdminNone.checked = wizardState.form.advanced.mainControl.allowChangeAdminToNone || false;
    }
    if (mainControlAllowSelfChange && wizardState.form.advanced.mainControl) {
      mainControlAllowSelfChange.checked = wizardState.form.advanced.mainControl.allowSelfChangeAdmin || false;
    }
  }

  // Hydrate on initial load (after a short delay to ensure DOM and state are ready)
  setTimeout(hydrateGovernanceSafeguardCheckboxes, 250);

  console.log('Update Names and Main Control governance safeguard checkboxes initialized');
})();

// ========================================
// GROUP ACTION TAKER SELECTORS
// ========================================

(function initializeGroupActionTakerSelectors() {
  // Define all group selector IDs for manual actions and permission changes
  const groupSelectors = [
    // Manual actions
    { selectId: 'manual-mint-group-id', containerId: 'manual-mint-group-selector-container', hintId: 'manual-mint-group-hint', noGroupsMessageId: 'manual-mint-no-groups-message' },
    { selectId: 'manual-mint-rules-group-id' },
    { selectId: 'manual-burn-group-id', containerId: 'manual-burn-group-selector-container', hintId: 'manual-burn-group-hint', noGroupsMessageId: 'manual-burn-no-groups-message' },
    { selectId: 'manual-burn-rules-group-id' },
    { selectId: 'manual-freeze-group-id', containerId: 'manual-freeze-group-selector-container', hintId: 'manual-freeze-group-hint', noGroupsMessageId: 'manual-freeze-no-groups-message' },
    { selectId: 'manual-freeze-rules-group-id' },
    { selectId: 'manual-unfreeze-group-id' },
    { selectId: 'manual-unfreeze-rules-group-id' },
    { selectId: 'destroy-frozen-group-id', containerId: 'destroy-frozen-group-selector-container', hintId: 'destroy-frozen-group-hint', noGroupsMessageId: 'destroy-frozen-no-groups-message' },
    { selectId: 'destroy-frozen-rules-group-id' },
    { selectId: 'emergency-group-id', containerId: 'emergency-group-selector-container', hintId: 'emergency-group-hint', noGroupsMessageId: 'emergency-no-groups-message' },
    { selectId: 'emergency-rules-group-id' },
    // Max supply change
    { selectId: 'change-max-supply-group-id' },
    { selectId: 'change-max-supply-rules-group-id' },
    // Permission change pages
    { selectId: 'conventions-perform-group-id' },
    { selectId: 'conventions-rules-group-id' },
    { selectId: 'marketplace-trade-mode-perform-group-id' },
    { selectId: 'marketplace-trade-mode-rules-group-id' },
    { selectId: 'direct-pricing-perform-group-id' },
    { selectId: 'direct-pricing-rules-group-id' },
    { selectId: 'main-control-perform-group-id' },
    { selectId: 'main-control-rules-group-id' },
    // Update Names group selectors
    { selectId: 'update-names-group-id', containerId: 'update-names-group-selector-container', hintId: 'update-names-group-hint', noGroupsMessageId: 'update-names-no-groups-message' },
    { selectId: 'update-names-rule-group-id', containerId: 'update-names-rule-group-selector-container', hintId: 'update-names-rule-group-hint', noGroupsMessageId: 'update-names-rule-no-groups-message' },
    // Distribution group selectors
    { selectId: 'preprogrammed-group-id' },
    { selectId: 'preprogrammed-rule-group-id' }
  ];

  // Function to update all group selectors with current groups
  function updateGroupSelectors() {
    const wizardState = window.wizardState;
    if (!wizardState || !wizardState.form || !wizardState.form.permissions) {
      return;
    }

    const groups = wizardState.form.permissions.groups || [];
    const hasGroups = groups.length > 0;

    // Sort groups: named groups first (alphabetically), then unnamed groups by creation order
    const sortedGroups = [...groups].sort((a, b) => {
      const aIsUnnamed = !a.name || a.name.trim() === '' || a.name.startsWith('Unnamed Group');
      const bIsUnnamed = !b.name || b.name.trim() === '' || b.name.startsWith('Unnamed Group');

      if (aIsUnnamed && !bIsUnnamed) return 1;  // Unnamed goes after named
      if (!aIsUnnamed && bIsUnnamed) return -1; // Named goes before unnamed
      if (!aIsUnnamed && !bIsUnnamed) {
        // Both named - sort alphabetically
        return a.name.localeCompare(b.name);
      }
      // Both unnamed - keep original order (by index in original array)
      return groups.indexOf(a) - groups.indexOf(b);
    });

    // Count unnamed groups for numbering
    let unnamedCounter = 0;
    const getDisplayName = (group) => {
      if (group.name && group.name.trim() !== '' && !group.name.startsWith('Unnamed Group')) {
        return group.name;
      }
      // Find the position of this unnamed group among all unnamed groups
      const unnamedGroups = groups.filter(g => !g.name || g.name.trim() === '' || g.name.startsWith('Unnamed Group'));
      const unnamedIndex = unnamedGroups.indexOf(group) + 1;
      return `Unnamed Group ${unnamedIndex}`;
    };

    groupSelectors.forEach(config => {
      const selectElement = document.getElementById(config.selectId);
      const containerElement = config.containerId ? document.getElementById(config.containerId) : null;
      const hintElement = config.hintId ? document.getElementById(config.hintId) : null;
      const noGroupsMessageElement = config.noGroupsMessageId ? document.getElementById(config.noGroupsMessageId) : null;

      if (!selectElement) {
        return;
      }

      if (hasGroups) {
        // Show select dropdown with available groups
        if (containerElement) {
          containerElement.hidden = false;
        }
        selectElement.style.display = '';

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select a group...</option>';

        // Add option for each group (sorted)
        sortedGroups.forEach((group) => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = getDisplayName(group);
          selectElement.appendChild(option);
        });

        // Show hint text
        if (hintElement) {
          hintElement.textContent = 'Choose which group can perform this action';
          hintElement.style.display = '';
        }

        // Hide "no groups" message
        if (noGroupsMessageElement) {
          noGroupsMessageElement.hidden = true;
        }
      } else {
        // No groups exist - hide dropdown and show message
        if (containerElement) {
          containerElement.hidden = true;
        }

        // Show "no groups" message
        if (noGroupsMessageElement) {
          noGroupsMessageElement.hidden = false;
        }
      }
    });
  }

  // Update selectors on page load
  updateGroupSelectors();

  // Update selectors when groups change
  // Hook into the renderPermissionGroups function
  const originalRenderPermissionGroups = window.renderPermissionGroups;
  if (originalRenderPermissionGroups && typeof originalRenderPermissionGroups === 'function') {
    window.renderPermissionGroups = function () {
      originalRenderPermissionGroups.apply(this, arguments);
      updateGroupSelectors();
    };
  }

  // Also update when panels are shown
  document.addEventListener('change', function (e) {
    if (e.target.type === 'radio' && e.target.hasAttribute('data-toggle-panel')) {
      const panelId = e.target.getAttribute('data-toggle-panel');
      // Check if this is a group panel
      if (panelId && panelId.includes('-panel-group')) {
        updateGroupSelectors();
      }
    }
  });

  // Expose for external use (Groups Page)
  window.updateGroupSelectors = updateGroupSelectors;

  console.log('Group action taker selectors initialized');
})();

// ========================================
// CREATE GROUP BUTTON HANDLERS
// ========================================

(function initializeCreateGroupButtons() {
  // Define all "Create Group" button IDs
  const createGroupButtonIds = [
    'manual-mint-create-group-btn',
    'manual-burn-create-group-btn',
    'manual-freeze-create-group-btn',
    'destroy-frozen-create-group-btn',
    'emergency-create-group-btn'
  ];

  // Add click handlers to all buttons
  createGroupButtonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        // Navigate to the group creation page (permissions-group substep on group tab)
        // First switch to the group tab
        if (typeof window.switchTab === 'function') {
          window.switchTab('group');
        }
        // Then navigate to the permissions-group screen
        if (typeof window.showScreen === 'function') {
          setTimeout(() => {
            window.showScreen('permissions-group', { force: true });
          }, 100);
        }
      });
    }
  });

  console.log('Create Group button handlers initialized');
})();

// ========================================
// NEW PERMISSION CHANGE PAGES STATE MANAGEMENT
// ========================================

(function initializePermissionChangePages() {
  // Define all new permission change pages
  const permissionPages = [
    {
      key: 'conventionsChange',
      prefix: 'conventions-change',
      hasRulesSection: true  // Has both "perform" and "change rules" sections
    },
    {
      key: 'marketplaceTradeMode',
      prefix: 'marketplace-trade-mode',
      hasRulesSection: true
    },
    {
      key: 'directPricing',
      prefix: 'direct-pricing',
      hasRulesSection: true
    },
    {
      key: 'mainControl',
      prefix: 'main-control',
      hasRulesSection: false  // Only has one section (change rules)
    }
  ];

  // Initialize state for all pages
  function ensurePermissionChangeState() {
    if (!wizardState.form.permissions) {
      wizardState.form.permissions = {};
    }

    permissionPages.forEach(page => {
      if (!wizardState.form.permissions[page.key]) {
        wizardState.form.permissions[page.key] = {
          enabled: false,
          perform: {
            type: 'none',  // none, owner, identity, or group
            identityId: '',
            groupId: ''
          },
          changeRules: {
            type: 'none',
            identityId: '',
            groupId: ''
          }
        };
      }
    });
  }

  // Helper function to get state for a specific page
  function getPageState(key) {
    ensurePermissionChangeState();
    return wizardState.form.permissions[key];
  }

  // Helper function to update state for a specific page
  function updatePageState(key, updates) {
    ensurePermissionChangeState();
    wizardState.form.permissions[key] = {
      ...wizardState.form.permissions[key],
      ...updates
    };
  }

  // Set up event listeners for each page
  permissionPages.forEach(page => {
    // Enable/disable radios
    const enableRadios = document.querySelectorAll(`input[name="${page.prefix}-enable"]`);
    enableRadios.forEach(radio => {
      radio.addEventListener('change', function () {
        const enabled = this.value === 'enabled';
        updatePageState(page.key, { enabled });
        console.log(`${page.key} enabled:`, enabled);
      });
    });

    // Perform authorization radios (only if page has this section)
    if (page.hasRulesSection) {
      const performRadios = document.querySelectorAll(`input[name="${page.prefix}-perform"]`);
      performRadios.forEach(radio => {
        radio.addEventListener('change', function () {
          const state = getPageState(page.key);
          state.perform.type = this.value;
          updatePageState(page.key, { perform: state.perform });
          console.log(`${page.key} perform type:`, this.value);
        });
      });

      // Perform identity input
      const performIdentityInput = document.getElementById(`${page.prefix}-perform-identity-id`);
      if (performIdentityInput) {
        performIdentityInput.addEventListener('input', function () {
          const state = getPageState(page.key);
          state.perform.identityId = this.value.trim();
          updatePageState(page.key, { perform: state.perform });
        });
      }

      // Perform group select
      const performGroupSelect = document.getElementById(`${page.prefix}-perform-group-id`);
      if (performGroupSelect) {
        performGroupSelect.addEventListener('change', function () {
          const state = getPageState(page.key);
          state.perform.groupId = this.value;
          updatePageState(page.key, { perform: state.perform });
        });
      }
    }

    // Change rules authorization radios
    const rulesRadiosName = page.hasRulesSection ? `${page.prefix}-change-rules` : `${page.prefix}-rules`;
    const rulesRadios = document.querySelectorAll(`input[name="${rulesRadiosName}"]`);
    rulesRadios.forEach(radio => {
      radio.addEventListener('change', function () {
        const state = getPageState(page.key);
        state.changeRules.type = this.value;
        updatePageState(page.key, { changeRules: state.changeRules });
        console.log(`${page.key} change rules type:`, this.value);
      });
    });

    // Change rules identity input
    const rulesIdentityInputId = page.hasRulesSection ? `${page.prefix}-rules-identity-id` : `${page.prefix}-identity-id`;
    const rulesIdentityInput = document.getElementById(rulesIdentityInputId);
    if (rulesIdentityInput) {
      rulesIdentityInput.addEventListener('input', function () {
        const state = getPageState(page.key);
        state.changeRules.identityId = this.value.trim();
        updatePageState(page.key, { changeRules: state.changeRules });
      });
    }

    // Change rules group select
    const rulesGroupSelectId = page.hasRulesSection ? `${page.prefix}-rules-group-id` : `${page.prefix}-group-id`;
    const rulesGroupSelect = document.getElementById(rulesGroupSelectId);
    if (rulesGroupSelect) {
      rulesGroupSelect.addEventListener('change', function () {
        const state = getPageState(page.key);
        state.changeRules.groupId = this.value;
        updatePageState(page.key, { changeRules: state.changeRules });
      });
    }
  });

  // Initialize state on page load
  ensurePermissionChangeState();

  console.log('Permission change pages initialized');
})();

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

(function initializeSearchFunctionality() {
  // Get all search inputs (one for each tab)
  const searchInputs = document.querySelectorAll('.wizard-sidebar__search-input');

  searchInputs.forEach(searchInput => {
    if (!searchInput) return;

    // Get the sidebar section this search belongs to
    const sidebarSection = searchInput.closest('.sidebar-section');
    if (!sidebarSection) return;

    // Get all navigation items in this sidebar
    const navItems = sidebarSection.querySelectorAll('.wizard-nav-item');
    const subItems = sidebarSection.querySelectorAll('.wizard-nav-subitem');

    // Build search index
    const searchIndex = [];

    // Index main navigation items
    navItems.forEach(navItem => {
      const text = navItem.querySelector('.wizard-nav-item__text')?.textContent || '';
      const step = navItem.getAttribute('data-step');
      const toggle = navItem.getAttribute('data-toggle');

      if (text && step) {
        searchIndex.push({
          type: 'main',
          text: text.toLowerCase(),
          element: navItem,
          step: step,
          toggle: toggle,
          submenu: toggle ? document.getElementById(toggle) : null
        });
      }
    });

    // Index sub-navigation items
    subItems.forEach(subItem => {
      const text = subItem.querySelector('.wizard-nav-subitem__text')?.textContent || '';
      const substep = subItem.getAttribute('data-substep');

      if (text && substep) {
        // Find parent main nav item
        const submenu = subItem.closest('.wizard-nav-submenu');
        const parentNavItem = submenu ? sidebarSection.querySelector(`[data-toggle="${submenu.id}"]`) : null;

        searchIndex.push({
          type: 'sub',
          text: text.toLowerCase(),
          element: subItem,
          substep: substep,
          submenu: submenu,
          parentNavItem: parentNavItem
        });
      }
    });

    // Handle search input
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase().trim();

      if (query === '') {
        // Reset: show all items
        searchIndex.forEach(item => {
          item.element.style.display = '';
          if (item.submenu) {
            item.submenu.style.display = '';
          }
        });
        return;
      }

      // Search and filter
      let hasResults = false;

      searchIndex.forEach(item => {
        if (item.text.includes(query)) {
          // Show matching item
          item.element.style.display = '';
          hasResults = true;

          // If it's a sub-item, make sure parent and submenu are visible
          if (item.type === 'sub' && item.parentNavItem && item.submenu) {
            item.parentNavItem.style.display = '';
            item.submenu.style.display = '';
            item.submenu.hidden = false;

            // Expand parent if collapsed
            if (item.parentNavItem.classList.contains('wizard-nav-item--expandable')) {
              item.parentNavItem.setAttribute('aria-expanded', 'true');
              const sidebarStep = item.parentNavItem.closest('.sidebar-step');
              if (sidebarStep) {
                sidebarStep.setAttribute('aria-expanded', 'true');
              }
            }
          }

          // If it's a main item with submenu, show the submenu
          if (item.type === 'main' && item.submenu) {
            item.submenu.style.display = '';
            item.submenu.hidden = false;
            item.element.setAttribute('aria-expanded', 'true');
            const sidebarStep = item.element.closest('.sidebar-step');
            if (sidebarStep) {
              sidebarStep.setAttribute('aria-expanded', 'true');
            }
          }
        } else {
          // Hide non-matching item
          item.element.style.display = 'none';
        }
      });

      // Handle sub-items visibility: hide submenu if no children match
      const submenus = sidebarSection.querySelectorAll('.wizard-nav-submenu');
      submenus.forEach(submenu => {
        const visibleSubItems = Array.from(submenu.querySelectorAll('.wizard-nav-subitem')).filter(
          item => item.style.display !== 'none'
        );

        if (visibleSubItems.length === 0) {
          submenu.style.display = 'none';

          // Also hide parent nav item if submenu is hidden
          const parentNavItem = sidebarSection.querySelector(`[data-toggle="${submenu.id}"]`);
          if (parentNavItem) {
            parentNavItem.style.display = 'none';
          }
        }
      });
    });

    // Handle clicking on search results
    subItems.forEach(subItem => {
      subItem.addEventListener('click', function (e) {
        e.preventDefault();
        const substep = this.getAttribute('data-substep');

        if (substep && typeof window.showScreen === 'function') {
          // Clear search
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));

          // Navigate to the substep
          window.showScreen(substep, { force: true });
        }
      });
    });
  });

  console.log('Search functionality initialized');
})();

// ========================================
// GROUP MANAGEMENT (Group Tab)
// ========================================

(function initializeGroupManagement() {
  const enableGroupCheckbox = document.getElementById('enable-group');
  const groupConfigSection = document.getElementById('group-config-section');
  const groupNameInput = document.getElementById('group-name');
  const groupThresholdInput = document.getElementById('group-threshold');
  const groupMembersList = document.getElementById('group-members-list');
  const addGroupMemberBtn = document.getElementById('add-group-member');

  if (!enableGroupCheckbox || !groupConfigSection) {
    console.warn('Group management elements not found');
    return;
  }

  // FIXED: Access wizardState from window (it's in a different IIFE scope)
  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('Group management: wizardState or persistState not available');
    return;
  }

  // Initialize with state
  function initializeGroupState() {
    if (!wizardState.form.group) {
      wizardState.form.group = {
        enabled: false,
        name: '',
        threshold: 2,
        members: [],
        permissions: {
          mint: true,
          burn: true,
          freeze: true,
          config: false,
          members: false
        }
      };
    }

    // Sync UI with state
    enableGroupCheckbox.checked = wizardState.form.group.enabled;
    toggleGroupSections(wizardState.form.group.enabled);

    if (groupNameInput) groupNameInput.value = wizardState.form.group.name;
    if (groupThresholdInput) groupThresholdInput.value = wizardState.form.group.threshold;

    // Render existing members
    renderGroupMembers();
  }

  // Toggle group configuration sections
  function toggleGroupSections(enabled) {
    if (groupConfigSection) {
      groupConfigSection.style.display = enabled ? 'block' : 'none';
    }
  }

  // Enable/disable group checkbox handler
  if (enableGroupCheckbox) {
    enableGroupCheckbox.addEventListener('change', function () {
      wizardState.form.group.enabled = this.checked;
      toggleGroupSections(this.checked);
      persistState();
    });
  }

  // Group name input handler
  if (groupNameInput) {
    groupNameInput.addEventListener('input', function () {
      wizardState.form.group.name = this.value;
      persistState();
    });
  }

  // Group threshold input handler
  if (groupThresholdInput) {
    groupThresholdInput.addEventListener('input', function () {
      const value = parseInt(this.value, 10);
      if (!isNaN(value) && value >= 1) {
        wizardState.form.group.threshold = value;
        persistState();
      }
    });
  }

  // Add group member button
  if (addGroupMemberBtn && groupMembersList) {
    addGroupMemberBtn.addEventListener('click', function () {
      const memberId = 'member-' + Date.now();
      wizardState.form.group.members.push({
        id: memberId,
        identityId: '',
        power: '1'
      });
      renderGroupMembers();
      persistState();

      // Focus the new member input
      setTimeout(() => {
        const newInput = document.querySelector(`input[data-member-id="${memberId}"][data-field="identityId"]`);
        if (newInput) newInput.focus();
      }, 0);
    });
  }

  // Render group members
  function renderGroupMembers() {
    if (!groupMembersList) return;

    groupMembersList.innerHTML = '';

    if (!wizardState.form.group.members || wizardState.form.group.members.length === 0) {
      // Show empty state
      const emptyState = document.createElement('p');
      emptyState.className = 'field-hint';
      emptyState.style.cssText = 'margin-bottom: var(--space-3); color: var(--color-text-muted);';
      emptyState.textContent = 'No members added yet. Click "Add Member" to get started.';
      groupMembersList.appendChild(emptyState);
      return;
    }

    wizardState.form.group.members.forEach((member, index) => {
      const memberEntry = document.createElement('div');
      memberEntry.className = 'field-group';
      memberEntry.style.cssText = 'padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';
      memberEntry.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <label class="wizard-field__label" style="margin-bottom: 0;">Member ${index + 1}</label>
          <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-member="${member.id}">Remove</button>
        </div>
        <div style="margin-bottom: var(--space-3);">
          <label class="wizard-field__label" for="member-identity-${member.id}">Identity ID *</label>
          <input class="wizard-field__input" type="text" id="member-identity-${member.id}" data-member-id="${member.id}" data-field="identityId" placeholder="Enter a Base58 ID" value="${member.identityId || ''}">
          <span class="field-hint">Base58-encoded Dash Platform identity ID (43-44 characters)</span>
        </div>
        <div>
          <label class="wizard-field__label" for="member-power-${member.id}">Voting Power *</label>
          <input class="wizard-field__input" type="number" id="member-power-${member.id}" data-member-id="${member.id}" data-field="power" min="1" placeholder="e.g., 1" value="${member.power || '1'}">
          <span class="field-hint">Weight of this member's vote (positive integer)</span>
        </div>
      `;
      groupMembersList.appendChild(memberEntry);
    });
  }

  // Handle member input changes and removals
  if (groupMembersList) {
    groupMembersList.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-member-id')) {
        const memberId = e.target.getAttribute('data-member-id');
        const field = e.target.getAttribute('data-field');
        const member = wizardState.form.group.members.find(m => m.id === memberId);
        if (member && field) {
          member[field] = e.target.value;
          persistState();
        }
      }
    });

    groupMembersList.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-member')) {
        const memberId = e.target.getAttribute('data-remove-member');
        const index = wizardState.form.group.members.findIndex(m => m.id === memberId);
        if (index !== -1) {
          wizardState.form.group.members.splice(index, 1);
          renderGroupMembers();
          persistState();
        }
      }
    });
  }

  // Initialize on load
  initializeGroupState();

  console.log('Group management initialized');
})();

// ==================== DOCUMENT TYPES MANAGEMENT ====================
(function () {
  const documentTypesList = document.getElementById('document-types-list');
  const documentTypesEmpty = document.getElementById('document-types-empty');
  const documentTypeAddButton = document.getElementById('document-type-add');
  const documentTypeModal = document.getElementById('document-type-modal');
  const documentModalTitle = document.getElementById('document-modal-title');
  const documentModalClose = document.getElementById('document-modal-close');
  const documentModalCancel = document.getElementById('document-modal-cancel');
  const documentModalSave = document.getElementById('document-modal-save');
  const documentTypeForm = document.getElementById('document-type-form');
  const documentTypeNameInput = document.getElementById('document-type-name');
  const documentTypeSchemaInput = document.getElementById('document-type-schema');
  const documentTypeMessage = document.getElementById('document-type-message');

  let editingDocumentType = null;

  // Utility buttons for JSON Schema textarea
  const schemaSampleBtn = document.getElementById('document-schema-sample');
  const schemaPasteBtn = document.getElementById('document-schema-paste');
  const schemaFormatBtn = document.getElementById('document-schema-format');
  const schemaClearBtn = document.getElementById('document-schema-clear');

  // Paste from clipboard
  if (schemaPasteBtn) {
    schemaPasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        documentTypeSchemaInput.value = text;

        // Try to format it automatically
        try {
          const parsed = JSON.parse(text);
          documentTypeSchemaInput.value = JSON.stringify(parsed, null, 2);
          documentTypeMessage.textContent = '✅ JSON pasted and formatted successfully!';
          documentTypeMessage.style.color = 'var(--color-success)';
          setTimeout(() => {
            documentTypeMessage.textContent = '';
          }, 3000);
        } catch (e) {
          documentTypeMessage.textContent = '⚠️ Pasted, but JSON is invalid. Please fix syntax errors.';
          documentTypeMessage.style.color = 'var(--color-warning)';
        }
      } catch (err) {
        documentTypeMessage.textContent = '❌ Could not read from clipboard. Please paste manually (Ctrl+V / Cmd+V).';
        documentTypeMessage.style.color = 'var(--color-error)';
      }
    });
  }

  // Format JSON
  if (schemaFormatBtn) {
    schemaFormatBtn.addEventListener('click', () => {
      const text = documentTypeSchemaInput.value.trim();
      if (!text) {
        documentTypeMessage.textContent = 'Nothing to format - textarea is empty.';
        documentTypeMessage.style.color = 'var(--color-warning)';
        return;
      }

      try {
        const parsed = JSON.parse(text);
        documentTypeSchemaInput.value = JSON.stringify(parsed, null, 2);
        documentTypeMessage.textContent = '✅ JSON formatted successfully!';
        documentTypeMessage.style.color = 'var(--color-success)';
        setTimeout(() => {
          documentTypeMessage.textContent = '';
        }, 3000);
      } catch (e) {
        documentTypeMessage.textContent = '❌ Invalid JSON: ' + e.message;
        documentTypeMessage.style.color = 'var(--color-error)';
      }
    });
  }

  // Clear textarea
  if (schemaClearBtn) {
    schemaClearBtn.addEventListener('click', () => {
      if (documentTypeSchemaInput.value.trim()) {
        if (confirm('Are you sure you want to clear the JSON Schema?')) {
          documentTypeSchemaInput.value = '';
          documentTypeMessage.textContent = '';
        }
      }
    });
  }

  // Sample schema templates
  const SAMPLE_SCHEMAS = {
    user: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          position: 0,
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-zA-Z0-9_-]+$',
          description: 'Unique username'
        },
        email: {
          type: 'string',
          position: 1,
          format: 'email',
          maxLength: 100,
          description: 'User email address'
        },
        displayName: {
          type: 'string',
          position: 2,
          maxLength: 100,
          description: 'Display name'
        },
        bio: {
          type: 'string',
          position: 3,
          maxLength: 500,
          description: 'User biography'
        },
        createdAt: {
          type: 'integer',
          position: 4,
          minimum: 0,
          description: 'Account creation timestamp'
        }
      },
      required: ['username', 'email'],
      additionalProperties: false
    },
    post: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          position: 0,
          minLength: 1,
          maxLength: 200,
          description: 'Post title'
        },
        content: {
          type: 'string',
          position: 1,
          minLength: 1,
          maxLength: 10000,
          description: 'Post content'
        },
        authorId: {
          type: 'string',
          position: 2,
          minLength: 42,
          maxLength: 44,
          pattern: '^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$',
          description: 'Author identity ID'
        },
        createdAt: {
          type: 'integer',
          position: 3,
          minimum: 0,
          description: 'Post creation timestamp'
        },
        tags: {
          type: 'array',
          position: 4,
          items: {
            type: 'string',
            maxLength: 50
          },
          maxItems: 10,
          description: 'Post tags'
        }
      },
      required: ['title', 'content', 'authorId'],
      additionalProperties: false
    },
    nftMetadata: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          position: 0,
          minLength: 1,
          maxLength: 100,
          description: 'NFT name'
        },
        description: {
          type: 'string',
          position: 1,
          maxLength: 1000,
          description: 'NFT description'
        },
        imageUrl: {
          type: 'string',
          position: 2,
          format: 'uri',
          maxLength: 500,
          description: 'URL to NFT image'
        },
        attributes: {
          type: 'array',
          position: 3,
          items: {
            type: 'object',
            properties: {
              trait_type: {
                type: 'string',
                maxLength: 50
              },
              value: {
                type: 'string',
                maxLength: 100
              }
            },
            additionalProperties: false
          },
          maxItems: 20,
          description: 'NFT attributes/traits'
        },
        creatorId: {
          type: 'string',
          position: 4,
          minLength: 42,
          maxLength: 44,
          description: 'Creator identity ID'
        }
      },
      required: ['name', 'imageUrl'],
      additionalProperties: false
    }
  };

  // Load sample schema
  if (schemaSampleBtn) {
    schemaSampleBtn.addEventListener('click', () => {
      // Create a selection modal or just cycle through samples
      const currentText = documentTypeSchemaInput.value.trim();

      // Determine which sample to show next
      let sampleKey = 'user'; // default

      if (currentText) {
        // Try to detect which sample is currently loaded and show the next one
        try {
          const currentSchema = JSON.parse(currentText);
          if (currentSchema.properties?.username) {
            sampleKey = 'post'; // user -> post
          } else if (currentSchema.properties?.title && currentSchema.properties?.content) {
            sampleKey = 'nftMetadata'; // post -> nftMetadata
          } else if (currentSchema.properties?.imageUrl) {
            sampleKey = 'user'; // nftMetadata -> user (cycle)
          }
        } catch (e) {
          // If can't parse, just use default
        }
      }

      const sample = SAMPLE_SCHEMAS[sampleKey];
      documentTypeSchemaInput.value = JSON.stringify(sample, null, 2);

      const sampleNames = { user: 'User Profile', post: 'Blog Post', nftMetadata: 'NFT Metadata' };
      documentTypeMessage.textContent = `✅ Loaded "${sampleNames[sampleKey]}" sample schema. Click again to cycle through examples.`;
      documentTypeMessage.style.color = 'var(--color-success)';

      setTimeout(() => {
        documentTypeMessage.textContent = '';
      }, 5000);
    });
  }

  // Render document types list
  function renderDocumentTypes() {
    if (!documentTypesList) return;

    const documentTypes = wizardState.form.documentTypes || {};
    const typeNames = Object.keys(documentTypes);

    // Show/hide empty message
    if (documentTypesEmpty) {
      documentTypesEmpty.style.display = typeNames.length === 0 ? 'block' : 'none';
    }

    // Clear existing items (except empty message)
    const items = documentTypesList.querySelectorAll('.document-type-item');
    items.forEach(item => item.remove());

    // Render each document type
    typeNames.forEach(typeName => {
      const schema = documentTypes[typeName];
      const item = document.createElement('div');
      item.className = 'document-type-item';

      const schemaPreview = JSON.stringify(schema).substring(0, 100) + '...';

      item.innerHTML = `
        <div class="document-type-item__info">
          <div class="document-type-item__name">${typeName}</div>
          <div class="document-type-item__schema">${schemaPreview}</div>
        </div>
        <div class="document-type-item__actions">
          <button class="document-type-item__btn" data-edit-doc="${typeName}">Edit</button>
          <button class="document-type-item__btn document-type-item__btn--delete" data-delete-doc="${typeName}">Delete</button>
        </div>
      `;

      documentTypesList.appendChild(item);
    });
  }

  // Open modal for adding/editing
  function openModal(typeName = null) {
    if (!documentTypeModal) return;

    editingDocumentType = typeName;

    if (typeName) {
      // Edit mode
      documentModalTitle.textContent = 'Edit Document Type';
      documentTypeNameInput.value = typeName;
      documentTypeNameInput.disabled = true; // Can't change name when editing
      const schema = wizardState.form.documentTypes[typeName];
      documentTypeSchemaInput.value = JSON.stringify(schema, null, 2);
    } else {
      // Add mode
      documentModalTitle.textContent = 'Add Document Type';
      documentTypeNameInput.value = '';
      documentTypeNameInput.disabled = false;
      documentTypeSchemaInput.value = '';
    }

    documentTypeMessage.textContent = '';
    documentTypeModal.hidden = false;
  }

  // Close modal
  function closeModal() {
    if (!documentTypeModal) return;
    documentTypeModal.hidden = true;
    editingDocumentType = null;
    documentTypeForm.reset();
  }

  // Save document type
  function saveDocumentType() {
    const typeName = documentTypeNameInput.value.trim();
    const schemaText = documentTypeSchemaInput.value.trim();

    // Validate name
    if (!typeName) {
      documentTypeMessage.textContent = 'Document type name is required.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(typeName)) {
      documentTypeMessage.textContent = 'Name must start with a letter and contain only letters, numbers, and underscores.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Check if name already exists (only when adding new)
    if (!editingDocumentType && wizardState.form.documentTypes[typeName]) {
      documentTypeMessage.textContent = 'A document type with this name already exists.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Validate JSON
    let schema;
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      documentTypeMessage.textContent = `❌ Invalid JSON syntax: ${e.message}. Click "Format" to check for errors.`;
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Check if user pasted the entire Platform contract instead of just a document schema
    if (schema.$format_version || schema.tokens || schema.ownerId || schema.documentSchemas) {
      documentTypeMessage.textContent = '⚠️ You pasted the entire Platform contract. Please paste ONLY the document schema (without the contract wrapper). Click "Sample" to see the correct format.';
      documentTypeMessage.style.color = 'var(--color-warning)';
      return;
    }

    // Basic validation for Dash Platform requirements
    if (!schema.type || schema.type !== 'object') {
      documentTypeMessage.textContent = '❌ Schema must have "type": "object" at the root level. Click "Sample" to see a valid example.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (!schema.properties || typeof schema.properties !== 'object' || Object.keys(schema.properties).length === 0) {
      documentTypeMessage.textContent = '❌ Schema must have a "properties" object with at least one field. Click "Sample" to see how to define properties.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (schema.additionalProperties !== false) {
      documentTypeMessage.textContent = '❌ Schema must have "additionalProperties": false (Dash Platform requirement). Click "Sample" to see the correct format.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Validate each property has type and position
    const properties = schema.properties;
    for (const propName in properties) {
      const prop = properties[propName];
      if (!prop.type) {
        documentTypeMessage.textContent = `❌ Property "${propName}" is missing the "type" field. Each property must specify a type (e.g., "string", "integer", "array").`;
        documentTypeMessage.style.color = 'var(--color-error)';
        return;
      }
      if (typeof prop.position !== 'number') {
        documentTypeMessage.textContent = `❌ Property "${propName}" is missing the "position" field or it's not a number. Each property must have a numeric "position" (e.g., 0, 1, 2).`;
        documentTypeMessage.style.color = 'var(--color-error)';
        return;
      }
    }

    // Save to state
    if (!wizardState.form.documentTypes) {
      wizardState.form.documentTypes = {};
    }

    // If editing, remove old name first (in case it changed)
    if (editingDocumentType && editingDocumentType !== typeName) {
      delete wizardState.form.documentTypes[editingDocumentType];
    }

    wizardState.form.documentTypes[typeName] = schema;
    persistState();
    renderDocumentTypes();
    closeModal();

    console.log('Document type saved:', typeName, schema);
  }

  // Delete document type
  function deleteDocumentType(typeName) {
    if (!confirm(`Are you sure you want to delete the document type "${typeName}"?`)) {
      return;
    }

    delete wizardState.form.documentTypes[typeName];
    persistState();
    renderDocumentTypes();

    console.log('Document type deleted:', typeName);
  }

  // Event listeners
  if (documentTypeAddButton) {
    documentTypeAddButton.addEventListener('click', () => openModal());
  }

  if (documentModalClose) {
    documentModalClose.addEventListener('click', closeModal);
  }

  if (documentModalCancel) {
    documentModalCancel.addEventListener('click', closeModal);
  }

  if (documentModalSave) {
    documentModalSave.addEventListener('click', saveDocumentType);
  }

  // Close modal on overlay click
  if (documentTypeModal) {
    documentTypeModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('document-modal__overlay')) {
        closeModal();
      }
    });
  }

  // Handle edit and delete buttons
  if (documentTypesList) {
    documentTypesList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-doc]');
      const deleteBtn = e.target.closest('[data-delete-doc]');

      if (editBtn) {
        const typeName = editBtn.getAttribute('data-edit-doc');
        openModal(typeName);
      } else if (deleteBtn) {
        const typeName = deleteBtn.getAttribute('data-delete-doc');
        deleteDocumentType(typeName);
      }
    });
  }

  // Initialize on load
  renderDocumentTypes();

  console.log('Document types management initialized');
})();

// ========================================
// KEYWORDS & DESCRIPTION (Search Metadata)
// ========================================
// Moved from naming to search step
// Event listeners and state management handled in main wizard code above


// ========================================
// PRE-PROGRAMMED DISTRIBUTION
// ========================================

(function initializePreProgrammedDistribution() {
  const preprogrammedContainer = document.getElementById('preprogrammed-entries');
  const addPreprogrammedBtn = document.getElementById('add-preprogrammed-entry');
  const distributionTypeRadios = document.querySelectorAll('input[name="distribution-type"]');

  if (!preprogrammedContainer || !addPreprogrammedBtn) {
    console.warn('Pre-programmed distribution elements not found');
    return;
  }

  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('wizardState or persistState not available for preprogrammed distribution');
    return;
  }

  // Ensure distribution.preProgrammed structure exists
  if (!wizardState.form.distribution.preProgrammed) {
    wizardState.form.distribution.preProgrammed = { entries: [] };
  }

  // Generate unique ID for entries
  let entryIdCounter = 0;
  function generateEntryId() {
    return `preprogrammed-${Date.now()}-${entryIdCounter++}`;
  }

  // Collect data from all preprogrammed entries in the DOM
  function collectPreProgrammedData() {
    const entries = [];
    const entryElements = preprogrammedContainer.querySelectorAll('.preprogrammed-entry');

    entryElements.forEach((entryEl) => {
      const timestampInput = entryEl.querySelector('input[name="preprogrammed-timestamp"]');
      const identityInput = entryEl.querySelector('input[name="preprogrammed-identity"]');
      const amountInput = entryEl.querySelector('input[name="preprogrammed-amount"]');

      const timestamp = timestampInput ? timestampInput.value.trim() : '';
      const identityId = identityInput ? identityInput.value.trim() : '';
      const amount = amountInput ? amountInput.value.trim() : '';

      // Only save entries with at least timestamp
      if (timestamp) {
        entries.push({
          id: entryEl.getAttribute('data-entry-id') || generateEntryId(),
          timestamp: timestamp,
          identityId: identityId,
          amount: amount
        });
      }
    });

    return entries;
  }

  // Save current preprogrammed data to state
  function savePreProgrammedData() {
    const entries = collectPreProgrammedData();
    wizardState.form.distribution.preProgrammed.entries = entries;
    persistState();
    console.log('Saved preprogrammed entries:', entries.length);
  }

  // Validate preprogrammed entry
  function validateEntry(entryEl) {
    const timestampInput = entryEl.querySelector('input[name="preprogrammed-timestamp"]');
    const identityInput = entryEl.querySelector('input[name="preprogrammed-identity"]');
    const amountInput = entryEl.querySelector('input[name="preprogrammed-amount"]');

    let isValid = true;

    // Validate timestamp (required)
    if (timestampInput) {
      const timestamp = timestampInput.value.trim();
      if (!timestamp) {
        timestampInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        timestampInput.style.borderColor = '';
      }
    }

    // Validate identity ID (required, basic format check)
    if (identityInput) {
      const identityId = identityInput.value.trim();
      if (!identityId || identityId.length < 20) {
        identityInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        identityInput.style.borderColor = '';
      }
    }

    // Validate amount (required, must be positive number)
    if (amountInput) {
      const amount = amountInput.value.trim();
      const numAmount = parseInt(amount, 10);
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        amountInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        amountInput.style.borderColor = '';
      }
    }

    return isValid;
  }

  // Create a new preprogrammed entry element
  function createEntryElement(data = {}) {
    const entryId = data.id || generateEntryId();
    const entry = document.createElement('div');
    entry.className = 'field-group preprogrammed-entry';
    entry.setAttribute('data-entry-id', entryId);
    entry.style.cssText = 'padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';

    entry.innerHTML = `
      <div class="field-group">
        <label class="wizard-field__label">Release timestamp *</label>
        <input class="wizard-field__input" type="datetime-local" name="preprogrammed-timestamp" value="${data.timestamp || ''}" required>
        <span class="field-hint">When tokens should be available for claim</span>
      </div>
      <div class="field-group">
        <label class="wizard-field__label">Recipient Identity ID *</label>
        <input class="wizard-field__input" type="text" name="preprogrammed-identity" placeholder="e.g., 4hKFP3mFB9vku8VJKcZvwVN123..." value="${data.identityId || ''}" required>
        <span class="field-hint">Dash Platform identity that can claim the tokens</span>
      </div>
      <div class="field-group">
        <label class="wizard-field__label">Token amount *</label>
        <input class="wizard-field__input" type="text" name="preprogrammed-amount" placeholder="e.g., 1000000" value="${data.amount || ''}" required>
        <span class="field-hint">Number of tokens to distribute</span>
      </div>
      <button class="wizard-button wizard-button--danger wizard-button--small" type="button" data-remove-preprogrammed style="margin-top: var(--space-2);">Remove</button>
    `;

    // Add event listeners to inputs for auto-save
    const inputs = entry.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        validateEntry(entry);
        savePreProgrammedData();
      });
      input.addEventListener('change', () => {
        savePreProgrammedData();
      });
    });

    return entry;
  }

  // Load saved preprogrammed entries from state
  function loadPreProgrammedEntries() {
    const entries = wizardState.form.distribution.preProgrammed?.entries || [];

    // Clear existing entries in DOM
    preprogrammedContainer.innerHTML = '';

    // If no saved entries, add one empty entry
    if (entries.length === 0) {
      const defaultEntry = createEntryElement();
      preprogrammedContainer.appendChild(defaultEntry);
    } else {
      // Load saved entries
      entries.forEach(data => {
        const entryEl = createEntryElement(data);
        preprogrammedContainer.appendChild(entryEl);
      });
    }
  }

  // Handle add entry button
  addPreprogrammedBtn.addEventListener('click', () => {
    const newEntry = createEntryElement();
    preprogrammedContainer.appendChild(newEntry);
    savePreProgrammedData();
  });

  // Handle remove entry button (event delegation)
  preprogrammedContainer.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-remove-preprogrammed')) {
      const entry = e.target.closest('.preprogrammed-entry');
      const entryCount = preprogrammedContainer.querySelectorAll('.preprogrammed-entry').length;

      // Keep at least one entry
      if (entryCount > 1) {
        entry.remove();
        savePreProgrammedData();
      } else {
        // Clear the last entry instead of removing
        const inputs = entry.querySelectorAll('input');
        inputs.forEach(input => input.value = '');
        savePreProgrammedData();
      }
    }
  });

  // Load entries when distribution type changes to preprogrammed
  if (distributionTypeRadios.length > 0) {
    distributionTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'preprogrammed' && e.target.checked) {
          loadPreProgrammedEntries();
        }
      });
    });
  }

  // Initial load
  loadPreProgrammedEntries();

  console.log('Pre-programmed distribution initialized');
})();


// ═══════════════════════════════════════════════════════
// TEMPLATE SELECTION
// ═══════════════════════════════════════════════════════

(function initializeTemplateSelection() {
  // Note: Template cards are now on the standalone Templates Page with [data-tpl] attribute
  // The modal and template logic still needs to be initialized for that page to work

  // Note: Access window functions directly in functions below since they may not be defined yet when this IIFE runs

  // Token Templates
  const TOKEN_TEMPLATES = {
    scratch: null, // No template, start fresh

    'simple-fixed': {
      name: 'SimpleToken',
      description: 'A basic fixed-supply token with burn capability and transfer notes',
      keywords: ['simple', 'fixed', 'basic', 'burnable'],
      decimals: 8,
      baseSupply: '1000000',
      maxSupply: '1000000',
      useMaxSupply: true,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: false,
        purchases: false
      },
      startAsPaused: false,
      manualMint: { enabled: false },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: false },
      unfreeze: { enabled: false },
      destroyFrozen: { enabled: false },
      emergency: { enabled: false },
      transferNotesEnabled: true,
      transferNoteTypes: {
        public: true,
        sharedEncrypted: false,
        privateEncrypted: false
      },
      tradeMode: 'closed',
      changeControl: {
        mint: false,
        burn: false,
        freeze: false,
        unfreeze: false,
        destroyFrozen: false,
        emergency: false
      },
      distribution: null,
      // Template wiring metadata
      enabledFeatures: {
        manualMint: false,
        manualBurn: true,
        manualFreeze: false,
        unfreeze: false,
        destroyFrozen: false,
        distribution: false,
        transferNotes: true
      },
      recommendedSubsteps: [
        'permissions-manual-burn',
        'permissions-transfer'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '1000000',
        maxSupplyDefault: '1000000',
        decimalsDefault: 8,
        useMaxSupplyDefault: true
      }
    },

    utility: {
      name: 'UtilityToken',
      description: 'Full-featured token for platform access, payments, and compliance',
      keywords: ['utility', 'platform', 'service', 'compliance', 'freeze'],
      decimals: 2,
      baseSupply: '10000000',
      maxSupply: '100000000',
      useMaxSupply: true,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: true,
        purchases: true
      },
      startAsPaused: false,
      allowTransferToFrozenBalance: true,
      transferNotesEnabled: true,
      transferNoteTypes: {
        public: true,
        sharedEncrypted: true,
        privateEncrypted: false
      },
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: true },
      unfreeze: { enabled: true },
      destroyFrozen: { enabled: true },
      emergency: { enabled: true },
      tradeMode: 'closed',
      changeControl: {
        mint: false,
        burn: false,
        freeze: true,
        unfreeze: true,
        destroyFrozen: true,
        emergency: true
      },
      distribution: null,
      // Template wiring metadata
      enabledFeatures: {
        manualMint: true,
        manualBurn: true,
        manualFreeze: true,
        unfreeze: true,
        destroyFrozen: true,
        distribution: false,
        transferNotes: true
      },
      recommendedSubsteps: [
        'permissions-manual-mint',
        'permissions-manual-burn',
        'permissions-manual-freeze',
        'permissions-emergency',
        'permissions-transfer'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '10000000',
        maxSupplyDefault: '100000000',
        decimalsDefault: 2,
        useMaxSupplyDefault: true
      }
    },

    reward: {
      name: 'RewardToken',
      description: 'Continuous emission for user rewards',
      keywords: ['reward', 'points', 'loyalty'],
      decimals: 0,
      baseSupply: '0',
      maxSupply: null,
      useMaxSupply: false,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: false,
        purchases: false
      },
      startAsPaused: false,
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: false },
      unfreeze: { enabled: false },
      destroyFrozen: { enabled: false },
      emergency: { enabled: false },
      tradeMode: 'closed',
      changeControl: {
        mint: true,
        burn: true,
        freeze: false,
        unfreeze: false,
        destroyFrozen: false,
        emergency: false
      },
      distribution: {
        cadence: {
          type: 'TimeBasedDistribution',
          intervalSeconds: '86400'  // 24 hours = 86400 seconds
        },
        emission: {
          type: 'FixedAmount',
          amount: '1000'
        }
      },
      // Template wiring metadata
      enabledFeatures: {
        manualMint: true,
        manualBurn: true,
        manualFreeze: false,
        unfreeze: false,
        destroyFrozen: false,
        distribution: true,
        transferNotes: false
      },
      recommendedSubsteps: [
        'permissions-manual-mint',
        'permissions-manual-burn',
        'distribution-perpetual'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '0',
        maxSupplyDefault: null,
        decimalsDefault: 0,
        useMaxSupplyDefault: false
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // BUSINESS & EXPERIMENT TEMPLATES
    // ═══════════════════════════════════════════════════════════════════

    membership: {
      name: 'MembershipToken',
      description: 'Subscription-based access token for tiered memberships and gated content',
      keywords: ['membership', 'subscription', 'access', 'tier', 'premium'],
      decimals: 0,  // Whole tokens for membership levels
      baseSupply: '10000',
      maxSupply: '100000',
      useMaxSupply: true,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: true,
        purchases: false
      },
      startAsPaused: false,
      allowTransferToFrozenBalance: false,
      transferNotesEnabled: true,
      transferNoteTypes: {
        public: true,
        sharedEncrypted: true,
        privateEncrypted: false
      },
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: true },  // Suspend members
      unfreeze: { enabled: true },
      destroyFrozen: { enabled: false },
      emergency: { enabled: true },
      tradeMode: 'closed',  // Non-transferable memberships
      changeControl: {
        mint: true,
        burn: true,
        freeze: true,
        unfreeze: true,
        destroyFrozen: false,
        emergency: true
      },
      distribution: null,
      // Template wiring metadata
      enabledFeatures: {
        manualMint: true,
        manualBurn: true,
        manualFreeze: true,
        unfreeze: true,
        destroyFrozen: false,
        distribution: false,
        transferNotes: true
      },
      recommendedSubsteps: [
        'permissions-manual-mint',
        'permissions-manual-burn',
        'permissions-manual-freeze',
        'permissions-emergency',
        'permissions-transfer'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '10000',
        maxSupplyDefault: '100000',
        decimalsDefault: 0,
        useMaxSupplyDefault: true
      }
    },

    testnet: {
      name: 'TestToken',
      description: 'Developer sandbox token with all features enabled for experimentation',
      keywords: ['test', 'dev', 'sandbox', 'experiment', 'debug'],
      decimals: 8,
      baseSupply: '1000000000',  // 1 billion for testing
      maxSupply: null,
      useMaxSupply: false,  // Unlimited for testing
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: true,
        purchases: true
      },
      startAsPaused: false,
      allowTransferToFrozenBalance: true,
      transferNotesEnabled: true,
      transferNoteTypes: {
        public: true,
        sharedEncrypted: true,
        privateEncrypted: true
      },
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: true },
      unfreeze: { enabled: true },
      destroyFrozen: { enabled: true },
      emergency: { enabled: true },
      tradeMode: 'permissionless',  // Open trading for testing
      changeControl: {
        mint: true,
        burn: true,
        freeze: true,
        unfreeze: true,
        destroyFrozen: true,
        emergency: true
      },
      distribution: {
        cadence: {
          type: 'BlockBasedDistribution',
          intervalBlocks: '10'  // Fast emissions for testing
        },
        emission: {
          type: 'FixedAmount',
          amount: '10000'
        }
      },
      // Template wiring metadata
      enabledFeatures: {
        manualMint: true,
        manualBurn: true,
        manualFreeze: true,
        unfreeze: true,
        destroyFrozen: true,
        distribution: true,
        transferNotes: true
      },
      recommendedSubsteps: [
        'permissions-manual-mint',
        'permissions-manual-burn',
        'permissions-manual-freeze',
        'permissions-emergency',
        'permissions-transfer',
        'distribution-perpetual',
        'advanced'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '1000000000',
        maxSupplyDefault: null,
        decimalsDefault: 8,
        useMaxSupplyDefault: false
      }
    },

    invoice: {
      name: 'InvoiceToken',
      description: 'B2B payment token with encrypted notes for invoices and audit trails',
      keywords: ['invoice', 'b2b', 'payment', 'business', 'audit', 'accounting'],
      decimals: 2,  // Currency-like precision
      baseSupply: '0',  // Mint as needed for invoices
      maxSupply: null,
      useMaxSupply: false,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: true,
        purchases: false
      },
      startAsPaused: false,
      allowTransferToFrozenBalance: false,
      transferNotesEnabled: true,
      transferNoteTypes: {
        public: false,
        sharedEncrypted: true,  // Encrypted invoices
        privateEncrypted: true
      },
      manualMint: { enabled: true },  // Mint per invoice
      manualBurn: { enabled: true },  // Burn on payment
      manualFreeze: { enabled: true },  // Dispute resolution
      unfreeze: { enabled: true },
      destroyFrozen: { enabled: false },
      emergency: { enabled: true },
      tradeMode: 'closed',  // Direct transfers only
      changeControl: {
        mint: true,
        burn: true,
        freeze: true,
        unfreeze: true,
        destroyFrozen: false,
        emergency: true
      },
      distribution: null,
      // Template wiring metadata
      enabledFeatures: {
        manualMint: true,
        manualBurn: true,
        manualFreeze: true,
        unfreeze: true,
        destroyFrozen: false,
        distribution: false,
        transferNotes: true
      },
      recommendedSubsteps: [
        'permissions-manual-mint',
        'permissions-manual-burn',
        'permissions-manual-freeze',
        'permissions-emergency',
        'permissions-transfer'
      ],
      supplyConfig: {
        editable: true,
        baseSupplyDefault: '0',
        maxSupplyDefault: null,
        decimalsDefault: 2,
        useMaxSupplyDefault: false
      }
    }
  };

  /**
   * Expand sidebar sections for enabled features when template is applied.
   * This makes it easy for users to see which features were configured by the template.
   */
  function expandSidebarForEnabledFeatures(state) {
    const permissions = state.form?.permissions || {};

    // Check if any permission features are enabled that warrant expanding permissions submenu
    const hasEnabledPermissionFeatures =
      permissions.manualMint?.enabled ||
      permissions.manualBurn?.enabled ||
      permissions.manualFreeze?.enabled ||
      permissions.unfreeze?.enabled ||
      permissions.destroyFrozen?.enabled ||
      permissions.emergencyAction?.enabled ||
      permissions.transferNotesEnabled;

    // Expand permissions submenu if any features are enabled
    if (hasEnabledPermissionFeatures) {
      const permissionsSubmenu = document.getElementById('permissions-submenu');
      const permissionsButton = document.querySelector('[data-toggle="permissions-submenu"]');
      if (permissionsSubmenu && permissionsButton) {
        permissionsSubmenu.hidden = false;
        permissionsButton.setAttribute('aria-expanded', 'true');
        const sidebarStep = permissionsButton.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Check if distribution is enabled
    const hasDistribution = state.form?.distribution?.enablePerpetual;
    if (hasDistribution) {
      const distributionSubmenu = document.getElementById('distribution-submenu');
      const distributionButton = document.querySelector('[data-toggle="distribution-submenu"]');
      if (distributionSubmenu && distributionButton) {
        distributionSubmenu.hidden = false;
        distributionButton.setAttribute('aria-expanded', 'true');
        const sidebarStep = distributionButton.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Expand advanced submenu if trading rules are configured
    const hasAdvancedFeatures = state.form?.advanced?.tradeMode && state.form?.advanced?.tradeMode !== 'closed';
    if (hasAdvancedFeatures) {
      const advancedSubmenu = document.getElementById('advanced-submenu');
      const advancedButton = document.querySelector('[data-toggle="advanced-submenu"]');
      if (advancedSubmenu && advancedButton) {
        advancedSubmenu.hidden = false;
        advancedButton.setAttribute('aria-expanded', 'true');
        const sidebarStep = advancedButton.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
      }
    }
  }

  function loadTemplate(templateKey) {
    console.log('loadTemplate called with:', templateKey);
    const template = TOKEN_TEMPLATES[templateKey];
    const state = window.wizardState;

    if (!state) {
      console.error('wizardState not available');
      return;
    }
    console.log('Template found:', template?.name);

    if (templateKey === 'scratch' || !template) {
      // Start from scratch - just navigate to naming
      state.activeTemplate = 'scratch';
      state.templateMeta = {
        appliedTemplate: 'scratch',
        appliedAt: Date.now(),
        customizations: { supplyOverrides: {} },
        deviations: {}
      };
      clearTemplateHighlights();
      clearFeatureIndicators();
      updateTemplateIndicator('scratch');

      // Switch to Token tab
      if (window.switchTab) {
        window.switchTab('token');
      }

      if (window.showScreen) {
        window.showScreen('naming', { force: true });
      }
      return;
    }

    // Capture supply overrides from modal before applying
    const supplyOverrides = {};
    const baseSupplyEl = document.getElementById('template-base-supply');
    const maxSupplyEl = document.getElementById('template-max-supply');
    const decimalsEl = document.getElementById('template-decimals');

    if (baseSupplyEl && baseSupplyEl.value) {
      supplyOverrides.baseSupply = baseSupplyEl.value;
    }
    if (maxSupplyEl) {
      supplyOverrides.maxSupply = maxSupplyEl.value || null;
      supplyOverrides.useMaxSupply = Boolean(maxSupplyEl.value);
    }
    if (decimalsEl && decimalsEl.value) {
      supplyOverrides.decimals = parseInt(decimalsEl.value, 10);
    }

    // Capture feature overrides from toggle state
    // featureOverrides is populated by feature toggle click handlers
    const capturedFeatureOverrides = { ...featureOverrides };

    // Store template metadata
    state.templateMeta = {
      appliedTemplate: templateKey,
      appliedAt: Date.now(),
      customizations: { supplyOverrides, featureOverrides: capturedFeatureOverrides },
      deviations: {}
    };
    state.activeTemplate = templateKey;

    // Clear previous template highlights
    clearTemplateHighlights();

    // Load template into wizard state
    // Note: Token name is intentionally NOT loaded from template - users must choose their own unique name
    state.form.tokenName = '';

    // Search metadata
    state.form.search = state.form.search || {};
    state.form.search.description = template.description || '';
    state.form.search.keywords = template.keywords && Array.isArray(template.keywords) ? template.keywords.join(', ') : '';

    // Permissions - apply supply overrides if provided, otherwise use template defaults
    state.form.permissions = state.form.permissions || {};
    state.form.permissions.decimals = supplyOverrides.decimals ?? template.decimals ?? 8;
    state.form.permissions.baseSupply = supplyOverrides.baseSupply ?? template.baseSupply ?? '0';
    state.form.permissions.maxSupply = supplyOverrides.maxSupply ?? template.maxSupply ?? '';
    state.form.permissions.useMaxSupply = supplyOverrides.useMaxSupply ?? template.useMaxSupply ?? false;

    // Apply feature overrides for history tracking
    const historyOverride = capturedFeatureOverrides.history;
    if (historyOverride !== undefined) {
      // User toggled history feature - enable/disable all tracking together
      state.form.permissions.keepsHistory = {
        transfers: historyOverride,
        mints: historyOverride,
        burns: historyOverride,
        freezes: historyOverride
      };
    } else {
      state.form.permissions.keepsHistory = template.keepsHistory || {};
    }

    state.form.permissions.startAsPaused = template.startAsPaused || false;

    // Apply feature overrides for mint/burn/freeze with proper authorization defaults
    // When enabled: performerType/ruleChangerType = 'owner' (Contract Owner)
    // When disabled: performerType/ruleChangerType = 'none' (No One)
    // Note: Default state is inlined here because this IIFE is isolated from the outer scope
    const defaultManualAction = {
      enabled: false,
      performerType: 'none',
      performerReference: '',
      ruleChangerType: 'none',
      ruleChangerReference: '',
      allowChangeAuthorizedToNone: false,
      allowChangeAdminToNone: false,
      allowSelfChangeAdmin: false,
      destinationType: 'contract-owner',
      destinationIdentity: '',
      allowCustomDestination: false
    };

    const mintOverride = capturedFeatureOverrides.mint;
    const mintEnabled = mintOverride !== undefined ? mintOverride : (template.manualMint?.enabled || false);
    state.form.permissions.manualMint = {
      ...defaultManualAction,
      enabled: mintEnabled,
      performerType: mintEnabled ? 'owner' : 'none',
      ruleChangerType: mintEnabled ? 'owner' : 'none'
    };

    const burnOverride = capturedFeatureOverrides.burn;
    const burnEnabled = burnOverride !== undefined ? burnOverride : (template.manualBurn?.enabled || false);
    state.form.permissions.manualBurn = {
      ...defaultManualAction,
      enabled: burnEnabled,
      performerType: burnEnabled ? 'owner' : 'none',
      ruleChangerType: burnEnabled ? 'owner' : 'none'
    };

    const freezeOverride = capturedFeatureOverrides.freeze;
    const freezeEnabled = freezeOverride !== undefined ? freezeOverride : (template.manualFreeze?.enabled || false);
    state.form.permissions.manualFreeze = {
      ...defaultManualAction,
      enabled: freezeEnabled,
      performerType: freezeEnabled ? 'owner' : 'none',
      ruleChangerType: freezeEnabled ? 'owner' : 'none'
    };

    // Apply same pattern to destroyFrozen and emergency
    const destroyFrozenEnabled = template.destroyFrozen?.enabled || false;
    state.form.permissions.destroyFrozen = {
      ...defaultManualAction,
      enabled: destroyFrozenEnabled,
      performerType: destroyFrozenEnabled ? 'owner' : 'none',
      ruleChangerType: destroyFrozenEnabled ? 'owner' : 'none'
    };

    const emergencyEnabled = template.emergency?.enabled || false;
    state.form.permissions.emergencyAction = {
      ...defaultManualAction,
      enabled: emergencyEnabled,
      performerType: emergencyEnabled ? 'owner' : 'none',
      ruleChangerType: emergencyEnabled ? 'owner' : 'none'
    };

    // Unfreeze uses a simpler state structure (no destination fields)
    const unfreezeEnabled = template.unfreeze?.enabled || false;
    state.form.permissions.unfreeze = {
      enabled: unfreezeEnabled,
      performerType: unfreezeEnabled ? 'owner' : 'none',
      performerReference: '',
      ruleChangerType: unfreezeEnabled ? 'owner' : 'none',
      ruleChangerReference: '',
      allowChangeAuthorizedToNone: false,
      allowChangeAdminToNone: false,
      allowSelfChangeAdmin: false
    };

    state.form.permissions.allowTransferToFrozenBalance = template.allowTransferToFrozenBalance || false;

    // Apply feature override for transfer notes
    const transferOverride = capturedFeatureOverrides.transfer;
    state.form.permissions.transferNotesEnabled = transferOverride !== undefined
      ? transferOverride
      : (template.transferNotesEnabled || false);
    state.form.permissions.transferNoteTypes = template.transferNoteTypes || {
      public: false,
      sharedEncrypted: false,
      privateEncrypted: false
    };

    // Distribution - apply feature override if user toggled it
    const distributionOverride = capturedFeatureOverrides.distribution;
    if (distributionOverride === false) {
      // User disabled distribution in preview
      state.form.distribution = state.form.distribution || {};
      state.form.distribution.enablePerpetual = false;
      state.form.distribution.cadence = {};
      state.form.distribution.emission = {};
    } else if (template.distribution) {
      state.form.distribution = state.form.distribution || {};
      state.form.distribution.cadence = template.distribution.cadence || {};
      state.form.distribution.emission = template.distribution.emission || {};
      // Auto-enable perpetual distribution when template provides it
      if (template.distribution.cadence || template.distribution.emission) {
        state.form.distribution.enablePerpetual = true;
      }
    }

    // Advanced
    state.form.advanced = state.form.advanced || {};
    state.form.advanced.tradeMode = template.tradeMode || 'closed';
    state.form.advanced.changeControl = template.changeControl || {};

    // Document Types
    if (template.documentTypes) {
      state.form.documentTypes = template.documentTypes;
    }

    // Save state
    if (window.persistState) {
      window.persistState();
    }

    // Update the Templates Library indicator
    updateTemplateIndicator(templateKey);

    // Sync all UI inputs with the loaded template data
    if (window.hydrateFormsFromState) {
      window.hydrateFormsFromState();
    }

    // Expand sidebar sections for enabled features so user can see what was configured
    expandSidebarForEnabledFeatures(state);

    // Switch to Token tab (naming screen is in token tab)
    if (window.switchTab) {
      window.switchTab('token');
      console.log('Switched to token tab');
    }

    // Expand the naming submenu in sidebar
    const namingSubmenu = document.getElementById('naming-submenu');
    const namingButton = document.querySelector('[data-toggle="naming-submenu"]');
    if (namingSubmenu && namingButton) {
      namingSubmenu.hidden = false;
      namingButton.setAttribute('aria-expanded', 'true');
      const sidebarStep = namingButton.closest('.sidebar-step');
      if (sidebarStep) {
        sidebarStep.setAttribute('aria-expanded', 'true');
      }
    }

    // Navigate to Token Name (first sub-step of naming)
    // screen-naming has id="screen-naming" and data-substep="naming"
    console.log('Navigating to naming screen after template load');
    if (window.showScreen) {
      window.showScreen('naming', { force: true });
      console.log('Called window.showScreen with naming');
    } else {
      console.error('ERROR: window.showScreen not available!');
    }

    // Apply step highlighting based on template features
    applyTemplateStepHighlights(templateKey, template);

    // Update feature indicators in sidebar
    updateFeatureIndicators();

    // AUTO-VALIDATE: Run validation on all steps that were pre-filled by the template
    // This ensures steps like Permissions, Advanced, Distribution show as "valid" in the sidebar
    validateAllStepsAfterTemplateLoad();

    // Show success message
    if (window.announce) {
      window.announce(`✓ Template "${template.name}" loaded successfully! Please enter a token name to continue.`);
    }
  }

  /**
   * Simplified template loader for the Templates Page.
   * Applies template configuration without wizard step highlighting or "Enabled" badges.
   * Used from the standalone Templates page to provide a clean start experience.
   */
  function loadTemplateSimple(templateKey) {
    console.log('[Templates Page] loadTemplateSimple called with:', templateKey);
    const template = TOKEN_TEMPLATES[templateKey];
    const state = window.wizardState;

    if (!state) {
      console.error('wizardState not available');
      return;
    }

    // Clear any previous template highlights that might exist
    clearTemplateHighlights();
    clearFeatureIndicators();

    if (templateKey === 'scratch' || !template) {
      // Start from scratch - reset to fresh state
      state.activeTemplate = null;
      state.templateMeta = null;

      // Hide the templates page screen
      const templatesScreen = document.getElementById('screen-templates-page');
      if (templatesScreen) {
        templatesScreen.classList.remove('wizard-screen--active');
        templatesScreen.setAttribute('hidden', '');
      }

      // Remove fullpage mode
      document.body.classList.remove('fullpage-mode');

      // Navigate to Tokens page
      if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
        window.globalHeader.switchPage('tokens');
      }

      // After page switch, show the naming screen
      setTimeout(() => {
        if (window.switchTab) window.switchTab('token');
        if (window.showScreen) window.showScreen('naming', { force: true });
      }, 50);
      return;
    }

    // Store minimal template metadata (no tracking for deviations)
    state.activeTemplate = templateKey;
    state.templateMeta = {
      appliedTemplate: templateKey,
      appliedAt: Date.now(),
      customizations: {},
      deviations: {}
    };

    // Apply template values to wizard state
    // Token name intentionally left empty - users must choose their own
    state.form.tokenName = '';

    // Search metadata
    state.form.search = state.form.search || {};
    state.form.search.description = template.description || '';
    state.form.search.keywords = template.keywords && Array.isArray(template.keywords) ? template.keywords.join(', ') : '';

    // Permissions
    state.form.permissions = state.form.permissions || {};
    state.form.permissions.decimals = template.decimals ?? 8;
    state.form.permissions.baseSupply = template.baseSupply ?? '0';
    state.form.permissions.maxSupply = template.maxSupply ?? '';
    state.form.permissions.useMaxSupply = template.useMaxSupply ?? false;
    state.form.permissions.keepsHistory = template.keepsHistory ? { ...template.keepsHistory } : {
      transfers: true, mints: true, burns: true, freezes: false, purchases: false
    };
    state.form.permissions.startAsPaused = template.startAsPaused ?? false;
    state.form.permissions.allowTransferToFrozenBalance = template.allowTransferToFrozenBalance ?? false;
    state.form.permissions.transferNotesEnabled = template.transferNotesEnabled ?? false;
    if (template.transferNoteTypes) {
      state.form.permissions.transferNoteTypes = { ...template.transferNoteTypes };
    }
    state.form.permissions.manualMint = template.manualMint ? { ...template.manualMint } : { enabled: false };
    state.form.permissions.manualBurn = template.manualBurn ? { ...template.manualBurn } : { enabled: false };
    state.form.permissions.manualFreeze = template.manualFreeze ? { ...template.manualFreeze } : { enabled: false };
    state.form.permissions.unfreeze = template.unfreeze ? { ...template.unfreeze } : { enabled: false };
    state.form.permissions.destroyFrozen = template.destroyFrozen ? { ...template.destroyFrozen } : { enabled: false };
    state.form.permissions.emergencyAction = template.emergency ? { ...template.emergency } : { enabled: false };

    // Advanced settings
    state.form.advanced = state.form.advanced || {};
    state.form.advanced.tradeMode = template.tradeMode ?? 'closed';
    state.form.advanced.changeControl = template.changeControl ? { ...template.changeControl } : {
      mint: false, burn: false, freeze: false, unfreeze: false, destroyFrozen: false, emergency: false
    };

    // Distribution (if template has it)
    if (template.distribution) {
      state.form.distribution = state.form.distribution || {};
      state.form.distribution.enablePerpetual = true;
      state.form.distribution.cadence = template.distribution.cadence ? { ...template.distribution.cadence } : null;
      state.form.distribution.emission = template.distribution.emission ? { ...template.distribution.emission } : null;
    }

    // Sync UI with state values using the comprehensive hydrate function
    if (typeof window.hydrateFormsFromState === 'function') {
      window.hydrateFormsFromState();
    }

    // Validate steps silently (updates sidebar status)
    validateAllStepsAfterTemplateLoad();

    // Persist state
    if (typeof window.persistState === 'function') {
      window.persistState();
    }

    // Hide the templates page screen
    const templatesScreen = document.getElementById('screen-templates-page');
    if (templatesScreen) {
      templatesScreen.classList.remove('wizard-screen--active');
      templatesScreen.setAttribute('hidden', '');
    }

    // Remove fullpage mode
    document.body.classList.remove('fullpage-mode');

    // Navigate to Tokens page (the main wizard view)
    if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
      window.globalHeader.switchPage('tokens');
    }

    // After page switch, show the naming screen
    setTimeout(() => {
      if (window.switchTab) window.switchTab('token');
      if (window.showScreen) window.showScreen('naming', { force: true });
    }, 50);

    console.log('[Templates Page] Template applied successfully:', template.name);
  }

  // Expose loadTemplateSimple globally for templates page
  window.loadTemplateSimple = loadTemplateSimple;

  /**
   * Load a template with custom values from the interactive template cards.
   * This applies the template base configuration and then overwrites with user-entered values.
   * Includes automatic English localization from singular/plural name inputs.
   */
  function loadTemplateWithCustomValues(templateKey, customValues) {
    console.log('[Templates Page] loadTemplateWithCustomValues called:', templateKey, customValues);
    const template = TOKEN_TEMPLATES[templateKey];
    const state = window.wizardState;

    if (!state) {
      console.error('wizardState not available');
      return;
    }

    // Clear any previous template highlights
    clearTemplateHighlights();
    clearFeatureIndicators();

    if (templateKey === 'scratch' || !template) {
      // Start from scratch - reset to fresh state
      state.activeTemplate = null;
      state.templateMeta = null;

      // Hide templates page
      const templatesScreen = document.getElementById('screen-templates-page');
      if (templatesScreen) {
        templatesScreen.classList.remove('wizard-screen--active');
        templatesScreen.setAttribute('hidden', '');
      }
      document.body.classList.remove('fullpage-mode');

      // Navigate to Tokens page
      if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
        window.globalHeader.switchPage('tokens');
      }

      // After page switch, show the naming screen
      setTimeout(() => {
        if (window.switchTab) window.switchTab('token');
        if (window.showScreen) window.showScreen('naming', { force: true });
      }, 50);
      return;
    }

    // Store template metadata
    state.activeTemplate = templateKey;
    state.templateMeta = {
      appliedTemplate: templateKey,
      appliedAt: Date.now(),
      customizations: customValues,
      deviations: {}
    };

    // Initialize form sections if needed
    state.form.naming = state.form.naming || { conventions: { localizations: {} }, rows: [] };
    state.form.naming.conventions = state.form.naming.conventions || { localizations: {} };
    state.form.naming.conventions.localizations = state.form.naming.conventions.localizations || {};
    state.form.permissions = state.form.permissions || {};
    state.form.advanced = state.form.advanced || {};
    state.form.distribution = state.form.distribution || {};
    state.form.search = state.form.search || {};

    // Apply naming from custom values (with English localization)
    const singular = customValues.naming?.singular || '';
    const plural = customValues.naming?.plural || '';

    // Set the token name to the singular form (used as display name)
    state.form.tokenName = singular;

    // Create English localization automatically from singular/plural
    if (singular) {
      state.form.naming.conventions.localizations.en = {
        singular_form: singular,
        plural_form: plural || singular + 's', // Default plural if not provided
        should_capitalize: true
      };
      // Also ensure naming rows are updated for the UI
      state.form.naming.rows = [{
        code: 'en',
        singularForm: singular,
        pluralForm: plural || singular + 's',
        shouldCapitalize: true
      }];
    } else {
      // Clear if no singular provided
      delete state.form.naming.conventions.localizations.en;
      state.form.naming.rows = [];
    }

    // Apply supply settings from custom values (override template defaults)
    state.form.permissions.decimals = customValues.supply?.decimals ?? template.decimals ?? 8;
    state.form.permissions.baseSupply = customValues.supply?.baseSupply || template.baseSupply || '0';
    state.form.permissions.maxSupply = customValues.supply?.maxSupply || template.maxSupply || '';
    state.form.permissions.useMaxSupply = Boolean(customValues.supply?.maxSupply || template.useMaxSupply);

    // Apply feature toggles from custom values (collected from modal UI)
    const features = customValues.features || {};

    // Token actions - use features from modal if provided, otherwise use template defaults
    state.form.permissions.manualMint = {
      enabled: features.manualMint?.enabled ?? template.manualMint?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };
    state.form.permissions.manualBurn = {
      enabled: features.manualBurn?.enabled ?? template.manualBurn?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };
    state.form.permissions.manualFreeze = {
      enabled: features.manualFreeze?.enabled ?? template.manualFreeze?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };
    state.form.permissions.unfreeze = {
      enabled: features.unfreeze?.enabled ?? template.unfreeze?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };
    state.form.permissions.destroyFrozen = {
      enabled: features.destroyFrozen?.enabled ?? template.destroyFrozen?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };
    state.form.permissions.emergencyAction = {
      enabled: features.emergency?.enabled ?? template.emergency?.enabled ?? false,
      authorizedBy: 'owner',
      rules: []
    };

    // Transfer notes
    state.form.permissions.transferNotesEnabled = features.transferNotesEnabled ?? template.transferNotesEnabled ?? false;
    state.form.permissions.transferNoteTypes = features.transferNoteTypes ?? template.transferNoteTypes ?? {
      public: true,
      sharedEncrypted: false,
      privateEncrypted: false
    };

    // History tracking from features object
    state.form.permissions.keepsHistory = features.keepsHistory ?? {
      transfers: template.keepsHistory?.transfers ?? true,
      mints: template.keepsHistory?.mints ?? true,
      burns: template.keepsHistory?.burns ?? true,
      freezes: template.keepsHistory?.freezes ?? false,
      purchases: template.keepsHistory?.purchases ?? false
    };

    // Launch settings
    state.form.permissions.allowTransferToFrozenBalance = features.allowTransferToFrozenBalance ?? template.allowTransferToFrozenBalance ?? false;
    state.form.permissions.startAsPaused = features.startAsPaused ?? template.startAsPaused ?? false;

    // Apply advanced settings - use features.tradeMode if provided, otherwise template default
    state.form.advanced.tradeMode = features.tradeMode ?? template.tradeMode ?? 'closed';
    state.form.advanced.changeControl = template.changeControl ? { ...template.changeControl } : {
      mint: false, burn: false, freeze: false, unfreeze: false, destroyFrozen: false, emergency: false
    };

    // Apply distribution settings
    // Check if distribution was enabled via modal toggle or if template has distribution
    const distributionEnabled = features.enableDistribution ?? !!(template.distribution);

    if (distributionEnabled && template.distribution) {
      state.form.distribution.enablePerpetual = true;
      state.form.distribution.cadence = template.distribution.cadence ? { ...template.distribution.cadence } : null;
      state.form.distribution.emission = template.distribution.emission ? { ...template.distribution.emission } : null;
    } else if (distributionEnabled && customValues.distribution?.intervalHours && customValues.distribution?.emissionAmount) {
      state.form.distribution.enablePerpetual = true;
      // Use custom distribution values if provided
      const intervalHours = customValues.distribution?.intervalHours || 24;
      const emissionAmount = customValues.distribution?.emissionAmount || '1000';

      state.form.distribution.cadence = {
        type: 'TimeBasedDistribution',
        intervalMs: String(intervalHours * 60 * 60 * 1000) // Convert hours to milliseconds
      };
      state.form.distribution.emission = {
        type: 'FixedAmount',
        amount: emissionAmount
      };
    } else {
      // Distribution disabled
      state.form.distribution.enablePerpetual = false;
      state.form.distribution.cadence = null;
      state.form.distribution.emission = null;
    }

    // Apply search metadata from template
    state.form.search.description = template.description || '';
    state.form.search.keywords = template.keywords && Array.isArray(template.keywords) ? template.keywords.join(', ') : '';

    // Sync UI with state values using the comprehensive hydrate function
    if (typeof window.hydrateFormsFromState === 'function') {
      window.hydrateFormsFromState();
    }

    // Validate steps
    validateAllStepsAfterTemplateLoad();

    // Persist state
    if (typeof window.persistState === 'function') {
      window.persistState();
    }

    // Hide templates page
    const templatesScreen = document.getElementById('screen-templates-page');
    if (templatesScreen) {
      templatesScreen.classList.remove('wizard-screen--active');
      templatesScreen.setAttribute('hidden', '');
    }
    document.body.classList.remove('fullpage-mode');

    // Navigate to Tokens page (the main wizard view)
    if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
      window.globalHeader.switchPage('tokens');
    }

    // After page switch, show the naming screen
    setTimeout(() => {
      if (window.switchTab) window.switchTab('token');
      if (window.showScreen) window.showScreen('naming', { force: true });
    }, 50);

    console.log('[Templates Page] Template with custom values applied successfully:', template.name);
  }

  // Expose globally
  window.loadTemplateWithCustomValues = loadTemplateWithCustomValues;

  /**
   * Validate all steps after template load to update sidebar status indicators.
   * Steps with valid pre-filled data will be marked as valid.
   */
  function validateAllStepsAfterTemplateLoad() {
    const state = window.wizardState;
    if (!state) return;

    // Validate each step and update wizardState.steps
    // Naming - won't be valid yet (user needs to enter token name)
    if (typeof window.evaluateNaming === 'function') {
      window.evaluateNaming({ touched: true, silent: true });
    }

    // Permissions - should be valid from template defaults
    if (typeof window.evaluatePermissions === 'function') {
      window.evaluatePermissions({ touched: true });
    }

    // Advanced - should be valid from template defaults
    if (typeof window.evaluateAdvanced === 'function') {
      window.evaluateAdvanced({ touched: true, silent: true });
    }

    // Distribution - validate if template included distribution settings
    if (typeof window.evaluateDistribution === 'function') {
      window.evaluateDistribution({ touched: true, silent: true });
    }

    // Search - optional, validate if template included search data
    if (typeof window.evaluateSearch === 'function') {
      window.evaluateSearch({ touched: true, silent: true });
    }

    // Update the furthest valid index based on actual step validity
    if (typeof window.computeFurthestValidIndexFromSteps === 'function') {
      state.furthestValidIndex = window.computeFurthestValidIndexFromSteps(state.steps);
    }

    // Update sidebar status indicators for all tracked steps
    if (window.TRACKED_STEPS && typeof window.updateStepStatusUI === 'function') {
      window.TRACKED_STEPS.forEach(step => window.updateStepStatusUI(step));
    }

    // Persist the updated state
    if (typeof window.persistState === 'function') {
      window.persistState();
    }

    console.log('✓ Template validation complete - step statuses updated');
  }

  // Step highlighting functions for template wiring
  function applyTemplateStepHighlights(templateKey, template) {
    // Clear any existing highlights first
    clearTemplateHighlights();

    if (!template || !template.recommendedSubsteps) {
      return;
    }

    // Add highlight class to recommended substeps in sidebar
    template.recommendedSubsteps.forEach(substepId => {
      const navItem = document.querySelector(`[data-substep="${substepId}"]`);
      if (navItem) {
        navItem.classList.add('wizard-nav-subitem--template-recommended');

        // Add badge if not already present
        if (!navItem.querySelector('.template-badge')) {
          const badge = document.createElement('span');
          badge.className = 'template-badge';
          badge.textContent = 'Enabled';
          badge.setAttribute('aria-label', 'Enabled by template');
          navItem.appendChild(badge);
        }
      }
    });

    // Expand parent menus for recommended substeps
    const parentSteps = new Set();
    template.recommendedSubsteps.forEach(substepId => {
      // Extract parent step from substep ID (e.g., 'permissions-manual-burn' -> 'permissions')
      const match = substepId.match(/^([a-z]+)-/);
      if (match) {
        parentSteps.add(match[1]);
      }
    });

    parentSteps.forEach(parentStep => {
      const submenu = document.getElementById(`${parentStep}-submenu`);
      const toggleBtn = document.querySelector(`[data-toggle="${parentStep}-submenu"]`);
      if (submenu && toggleBtn) {
        submenu.hidden = false;
        toggleBtn.setAttribute('aria-expanded', 'true');
        const sidebarStep = toggleBtn.closest('.sidebar-step');
        if (sidebarStep) {
          sidebarStep.setAttribute('aria-expanded', 'true');
        }
      }
    });
  }

  function clearTemplateHighlights() {
    // Remove all template-recommended classes
    document.querySelectorAll('.wizard-nav-subitem--template-recommended').forEach(el => {
      el.classList.remove('wizard-nav-subitem--template-recommended');
    });

    // Remove all template badges
    document.querySelectorAll('.template-badge').forEach(badge => {
      badge.remove();
    });
  }

  /**
   * Updates the feature indicators (inline badges) on navigation substeps
   * Called after template application or when user changes feature settings
   */
  function updateFeatureIndicators() {
    const state = window.wizardState;
    if (!state?.form?.permissions) {
      return;
    }

    const permissions = state.form.permissions || {};
    const distribution = state.form.distribution || {};

    // Map substep IDs to their enabled state
    const featureMap = {
      'permissions-manual-mint': Boolean(permissions.manualMint?.enabled),
      'permissions-manual-burn': Boolean(permissions.manualBurn?.enabled),
      'permissions-manual-freeze': Boolean(permissions.manualFreeze?.enabled),
      'permissions-transfer': Boolean(permissions.transferNotesEnabled !== false),
      'advanced-history': Boolean(
        permissions.keepsHistory?.transfers ||
        permissions.keepsHistory?.mints ||
        permissions.keepsHistory?.burns ||
        permissions.keepsHistory?.freezes
      ),
      'distribution': Boolean(distribution.enablePerpetual)
    };

    // Update each substep with ENABLED badge
    Object.entries(featureMap).forEach(([substepId, isEnabled]) => {
      const navItem = document.querySelector(`[data-substep="${substepId}"]`);
      if (!navItem) {
        return;
      }

      // Remove ALL existing badges first (both template-badge and feature-enabled-badge)
      navItem.querySelectorAll('.template-badge, .feature-enabled-badge').forEach(b => b.remove());

      if (isEnabled) {
        // Add single badge
        const badge = document.createElement('span');
        badge.className = 'feature-enabled-badge';
        badge.textContent = 'ENABLED';
        navItem.appendChild(badge);
      }
    });
  }

  /**
   * Clears all feature enabled badges (used when resetting wizard)
   */
  function clearFeatureIndicators() {
    document.querySelectorAll('.feature-enabled-badge').forEach(badge => {
      badge.remove();
    });
  }

  // Expose functions globally for access from other parts of the app
  window.updateFeatureIndicators = updateFeatureIndicators;
  window.clearFeatureIndicators = clearFeatureIndicators;

  function updateTemplateIndicator(templateKey) {
    // Templates sidebar step removed - this function now only tracks internal state
    // The template indicator was shown in the sidebar Templates step which is no longer present
    console.log('[Template] Active template:', templateKey);
  }

  // Template confirmation modal elements
  const confirmModal = document.getElementById('template-confirmation-modal');
  const confirmModalTitle = document.getElementById('template-modal-title');
  const confirmModalDescription = document.getElementById('template-modal-description');
  const confirmModalPreview = document.getElementById('template-modal-preview');
  const confirmBtn = document.getElementById('template-confirm-btn');
  const cancelBtn = document.getElementById('template-cancel-btn');
  let pendingTemplateKey = null;
  let pendingTemplateFromPage = false; // Track if selection came from Templates Page

  // Naming config elements (for quick edit in modal)
  const namingConfigSection = document.getElementById('template-naming-config');
  const singularInput = document.getElementById('template-singular');
  const pluralInput = document.getElementById('template-plural');

  // Supply config elements (for quick edit in modal)
  const supplyConfigSection = document.getElementById('template-supply-config');
  const baseSupplyInput = document.getElementById('template-base-supply');
  const maxSupplyInput = document.getElementById('template-max-supply');
  const decimalsSelect = document.getElementById('template-decimals');
  const supplyPreviewValue = document.getElementById('template-preview-value');
  const supplyPreviewDetails = document.getElementById('supply-preview-details');
  const supplyRatioFill = document.getElementById('supply-ratio-fill');
  const supplyRatioLabel = document.getElementById('supply-ratio-label');

  // Feature override state for toggleable features
  let featureOverrides = {};

  // Update live preview of supply configuration
  function updateTemplateSupplyPreview() {
    if (!supplyPreviewValue) return;

    const baseSupply = baseSupplyInput?.value || '0';
    const maxSupply = maxSupplyInput?.value;
    const decimals = parseInt(decimalsSelect?.value || '8', 10);

    // Format numbers with commas
    const formatNum = (n) => {
      if (!n || n === '0') return '0';
      return Number(n).toLocaleString();
    };

    // Update the main value display
    const baseNum = parseFloat(baseSupply) || 0;
    const maxNum = parseFloat(maxSupply) || 0;
    const formatted = formatNum(baseSupply);
    supplyPreviewValue.textContent = formatted;

    // Update details line
    if (supplyPreviewDetails) {
      const maxFormatted = maxSupply ? formatNum(maxSupply) : 'unlimited';
      supplyPreviewDetails.textContent = `${decimals} decimal places • Max: ${maxFormatted}`;
    }

    // Validation: base cannot exceed max (when max is set)
    const isInvalid = maxNum > 0 && baseNum > maxNum;

    // Update supply ratio bar
    if (supplyRatioFill && supplyRatioLabel) {
      if (isInvalid) {
        // Error state: base exceeds max
        supplyRatioFill.style.width = '100%';
        supplyRatioFill.style.background = 'linear-gradient(90deg, #EF4444, #DC2626)';
        supplyRatioLabel.textContent = 'Base cannot exceed max!';
        supplyRatioLabel.style.color = '#EF4444';
      } else {
        // Reset to normal styling
        supplyRatioFill.style.background = '';
        supplyRatioLabel.style.color = '';

        if (maxNum > 0 && baseNum > 0) {
          const ratio = Math.min((baseNum / maxNum) * 100, 100);
          supplyRatioFill.style.width = `${ratio}%`;
          supplyRatioLabel.textContent = `${ratio.toFixed(1)}% of max supply`;
        } else if (baseNum > 0) {
          supplyRatioFill.style.width = '100%';
          supplyRatioLabel.textContent = 'No max supply set';
        } else {
          supplyRatioFill.style.width = '0%';
          supplyRatioLabel.textContent = 'Enter base supply';
        }
      }
    }

    // Disable/enable Apply button based on validation
    const applyBtn = document.getElementById('template-confirm-btn');
    if (applyBtn) {
      applyBtn.disabled = isInvalid;
    }
  }

  // Update emission timeline visualization
  function updateEmissionTimeline(template) {
    const timeline = document.getElementById('emission-timeline');
    if (!timeline) return;

    // Check if this template has distribution settings
    const hasDistribution = template?.distribution?.emission || template?.distribution?.cadence;
    if (!hasDistribution) {
      timeline.hidden = true;
      return;
    }

    timeline.hidden = false;

    const emission = template.distribution.emission || {};
    const cadence = template.distribution.cadence || {};

    // Calculate daily emission rate
    let dailyRate = 0;
    let emissionNote = '';

    if (emission.type === 'FixedAmount') {
      const amount = parseFloat(emission.amount) || 0;

      if (cadence.type === 'TimeBasedDistribution') {
        const intervalSeconds = parseFloat(cadence.intervalSeconds) || 86400;
        dailyRate = (86400 / intervalSeconds) * amount;
        emissionNote = `Based on ${formatNumber(amount)} tokens every ${formatDuration(intervalSeconds)}`;
      } else if (cadence.type === 'BlockBasedDistribution') {
        // Dash blocks average ~2.5 minutes = 150 seconds
        const intervalBlocks = parseFloat(cadence.intervalBlocks) || 1;
        const blocksPerDay = 86400 / 150; // ~576 blocks per day
        dailyRate = (blocksPerDay / intervalBlocks) * amount;
        emissionNote = `Based on ${formatNumber(amount)} tokens every ${intervalBlocks} block(s)`;
      } else if (cadence.type === 'EpochBasedDistribution') {
        // Epochs are typically longer periods
        const intervalEpochs = parseFloat(cadence.intervalEpochs) || 1;
        // Assume 1 epoch = 1 week for estimation
        dailyRate = (amount / intervalEpochs) / 7;
        emissionNote = `Based on ${formatNumber(amount)} tokens every ${intervalEpochs} epoch(s)`;
      } else {
        dailyRate = amount;
        emissionNote = `Based on ${formatNumber(amount)} tokens per distribution`;
      }
    } else if (emission.type === 'Exponential') {
      const initialAmount = parseFloat(emission.initialAmount) || 0;
      dailyRate = initialAmount;
      emissionNote = `Exponential decay from ${formatNumber(initialAmount)} tokens`;
    } else if (emission.type === 'StepFunction') {
      // Use first step amount as estimate
      dailyRate = parseFloat(emission.steps?.[0]?.amount) || 0;
      emissionNote = `Step function emission schedule`;
    } else if (emission.type === 'Linear') {
      const startAmount = parseFloat(emission.startAmount) || 0;
      dailyRate = startAmount;
      emissionNote = `Linear from ${formatNumber(startAmount)} tokens`;
    }

    // Calculate cumulative values for each period
    const periods = {
      day: dailyRate,
      week: dailyRate * 7,
      month: dailyRate * 30,
      year: dailyRate * 365
    };

    // Find max for scaling
    const maxValue = periods.year || 1;

    // Update each row
    Object.entries(periods).forEach(([period, value]) => {
      const fillEl = document.getElementById(`emission-fill-${period}`);
      const valueEl = document.getElementById(`emission-value-${period}`);

      if (fillEl) {
        const percentage = Math.min((value / maxValue) * 100, 100);
        // Animate with a slight delay
        setTimeout(() => {
          fillEl.style.width = `${percentage}%`;
        }, 100);
      }

      if (valueEl) {
        valueEl.textContent = formatNumber(Math.round(value));
      }
    });

    // Update note
    const noteEl = document.getElementById('emission-note');
    if (noteEl) {
      noteEl.textContent = emissionNote || 'Based on template emission settings';
    }
  }

  // Helper function to format numbers with commas
  function formatNumber(n) {
    if (!n || n === 0) return '0';
    if (n >= 1000000) {
      return (n / 1000000).toFixed(1) + 'M';
    }
    if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'K';
    }
    return n.toLocaleString();
  }

  // Helper function to format duration
  function formatDuration(seconds) {
    if (seconds >= 86400) return `${Math.round(seconds / 86400)} day(s)`;
    if (seconds >= 3600) return `${Math.round(seconds / 3600)} hour(s)`;
    if (seconds >= 60) return `${Math.round(seconds / 60)} minute(s)`;
    return `${seconds} second(s)`;
  }

  // Setup feature toggle click handlers
  function setupFeatureToggles() {
    const featuresContainer = document.getElementById('template-features');
    if (!featuresContainer) return;

    // Add interactive class to all feature cards
    const featureCards = featuresContainer.querySelectorAll('.template-feature');
    featureCards.forEach(card => {
      card.classList.add('template-feature--interactive');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
    });

    // Event delegation for clicks
    featuresContainer.addEventListener('click', handleFeatureToggle);
    featuresContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFeatureToggle(e);
      }
    });
  }

  // Handle feature toggle
  function handleFeatureToggle(e) {
    const card = e.target.closest('.template-feature');
    if (!card) return;

    const feature = card.dataset.feature;
    if (!feature) return;

    const currentState = card.getAttribute('data-active') === 'true';
    const newState = !currentState;

    // Store override
    featureOverrides[feature] = newState;

    // Update UI
    card.setAttribute('data-active', String(newState));
    const statusEl = card.querySelector('.template-feature__status');
    if (statusEl) {
      statusEl.textContent = newState ? 'On' : 'Off';
    }

    // Visual feedback animation
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      card.style.transform = '';
    }, 100);
  }

  // Reset feature overrides when modal closes
  function resetFeatureOverrides() {
    featureOverrides = {};
  }

  // Initialize feature toggles
  setupFeatureToggles();

  function showTemplateConfirmation(templateKey, fromPage = false) {
    const template = TOKEN_TEMPLATES[templateKey];

    if (templateKey === 'scratch' || !template) {
      // No confirmation needed for "Start from Scratch"
      if (fromPage) {
        loadTemplateSimple(templateKey);
      } else {
        loadTemplate(templateKey);
      }
      return;
    }

    pendingTemplateKey = templateKey;
    pendingTemplateFromPage = fromPage;

    // Update modal content
    confirmModalTitle.textContent = `Apply "${template.name}" Template?`;
    confirmModalDescription.textContent = 'This will replace your current configuration with the following template settings:';

    // Build preview HTML with comprehensive feature detection
    const features = [];

    // Manual actions
    if (template.manualBurn?.enabled) features.push('Burn capability');
    if (template.manualMint?.enabled) features.push('Mint capability');
    if (template.manualFreeze?.enabled) features.push('Freeze controls');
    if (template.destroyFrozen?.enabled) features.push('Destroy frozen tokens');
    if (template.emergency?.enabled) features.push('Emergency actions');

    // Transfer notes
    if (template.transferNotesEnabled) {
      if (template.transferNoteTypes?.sharedEncrypted) {
        features.push('Transfer notes (encrypted)');
      } else if (template.transferNoteTypes?.public) {
        features.push('Transfer notes');
      }
    }

    // History tracking highlights
    const historyTypes = [];
    if (template.keepsHistory?.mints) historyTypes.push('mints');
    if (template.keepsHistory?.burns) historyTypes.push('burns');
    if (template.keepsHistory?.freezes) historyTypes.push('freezes');
    if (historyTypes.length > 0) {
      features.push(`Track ${historyTypes.join(', ')}`);
    }

    // Change control (immutability)
    if (template.changeControl?.mint === false && template.changeControl?.burn === false) {
      features.push('Locked mint/burn rules');
    }

    // Distribution
    if (template.distribution) {
      if (template.distribution.cadence?.type) features.push(template.distribution.cadence.type.replace('BasedDistribution', ''));
      if (template.distribution.emission?.type) features.push(`${template.distribution.emission.type} emission`);
    }

    // Get icon SVG based on template - illustrative icons with unique designs
    const templateIcons = {
      'scratch': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
        <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        <circle cx="18" cy="4" r="1.2" opacity="0.6"/>
        <circle cx="21" cy="2" r="0.8" opacity="0.4"/>
        <circle cx="15" cy="2" r="1" opacity="0.5"/>
      </svg>`,
      'simple-fixed': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="18" rx="7" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <ellipse cx="12" cy="14" rx="7" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <ellipse cx="12" cy="10" rx="7" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 10v8M19 10v8" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 4l-2 2h4l-2-2z"/>
        <rect x="10" y="5" width="4" height="3" rx="0.5"/>
      </svg>`,
      'utility': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="9" cy="13" r="1.5"/>
        <path d="M9 7v2M9 17v2M3 13h2M13 13h2"/>
        <path d="M5.5 9.5l1.4 1.4M11 15l1.4 1.4M5.5 16.5l1.4-1.4M11 11l1.4-1.4"/>
        <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="17" cy="9" r="1"/>
        <path d="M17 5v1.5M17 11.5v1.5M13.5 9h1.5M19.5 9h1.5"/>
      </svg>`,
      'reward': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9V6a2 2 0 012-2h8a2 2 0 012 2v3" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M18 9a3 3 0 003-3h-3M6 9a3 3 0 01-3-3h3" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M6 9h12v4a6 6 0 01-12 0V9z" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M9 20h6M12 17v3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 8l1 2h2l-1.5 1.5.5 2-2-1-2 1 .5-2L9 10h2l1-2z"/>
      </svg>`,
      'membership': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="8" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 14h6M12 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M6 7h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      'testnet': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polyline points="16 18 22 12 16 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="8 6 2 12 8 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 3"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>`,
      'invoice': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.5"/>
        <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 9h1v2h-1z" fill="currentColor"/>
        <circle cx="16" cy="17" r="1.5" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>`
    };
    const iconSvg = templateIcons[pendingTemplateKey] || templateIcons['scratch'];

    confirmModalPreview.innerHTML = `
      <div class="template-preview__header">
        <div class="template-preview__icon">${iconSvg}</div>
        <div class="template-preview__info">
          <h3 class="template-preview__title">${template.name}</h3>
          <p class="template-preview__description">${template.description || ''}</p>
        </div>
      </div>
      ${features.length > 0 ? `
        <div class="template-preview__features">
          ${features.map(f => `<span class="template-preview__feature">${f}</span>`).join('')}
        </div>
      ` : ''}
    `;

    // Handle naming configuration section (always visible)
    if (namingConfigSection) {
      // Clear previous values
      if (singularInput) singularInput.value = '';
      if (pluralInput) pluralInput.value = '';
    }

    // Handle supply configuration section (always visible now)
    if (supplyConfigSection) {
      // Pre-fill with template defaults or clear
      if (baseSupplyInput) {
        baseSupplyInput.value = template.supplyConfig?.baseSupplyDefault || '';
      }
      if (maxSupplyInput) {
        maxSupplyInput.value = template.supplyConfig?.maxSupplyDefault || '';
      }
      if (decimalsSelect) {
        decimalsSelect.value = String(template.supplyConfig?.decimalsDefault ?? template.decimals ?? 8);
      }

      // Update preview
      updateTemplateSupplyPreview();

      // Add input listeners for live preview (remove first to avoid duplicates)
      baseSupplyInput?.removeEventListener('input', updateTemplateSupplyPreview);
      maxSupplyInput?.removeEventListener('input', updateTemplateSupplyPreview);
      decimalsSelect?.removeEventListener('change', updateTemplateSupplyPreview);

      baseSupplyInput?.addEventListener('input', updateTemplateSupplyPreview);
      maxSupplyInput?.addEventListener('input', updateTemplateSupplyPreview);
      decimalsSelect?.addEventListener('change', updateTemplateSupplyPreview);
    }

    // Set modal accent color based on template
    const accentColors = {
      'scratch': '#6366F1',
      'simple-fixed': '#0E76FD',
      'utility': '#10B981',
      'reward': '#8B5CF6',
      'membership': '#F97316',
      'testnet': '#06B6D4',
      'invoice': '#14B8A6'
    };
    confirmModal.style.setProperty('--modal-accent', accentColors[pendingTemplateKey] || '#0E76FD');

    // Update feature showcase grid
    updateFeatureShowcase(template);

    // Update emission timeline (for distribution templates)
    updateEmissionTimeline(template);

    // Ensure Apply button is enabled (may have been disabled from previous modal)
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }

    // Show modal and lock body scroll
    confirmModal.removeAttribute('hidden');

    // Save current scroll position before locking
    const scrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollY}px`;
    document.body.dataset.scrollY = scrollY;
    confirmBtn.focus();
  }

  // Update the feature showcase grid based on template capabilities
  function updateFeatureShowcase(template) {
    const featuresContainer = document.getElementById('template-features');
    if (!featuresContainer) return;

    // Reset feature overrides for new template
    featureOverrides = {};

    // Define feature mappings for toggle features
    const featureStates = {
      mint: template?.manualMint?.enabled || false,
      burn: template?.manualBurn?.enabled || false,
      freeze: template?.manualFreeze?.enabled || false,
      unfreeze: template?.unfreeze?.enabled || false,
      destroyFrozen: template?.destroyFrozen?.enabled || false,
      transfer: template?.transferNotesEnabled ?? true,
      distribution: !!(template?.distribution?.cadence || template?.distribution?.emission),
      emergency: template?.emergency?.enabled || false,
      // History tracking
      historyTransfers: template?.keepsHistory?.transfers ?? true,
      historyMints: template?.keepsHistory?.mints ?? true,
      historyBurns: template?.keepsHistory?.burns ?? true,
      historyFreezes: template?.keepsHistory?.freezes || false,
      // Transfer note types
      notePublic: template?.transferNoteTypes?.public ?? true,
      noteShared: template?.transferNoteTypes?.sharedEncrypted || false,
      notePrivate: template?.transferNoteTypes?.privateEncrypted || false,
      // Launch settings
      startPaused: template?.startAsPaused || false,
      allowTransferToFrozen: template?.allowTransferToFrozenBalance || false
    };

    // Update each toggle feature element
    Object.entries(featureStates).forEach(([feature, isActive]) => {
      const featureEl = featuresContainer.querySelector(`[data-feature="${feature}"]`);
      if (featureEl) {
        featureEl.setAttribute('data-active', isActive ? 'true' : 'false');
        const statusEl = featureEl.querySelector('.template-feature__status');
        if (statusEl) {
          statusEl.textContent = isActive ? 'On' : 'Off';
        }
      }
    });

    // Update trade mode select
    const tradeModeSelect = document.getElementById('template-trade-mode');
    if (tradeModeSelect) {
      tradeModeSelect.value = template?.tradeMode || 'closed';
    }

    // Show/hide transfer notes group based on transfer notes being enabled
    const transferNotesGroup = document.getElementById('template-transfer-notes-group');
    if (transferNotesGroup) {
      transferNotesGroup.style.display = template?.transferNotesEnabled ? '' : 'none';
    }
  }

  function hideTemplateConfirmation() {
    confirmModal.setAttribute('hidden', '');
    pendingTemplateKey = null;
    pendingTemplateFromPage = false;
    // Reset feature overrides when closing modal
    resetFeatureOverrides();
    // Restore body scroll and position
    const scrollY = document.body.dataset.scrollY || 0;
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    delete document.body.dataset.scrollY;
    window.scrollTo(0, parseInt(scrollY, 10));
  }

  // Note: Template card click handlers are now on the Templates Page (setupPages function)
  // The [data-tpl] cards use window.showTemplateConfirmation directly

  // Collect all feature overrides from modal UI
  function collectFeatureOverrides() {
    const featuresContainer = document.getElementById('template-features');
    if (!featuresContainer) return {};

    const overrides = {};

    // Collect toggle feature states
    const toggleFeatures = featuresContainer.querySelectorAll('.template-feature[data-feature]');
    toggleFeatures.forEach(el => {
      const feature = el.dataset.feature;
      // Skip select-based features
      if (el.classList.contains('template-feature--select')) return;
      const isActive = el.getAttribute('data-active') === 'true';
      overrides[feature] = isActive;
    });

    // Collect trade mode from select
    const tradeModeSelect = document.getElementById('template-trade-mode');
    if (tradeModeSelect) {
      overrides.tradeMode = tradeModeSelect.value;
    }

    return overrides;
  }

  // Confirm button
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      console.log('Apply Template clicked, pendingTemplateKey:', pendingTemplateKey, 'fromPage:', pendingTemplateFromPage);
      if (pendingTemplateKey) {
        // Collect custom values from modal inputs
        const featureOverridesFromUI = collectFeatureOverrides();

        const customValues = {
          naming: {
            singular: singularInput?.value?.trim() || '',
            plural: pluralInput?.value?.trim() || ''
          },
          supply: {
            baseSupply: baseSupplyInput?.value?.replace(/,/g, '') || '',
            maxSupply: maxSupplyInput?.value?.replace(/,/g, '') || '',
            decimals: parseInt(decimalsSelect?.value, 10) || 8
          },
          features: {
            // Token actions
            manualMint: { enabled: featureOverridesFromUI.mint ?? false },
            manualBurn: { enabled: featureOverridesFromUI.burn ?? false },
            manualFreeze: { enabled: featureOverridesFromUI.freeze ?? false },
            unfreeze: { enabled: featureOverridesFromUI.unfreeze ?? false },
            destroyFrozen: { enabled: featureOverridesFromUI.destroyFrozen ?? false },
            emergency: { enabled: featureOverridesFromUI.emergency ?? false },
            // Transfer notes
            transferNotesEnabled: featureOverridesFromUI.transfer ?? true,
            transferNoteTypes: {
              public: featureOverridesFromUI.notePublic ?? true,
              sharedEncrypted: featureOverridesFromUI.noteShared ?? false,
              privateEncrypted: featureOverridesFromUI.notePrivate ?? false
            },
            // Distribution
            enableDistribution: featureOverridesFromUI.distribution ?? false,
            // History tracking
            keepsHistory: {
              transfers: featureOverridesFromUI.historyTransfers ?? true,
              mints: featureOverridesFromUI.historyMints ?? true,
              burns: featureOverridesFromUI.historyBurns ?? true,
              freezes: featureOverridesFromUI.historyFreezes ?? false,
              purchases: false
            },
            // Trading
            tradeMode: featureOverridesFromUI.tradeMode || 'closed',
            // Launch settings
            startAsPaused: featureOverridesFromUI.startPaused ?? false,
            allowTransferToFrozenBalance: featureOverridesFromUI.allowTransferToFrozen ?? false
          }
        };

        console.log('Collected custom values:', customValues);

        // Use loadTemplateWithCustomValues for both flows
        if (typeof window.loadTemplateWithCustomValues === 'function') {
          window.loadTemplateWithCustomValues(pendingTemplateKey, customValues);
        } else if (pendingTemplateFromPage) {
          // Fallback: From Templates Page - use simple loader (no wizard highlights)
          loadTemplateSimple(pendingTemplateKey);
        } else {
          // Fallback: From wizard flow - use regular loader with highlights
          loadTemplate(pendingTemplateKey);
        }
        hideTemplateConfirmation();
      }
    });
  } else {
    console.error('confirmBtn not found!');
  }

  // Cancel button and overlay
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideTemplateConfirmation);
  }

  if (confirmModal) {
    const overlay = confirmModal.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', hideTemplateConfirmation);
    }
  }

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !confirmModal.hasAttribute('hidden')) {
      hideTemplateConfirmation();
    }
  });

  // Expose showTemplateConfirmation globally for templates page
  window.showTemplateConfirmation = showTemplateConfirmation;

  // Restore template indicator and highlights on page load
  if (window.wizardState && window.wizardState.activeTemplate) {
    updateTemplateIndicator(window.wizardState.activeTemplate);

    // Re-apply highlights if template exists
    const activeTemplate = TOKEN_TEMPLATES[window.wizardState.activeTemplate];
    if (activeTemplate && window.wizardState.activeTemplate !== 'scratch') {
      applyTemplateStepHighlights(window.wizardState.activeTemplate, activeTemplate);
    }
  }

  // Deviation tracking functions
  function trackTemplateDeviation(fieldPath, newValue) {
    const state = window.wizardState;
    if (!state?.templateMeta?.appliedTemplate) return;
    if (state.templateMeta.appliedTemplate === 'scratch') return;

    const template = TOKEN_TEMPLATES[state.templateMeta.appliedTemplate];
    if (!template) return;

    const originalValue = getNestedValue(template, fieldPath);

    if (newValue !== originalValue) {
      state.templateMeta.deviations[fieldPath] = {
        originalValue,
        currentValue: newValue,
        changedAt: Date.now()
      };
    } else {
      // Value matches template, remove deviation record
      delete state.templateMeta.deviations[fieldPath];
    }

    updateTemplateDeviationIndicator();
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  function updateTemplateDeviationIndicator() {
    // Templates sidebar step removed - deviation indicator no longer shown
    // Just log for debugging purposes
    const state = window.wizardState;
    const deviationCount = Object.keys(state?.templateMeta?.deviations || {}).length;
    if (deviationCount > 0) {
      console.log('[Template] Deviations from template:', deviationCount);
    }
  }

  // Expose tracking function globally for use by other parts of the app
  window.trackTemplateDeviation = trackTemplateDeviation;
  window.updateTemplateDeviationIndicator = updateTemplateDeviationIndicator;

  console.log('✓ Template selection modal initialized');
})();

// =============================================
// Start Over Modal Functionality
// =============================================
(function initStartOverModal() {
  const startOverModal = document.getElementById('start-over-modal');
  const startOverBtn = document.getElementById('start-over-btn');
  const startOverBtnGroup = document.getElementById('start-over-btn-group');
  const startOverCancelBtn = document.getElementById('start-over-cancel-btn');
  const startOverConfirmBtn = document.getElementById('start-over-confirm-btn');

  if (!startOverModal) {
    console.warn('Start Over modal not found');
    return;
  }

  function showStartOverModal() {
    startOverModal.removeAttribute('hidden');
    startOverConfirmBtn?.focus();
  }

  function hideStartOverModal() {
    startOverModal.setAttribute('hidden', '');
  }

  function confirmStartOver() {
    // Reset wizard state without reloading the page
    hideStartOverModal();

    // Call the exposed resetWizard function
    if (typeof window.resetWizard === 'function') {
      window.resetWizard();
    }

    // Navigate to first step of the wizard
    if (typeof window.showScreen === 'function') {
      window.showScreen('naming', { force: true });
    }

    // Show success toast
    if (typeof window.showToast === 'function') {
      window.showToast('Wizard has been reset', 'success');
    }
  }

  // Show modal when Start Over clicked (main sidebar)
  if (startOverBtn) {
    startOverBtn.addEventListener('click', showStartOverModal);
  }

  // Show modal when Start Over clicked (group sidebar)
  if (startOverBtnGroup) {
    startOverBtnGroup.addEventListener('click', showStartOverModal);
  }

  // Cancel button
  if (startOverCancelBtn) {
    startOverCancelBtn.addEventListener('click', hideStartOverModal);
  }

  // Confirm button
  if (startOverConfirmBtn) {
    startOverConfirmBtn.addEventListener('click', confirmStartOver);
  }

  // Overlay click to close
  const overlay = startOverModal.querySelector('.modal__overlay');
  if (overlay) {
    overlay.addEventListener('click', hideStartOverModal);
  }

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !startOverModal.hasAttribute('hidden')) {
      hideStartOverModal();
    }
  });

  console.log('✓ Start Over modal initialized');
})();

// =============================================
// Settings Confirmation Modal (Before Registration)
// =============================================
(function initSettingsConfirmationModal() {
  const modal = document.getElementById('settings-confirmation-modal');
  const summaryContainer = document.getElementById('settings-confirmation-summary');
  const backBtn = document.getElementById('settings-confirmation-back');
  const continueBtn = document.getElementById('settings-confirmation-continue');

  if (!modal) {
    console.warn('Settings confirmation modal not found');
    return;
  }

  // Steps that must be valid before registration (excluding optional ones)
  const REQUIRED_STEPS = ['naming', 'permissions', 'advanced'];
  const OPTIONAL_STEPS = ['distribution', 'search'];
  const ALL_STEPS = [...REQUIRED_STEPS, ...OPTIONAL_STEPS];

  const STEP_DISPLAY_NAMES = {
    naming: 'Token Naming',
    permissions: 'Permissions & Supply',
    advanced: 'Usage & Trading',
    distribution: 'Distribution',
    search: 'Search & Discovery'
  };

  /**
   * Run validation on all steps and return results
   */
  function validateAllSteps() {
    const results = {};

    // Run each step's validation function
    ALL_STEPS.forEach(stepId => {
      let isValid = false;
      let message = '';

      try {
        switch (stepId) {
          case 'naming':
            if (typeof evaluateNaming === 'function') {
              const result = evaluateNaming({ touched: true, silent: true });
              isValid = result.valid;
              message = result.message || '';
            }
            break;
          case 'permissions':
            if (typeof evaluatePermissions === 'function') {
              const result = evaluatePermissions({ touched: true });
              isValid = result.valid;
              message = result.message || '';
            }
            break;
          case 'advanced':
            if (typeof evaluateAdvanced === 'function') {
              const result = evaluateAdvanced({ touched: true, silent: true });
              isValid = result.valid;
              message = result.message || '';
            }
            break;
          case 'distribution':
            if (typeof evaluateDistribution === 'function') {
              const result = evaluateDistribution({ touched: true, silent: true });
              isValid = result.valid;
              message = result.message || '';
            } else {
              // Distribution is optional - mark as valid if not configured
              isValid = true;
            }
            break;
          case 'search':
            if (typeof evaluateSearch === 'function') {
              const result = evaluateSearch({ touched: true, silent: true });
              isValid = result.valid;
              message = result.message || '';
            } else {
              // Search is optional
              isValid = true;
            }
            break;
        }
      } catch (err) {
        console.warn(`Validation error for step ${stepId}:`, err);
        isValid = false;
        message = 'Validation error';
      }

      // Also check wizardState.steps for validity
      const stepState = window.wizardState?.steps?.[stepId];
      if (stepState?.validity === 'valid') {
        isValid = true;
      }

      results[stepId] = {
        valid: isValid,
        required: REQUIRED_STEPS.includes(stepId),
        message: message
      };
    });

    return results;
  }

  /**
   * Generate HTML for the validation status section
   */
  function generateValidationStatusHTML(validationResults) {
    const allRequiredValid = REQUIRED_STEPS.every(step => validationResults[step]?.valid);

    let statusHTML = `
      <div class="validation-status ${allRequiredValid ? 'validation-status--ready' : 'validation-status--blocked'}">
        <div class="validation-status__header">
          <span class="validation-status__icon">${allRequiredValid ? '✓' : '!'}</span>
          <h4 class="validation-status__title">${allRequiredValid ? 'Ready for Registration' : 'Configuration Incomplete'}</h4>
        </div>
        <p class="validation-status__message">${allRequiredValid
          ? 'All required steps are complete. Review your settings below.'
          : 'Please complete the required steps before proceeding to registration.'}</p>
        <div class="validation-status__steps">
    `;

    ALL_STEPS.forEach(stepId => {
      const result = validationResults[stepId];
      const displayName = STEP_DISPLAY_NAMES[stepId] || stepId;
      const isRequired = REQUIRED_STEPS.includes(stepId);
      const statusClass = result.valid ? 'valid' : (isRequired ? 'invalid' : 'optional');
      const statusIcon = result.valid ? '✓' : (isRequired ? '✗' : '○');
      const statusText = result.valid ? 'Complete' : (isRequired ? 'Required' : 'Optional');

      statusHTML += `
        <div class="validation-step validation-step--${statusClass}">
          <span class="validation-step__icon">${statusIcon}</span>
          <span class="validation-step__name">${displayName}</span>
          <span class="validation-step__status">${statusText}</span>
          ${!result.valid && result.message ? `<span class="validation-step__message">${result.message}</span>` : ''}
        </div>
      `;
    });

    statusHTML += '</div></div>';
    return statusHTML;
  }

  /**
   * Generate HTML for the settings summary
   */
  function generateSettingsSummaryHTML() {
    const state = window.wizardState?.form;
    if (!state) return '<p>Unable to load settings.</p>';

    const categories = [];

    // Token Identity
    const tokenIdentity = [];
    if (state.tokenName) {
      tokenIdentity.push({ label: 'Token Name', value: state.tokenName });
    }
    if (state.permissions?.decimals !== undefined) {
      tokenIdentity.push({ label: 'Decimals', value: state.permissions.decimals.toString() });
    }
    // Localizations count
    const localizationCount = state.naming?.conventions?.localizations
      ? Object.keys(state.naming.conventions.localizations).length
      : 0;
    if (localizationCount > 0) {
      tokenIdentity.push({ label: 'Localizations', value: `${localizationCount} language(s)` });
    }
    if (tokenIdentity.length > 0) {
      categories.push({ icon: '🏷️', title: 'Token Identity', items: tokenIdentity });
    }

    // Supply Settings
    const supplySettings = [];
    if (state.permissions?.baseSupply) {
      supplySettings.push({ label: 'Base Supply', value: formatNumber(state.permissions.baseSupply) });
    }
    if (state.permissions?.maxSupply) {
      supplySettings.push({ label: 'Max Supply', value: formatNumber(state.permissions.maxSupply) });
    }
    if (supplySettings.length > 0) {
      categories.push({ icon: '💰', title: 'Supply Settings', items: supplySettings });
    }

    // Token Actions
    const tokenActions = [];
    tokenActions.push({
      label: 'Minting',
      value: state.permissions?.manualMint?.enabled ? 'Enabled' : 'Disabled',
      enabled: state.permissions?.manualMint?.enabled
    });
    tokenActions.push({
      label: 'Burning',
      value: state.permissions?.manualBurn?.enabled ? 'Enabled' : 'Disabled',
      enabled: state.permissions?.manualBurn?.enabled
    });
    tokenActions.push({
      label: 'Freezing',
      value: state.permissions?.manualFreeze?.enabled ? 'Enabled' : 'Disabled',
      enabled: state.permissions?.manualFreeze?.enabled
    });
    categories.push({ icon: '⚙️', title: 'Token Actions', items: tokenActions });

    // Transfer Settings
    const transferSettings = [];
    transferSettings.push({
      label: 'Transfers',
      value: state.permissions?.transferable !== false ? 'Allowed' : 'Disabled',
      enabled: state.permissions?.transferable !== false
    });
    if (state.permissions?.transferNotes?.enabled) {
      transferSettings.push({ label: 'Transfer Notes', value: 'Enabled', enabled: true });
    }
    categories.push({ icon: '↔️', title: 'Transfer Settings', items: transferSettings });

    // Distribution (if configured)
    const distributionSettings = [];
    if (state.distribution?.emission?.type) {
      const emissionType = state.distribution.emission.type;
      const emissionLabels = {
        'FixedAmount': 'Fixed Amount',
        'Exponential': 'Exponential',
        'StepFunction': 'Step Function',
        'Linear': 'Linear'
      };
      distributionSettings.push({ label: 'Emission Type', value: emissionLabels[emissionType] || emissionType });
    }
    if (state.distribution?.cadence?.type) {
      const cadenceType = state.distribution.cadence.type;
      const cadenceLabels = {
        'BlockBasedDistribution': 'Block-based',
        'TimeBasedDistribution': 'Time-based',
        'EpochBasedDistribution': 'Epoch-based'
      };
      distributionSettings.push({ label: 'Cadence', value: cadenceLabels[cadenceType] || cadenceType });
    }
    if (state.distribution?.perpetualEnabled) {
      distributionSettings.push({ label: 'Perpetual Distribution', value: 'Enabled', enabled: true });
    }
    if (distributionSettings.length > 0) {
      categories.push({ icon: '📊', title: 'Distribution', items: distributionSettings });
    }

    // Launch Settings
    const launchSettings = [];
    launchSettings.push({
      label: 'Start as Paused',
      value: state.permissions?.startAsPaused ? 'Yes' : 'No',
      enabled: state.permissions?.startAsPaused
    });
    categories.push({ icon: '🚀', title: 'Launch Settings', items: launchSettings });

    // Search & Discovery
    const searchSettings = [];
    if (state.search?.description) {
      const desc = state.search.description;
      searchSettings.push({
        label: 'Description',
        value: desc.length > 50 ? desc.substring(0, 50) + '...' : desc
      });
    }
    if (state.search?.keywords) {
      const keywords = state.search.keywords.split(',').filter(k => k.trim()).length;
      if (keywords > 0) {
        searchSettings.push({ label: 'Keywords', value: `${keywords} keyword(s)` });
      }
    }
    if (searchSettings.length > 0) {
      categories.push({ icon: '🔍', title: 'Search & Discovery', items: searchSettings });
    }

    // Render categories
    return categories.map(category => `
      <div class="settings-summary__category">
        <div class="settings-summary__category-header">
          <span class="settings-summary__category-icon">${category.icon}</span>
          <h4 class="settings-summary__category-title">${category.title}</h4>
        </div>
        <div class="settings-summary__items">
          ${category.items.map(item => `
            <div class="settings-summary__item">
              <span class="settings-summary__label">${item.label}</span>
              ${item.enabled !== undefined
                ? `<span class="settings-summary__badge ${item.enabled ? '' : 'settings-summary__badge--off'}">${item.enabled ? '✓ ' : ''}${item.value}</span>`
                : `<span class="settings-summary__value">${item.value}</span>`
              }
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  /**
   * Format large numbers with commas
   */
  function formatNumber(num) {
    if (!num) return '0';
    const str = num.toString();
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Track validation state for the continue button
  let currentValidationResults = null;

  /**
   * Show the confirmation modal
   */
  function showSettingsConfirmationModal() {
    // Run validation on all steps
    currentValidationResults = validateAllSteps();
    const allRequiredValid = REQUIRED_STEPS.every(step => currentValidationResults[step]?.valid);

    // Populate validation status and settings summary
    if (summaryContainer) {
      summaryContainer.innerHTML = generateValidationStatusHTML(currentValidationResults) + generateSettingsSummaryHTML();
    }

    // Update continue button state
    if (continueBtn) {
      if (allRequiredValid) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('wizard-button--disabled');
        continueBtn.textContent = 'Continue to Registration →';
      } else {
        continueBtn.disabled = true;
        continueBtn.classList.add('wizard-button--disabled');
        continueBtn.textContent = 'Complete Required Steps First';
      }
    }

    modal.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    continueBtn?.focus();
  }

  /**
   * Hide the confirmation modal
   */
  function hideSettingsConfirmationModal() {
    modal.setAttribute('hidden', '');
    document.body.classList.remove('modal-open');
  }

  /**
   * Handle continue to registration
   */
  function handleContinueToRegistration() {
    // Double-check validation before proceeding
    const allRequiredValid = currentValidationResults &&
      REQUIRED_STEPS.every(step => currentValidationResults[step]?.valid);

    if (!allRequiredValid) {
      console.warn('Cannot proceed - required steps not complete');
      return;
    }

    hideSettingsConfirmationModal();

    // Navigate to export step
    if (typeof goToNextScreen === 'function') {
      goToNextScreen('search');
    } else if (typeof showScreen === 'function') {
      showScreen('export');
    }
  }

  // Event listeners
  if (backBtn) {
    backBtn.addEventListener('click', hideSettingsConfirmationModal);
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', handleContinueToRegistration);
  }

  // Overlay click to close
  const overlay = modal.querySelector('.modal__overlay');
  if (overlay) {
    overlay.addEventListener('click', hideSettingsConfirmationModal);
  }

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      hideSettingsConfirmationModal();
    }
  });

  // Expose function globally for use by search-next button
  window.showSettingsConfirmationModal = showSettingsConfirmationModal;

  console.log('✓ Settings confirmation modal initialized');
})();

// ═══════════════════════════════════════════════════════
// INLINE HELP SYSTEM
// ═══════════════════════════════════════════════════════

(function initializeHelpSystem() {
  // Help content database
  const HELP_CONTENT = {
    'token-name': {
      title: 'Token Name',
      content: `
        <p>Choose a unique, memorable name for your token that users will recognize.</p>
        <div class="help-tooltip-example">
          <strong>Examples:</strong>
          <p>"RewardPoints", "PlatformCredits", "GameGold"</p>
        </div>
        <p>Must be 2-64 characters. Can include letters, numbers, spaces, and basic punctuation.</p>
        <div class="help-tooltip-permanent">
          Cannot be changed after token is registered
        </div>
      `
    },

    'decimals': {
      title: 'Decimals',
      content: `
        <p>Controls how divisible your token is. Similar to how dollars have 2 decimals ($1.25).</p>
        <p><strong>Examples:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li><strong>0 decimals:</strong> Whole units only (voting rights, membership)</li>
          <li><strong>2 decimals:</strong> Like currency (1.25 tokens)</li>
          <li><strong>8 decimals:</strong> Maximum precision (0.00000001 tokens)</li>
        </ul>
        <div class="help-tooltip-permanent">
          Cannot be changed after token is registered
        </div>
      `
    },

    'base-supply': {
      title: 'Base Supply',
      content: `
        <p>The initial amount of tokens created when you register your token.</p>
        <p><strong>These tokens are created immediately</strong> and sent to your wallet.</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p>Base supply of 1,000,000 means you start with 1 million tokens</p>
        </div>
        <p><strong>Tip:</strong> Consider your total planned supply and distribution schedule when setting this.</p>
      `
    },

    'max-supply': {
      title: 'Maximum Supply',
      content: `
        <p>The total amount of tokens that can ever exist. This is a hard cap.</p>
        <p><strong>If enabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>No more tokens can be created once this limit is reached</li>
          <li>Provides scarcity and predictability</li>
          <li>Popular for governance and store-of-value tokens</li>
        </ul>
        <p><strong>If disabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Unlimited supply - can mint forever</li>
          <li>Good for reward systems and utility tokens</li>
        </ul>
        <div class="help-tooltip-permanent">
          ⚠️ Can only be changed after registration if you configure governance rules below
        </div>
        <p><strong>See:</strong> "Can the max supply be changed?" section for governance controls</p>
      `
    },

    'keeps-history': {
      title: 'History Tracking',
      content: `
        <p>Choose which token operations to record on the blockchain.</p>
        <p><strong>Tracked operations appear in:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Token explorer views</li>
          <li>Wallet transaction history</li>
          <li>Audit trails</li>
        </ul>
        <p><strong>⚠️ Warning:</strong> Tracking uses more blockchain space and costs more in fees.</p>
        <p><strong>Tip:</strong> Most tokens track transfers at minimum.</p>
      `
    },

    'trade-mode': {
      title: 'Marketplace Trade Mode',
      content: `
        <p>Dash Platform hasn't enabled marketplace trading yet, so every token launches as <strong>Not Tradeable</strong>.</p>
        <p><strong>Not Tradeable:</strong> Token cannot be listed or swapped until the future marketplace upgrade.</p>
        <p><strong>Coming soon:</strong> Permissionless and approval-based modes will unlock once trading goes live.</p>
      `
    },

    'distribution-type': {
      title: 'Distribution Schedule',
      content: `
        <p>Automatically create new tokens on a schedule.</p>
        <p><strong>Time-Based:</strong> Create tokens every X hours/days (e.g., daily rewards)</p>
        <p><strong>Block-Based:</strong> Create tokens every X blocks (more predictable on-chain)</p>
        <p><strong>Epoch-Based:</strong> Create tokens at Dash Platform epoch boundaries</p>
        <p><strong>⚠️ Important:</strong> Distribution runs automatically once enabled. Make sure you control the destination address!</p>
      `
    },

    'emission-type': {
      title: 'Emission Function',
      content: `
        <p>How many tokens are created each time distribution runs.</p>
        <p><strong>Fixed Amount:</strong> Same amount every time (e.g., 1000 tokens daily)</p>
        <p><strong>Exponential:</strong> Decreases over time (like Bitcoin halving)</p>
        <p><strong>Linear:</strong> Gradually increases or decreases</p>
        <p><strong>Step Function:</strong> Different amounts at different stages</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p>Fixed 100 tokens per day = predictable, steady rewards</p>
        </div>
      `
    },

    'manual-mint': {
      title: 'Manual Minting',
      content: `
        <p>Allows creating new tokens manually at any time.</p>
        <p><strong>When enabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Token owner can create new tokens on demand</li>
          <li>Still respects max supply limit if set</li>
          <li>Useful for rewards, airdrops, or flexible supply</li>
        </ul>
        <p><strong>⚠️ Warning:</strong> Users may be concerned about inflation. Consider enabling change control to require community approval.</p>
      `
    },

    'manual-burn': {
      title: 'Manual Burning',
      content: `
        <p>Allows permanently destroying tokens.</p>
        <p><strong>Common uses:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Reduce supply to increase scarcity</li>
          <li>"Burn to redeem" mechanics (burn tokens for items/services)</li>
          <li>Correct mistakes or remove tokens from circulation</li>
        </ul>
        <p><strong>Tip:</strong> Burned tokens are gone forever and cannot be recovered.</p>
      `
    },

    'start-paused': {
      title: 'Start Paused',
      content: `
        <p>Whether your token starts in a paused state.</p>
        <p><strong>When paused:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>No transfers allowed</li>
          <li>No minting or burning</li>
          <li>Token is "frozen" until unpaused</li>
        </ul>
        <p><strong>Use case:</strong> Pause until you're ready to officially launch (prepare marketing, set up pools, etc.)</p>
        <p><strong>⚠️ Important:</strong> You need unpause permissions enabled to resume operations.</p>
      `
    },

    // Priority 1: Critical Concepts
    'change-max-supply': {
      title: 'Max Supply Change Rules',
      content: `
        <p>Control who can modify the max supply cap after deployment.</p>
        <p><strong>Options:</strong> Owner / Identity / Group / Main Group / No One</p>
        <div class="help-tooltip-permanent">
          ⚠️ Setting to "No One" makes max supply immutable forever
        </div>
        <p>This is a critical security and economic decision that affects your token's scarcity guarantees.</p>
      `
    },

    'manual-freeze': {
      title: 'Manual Freezing',
      content: `
        <p>Allow locking specific token balances to prevent transfers.</p>
        <p><strong>Use cases:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Regulatory compliance</li>
          <li>Security investigations</li>
          <li>Vesting lockups</li>
        </ul>
        <div class="help-tooltip-permanent">
          ⚠️ Freezing can restrict user access to their tokens - use responsibly
        </div>
      `
    },

    'actor-types': {
      title: 'Who Can Perform Actions',
      content: `
        <p><strong>Owner:</strong> The contract owner's identity (single person)</p>
        <p><strong>Identity:</strong> A specific Dash Platform identity ID</p>
        <p><strong>Group:</strong> A defined control group (requires group configuration)</p>
        <p><strong>Main Group:</strong> The primary control group for governance</p>
        <p><strong>No One:</strong> Action is permanently disabled</p>
        <div class="help-tooltip-permanent">
          ⚠️ "No One" is irreversible - the action becomes permanently locked
        </div>
      `
    },

    'governance-safeguards': {
      title: 'Governance Safeguards',
      content: `
        <p>Advanced governance controls that determine if permissions can be permanently locked:</p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li><strong>Allow changing authorized to "No One":</strong> Permits disabling the action forever</li>
          <li><strong>Allow changing admin to "No One":</strong> Permits permanently locking rule changes</li>
          <li><strong>Allow self-changing admin:</strong> Admin can change their own permissions</li>
        </ul>
        <div class="help-tooltip-permanent">
          ⚠️ For experts only - default is safe (unchecked). Only enable if you understand the implications.
        </div>
      `
    },

    'owner-identity-id': {
      title: 'Owner Identity ID',
      content: `
        <p>Your Dash Platform identity ID that will own this token contract.</p>
        <p><strong>Format:</strong> Base58, 43-44 characters</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p><code>GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec</code></p>
        </div>
        <p><strong>Get your identity from:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Dash Platform wallet (mobile/desktop)</li>
          <li>dash-evo-tool command line tool</li>
          <li>Leave empty to create new identity during self-service registration</li>
        </ul>
        <div class="help-tooltip-permanent">
          ⚠️ This identity will have permanent ownership - double-check before submitting
        </div>
      `
    },

    // Priority 2: Distribution & Economics
    'cadence-type': {
      title: 'Distribution Cadence Type',
      content: `
        <p>How to schedule token distributions:</p>
        <p><strong>Block-based:</strong> Release tokens every N blocks (~4 hours per 100 blocks on Dash)</p>
        <p><strong>Time-based:</strong> Release tokens every N seconds (e.g., 3600 = 1 hour)</p>
        <p><strong>Epoch-based:</strong> Release tokens based on Dash Platform epochs (advanced)</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p>Every 100 blocks = approximately 4 hours between distributions</p>
        </div>
      `
    },

    'epoch-based-distribution': {
      title: 'Epoch-based Distribution',
      content: `
        <p>Distribute tokens based on Dash Platform epochs.</p>
        <p><strong>What are epochs?</strong> Periods defined by the Dash network for validator rotation and governance.</p>
        <div class="help-tooltip-permanent">
          ⚠️ Advanced feature - requires deep understanding of Dash Platform architecture
        </div>
        <p>Only use if you understand Dash Platform's epoch system.</p>
      `
    },

    'evonodes-recipient': {
      title: 'Evonodes by Participation',
      content: `
        <p>Distribute tokens to Dash evonodes (validator nodes) based on their participation in the network.</p>
        <p><strong>Requirement:</strong> Must use Epoch-based cadence</p>
        <p><strong>Use case:</strong> Incentivizing network validators, decentralized distribution</p>
        <p>This rewards network validators proportionally to their contribution.</p>
      `
    },

    'emission-function': {
      title: 'Emission Functions',
      content: `
        <p><strong>Fixed Amount:</strong> Same amount every time (e.g., 100 tokens)</p>
        <p><strong>Random Amount:</strong> Random amount between min/max each time</p>
        <p><strong>Step Decreasing:</strong> Amount reduces over time (like Bitcoin halving)</p>
        <div class="help-tooltip-example">
          <strong>Bitcoin-style Example:</strong>
          <p>Start at 50 tokens, halve every 210,000 distributions → 50, 25, 12.5, 6.25...</p>
        </div>
        <p>Choose based on your economic model.</p>
      `
    },

    'step-decreasing-emission': {
      title: 'Step Decreasing Amount',
      content: `
        <p>Create a halving-style emission schedule where the distributed amount decreases over time.</p>
        <p><strong>Configure:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li><strong>Step count:</strong> How many distributions before amount decreases</li>
          <li><strong>Numerator/Denominator:</strong> Reduction fraction (e.g., 1/2 = halve the amount)</li>
          <li><strong>Start amount:</strong> Initial distribution amount</li>
          <li><strong>Trailing amount:</strong> Minimum amount after all reductions</li>
        </ul>
        <p>This creates predictable, deflationary emissions like Bitcoin.</p>
      `
    },

    'perpetual-distribution-rules': {
      title: 'Perpetual Distribution Rules',
      content: `
        <p>Control who can perform distributions and who can change distribution rules after deployment.</p>
        <p>This governance layer determines if your distribution schedule is fixed or can be modified later.</p>
        <div class="help-tooltip-permanent">
          ⚠️ Setting to "No One" makes distribution schedule immutable
        </div>
      `
    },

    // Priority 3: History & Advanced
    'keeps-history-transfers': {
      title: 'Keep Transfer History',
      content: `
        <p>Record all token transfers on-chain for complete transaction history.</p>
        <p><strong>Tradeoff:</strong> Historical data vs. storage cost</p>
        <p>Enables tracking but increases storage costs. Turn off to reduce blockchain storage fees if you don't need transfer records.</p>
      `
    },

    'keeps-history-direct-pricing': {
      title: 'Keep Direct Pricing History',
      content: `
        <p>Record pricing changes for your token on-chain.</p>
        <p><strong>Use case:</strong> Price discovery, historical analytics</p>
        <p>Useful if you plan to implement direct pricing mechanisms or want to track price history. Increases storage requirements.</p>
      `
    },

    'encryption-bounded-key': {
      title: 'Encryption Bounded Key',
      content: `
        <p>Advanced cryptography: Specify a storage key requirement (0-255) for identity-based encryption.</p>
        <div class="help-tooltip-permanent">
          ⚠️ Expert feature - incorrect values can break functionality
        </div>
        <p>Only use if you understand Dash Platform's encryption-bounded storage system. Leave empty for standard configurations.</p>
      `
    },

    'decryption-bounded-key': {
      title: 'Decryption Bounded Key',
      content: `
        <p>Advanced cryptography: Specify a storage key requirement (0-255) for identity-based decryption.</p>
        <div class="help-tooltip-permanent">
          ⚠️ Expert feature - incorrect values can break functionality
        </div>
        <p>Only use if you understand Dash Platform's encryption-bounded storage system. Leave empty for standard configurations.</p>
      `
    },

    'sized-integer-types': {
      title: 'Sized Integer Types',
      content: `
        <p>Use explicit integer size declarations (uint32, uint64) instead of variable-length integers.</p>
        <p><strong>Tradeoff:</strong> Performance vs. forward compatibility</p>
        <p>Improves performance and reduces storage costs, but may affect compatibility with future Dash Platform versions.</p>
        <p><strong>Default:</strong> Checked (recommended)</p>
      `
    },

    // Priority 4: Naming & Localization
    'localization': {
      title: 'Multi-language Localization',
      content: `
        <p>Add multi-language support for your token name.</p>
        <p><strong>Format:</strong> Language code must be 2 lowercase letters (ISO 639-1)</p>
        <div class="help-tooltip-example">
          <strong>Examples:</strong>
          <p>en: Token/Tokens<br>es: Ficha/Fichas<br>fr: Jeton/Jetons</p>
        </div>
        <p>Improves international accessibility and user experience.</p>
      `
    },

    'update-naming': {
      title: 'Update Naming Rules',
      content: `
        <p>Allow token names to be updated after deployment.</p>
        <p><strong>Enable:</strong> Flexibility to rebrand or correct names later</p>
        <p><strong>Disable:</strong> Names become immutable and permanent</p>
        <p><strong>Tradeoff:</strong> Flexibility vs. permanence (immutable names prevent confusion)</p>
      `
    },

    // Priority 5: Permissions Details
    'mint-destination': {
      title: 'Mint Destination',
      content: `
        <p>Where newly minted tokens are sent:</p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li><strong>Contract Owner:</strong> Tokens go to the owner's identity</li>
          <li><strong>Specific Identity:</strong> Tokens go to a designated identity ID</li>
          <li><strong>Allow Custom Destination:</strong> Minter can choose destination each time</li>
        </ul>
        <p>Choose based on your distribution strategy.</p>
      `
    },

    'mint-allow-custom': {
      title: 'Allow Custom Destination',
      content: `
        <p>Let the authorized minter choose where tokens are sent each time they mint.</p>
        <p><strong>Tradeoff:</strong> Flexibility vs. control</p>
        <p>Enables flexible distribution but gives minter more control. Disable to always send to a fixed destination.</p>
      `
    },

    'unfreeze-rules': {
      title: 'Unfreeze Rules',
      content: `
        <p>Control who can unfreeze frozen tokens.</p>
        <p>This is separate from freeze permissions - you might want different people to freeze vs. unfreeze.</p>
        <p><strong>Use case:</strong> Separation of duties, multi-sig unfreezing</p>
      `
    },

    'destroy-frozen-rules': {
      title: 'Destroy Frozen Funds Rules',
      content: `
        <p>Control who can permanently destroy frozen tokens.</p>
        <div class="help-tooltip-permanent">
          ⚠️ This is irreversible - destroyed tokens cannot be recovered under any circumstances
        </div>
        <p>This is an extreme action - frozen tokens are completely removed from circulation. Use for regulatory compliance or security incidents only.</p>
      `
    },

    'emergency-action-rules': {
      title: 'Emergency Action Rules',
      content: `
        <p>Emergency override permissions for critical situations.</p>
        <p><strong>Use cases:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Security incidents</li>
          <li>Regulatory compliance</li>
          <li>Critical bug fixes</li>
        </ul>
        <div class="help-tooltip-permanent">
          ⚠️ Emergency actions should have strong governance - consider requiring multi-sig approval
        </div>
      `
    },

    // Priority 6: Registration
    'registration-det': {
      title: 'DET Registration (Dash Evo Tool)',
      content: `
        <p>Export your token configuration as raw JSON for use with dash-evo-tool, the official Dash Platform command-line tool.</p>
        <p><strong>Best for:</strong> Advanced users, automated deployments, programmatic registration</p>
        <p><strong>Requirements:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Install dash-evo-tool: <code>npm install -g dash-evo-tool</code></li>
          <li>Have a funded Dash Platform identity</li>
        </ul>
      `
    },

    'registration-self-service': {
      title: 'Self-service Registration',
      content: `
        <p>Import your wallet mnemonic phrase and register directly from the browser using Dash SDK.</p>
        <div class="help-tooltip-permanent">
          ⚠️ Security warnings:
          <ul style="margin: 4px 0 0 20px; padding: 0;">
            <li>Only use on trusted, secure devices</li>
            <li>Mnemonic is stored in memory only (not saved)</li>
            <li>Close browser immediately after registration</li>
            <li>Consider using DET method for high-value tokens</li>
          </ul>
        </div>
        <p><strong>Requirements:</strong> 12 or 24-word BIP39 mnemonic phrase</p>
      `
    },

    'wallet-mnemonic': {
      title: 'Wallet Mnemonic Phrase',
      content: `
        <p>Your 12 or 24-word recovery phrase for your Dash wallet.</p>
        <div class="help-tooltip-permanent">
          ⚠️ NEVER share your mnemonic with anyone
          <ul style="margin: 4px 0 0 20px; padding: 0;">
            <li>Only enter on trusted, secure devices</li>
            <li>Not sent to any server - stays in browser memory</li>
            <li>Close browser tab immediately after registration</li>
          </ul>
        </div>
        <p><strong>Format:</strong> 12 or 24 words separated by spaces (BIP39 word list)</p>
        <p><strong>Alternative:</strong> Use DET or Mobile registration to avoid entering mnemonic in browser</p>
      `
    }
  };

  // Create and position tooltip
  function showHelpTooltip(helpIcon, contentKey) {
    // Hide any existing tooltips
    hideAllTooltips();

    const content = HELP_CONTENT[contentKey];
    if (!content) {
      console.warn('No help content found for:', contentKey);
      return;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip';
    tooltip.id = `tooltip-${contentKey}`;
    tooltip.innerHTML = content.content;

    // Add to body
    document.body.appendChild(tooltip);

    // Position tooltip below the help icon
    const iconRect = helpIcon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = iconRect.left;
    let top = iconRect.bottom + 8;

    // Adjust if tooltip would go off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + tooltipRect.width > viewportWidth - 20) {
      left = viewportWidth - tooltipRect.width - 20;
    }

    if (top + tooltipRect.height > viewportHeight - 20) {
      // Show above instead
      top = iconRect.top - tooltipRect.height - 8;
      tooltip.classList.add('help-tooltip--above');
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.removeAttribute('hidden');

    // Store reference to close later
    helpIcon._activeTooltip = tooltip;

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeTooltipOnClickOutside);
    }, 10);
  }

  function hideAllTooltips() {
    document.querySelectorAll('.help-tooltip').forEach(tooltip => {
      tooltip.remove();
    });
    document.removeEventListener('click', closeTooltipOnClickOutside);
  }

  function closeTooltipOnClickOutside(e) {
    if (!e.target.closest('.help-icon') && !e.target.closest('.help-tooltip')) {
      hideAllTooltips();
    }
  }

  // Initialize help icons
  function initializeHelpIcons() {
    document.querySelectorAll('.help-icon').forEach(icon => {
      // Click handler
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const contentKey = icon.getAttribute('data-help');

        // Toggle tooltip
        if (icon._activeTooltip) {
          hideAllTooltips();
        } else {
          showHelpTooltip(icon, contentKey);
        }
      });

      // Keyboard handler for Enter and Space keys
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();

          const contentKey = icon.getAttribute('data-help');

          // Toggle tooltip
          if (icon._activeTooltip) {
            hideAllTooltips();
          } else {
            showHelpTooltip(icon, contentKey);
          }
        }
      });
    });
  }

  // Close tooltips on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllTooltips();
    }
  });

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHelpIcons);
  } else {
    initializeHelpIcons();
  }

  // Re-initialize when new help icons are added dynamically
  // Performance optimization: Debounced callback and narrowed scope
  let helpIconObserverTimer = null;
  const helpIconObserver = new MutationObserver((mutations) => {
    // Check if any mutation added help icons
    let hasNewHelpIcons = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          if ((node.classList && node.classList.contains('help-icon')) ||
              (node.querySelector && node.querySelector('.help-icon'))) {
            hasNewHelpIcons = true;
            break;
          }
        }
      }
      if (hasNewHelpIcons) break;
    }

    // Debounce re-initialization to avoid excessive calls
    if (hasNewHelpIcons) {
      if (helpIconObserverTimer) clearTimeout(helpIconObserverTimer);
      helpIconObserverTimer = setTimeout(initializeHelpIcons, 100);
    }
  });

  // Narrow scope to wizard container only (where dynamic content lives)
  const wizardContainer = document.querySelector('.wizard-main');
  helpIconObserver.observe(wizardContainer || document.body, {
    childList: true,
    subtree: true
  });

  console.log('✓ Inline help system initialized');
})();

// ═══════════════════════════════════════════════════════
// DUAL INFO/GUIDE PANEL SYSTEM
// ═══════════════════════════════════════════════════════

(function initializeGuidePanel() {
  const STORAGE_KEY_COLLAPSED = 'dash-wizard-guide-collapsed';
  const STORAGE_KEY_ACTIVE_PANEL = 'dash-wizard-active-panel';

  // Restore saved state from localStorage
  function restoreState() {
    const collapsedState = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    const activePanel = localStorage.getItem(STORAGE_KEY_ACTIVE_PANEL) || 'info';

    document.querySelectorAll('.page-guide').forEach(guide => {
      // Restore collapsed state
      if (collapsedState === 'true') {
        guide.setAttribute('data-collapsed', 'true');
        const collapseBtn = guide.querySelector('.page-guide__collapse');
        if (collapseBtn) {
          collapseBtn.setAttribute('aria-expanded', 'false');
        }
      }

      // Restore active panel (INFO or GUIDE)
      switchPanel(guide, activePanel, false);
    });

    // Restore body class for content recentering
    if (collapsedState === 'true') {
      document.body.classList.add('guide-panel-collapsed');
    } else {
      document.body.classList.remove('guide-panel-collapsed');
    }
  }

  // Toggle panel collapse/expand
  function toggleCollapse(guidePanel) {
    const isCollapsed = guidePanel.getAttribute('data-collapsed') === 'true';
    const newState = !isCollapsed;

    // Update all panels to match (keeps state consistent across wizard steps)
    document.querySelectorAll('.page-guide').forEach(guide => {
      guide.setAttribute('data-collapsed', String(newState));
      const collapseBtn = guide.querySelector('.page-guide__collapse');
      if (collapseBtn) {
        collapseBtn.setAttribute('aria-expanded', String(!newState));
      }
    });

    // Toggle body class to recenter wizard content
    if (newState) {
      document.body.classList.add('guide-panel-collapsed');
    } else {
      document.body.classList.remove('guide-panel-collapsed');
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(newState));
  }

  // Switch between INFO and GUIDE panels
  function switchPanel(guidePanel, panelType, saveState = true) {
    // Update tab button states
    const infoTab = guidePanel.querySelector('.page-guide__tab--info');
    const guideTab = guidePanel.querySelector('.page-guide__tab--guide');
    const infoPanel = guidePanel.querySelector('.page-guide__panel--info');
    const guidePanel2 = guidePanel.querySelector('.page-guide__panel--guide');

    if (!infoTab || !guideTab || !infoPanel || !guidePanel2) return;

    if (panelType === 'info') {
      // Update tab states
      infoTab.classList.add('active');
      infoTab.setAttribute('aria-pressed', 'true');
      guideTab.classList.remove('active');
      guideTab.setAttribute('aria-pressed', 'false');

      // Update panel visibility
      infoPanel.classList.add('active');
      infoPanel.removeAttribute('hidden');
      guidePanel2.classList.remove('active');
      guidePanel2.setAttribute('hidden', '');
    } else {
      // Update tab states
      guideTab.classList.add('active');
      guideTab.setAttribute('aria-pressed', 'true');
      infoTab.classList.remove('active');
      infoTab.setAttribute('aria-pressed', 'false');

      // Update panel visibility
      guidePanel2.classList.add('active');
      guidePanel2.removeAttribute('hidden');
      infoPanel.classList.remove('active');
      infoPanel.setAttribute('hidden', '');
    }

    // Save to localStorage
    if (saveState) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PANEL, panelType);

      // Update all other panels to match
      document.querySelectorAll('.page-guide').forEach(guide => {
        if (guide !== guidePanel) {
          switchPanel(guide, panelType, false);
        }
      });
    }
  }

  // Expand panel if collapsed (used by help icons)
  function expandGuidePanel() {
    const currentGuide = document.querySelector('.wizard-screen--active .page-guide');
    if (currentGuide && currentGuide.getAttribute('data-collapsed') === 'true') {
      toggleCollapse(currentGuide);
    }
    // Always switch to INFO panel when help icon is clicked
    if (currentGuide) {
      switchPanel(currentGuide, 'info');
    }
  }

  // Initialize tab buttons using event delegation for better performance
  // This replaces the clone-replace pattern which caused DOM reflows
  let guideButtonsInitialized = false;

  function initializeToggleButtons() {
    // Only set up delegation once - no need to reinitialize
    if (guideButtonsInitialized) return;
    guideButtonsInitialized = true;

    // Event delegation for all page guide interactions
    document.addEventListener('click', (e) => {
      // Handle INFO/GUIDE tab buttons
      const tab = e.target.closest('.page-guide__tab');
      if (tab) {
        e.preventDefault();
        const panel = tab.closest('.page-guide');
        const panelType = tab.getAttribute('data-panel');
        if (panelType) {
          switchPanel(panel, panelType);
        }
        return;
      }

      // Handle collapse buttons
      const collapseBtn = e.target.closest('.page-guide__collapse');
      if (collapseBtn) {
        e.preventDefault();
        const panel = collapseBtn.closest('.page-guide');
        toggleCollapse(panel);
        return;
      }
    });
  }

  // Update help icon behavior for desktop
  function isDesktop() {
    return window.innerWidth > 1200;
  }

  // Clear any existing highlights
  function clearHighlights() {
    document.querySelectorAll('.page-guide__step-heading--highlighted').forEach(heading => {
      heading.classList.remove('page-guide__step-heading--highlighted');
    });
  }

  // Highlight and scroll to guide section
  function highlightGuideSection(targetId) {
    if (!targetId) return;

    // Find the target section
    const targetSection = document.getElementById(targetId);
    if (!targetSection) {
      console.warn(`Guide section not found: ${targetId}`);
      return;
    }

    // Clear any existing highlights
    clearHighlights();

    // Add highlight class to the target section
    targetSection.classList.add('page-guide__step-heading--highlighted');
    console.log('✓ Added highlight class to:', targetId);

    // Scroll the guide panel to show the highlighted section
    const guidePanel = targetSection.closest('.page-guide');
    if (guidePanel) {
      // Calculate position relative to the guide panel's scroll container
      const targetOffset = targetSection.offsetTop;
      const toggleHeight = 60; // Approximate height of sticky toggle button

      // Scroll the guide panel container - fast smooth for polished feel
      // Respects user's reduced motion preference automatically via CSS
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      guidePanel.scrollTo({
        top: targetOffset - toggleHeight - 20, // 20px padding
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      console.log('✓ Scrolled to section:', targetId);
    }

    // Auto-remove highlight after 3 seconds
    setTimeout(() => {
      targetSection.classList.remove('page-guide__step-heading--highlighted');
      console.log('✓ Removed highlight from:', targetId);
    }, 3500);
  }

  // Override help icon clicks on desktop to scroll guide panel
  function enhanceHelpIcons() {
    document.querySelectorAll('.help-icon').forEach(icon => {
      const originalHandler = icon.onclick;

      icon.addEventListener('click', (e) => {
        if (isDesktop()) {
          // On desktop: expand panel, highlight, and scroll to relevant section
          e.preventDefault();
          e.stopPropagation();

          // Get the guide target from data attribute
          const guideTarget = icon.getAttribute('data-guide-target');

          // Expand the panel if collapsed
          expandGuidePanel();

          // Highlight and scroll to the target section
          if (guideTarget) {
            highlightGuideSection(guideTarget);
          }
        }
        // On mobile (<1200px): let the original tooltip behavior work
      }, true); // Use capture phase to run before original handler
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      restoreState();
      initializeToggleButtons();
      enhanceHelpIcons();
    });
  } else {
    restoreState();
    initializeToggleButtons();
    enhanceHelpIcons();
  }

  // Note: With event delegation in initializeToggleButtons(), we no longer need
  // a MutationObserver to reinitialize buttons when screens change.
  // Event delegation automatically handles dynamically added elements.

  console.log('✓ Dual INFO/GUIDE panel system initialized');
})();

// ============================================
// Interactive Background Glow System (Optimized)
// CSS-only gradients with subtle parallax
// ============================================
(function() {
  'use strict';

  const bg = document.querySelector('.background-orbs');
  if (!bg) return;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('✓ Background glow: parallax disabled (prefers-reduced-motion)');
    return;
  }

  // State - track mouse position as percentage (0-100)
  let mouseX = 50, mouseY = 50;
  let targetX = 50, targetY = 50;
  let rafId = null;

  // Linear interpolation for smooth movement
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Update gradient positions
  function update() {
    mouseX = lerp(mouseX, targetX, 0.05);
    mouseY = lerp(mouseY, targetY, 0.05);

    bg.style.setProperty('--mouse-x', mouseX);
    bg.style.setProperty('--mouse-y', mouseY);

    // Continue animation if not yet converged
    if (Math.abs(mouseX - targetX) > 0.1 || Math.abs(mouseY - targetY) > 0.1) {
      rafId = requestAnimationFrame(update);
    } else {
      rafId = null;
    }
  }

  // Mouse move handler with passive listener
  document.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth) * 100;
    targetY = (e.clientY / window.innerHeight) * 100;
    if (!rafId) rafId = requestAnimationFrame(update);
  }, { passive: true });

  // Pause when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  console.log('✓ Background glow system initialized (optimized CSS gradients)');
})();

// ============================================
// Landing Page & Hub Page Handler
// Full-screen introduction flow: Landing -> Hub -> Wizard
// ============================================
(function initLandingAndHubPages() {
  'use strict';

  const LANDING_STORAGE_KEY = 'dash-wizard-landing-seen';

  function setupPages() {
    const landingPage = document.getElementById('landing-page');
    const hubPage = document.getElementById('hub-page');
    const enterWizardBtn = document.getElementById('enter-wizard-btn');
    const hubCreateTokenBtn = document.getElementById('hub-create-token');
    const hubTemplatesBtn = document.getElementById('hub-templates');
    const hubDocumentsBtn = document.getElementById('hub-documents');
    const hubGroupsBtn = document.getElementById('hub-groups');
    const wizardShell = document.querySelector('.wizard-shell');

    console.log('[Pages] Elements found:', {
      landingPage: !!landingPage,
      hubPage: !!hubPage,
      enterWizardBtn: !!enterWizardBtn,
      hubCreateTokenBtn: !!hubCreateTokenBtn,
      hubTemplatesBtn: !!hubTemplatesBtn,
      hubDocumentsBtn: !!hubDocumentsBtn,
      hubGroupsBtn: !!hubGroupsBtn,
      wizardShell: !!wizardShell
    });

    if (!landingPage) {
      console.log('[Pages] Landing page element not found, skipping initialization');
      return;
    }

    // Check if user has already seen the landing page in this session
    function hasSeenLanding() {
      return sessionStorage.getItem(LANDING_STORAGE_KEY) === 'true';
    }

    // Mark landing as seen
    function markLandingSeen() {
      sessionStorage.setItem(LANDING_STORAGE_KEY, 'true');
    }

    // Hide all intro pages and show wizard
    function showWizard() {
      console.log('[Pages] Showing wizard...');

      // Hide landing page
      if (landingPage) {
        landingPage.classList.add('landing-page--hidden');
        landingPage.style.display = 'none';
      }

      // Hide hub page
      if (hubPage) {
        hubPage.classList.add('hub-page--hidden');
        hubPage.hidden = true;
      }

      // Show wizard
      document.body.classList.remove('landing-visible');
      document.body.classList.remove('hub-visible');
      if (wizardShell) {
        wizardShell.classList.remove('wizard-shell--hidden');
        wizardShell.style.opacity = '1';
        wizardShell.style.visibility = 'visible';
        wizardShell.style.pointerEvents = 'auto';
      }

      console.log('[Pages] Wizard visible');
    }

    // Show hub page (hide landing and wizard)
    function showHubPage() {
      console.log('[Pages] Showing hub page...');

      // Hide landing page with animation
      if (landingPage) {
        landingPage.classList.add('landing-page--hidden');
        setTimeout(() => {
          landingPage.style.display = 'none';
        }, 500);
      }

      // Show hub page
      if (hubPage) {
        hubPage.hidden = false;
        hubPage.classList.remove('hub-page--hidden');
      }

      // Keep wizard hidden
      document.body.classList.remove('landing-visible');
      document.body.classList.add('hub-visible');
      if (wizardShell) {
        wizardShell.classList.add('wizard-shell--hidden');
        wizardShell.style.opacity = '0';
        wizardShell.style.visibility = 'hidden';
        wizardShell.style.pointerEvents = 'none';
      }

      markLandingSeen();
      console.log('[Pages] Hub page visible');
    }

    // Expose showHubPage globally for inline onclick fallback
    window.showHubPage = showHubPage;

    // Show landing page (hide hub and wizard)
    function showLandingPageUI() {
      console.log('[Pages] Showing landing page...');

      // Hide hub page
      if (hubPage) {
        hubPage.hidden = true;
        hubPage.classList.add('hub-page--hidden');
      }

      // Show landing page
      document.body.classList.add('landing-visible');
      document.body.classList.remove('hub-visible');
      if (landingPage) {
        landingPage.style.display = 'flex';
        landingPage.classList.remove('landing-page--hidden');
      }
      if (wizardShell) {
        wizardShell.classList.add('wizard-shell--hidden');
        wizardShell.style.opacity = '0';
        wizardShell.style.visibility = 'hidden';
        wizardShell.style.pointerEvents = 'none';
      }
    }

    // Initialize - determine which page to show
    if (hasSeenLanding()) {
      // User has already seen landing, show hub page
      if (landingPage) landingPage.style.display = 'none';
      if (hubPage) {
        hubPage.hidden = false;
        hubPage.classList.remove('hub-page--hidden');
      }
      document.body.classList.add('hub-visible');
      if (wizardShell) {
        wizardShell.classList.add('wizard-shell--hidden');
        wizardShell.style.opacity = '0';
        wizardShell.style.visibility = 'hidden';
        wizardShell.style.pointerEvents = 'none';
      }
      console.log('[Pages] Showing hub page (landing already seen)');
    } else {
      // Show landing page first
      showLandingPageUI();
      console.log('[Pages] Landing page displayed');
    }

    // Event listeners for landing page "Create Your Token" button
    if (enterWizardBtn) {
      // Click event (works for both mouse and touch on most browsers)
      enterWizardBtn.addEventListener('click', function(e) {
        console.log('[Pages] Landing button clicked - showing hub');
        e.preventDefault();
        e.stopPropagation();
        showHubPage();
      });

      // Touch event for better mobile support
      enterWizardBtn.addEventListener('touchend', function(e) {
        console.log('[Pages] Landing button touched - showing hub');
        e.preventDefault();
        showHubPage();
      }, { passive: false });

      enterWizardBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showHubPage();
        }
      });
    }

    // Event listeners for hub page buttons
    if (hubCreateTokenBtn) {
      hubCreateTokenBtn.addEventListener('click', function(e) {
        console.log('[Pages] Hub Create Token clicked');
        e.preventDefault();
        showWizard();
        // Navigate to tokens page (templates)
        if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
          setTimeout(() => {
            window.globalHeader.switchPage('tokens');
          }, 100);
        }
      });
    }

    if (hubTemplatesBtn) {
      hubTemplatesBtn.addEventListener('click', function(e) {
        console.log('[Pages] Hub Templates clicked');
        e.preventDefault();

        // Show wizard shell and use global header's switchPage for consistency
        showWizard();

        // Use global header's switchPage to navigate to templates
        if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
          window.globalHeader.switchPage('templates');
        }
      });
    }

    // Back to hub button on templates page
    const templatesBackBtn = document.getElementById('templates-back-to-hub');
    if (templatesBackBtn) {
      templatesBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        showHubPage();
      });
    }

    // Templates page card click handlers - opens the confirmation modal
    const templatesContent = document.getElementById('templates-content');
    if (templatesContent) {
      templatesContent.addEventListener('click', function(e) {
        const card = e.target.closest('[data-tpl]');
        if (card) {
          const templateKey = card.getAttribute('data-tpl');
          console.log('[Templates Page] Card clicked:', templateKey);

          // Show the template confirmation modal (fromPage = true for simple loading)
          if (typeof window.showTemplateConfirmation === 'function') {
            window.showTemplateConfirmation(templateKey, true);
          } else {
            console.error('showTemplateConfirmation not available');
          }
        }
      });
    }

    if (hubDocumentsBtn) {
      hubDocumentsBtn.addEventListener('click', function(e) {
        console.log('[Pages] Hub Documents clicked');
        e.preventDefault();
        showWizard();
        // Navigate to documents page
        if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
          setTimeout(() => {
            window.globalHeader.switchPage('documents');
          }, 100);
        }
      });
    }

    if (hubGroupsBtn) {
      hubGroupsBtn.addEventListener('click', function(e) {
        console.log('[Pages] Hub Groups clicked');
        e.preventDefault();
        showWizard();
        // Navigate to groups page
        if (window.globalHeader && typeof window.globalHeader.switchPage === 'function') {
          setTimeout(() => {
            window.globalHeader.switchPage('groups');
          }, 100);
        }
      });
    }

    // Expose functions for external access
    window.showLandingPage = function() {
      sessionStorage.removeItem(LANDING_STORAGE_KEY);
      showLandingPageUI();
    };

    window.showHubPage = showHubPage;
    window.hideIntroPages = showWizard;

    console.log('[Pages] Landing and Hub page handler initialized successfully');
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPages);
  } else {
    setupPages();
  }
})();

// ============================================
// Global Header Controller
// Handles navigation, theme toggle, and register button
// ============================================
(function initGlobalHeader() {
  'use strict';

  // Current active page
  let currentPage = 'tokens';

  function setupGlobalHeader() {
    const globalHeader = document.getElementById('global-header');
    const headerNavLinks = document.querySelectorAll('.global-header__link');
    const headerThemeBtns = document.querySelectorAll('.global-header__theme-btn');
    const headerResetBtn = document.getElementById('header-reset-btn');
    const headerRegisterBtn = document.getElementById('header-register-btn');
    const registerDropdown = document.getElementById('register-dropdown');
    const missingStepsList = document.getElementById('missing-steps-list');
    const headerBrandLink = document.getElementById('header-brand-link');

    if (!globalHeader) {
      console.log('[GlobalHeader] Global header not found, skipping initialization');
      return;
    }

    console.log('[GlobalHeader] Initializing global header...');

    // ─────────────────────────────────────────────────────────────────────
    // Page Navigation
    // ─────────────────────────────────────────────────────────────────────
    function switchPage(pageId) {
      currentPage = pageId;

      // Update header nav active state
      headerNavLinks.forEach(link => {
        const isActive = link.dataset.page === pageId;
        link.classList.toggle('global-header__link--active', isActive);
      });

      // Show/hide sidebar content based on page
      const tokenSidebar = document.querySelector('[data-sidebar="token"]');
      const groupSidebar = document.querySelector('[data-sidebar="group"]');
      const documentsSidebar = document.querySelector('[data-sidebar="documents"]');
      const wizardOutline = document.querySelector('.wizard-outline');

      // Hide all sidebars first
      if (tokenSidebar) tokenSidebar.hidden = true;
      if (groupSidebar) groupSidebar.hidden = true;
      if (documentsSidebar) documentsSidebar.hidden = true;

      // Show the appropriate sidebar (or hide for fullpage screens)
      if (pageId === 'documents' || pageId === 'templates' || pageId === 'groups') {
        // Documents, Templates, and Groups are fullpage layouts - hide the entire sidebar
        if (wizardOutline) wizardOutline.style.display = 'none';
        document.body.classList.add('fullpage-mode');
      } else {
        // Show sidebar for other pages
        if (wizardOutline) wizardOutline.style.display = '';
        document.body.classList.remove('fullpage-mode');

        if (tokenSidebar) {
          tokenSidebar.hidden = false;
        }
      }

      // Clean up groups page state when leaving
      if (pageId !== 'groups') {
        document.body.classList.remove('groups-page-active');
        const sidebar = document.querySelector('.wizard-sidebar');
        if (sidebar) sidebar.style.display = '';
      }

      // Handle page-specific content visibility
      if (pageId === 'tokens') {
        // Show token wizard screens
        if (typeof showScreen === 'function') {
          const activeStep = wizardState?.active || 'naming';
          showScreen(activeStep);
        }
      } else if (pageId === 'templates') {
        // Show standalone templates page (not the wizard welcome screen)
        // Hide all wizard screens first
        document.querySelectorAll('.wizard-screen').forEach(screen => {
          screen.classList.remove('wizard-screen--active');
        });
        // Show templates page
        const templatesScreen = document.getElementById('screen-templates-page');
        if (templatesScreen) {
          templatesScreen.classList.add('wizard-screen--active');
          templatesScreen.removeAttribute('hidden');
        }
      } else if (pageId === 'groups') {
        // Show groups page - handle directly since it's a standalone page
        // Hide all wizard screens first
        document.querySelectorAll('.wizard-screen').forEach(screen => {
          screen.classList.remove('wizard-screen--active');
        });
        // Show groups screen
        const groupsScreen = document.getElementById('screen-groups-page');
        if (groupsScreen) {
          groupsScreen.classList.add('wizard-screen--active');
          groupsScreen.removeAttribute('hidden');
        }
        // Add body class for fullpage styling
        document.body.classList.add('groups-page-active');
        // Also explicitly hide the sidebar
        const sidebar = document.querySelector('.wizard-sidebar');
        if (sidebar) sidebar.style.display = 'none';
        // Render group list
        if (typeof window.groupsPage !== 'undefined' && typeof window.groupsPage.render === 'function') {
          window.groupsPage.render();
        }
      } else if (pageId === 'documents') {
        // Show documents page - handle directly since it's not part of wizard flow
        // Hide all wizard screens first
        document.querySelectorAll('.wizard-screen').forEach(screen => {
          screen.classList.remove('wizard-screen--active');
        });
        // Show documents screen
        const documentsScreen = document.getElementById('screen-documents');
        if (documentsScreen) {
          documentsScreen.classList.add('wizard-screen--active');
          documentsScreen.removeAttribute('hidden');
        }
        // Refresh document list
        if (window.documentStorage && typeof window.documentStorage.render === 'function') {
          window.documentStorage.render();
        }
      }

      // Close dropdown if open
      if (registerDropdown) {
        registerDropdown.hidden = true;
      }

      console.log('[GlobalHeader] Switched to page:', pageId);
    }

    // Add click handlers to nav links
    headerNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;
        if (pageId) {
          switchPage(pageId);
        }
      });
    });

    // Brand link - return to hub page
    if (headerBrandLink) {
      headerBrandLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Show hub page (main navigation hub)
        if (typeof window.showHubPage === 'function') {
          window.showHubPage();
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Theme Toggle (syncs with wizard IIFE using 'ui.theme' key)
    // ─────────────────────────────────────────────────────────────────────
    const THEME_KEY = 'ui.theme'; // Must match wizard IIFE's THEME_STORAGE_KEY
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);

      // Update header button states
      headerThemeBtns.forEach(btn => {
        btn.classList.toggle('global-header__theme-btn--active', btn.dataset.theme === theme);
      });

      // Also update sidebar theme toggles to stay in sync
      const sidebarThemeRadios = document.querySelectorAll('input[name="ui-theme"], input[name="ui-theme-group"]');
      sidebarThemeRadios.forEach(radio => {
        radio.checked = radio.value === theme;
        const option = radio.closest('.theme-toggle__option');
        if (option) {
          option.classList.toggle('theme-toggle__option--active', radio.value === theme);
        }
      });
    }

    function setThemeFromHeader(theme, persist = true) {
      applyTheme(theme);
      if (persist) {
        localStorage.setItem(THEME_KEY, theme);
      }
      console.log('[GlobalHeader] Theme set to:', theme, persist ? '(saved)' : '(system)');
    }

    headerThemeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (theme) {
          setThemeFromHeader(theme, true); // User click = persist
        }
      });
    });

    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemTheme = darkModeQuery.matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    // Apply initial theme (don't persist if following system)
    applyTheme(initialTheme);

    // Listen for system theme changes
    darkModeQuery.addEventListener('change', (e) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      const userPref = localStorage.getItem(THEME_KEY);

      if (!userPref) {
        // No saved preference - follow system
        applyTheme(newSystemTheme);
        console.log('[GlobalHeader] Following system theme:', newSystemTheme);
      } else {
        console.log('[GlobalHeader] System changed to', newSystemTheme, '- user preference:', userPref);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // Reset Button (Full Website Reset)
    // ─────────────────────────────────────────────────────────────────────
    if (headerResetBtn) {
      headerResetBtn.addEventListener('click', () => {
        console.log('[GlobalHeader] Reset button clicked');
        // Show full reset modal
        const fullResetModal = document.getElementById('full-reset-modal');
        console.log('[GlobalHeader] Reset modal found:', !!fullResetModal);
        if (fullResetModal) {
          fullResetModal.removeAttribute('hidden');
          console.log('[GlobalHeader] Reset modal shown');
        } else {
          console.error('[GlobalHeader] Reset modal not found!');
        }
      });
    } else {
      console.warn('[GlobalHeader] Reset button not found');
    }

    // Full Reset Modal Handlers
    const fullResetModal = document.getElementById('full-reset-modal');
    const fullResetCancelBtn = document.getElementById('full-reset-cancel-btn');
    const fullResetConfirmBtn = document.getElementById('full-reset-confirm-btn');

    console.log('[GlobalHeader] Reset modal elements:', {
      modal: !!fullResetModal,
      cancelBtn: !!fullResetCancelBtn,
      confirmBtn: !!fullResetConfirmBtn
    });

    if (fullResetModal) {
      // Cancel button
      if (fullResetCancelBtn) {
        fullResetCancelBtn.addEventListener('click', () => {
          console.log('[Full Reset] Cancel clicked');
          fullResetModal.setAttribute('hidden', '');
        });
      }

      // Confirm button handler is in index.html inline onclick
      // This prevents race conditions between handlers

      // Overlay click to close
      const overlay = fullResetModal.querySelector('.modal__overlay');
      if (overlay) {
        overlay.addEventListener('click', () => {
          fullResetModal.setAttribute('hidden', '');
        });
      }

      // ESC key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !fullResetModal.hasAttribute('hidden')) {
          fullResetModal.setAttribute('hidden', '');
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Register Button with Dropdown for Missing Steps
    // ─────────────────────────────────────────────────────────────────────
    function getStepDisplayName(stepId) {
      const names = {
        'naming': 'Naming',
        'permissions': 'Permissions',
        'distribution': 'Distribution',
        'advanced': 'Usage',
        'search': 'Search Ability',
        'export': 'Export'
      };
      return names[stepId] || stepId;
    }

    function getStepIssue(stepId) {
      const issues = {
        'naming': 'Token name required',
        'permissions': 'Supply settings required',
        'distribution': 'Distribution settings needed',
        'advanced': 'Configuration needed',
        'search': 'Search settings needed'
      };
      return issues[stepId] || 'Configuration incomplete';
    }

    function getMissingRequiredSteps() {
      // Required steps that must be valid before registration
      const required = ['naming', 'permissions'];
      const missing = [];

      if (typeof wizardState !== 'undefined' && wizardState.steps) {
        required.forEach(stepId => {
          const state = wizardState.steps[stepId];
          if (!state || state.validity !== 'valid') {
            missing.push({
              id: stepId,
              name: getStepDisplayName(stepId),
              issue: getStepIssue(stepId)
            });
          }
        });
      } else {
        // If wizard state not available, assume all required
        required.forEach(stepId => {
          missing.push({
            id: stepId,
            name: getStepDisplayName(stepId),
            issue: getStepIssue(stepId)
          });
        });
      }

      return missing;
    }

    function showRegisterDropdown(missingSteps) {
      if (!registerDropdown || !missingStepsList) return;

      // Populate list with clickable links
      missingStepsList.innerHTML = missingSteps.map(step => `
        <li>
          <a href="#" class="register-dropdown__link" data-step="${step.id}">
            <span class="register-dropdown__step-name">${step.name}</span>
            <span class="register-dropdown__step-issue">${step.issue}</span>
          </a>
        </li>
      `).join('');

      registerDropdown.hidden = false;

      // Add click handlers to navigate
      missingStepsList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          registerDropdown.hidden = true;
          switchPage('tokens');
          if (typeof showScreen === 'function') {
            showScreen(link.dataset.step);
          }
        });
      });
    }

    function handleRegisterClick() {
      const missingSteps = getMissingRequiredSteps();

      if (missingSteps.length === 0) {
        // All complete - go to export
        switchPage('tokens');
        if (typeof showScreen === 'function') {
          showScreen('export');
        }
      } else {
        // Show dropdown with missing steps
        showRegisterDropdown(missingSteps);
      }
    }

    if (headerRegisterBtn) {
      headerRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleRegisterClick();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (registerDropdown && !registerDropdown.hidden) {
        const isInsideDropdown = registerDropdown.contains(e.target);
        const isRegisterBtn = headerRegisterBtn && headerRegisterBtn.contains(e.target);
        if (!isInsideDropdown && !isRegisterBtn) {
          registerDropdown.hidden = true;
        }
      }
    });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && registerDropdown && !registerDropdown.hidden) {
        registerDropdown.hidden = true;
        headerRegisterBtn?.focus();
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // Expose functions globally for integration
    // ─────────────────────────────────────────────────────────────────────
    window.globalHeader = {
      switchPage,
      setTheme: setThemeFromHeader,
      getCurrentPage: () => currentPage
    };

    // Fire custom event to signal app is ready for navigation
    window.dispatchEvent(new CustomEvent('wizardAppReady', { detail: { globalHeader: window.globalHeader } }));
    window.wizardAppReady = true;

    console.log('[GlobalHeader] Global header initialized successfully');
    console.log('[GlobalHeader] wizardAppReady event fired');
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalHeader);
  } else {
    setupGlobalHeader();
  }
})();

// ============================================
// Mobile Navigation Controller
// Handles hamburger menu and mobile nav drawer
// ============================================
(function initMobileNavigation() {
  'use strict';

  function setupMobileNav() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navDrawer = document.getElementById('mobile-nav-drawer');
    const navBackdrop = document.getElementById('mobile-nav-backdrop');
    const navClose = document.getElementById('mobile-nav-close');
    const navLinks = document.querySelectorAll('.mobile-nav-drawer__link');

    if (!menuBtn || !navDrawer) {
      console.log('[MobileNav] Elements not found, skipping initialization');
      return;
    }

    // Open drawer
    function openDrawer() {
      navDrawer.classList.add('is-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    // Close drawer
    function closeDrawer() {
      navDrawer.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    // Toggle drawer
    menuBtn.addEventListener('click', () => {
      if (navDrawer.classList.contains('is-open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close on backdrop click
    if (navBackdrop) {
      navBackdrop.addEventListener('click', closeDrawer);
    }

    // Close button
    if (navClose) {
      navClose.addEventListener('click', closeDrawer);
    }

    // Handle nav link clicks
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;

        // Update active state
        navLinks.forEach(l => l.classList.remove('mobile-nav-drawer__link--active'));
        link.classList.add('mobile-nav-drawer__link--active');

        // Also update header nav active state
        const headerLinks = document.querySelectorAll('.global-header__link');
        headerLinks.forEach(l => {
          l.classList.toggle('global-header__link--active', l.dataset.page === page);
        });

        // Navigate to page
        if (typeof window.GlobalHeader !== 'undefined' && window.GlobalHeader.navigateTo) {
          window.GlobalHeader.navigateTo(page);
        }

        // Close drawer
        closeDrawer();
      });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Sync with header nav when pages change
    const headerLinks = document.querySelectorAll('.global-header__link');
    headerLinks.forEach(link => {
      link.addEventListener('click', () => {
        const page = link.dataset.page;
        navLinks.forEach(l => {
          l.classList.toggle('mobile-nav-drawer__link--active', l.dataset.page === page);
        });
      });
    });

    console.log('[MobileNav] Mobile navigation initialized');
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileNav);
  } else {
    setupMobileNav();
  }
})();

// ============================================
// Mobile Sidebar Toggle Controller
// Handles the floating button to open wizard sidebar on mobile
// ============================================
(function initMobileSidebarToggle() {
  'use strict';

  function setupMobileSidebar() {
    const sidebar = document.querySelector('.wizard-sidebar');

    if (!sidebar) {
      console.log('[MobileSidebar] Sidebar not found, skipping initialization');
      return;
    }

    // Create the floating toggle button if it doesn't exist
    let toggleBtn = document.querySelector('.mobile-sidebar-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.className = 'mobile-sidebar-toggle';
      toggleBtn.setAttribute('aria-label', 'Open wizard steps');
      toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      `;
      document.body.appendChild(toggleBtn);
    }

    // Create backdrop if it doesn't exist
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    // Open sidebar
    function openSidebar() {
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    }

    // Close sidebar
    function closeSidebar() {
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
    }

    // Toggle button click
    toggleBtn.addEventListener('click', openSidebar);

    // Backdrop click closes sidebar
    backdrop.addEventListener('click', closeSidebar);

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    });

    // Close sidebar when a step is clicked (on mobile)
    const stepItems = sidebar.querySelectorAll('.wizard-path__item, .wizard-nav-item');
    stepItems.forEach(item => {
      item.addEventListener('click', () => {
        // Only close on mobile
        if (window.innerWidth <= 900) {
          closeSidebar();
        }
      });
    });

    // Expose close function globally
    window.closeMobileSidebar = closeSidebar;

    console.log('[MobileSidebar] Mobile sidebar toggle initialized');
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileSidebar);
  } else {
    setupMobileSidebar();
  }
})();

// ============================================
// Document Storage Controller
// Handles save/load/edit/delete of token configurations
// ============================================
(function initDocumentStorage() {
  'use strict';

  const STORAGE_KEY = 'dash-wizard-documents';
  let documents = [];
  let editingDocId = null;

  // ─────────────────────────────────────────────────────────────────────
  // Helper: Show toast notification (wrapper for global function)
  // ─────────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    // Try to use the global showToast if available
    if (typeof window.showToast === 'function') {
      window.showToast({ type, title: message });
    } else {
      // Fallback: log to console
      console.log(`[Toast ${type}] ${message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Storage Functions
  // ─────────────────────────────────────────────────────────────────────
  function loadDocuments() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      documents = stored ? JSON.parse(stored) : [];
      console.log('[Documents] Loaded', documents.length, 'documents');
    } catch (e) {
      console.error('[Documents] Error loading documents:', e);
      documents = [];
    }
    return documents;
  }

  function saveDocuments() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
      console.log('[Documents] Saved', documents.length, 'documents');
    } catch (e) {
      console.error('[Documents] Error saving documents:', e);
      showToast('Error saving documents', 'error');
    }
  }

  function generateId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Document CRUD Operations
  // ─────────────────────────────────────────────────────────────────────
  function createDocument(name, notes, wizardData) {
    const doc = {
      id: generateId(),
      name: name.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(wizardData)) // Deep clone
    };
    documents.unshift(doc); // Add to beginning
    saveDocuments();
    return doc;
  }

  function updateDocument(id, updates) {
    const index = documents.findIndex(d => d.id === id);
    if (index !== -1) {
      documents[index] = {
        ...documents[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      saveDocuments();
      return documents[index];
    }
    return null;
  }

  function deleteDocument(id) {
    const index = documents.findIndex(d => d.id === id);
    if (index !== -1) {
      documents.splice(index, 1);
      saveDocuments();
      return true;
    }
    return false;
  }

  function getDocument(id) {
    return documents.find(d => d.id === id);
  }

  // ─────────────────────────────────────────────────────────────────────
  // UI Rendering
  // ─────────────────────────────────────────────────────────────────────
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  function getTokenSummary(data) {
    const summary = [];
    if (data.tokenName) {
      summary.push({ label: 'Token', value: data.tokenName, primary: true });
    }
    if (data.permissions?.baseSupply) {
      const supply = parseInt(data.permissions.baseSupply).toLocaleString();
      summary.push({ label: 'Supply', value: supply });
    }
    if (data.permissions?.decimals !== undefined) {
      summary.push({ label: 'Decimals', value: data.permissions.decimals });
    }
    return summary;
  }

  function createDocumentCard(doc) {
    const summary = getTokenSummary(doc.data);

    const card = document.createElement('div');
    card.className = 'document-card';
    card.dataset.id = doc.id;

    card.innerHTML = `
      <div class="document-card__header">
        <div class="document-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 2h8l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2v4h4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="document-card__info">
          <h3 class="document-card__name">${escapeHtml(doc.name)}</h3>
          <span class="document-card__date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${formatDate(doc.updatedAt)}
          </span>
        </div>
      </div>
      <div class="document-card__body">
        ${doc.notes ? `<p class="document-card__notes">${escapeHtml(doc.notes)}</p>` : ''}
        <div class="document-card__summary">
          ${summary.map(item => `
            <span class="document-card__tag ${item.primary ? 'document-card__tag--primary' : ''}">
              <span>${item.label}:</span> ${escapeHtml(String(item.value))}
            </span>
          `).join('')}
        </div>
      </div>
      <div class="document-card__actions">
        <button class="document-card__action document-card__action--primary" data-action="load" title="Load this configuration">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Load
        </button>
        <button class="document-card__action" data-action="export" title="Export as JSON">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Export
        </button>
        <button class="document-card__action" data-action="edit" title="Edit document name/notes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Edit
        </button>
        <button class="document-card__action document-card__action--danger" data-action="delete" title="Delete document">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Delete
        </button>
      </div>
    `;

    // Add click handlers
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardAction(doc.id, btn.dataset.action);
      });
    });

    return card;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderDocuments(filter = '') {
    const listEl = document.getElementById('documents-list');
    const emptyEl = document.getElementById('documents-empty');
    const countBadge = document.getElementById('documents-count');

    if (!listEl) {
      console.warn('[Documents] documents-list element not found');
      return;
    }

    // Filter documents
    let filtered = documents;
    if (filter) {
      const search = filter.toLowerCase();
      filtered = documents.filter(doc =>
        doc.name.toLowerCase().includes(search) ||
        (doc.notes && doc.notes.toLowerCase().includes(search)) ||
        (doc.data.tokenName && doc.data.tokenName.toLowerCase().includes(search))
      );
    }

    // Update count badge
    if (countBadge) {
      countBadge.textContent = documents.length;
    }

    // Clear existing items (except empty state)
    listEl.querySelectorAll('.docs-item').forEach(el => el.remove());

    // Show/hide empty state
    if (emptyEl) {
      emptyEl.style.display = filtered.length === 0 ? 'flex' : 'none';
    }

    // Add document items
    filtered.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'docs-item';
      item.dataset.id = doc.id;

      item.innerHTML = `
        <div class="docs-item__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 2h8l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2v4h4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="docs-item__info">
          <p class="docs-item__name">${escapeHtml(doc.name)}</p>
          <span class="docs-item__date">${formatDate(doc.updatedAt)}</span>
        </div>
        <div class="docs-item__actions">
          <button class="docs-item__action" data-action="export" title="Export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="docs-item__action docs-item__action--danger" data-action="delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `;

      // Click to load into editor
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        if (window.contractEditor) {
          window.contractEditor.loadDocument(doc);
        }
      });

      // Action buttons
      item.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'export') {
            exportDocument(doc);
          } else if (action === 'delete') {
            openDeleteModal(doc.id);
          }
        });
      });

      listEl.appendChild(item);
    });

    console.log('[Documents] Rendered', filtered.length, 'documents');
  }

  // ─────────────────────────────────────────────────────────────────────
  // Modal Handlers
  // ─────────────────────────────────────────────────────────────────────
  let pendingSaveData = null; // Holds data from editor when saving

  function openSaveModal(isEdit = false, docId = null, editorData = null) {
    const modal = document.getElementById('save-document-modal');
    const titleEl = document.getElementById('save-document-modal-title');
    const nameInput = document.getElementById('document-name-input');
    const notesInput = document.getElementById('document-notes-input');
    const summaryContent = document.getElementById('document-summary-content');
    const confirmBtn = document.getElementById('save-document-confirm');

    if (!modal || !nameInput) return;

    editingDocId = docId;
    pendingSaveData = editorData; // Store editor data if provided

    // Set modal title
    if (titleEl) {
      titleEl.textContent = isEdit ? 'Edit Document' : 'Save Document';
    }
    if (confirmBtn) {
      confirmBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2"/>
          <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" stroke-width="2"/>
        </svg>
        ${isEdit ? 'Update Document' : 'Save Document'}
      `;
    }

    // Populate fields
    if (isEdit && docId) {
      const doc = getDocument(docId);
      if (doc) {
        nameInput.value = doc.name;
        notesInput.value = doc.notes || '';
      }
    } else {
      // Generate default name from token name or editor data
      let tokenName = 'Token';
      if (editorData && editorData.tokenName) {
        tokenName = editorData.tokenName;
      } else if (typeof wizardState !== 'undefined' && wizardState.form?.tokenName) {
        tokenName = wizardState.form.tokenName;
      }
      nameInput.value = `${tokenName} Configuration`;
      notesInput.value = '';
    }

    // Populate summary
    const dataToSummarize = editorData || (typeof wizardState !== 'undefined' ? wizardState.form : null);
    if (summaryContent && dataToSummarize) {
      const summary = getTokenSummary(dataToSummarize);
      summaryContent.innerHTML = summary.map(item => `
        <div class="document-preview-summary__item">
          <span class="document-preview-summary__item-label">${item.label}:</span>
          <span class="document-preview-summary__item-value">${escapeHtml(String(item.value))}</span>
        </div>
      `).join('');
    }

    modal.hidden = false;
    nameInput.focus();
  }

  function closeSaveModal() {
    const modal = document.getElementById('save-document-modal');
    if (modal) {
      modal.hidden = true;
      editingDocId = null;
      pendingSaveData = null;
    }
  }

  function handleSaveConfirm() {
    const nameInput = document.getElementById('document-name-input');
    const notesInput = document.getElementById('document-notes-input');

    if (!nameInput) return;

    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter a document name', 'warning');
      nameInput.focus();
      return;
    }

    if (editingDocId) {
      // Update existing document
      updateDocument(editingDocId, { name, notes: notesInput.value.trim() });
      showToast('Document updated successfully', 'success');
    } else {
      // Create new document - use pendingSaveData if available, otherwise use wizardState
      const dataToSave = pendingSaveData || (typeof wizardState !== 'undefined' ? wizardState.form : null);
      if (!dataToSave) {
        showToast('No configuration to save', 'error');
        return;
      }
      createDocument(name, notesInput.value, dataToSave);
      showToast('Document saved successfully', 'success');
    }

    closeSaveModal();
    renderDocuments();
  }

  function openDeleteModal(docId) {
    const modal = document.getElementById('delete-document-modal');
    const nameEl = document.getElementById('delete-document-name');
    const confirmBtn = document.getElementById('delete-document-confirm');

    if (!modal) return;

    const doc = getDocument(docId);
    if (!doc) return;

    if (nameEl) {
      nameEl.textContent = doc.name;
    }

    // Store doc ID for confirmation
    if (confirmBtn) {
      confirmBtn.dataset.docId = docId;
    }

    modal.hidden = false;
  }

  function closeDeleteModal() {
    const modal = document.getElementById('delete-document-modal');
    if (modal) modal.hidden = true;
  }

  function handleDeleteConfirm() {
    const confirmBtn = document.getElementById('delete-document-confirm');
    if (!confirmBtn) return;

    const docId = confirmBtn.dataset.docId;
    if (docId && deleteDocument(docId)) {
      showToast('Document deleted', 'success');
      renderDocuments();
    }
    closeDeleteModal();
  }

  function openLoadModal(docId) {
    const modal = document.getElementById('load-document-modal');
    const nameEl = document.getElementById('load-document-name');
    const confirmBtn = document.getElementById('load-document-confirm');

    if (!modal) return;

    const doc = getDocument(docId);
    if (!doc) return;

    if (nameEl) {
      nameEl.textContent = doc.name;
    }

    // Store doc ID for confirmation
    if (confirmBtn) {
      confirmBtn.dataset.docId = docId;
    }

    modal.hidden = false;
  }

  function closeLoadModal() {
    const modal = document.getElementById('load-document-modal');
    if (modal) modal.hidden = true;
  }

  function handleLoadConfirm() {
    const confirmBtn = document.getElementById('load-document-confirm');
    if (!confirmBtn) return;

    const docId = confirmBtn.dataset.docId;
    const doc = getDocument(docId);

    if (doc && typeof wizardState !== 'undefined') {
      // Restore wizard state from document
      Object.assign(wizardState.form, doc.data);

      // Save to localStorage
      localStorage.setItem('wizard-state', JSON.stringify(wizardState));

      showToast(`Loaded "${doc.name}"`, 'success');

      // Navigate to tokens page
      if (window.globalHeader) {
        window.globalHeader.switchPage('tokens');
      }

      // Refresh UI
      if (typeof updateAllValidationStates === 'function') {
        updateAllValidationStates();
      }
      if (typeof showScreen === 'function') {
        showScreen('naming');
      }
    }

    closeLoadModal();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Card Actions
  // ─────────────────────────────────────────────────────────────────────
  function handleCardAction(docId, action) {
    const doc = getDocument(docId);
    if (!doc) return;

    switch (action) {
      case 'load':
        openLoadModal(docId);
        break;

      case 'export':
        exportDocument(doc);
        break;

      case 'edit':
        openSaveModal(true, docId);
        break;

      case 'delete':
        openDeleteModal(docId);
        break;
    }
  }

  function exportDocument(doc) {
    const exportData = {
      name: doc.name,
      notes: doc.notes,
      createdAt: doc.createdAt,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: doc.data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Document exported', 'success');
  }

  function importDocument(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const content = e.target.result;
        const imported = JSON.parse(content);

        let documentData;
        let documentName;
        let documentNotes = '';

        // Check if it's a wrapped export format (has .data property)
        if (imported.data && typeof imported.data === 'object') {
          // Wrapped format from our export
          documentData = imported.data;
          documentName = imported.name || file.name.replace(/\.json$/i, '');
          documentNotes = imported.notes || '';
        } else if (typeof imported === 'object') {
          // Raw contract JSON - use file contents directly
          documentData = imported;
          documentName = imported.tokenName || file.name.replace(/\.json$/i, '');
          documentNotes = 'Imported from ' + file.name;
        } else {
          throw new Error('Invalid JSON format');
        }

        // Create document from imported data
        const doc = createDocument(documentName, documentNotes, documentData);

        // Also load into the editor for immediate viewing
        if (window.contractEditor && typeof window.contractEditor.loadDocument === 'function') {
          window.contractEditor.loadDocument(doc);
        }

        showToast(`Imported "${doc.name}"`, 'success');
        renderDocuments();

      } catch (err) {
        console.error('[Documents] Import error:', err);

        // Provide helpful error message
        if (err instanceof SyntaxError) {
          showToast('Invalid JSON file - please check the file format', 'error');
        } else {
          showToast('Failed to import: ' + err.message, 'error');
        }
      }
    };

    reader.onerror = function() {
      showToast('Failed to read file', 'error');
    };

    reader.readAsText(file);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Event Setup
  // ─────────────────────────────────────────────────────────────────────
  function setupDocumentStorage() {
    // Load existing documents
    loadDocuments();

    // Save buttons
    const saveBtn = document.getElementById('save-current-doc-btn');
    const emptySaveBtn = document.getElementById('empty-save-btn');
    const sidebarSaveBtn = document.getElementById('sidebar-save-doc-btn');

    [saveBtn, emptySaveBtn, sidebarSaveBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => openSaveModal(false));
      }
    });

    // Import buttons
    const importBtn = document.getElementById('import-doc-btn');
    const sidebarImportBtn = document.getElementById('sidebar-import-doc-btn');
    const importInput = document.getElementById('import-doc-input');

    [importBtn, sidebarImportBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (importInput) importInput.click();
        });
      }
    });

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importDocument(e.target.files[0]);
          e.target.value = ''; // Reset for next import
        }
      });
    }

    // Search input
    const searchInput = document.getElementById('documents-search-input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          renderDocuments(e.target.value);
        }, 200);
      });
    }

    // Save modal
    const saveModalClose = document.getElementById('save-document-modal-close');
    const saveCancel = document.getElementById('save-document-cancel');
    const saveConfirm = document.getElementById('save-document-confirm');

    [saveModalClose, saveCancel].forEach(btn => {
      if (btn) btn.addEventListener('click', closeSaveModal);
    });

    if (saveConfirm) {
      saveConfirm.addEventListener('click', handleSaveConfirm);
    }

    // Delete modal
    const deleteCancel = document.getElementById('delete-document-cancel');
    const deleteConfirm = document.getElementById('delete-document-confirm');

    if (deleteCancel) deleteCancel.addEventListener('click', closeDeleteModal);
    if (deleteConfirm) deleteConfirm.addEventListener('click', handleDeleteConfirm);

    // Load modal
    const loadCancel = document.getElementById('load-document-cancel');
    const loadConfirm = document.getElementById('load-document-confirm');

    if (loadCancel) loadCancel.addEventListener('click', closeLoadModal);
    if (loadConfirm) loadConfirm.addEventListener('click', handleLoadConfirm);

    // Modal overlay close
    document.querySelectorAll('#save-document-modal .modal__overlay, #delete-document-modal .modal__overlay, #load-document-modal .modal__overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        closeSaveModal();
        closeDeleteModal();
        closeLoadModal();
      });
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSaveModal();
        closeDeleteModal();
        closeLoadModal();
      }
    });

    // Initial render
    renderDocuments();

    console.log('[Documents] Document storage initialized');
  }

  // ─────────────────────────────────────────────────────────────────────
  // Contract Editor Functions
  // ─────────────────────────────────────────────────────────────────────
  let currentEditorDocId = null;
  let editorContent = '';

  function setupEditor() {
    const editor = document.getElementById('contract-editor');
    const lineNumbers = document.getElementById('editor-line-numbers');
    const linesInfo = document.getElementById('editor-lines');
    const charsInfo = document.getElementById('editor-chars');
    const validationInfo = document.getElementById('editor-validation');
    const editorStatus = document.getElementById('editor-status');
    const editorStatusText = document.getElementById('editor-status-text');

    if (!editor) {
      console.warn('[Documents] Editor element not found, retrying in 500ms...');
      setTimeout(setupEditor, 500);
      return;
    }

    console.log('[Documents] Setting up contract editor...');

    // Update line numbers
    function updateLineNumbers() {
      const lines = editor.value.split('\n').length;
      const numbers = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
      if (lineNumbers) lineNumbers.textContent = numbers;
      if (linesInfo) linesInfo.textContent = `Lines: ${lines}`;
      if (charsInfo) charsInfo.textContent = `Characters: ${editor.value.length}`;
    }

    // Validate JSON
    function validateJSON() {
      const value = editor.value.trim();
      if (!value) {
        if (validationInfo) {
          validationInfo.className = 'docs-editor__info-item docs-editor__info-item--validation';
          validationInfo.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Paste JSON to validate
          `;
        }
        return false;
      }

      try {
        JSON.parse(value);
        if (validationInfo) {
          validationInfo.className = 'docs-editor__info-item docs-editor__info-item--validation docs-editor__info-item--valid';
          validationInfo.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Valid JSON
          `;
        }
        return true;
      } catch (e) {
        if (validationInfo) {
          validationInfo.className = 'docs-editor__info-item docs-editor__info-item--validation docs-editor__info-item--invalid';
          validationInfo.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Invalid JSON
          `;
        }
        return false;
      }
    }

    // Update editor status
    function updateEditorStatus(status, text) {
      if (editorStatus) {
        editorStatus.className = 'docs-editor__status' + (status ? ' docs-editor__status--' + status : '');
      }
      if (editorStatusText) {
        editorStatusText.textContent = text;
      }
    }

    // Sync scroll for line numbers
    editor.addEventListener('scroll', () => {
      if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
    });

    // Input event
    editor.addEventListener('input', () => {
      updateLineNumbers();
      validateJSON();
      if (currentEditorDocId) {
        updateEditorStatus('modified', 'Modified (unsaved)');
      }
    });

    // Initial update
    updateLineNumbers();

    // Format button
    const formatBtn = document.getElementById('editor-format-btn');
    if (formatBtn) {
      console.log('[Documents] Format button found, attaching listener');
      formatBtn.addEventListener('click', () => {
        console.log('[Documents] Format button clicked');
        try {
          const parsed = JSON.parse(editor.value);
          editor.value = JSON.stringify(parsed, null, 2);
          updateLineNumbers();
          validateJSON();
          showToast('JSON formatted', 'success');
        } catch (e) {
          console.error('[Documents] Format error:', e);
          showToast('Cannot format invalid JSON', 'error');
        }
      });
    } else {
      console.warn('[Documents] Format button not found');
    }

    // Copy button
    const copyBtn = document.getElementById('editor-copy-btn');
    if (copyBtn) {
      console.log('[Documents] Copy button found, attaching listener');
      copyBtn.addEventListener('click', async () => {
        console.log('[Documents] Copy button clicked');
        try {
          await navigator.clipboard.writeText(editor.value);
          showToast('Copied to clipboard', 'success');
        } catch (e) {
          console.error('[Documents] Copy error:', e);
          showToast('Failed to copy', 'error');
        }
      });
    } else {
      console.warn('[Documents] Copy button not found');
    }

    // Download button
    const downloadBtn = document.getElementById('editor-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const blob = new Blob([editor.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contract.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded', 'success');
      });
    }

    // Load to Wizard button
    const loadToWizardBtn = document.getElementById('editor-load-to-wizard-btn');
    if (loadToWizardBtn) {
      loadToWizardBtn.addEventListener('click', () => {
        if (!validateJSON()) {
          showToast('Please enter valid JSON first', 'error');
          return;
        }

        try {
          const data = JSON.parse(editor.value);

          if (typeof wizardState !== 'undefined') {
            Object.assign(wizardState.form, data);
            localStorage.setItem('wizard-state', JSON.stringify(wizardState));

            showToast('Loaded to wizard', 'success');

            if (window.globalHeader) {
              window.globalHeader.switchPage('tokens');
            }

            if (typeof updateAllValidationStates === 'function') {
              updateAllValidationStates();
            }
            if (typeof showScreen === 'function') {
              showScreen('naming');
            }
          }
        } catch (e) {
          showToast('Failed to load: ' + e.message, 'error');
        }
      });
    }

    // Save as Document button (from editor)
    const editorSaveBtn = document.getElementById('editor-save-btn');
    if (editorSaveBtn) {
      editorSaveBtn.addEventListener('click', () => {
        if (!validateJSON()) {
          showToast('Please enter valid JSON first', 'error');
          return;
        }

        try {
          const data = JSON.parse(editor.value);
          const tokenName = data.tokenName || 'Untitled';

          // Open save modal with editor content
          openSaveModal(false, null, data);
        } catch (e) {
          showToast('Failed to parse JSON', 'error');
        }
      });
    }

    // Expose editor functions
    window.contractEditor = {
      loadDocument: (doc) => {
        currentEditorDocId = doc.id;
        editor.value = JSON.stringify(doc.data, null, 2);
        updateLineNumbers();
        validateJSON();
        updateEditorStatus('loaded', `Editing: ${doc.name}`);

        // Highlight in list
        highlightDocumentInList(doc.id);
      },
      loadJSON: (json) => {
        currentEditorDocId = null;
        editor.value = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
        updateLineNumbers();
        validateJSON();
        updateEditorStatus('', 'New document');
      },
      clear: () => {
        currentEditorDocId = null;
        editor.value = '';
        updateLineNumbers();
        validateJSON();
        updateEditorStatus('', 'No document loaded');
        highlightDocumentInList(null);
      },
      getContent: () => editor.value,
      isValid: validateJSON
    };

    console.log('[Documents] Contract editor setup complete');
  }

  function highlightDocumentInList(docId) {
    const items = document.querySelectorAll('.docs-item');
    items.forEach(item => {
      item.classList.toggle('docs-item--active', item.dataset.id === docId);
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Updated Event Setup
  // ─────────────────────────────────────────────────────────────────────
  function setupDocumentStorage() {
    // Load existing documents
    loadDocuments();

    // Setup editor
    setupEditor();

    // Save buttons
    const saveBtn = document.getElementById('save-current-doc-btn');
    const emptySaveBtn = document.getElementById('empty-save-btn');
    const sidebarSaveBtn = document.getElementById('sidebar-save-doc-btn');

    [saveBtn, emptySaveBtn, sidebarSaveBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => openSaveModal(false));
      }
    });

    // Import buttons
    const importBtn = document.getElementById('import-doc-btn');
    const sidebarImportBtn = document.getElementById('sidebar-import-doc-btn');
    const importInput = document.getElementById('import-doc-input');

    [importBtn, sidebarImportBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (importInput) importInput.click();
        });
      }
    });

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importDocument(e.target.files[0]);
          e.target.value = ''; // Reset for next import
        }
      });
    }

    // Search input
    const searchInput = document.getElementById('documents-search-input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          renderDocuments(e.target.value);
        }, 200);
      });
    }

    // Save modal
    const saveModalClose = document.getElementById('save-document-modal-close');
    const saveCancel = document.getElementById('save-document-cancel');
    const saveConfirm = document.getElementById('save-document-confirm');

    [saveModalClose, saveCancel].forEach(btn => {
      if (btn) btn.addEventListener('click', closeSaveModal);
    });

    if (saveConfirm) {
      saveConfirm.addEventListener('click', handleSaveConfirm);
    }

    // Delete modal
    const deleteCancel = document.getElementById('delete-document-cancel');
    const deleteConfirm = document.getElementById('delete-document-confirm');

    if (deleteCancel) deleteCancel.addEventListener('click', closeDeleteModal);
    if (deleteConfirm) deleteConfirm.addEventListener('click', handleDeleteConfirm);

    // Load modal
    const loadCancel = document.getElementById('load-document-cancel');
    const loadConfirm = document.getElementById('load-document-confirm');

    if (loadCancel) loadCancel.addEventListener('click', closeLoadModal);
    if (loadConfirm) loadConfirm.addEventListener('click', handleLoadConfirm);

    // Modal overlay close
    document.querySelectorAll('#save-document-modal .modal__overlay, #delete-document-modal .modal__overlay, #load-document-modal .modal__overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        closeSaveModal();
        closeDeleteModal();
        closeLoadModal();
      });
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSaveModal();
        closeDeleteModal();
        closeLoadModal();
      }
    });

    // Initial render
    renderDocuments();

    console.log('[Documents] Document storage initialized with editor');
  }

  // Expose for external use
  window.documentStorage = {
    save: () => openSaveModal(false),
    load: loadDocuments,
    render: renderDocuments,
    getCount: () => documents.length,
    createDocument: createDocument,
    switchToDocumentsPage: () => {
      if (typeof window.switchPage === 'function') {
        window.switchPage('documents');
      }
    }
  };

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDocumentStorage);
  } else {
    setupDocumentStorage();
  }
})();

// ═══════════════════════════════════════════════════════════════════════════
// GROUPS PAGE - Manage permission groups from standalone page
// ═══════════════════════════════════════════════════════════════════════════
(function initializeGroupsPage() {
  'use strict';

  // State
  let selectedGroupId = null;

  // Helper to get fresh element references
  const $ = (id) => document.getElementById(id);

  // Check if page exists at init time
  if (!$('groups-list')) {
    console.log('[GroupsPage] Groups page elements not found, skipping initialization');
    return;
  }

  /**
   * Get groups from wizardState
   */
  function getGroups() {
    if (!window.wizardState || !window.wizardState.form || !window.wizardState.form.permissions) {
      return [];
    }
    return window.wizardState.form.permissions.groups || [];
  }

  /**
   * Save groups to wizardState
   */
  function saveGroups(groups) {
    if (!window.wizardState || !window.wizardState.form || !window.wizardState.form.permissions) {
      console.error('[GroupsPage] wizardState not available');
      return;
    }
    window.wizardState.form.permissions.groups = groups;
    if (typeof window.persistState === 'function') {
      window.persistState();
    }
    // Update group selectors in permissions dropdowns
    if (typeof window.updateGroupSelectors === 'function') {
      window.updateGroupSelectors();
    }
  }

  /**
   * Generate unique group ID
   */
  function generateGroupId() {
    return 'group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Generate unique member ID
   */
  function generateMemberId() {
    return 'member-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get display name for a group (numbered for unnamed groups)
   */
  function getGroupDisplayName(group, allGroups) {
    if (group.name && group.name.trim() !== '' && !group.name.startsWith('Unnamed Group')) {
      return group.name;
    }
    // Find the position of this unnamed group among all unnamed groups
    const unnamedGroups = allGroups.filter(g => !g.name || g.name.trim() === '' || g.name.startsWith('Unnamed Group'));
    const unnamedIndex = unnamedGroups.findIndex(g => g.id === group.id) + 1;
    return `Unnamed Group ${unnamedIndex}`;
  }

  /**
   * Sort groups: named groups first (alphabetically), then unnamed groups by creation order
   */
  function getSortedGroups(groups) {
    return [...groups].sort((a, b) => {
      const aIsUnnamed = !a.name || a.name.trim() === '' || a.name.startsWith('Unnamed Group');
      const bIsUnnamed = !b.name || b.name.trim() === '' || b.name.startsWith('Unnamed Group');

      if (aIsUnnamed && !bIsUnnamed) return 1;  // Unnamed goes after named
      if (!aIsUnnamed && bIsUnnamed) return -1; // Named goes before unnamed
      if (!aIsUnnamed && !bIsUnnamed) {
        // Both named - sort alphabetically
        return a.name.localeCompare(b.name);
      }
      // Both unnamed - keep original order (by index in original array)
      return groups.indexOf(a) - groups.indexOf(b);
    });
  }

  /**
   * Render the groups list
   */
  function renderGroupsList() {
    const groups = getGroups();
    const sortedGroups = getSortedGroups(groups);
    const groupsList = $('groups-list');
    const groupsEmpty = $('groups-empty');
    const groupsCount = $('groups-count');

    // Update count
    if (groupsCount) {
      groupsCount.textContent = groups.length;
    }

    // Show/hide empty state
    if (groupsEmpty) {
      groupsEmpty.hidden = groups.length > 0;
    }

    if (!groupsList) return;

    // Clear existing items (except empty state)
    const existingItems = groupsList.querySelectorAll('.groups-list__item');
    existingItems.forEach(item => item.remove());

    // Render each group (sorted)
    sortedGroups.forEach((group) => {
      const item = document.createElement('button');
      item.className = 'groups-list__item';
      item.type = 'button';
      item.dataset.groupId = group.id;
      if (group.id === selectedGroupId) {
        item.classList.add('groups-list__item--active');
      }

      const memberCount = Array.isArray(group.members) ? group.members.length : 0;
      const totalPower = Array.isArray(group.members)
        ? group.members.reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0)
        : 0;
      const displayName = getGroupDisplayName(group, groups);
      const validationStatus = validateGroup(group);

      item.innerHTML = `
        <div class="groups-list__item-icon ${validationStatus.valid ? 'groups-list__item-icon--valid' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="groups-list__item-content">
          <div class="groups-list__item-name">${escapeHtml(displayName)}</div>
          <div class="groups-list__item-meta">${memberCount} member${memberCount !== 1 ? 's' : ''} · Power: ${totalPower}/${group.requiredPower || 0}</div>
        </div>
        ${!validationStatus.valid ? `<div class="groups-list__item-warning" title="${escapeHtml(validationStatus.message)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M12 3l9.5 16.5H2.5L12 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>` : ''}
      `;

      item.addEventListener('click', () => selectGroup(group.id));
      groupsList.appendChild(item);
    });
  }

  /**
   * Validate Base58 identity ID
   */
  function validateBase58Identity(rawValue) {
    const trimmed = (rawValue || '').trim();
    if (trimmed.length === 0) {
      return { valid: false, message: 'Identity ID is required' };
    }
    if (trimmed.length < 43 || trimmed.length > 44) {
      return { valid: false, message: 'Must be 43-44 characters' };
    }
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    if (!base58Pattern.test(trimmed)) {
      return { valid: false, message: 'Invalid Base58 format' };
    }
    return { valid: true, message: 'Valid identity' };
  }

  /**
   * Validate a group
   */
  function validateGroup(group) {
    const errors = [];

    // Check if group has members
    if (!group.members || group.members.length === 0) {
      errors.push('Group needs at least one member');
    }

    // Check if required power is set
    const requiredPower = parseInt(group.requiredPower, 10) || 0;
    if (requiredPower <= 0) {
      errors.push('Required power must be greater than 0');
    }

    // Check if total power meets required power
    const totalPower = (group.members || []).reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0);
    if (totalPower < requiredPower) {
      errors.push(`Total member power (${totalPower}) is less than required (${requiredPower})`);
    }

    // Check if all members have valid identities (Base58)
    const invalidIdentityMembers = (group.members || []).filter(m => {
      const validation = validateBase58Identity(m.identity);
      return !validation.valid;
    });
    if (invalidIdentityMembers.length > 0) {
      errors.push(`${invalidIdentityMembers.length} member(s) with invalid identity`);
    }

    // Check if all members have power > 0
    const zeroPowerMembers = (group.members || []).filter(m => !m.power || parseInt(m.power, 10) <= 0);
    if (zeroPowerMembers.length > 0) {
      errors.push(`${zeroPowerMembers.length} member(s) have no voting power`);
    }

    return {
      valid: errors.length === 0,
      message: errors.join('; ') || 'Group is valid'
    };
  }

  /**
   * Select a group for editing
   */
  function selectGroup(groupId) {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
      console.error('[GroupsPage] Group not found:', groupId);
      return;
    }

    const displayName = getGroupDisplayName(group, groups);
    console.log('[GroupsPage] Selecting group:', groupId, displayName);
    selectedGroupId = groupId;

    const groupsList = $('groups-list');
    const groupEditorEmpty = $('group-editor-empty');
    const groupEditorContent = $('group-editor-content');
    const groupDeleteBtn = $('group-delete-btn');
    const groupEditorStatusText = $('group-editor-status-text');
    const groupEditorStatus = $('group-editor-status');
    const groupEditName = $('group-edit-name');
    const groupEditThreshold = $('group-edit-threshold');

    // Update list active state
    if (groupsList) {
      groupsList.querySelectorAll('.groups-list__item').forEach(item => {
        item.classList.toggle('groups-list__item--active', item.dataset.groupId === groupId);
      });
    }

    // Show editor content
    if (groupEditorEmpty) groupEditorEmpty.hidden = true;
    if (groupEditorContent) groupEditorContent.hidden = false;
    if (groupDeleteBtn) groupDeleteBtn.hidden = false;

    // Validate and update status
    const validationStatus = validateGroup(group);
    if (groupEditorStatusText) {
      groupEditorStatusText.textContent = 'Editing: ' + displayName;
    }
    if (groupEditorStatus) {
      groupEditorStatus.classList.toggle('groups-editor__status--editing', true);
      groupEditorStatus.classList.toggle('groups-editor__status--valid', validationStatus.valid);
      groupEditorStatus.classList.toggle('groups-editor__status--invalid', !validationStatus.valid);
    }

    // Populate form - use actual name (not display name) so user can edit it
    if (groupEditName) groupEditName.value = group.name || '';
    if (groupEditThreshold) groupEditThreshold.value = group.requiredPower || '';

    // Render members
    renderMembers(group.members || []);
    updateSummary();
  }

  /**
   * Render member rows
   */
  function renderMembers(members) {
    const groupMembersList = $('gp-members-list');
    const groupMembersEmpty = $('gp-members-empty');

    if (!groupMembersList) {
      return;
    }

    groupMembersList.innerHTML = '';

    // Hide empty state when we have members
    if (groupMembersEmpty) {
      groupMembersEmpty.hidden = members.length > 0;
    }

    members.forEach((member, index) => {
      const row = document.createElement('div');
      row.className = 'groups-member';
      row.dataset.memberId = member.id;

      // Validate identity
      const identityValidation = validateBase58Identity(member.identity);
      const identityStatusClass = member.identity && member.identity.trim()
        ? (identityValidation.valid ? 'groups-member__identity--valid' : 'groups-member__identity--invalid')
        : '';

      row.innerHTML = `
        <div class="groups-member__number">${index + 1}</div>
        <div class="groups-member__identity ${identityStatusClass}">
          <input type="text"
                 class="groups-member__identity-input"
                 placeholder="Enter Base58 Identity ID (43-44 chars)"
                 value="${escapeHtml(member.identity || '')}"
                 data-field="identity"
                 spellcheck="false"
                 autocomplete="off">
          <span class="groups-member__identity-status" title="${escapeHtml(identityValidation.message)}">
            ${identityValidation.valid && member.identity ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            ` : member.identity ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            ` : ''}
          </span>
        </div>
        <div class="groups-member__power">
          <input type="text"
                 class="groups-member__power-input"
                 placeholder="Power"
                 value="${escapeHtml(String(member.power || ''))}"
                 inputmode="numeric"
                 pattern="[0-9]*"
                 data-field="power">
        </div>
        <button type="button" class="groups-member__remove-btn" data-action="remove" title="Remove member">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      `;

      // Add event listeners
      const identityInput = row.querySelector('[data-field="identity"]');
      const powerInput = row.querySelector('[data-field="power"]');
      const removeBtn = row.querySelector('[data-action="remove"]');

      identityInput.addEventListener('input', () => {
        updateMemberField(member.id, 'identity', identityInput.value);
        // Re-render to update validation status
        const groups = getGroups();
        const group = groups.find(g => g.id === selectedGroupId);
        if (group) {
          renderMembers(group.members);
        }
      });

      identityInput.addEventListener('blur', () => {
        updateSummary();
        renderGroupsList(); // Update list to show validation
      });

      powerInput.addEventListener('input', () => {
        updateMemberField(member.id, 'power', powerInput.value);
        updateSummary();
      });

      powerInput.addEventListener('blur', () => {
        renderGroupsList(); // Update list to show validation
      });

      removeBtn.addEventListener('click', () => {
        removeMember(member.id);
      });

      groupMembersList.appendChild(row);
    });
  }

  /**
   * Update member field in current group
   */
  function updateMemberField(memberId, field, value) {
    if (!selectedGroupId) return;

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group || !group.members) return;

    const member = group.members.find(m => m.id === memberId);
    if (!member) return;

    member[field] = value;
    // Don't save yet - wait for explicit save
  }

  /**
   * Add a new member to current group
   */
  function addMember() {
    if (!selectedGroupId) {
      showToast('Please select a group first', 'warning');
      return;
    }

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) {
      return;
    }

    if (!Array.isArray(group.members)) {
      group.members = [];
    }

    const newMember = {
      id: generateMemberId(),
      identity: '',
      power: ''
    };

    group.members.push(newMember);
    renderMembers(group.members);
    updateSummary();

    // Focus the new identity input
    const gpMembersList = $('gp-members-list');
    if (gpMembersList) {
      const newRow = gpMembersList.querySelector(`[data-member-id="${newMember.id}"]`);
      if (newRow) {
        const input = newRow.querySelector('[data-field="identity"]');
        if (input) input.focus();
      }
    }
  }

  /**
   * Remove a member from current group
   */
  function removeMember(memberId) {
    if (!selectedGroupId) return;

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group || !group.members) return;

    const index = group.members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      group.members.splice(index, 1);
      renderMembers(group.members);
      updateSummary();
    }
  }

  /**
   * Update the summary display
   */
  function updateSummary() {
    if (!selectedGroupId) return;

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    const groupEditThreshold = $('group-edit-threshold');
    const groupTotalMembers = $('gp-total-members');
    const groupTotalPower = $('gp-total-power');
    const groupRequiredPower = $('gp-required-power');

    const members = Array.isArray(group.members) ? group.members : [];
    const totalMembers = members.length;
    const totalPower = members.reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0);
    const requiredPower = parseInt(groupEditThreshold?.value, 10) || 0;

    if (groupTotalMembers) groupTotalMembers.textContent = totalMembers;
    if (groupTotalPower) groupTotalPower.textContent = totalPower;
    if (groupRequiredPower) groupRequiredPower.textContent = requiredPower;
  }

  /**
   * Create a new group
   */
  function createGroup() {
    console.log('[GroupsPage] Creating new group...');

    const newGroup = {
      id: generateGroupId(),
      name: '',
      requiredPower: '',
      members: []
    };

    const groups = getGroups();
    groups.push(newGroup);
    saveGroups(groups);

    renderGroupsList();
    selectGroup(newGroup.id);

    // Focus the name input
    const groupEditName = $('group-edit-name');
    if (groupEditName) {
      setTimeout(() => groupEditName.focus(), 50);
    }
  }

  /**
   * Save the current group
   */
  function saveCurrentGroup() {
    if (!selectedGroupId) return;

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    const groupEditName = $('group-edit-name');
    const groupEditThreshold = $('group-edit-threshold');
    const groupEditorStatusText = $('group-editor-status-text');

    // Update from form
    group.name = groupEditName?.value?.trim() || '';
    group.requiredPower = groupEditThreshold?.value?.trim() || '';

    // Validate
    if (!group.name) {
      showToast('Please enter a group name', 'warning');
      if (groupEditName) groupEditName.focus();
      return;
    }

    saveGroups(groups);
    renderGroupsList();

    // Update group selectors throughout the wizard
    if (typeof window.updateGroupSelectors === 'function') {
      window.updateGroupSelectors();
    }

    // Update status
    if (groupEditorStatusText) {
      groupEditorStatusText.textContent = 'Saved: ' + group.name;
    }

    showToast('Group saved successfully', 'success');

    // Also update the permission groups UI if it exists
    if (typeof window.renderPermissionGroups === 'function') {
      window.renderPermissionGroups();
    }
  }

  /**
   * Delete the current group
   */
  function deleteCurrentGroup() {
    if (!selectedGroupId) return;

    const groups = getGroups();
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    if (!confirm(`Are you sure you want to delete "${group.name || 'this group'}"? This cannot be undone.`)) {
      return;
    }

    const index = groups.findIndex(g => g.id === selectedGroupId);
    if (index !== -1) {
      groups.splice(index, 1);
      saveGroups(groups);
    }

    selectedGroupId = null;

    const groupEditorEmpty = $('group-editor-empty');
    const groupEditorContent = $('group-editor-content');
    const groupDeleteBtn = $('group-delete-btn');
    const groupEditorStatusText = $('group-editor-status-text');

    // Reset editor
    if (groupEditorEmpty) groupEditorEmpty.hidden = false;
    if (groupEditorContent) groupEditorContent.hidden = true;
    if (groupDeleteBtn) groupDeleteBtn.hidden = true;
    if (groupEditorStatusText) groupEditorStatusText.textContent = 'No group selected';

    renderGroupsList();

    // Update group selectors throughout the wizard
    if (typeof window.updateGroupSelectors === 'function') {
      window.updateGroupSelectors();
    }

    showToast('Group deleted', 'success');

    // Also update the permission groups UI if it exists
    if (typeof window.renderPermissionGroups === 'function') {
      window.renderPermissionGroups();
    }
  }

  /**
   * Cancel editing
   */
  function cancelEditing() {
    selectedGroupId = null;

    const groupsList = $('groups-list');
    const groupEditorEmpty = $('group-editor-empty');
    const groupEditorContent = $('group-editor-content');
    const groupDeleteBtn = $('group-delete-btn');
    const groupEditorStatusText = $('group-editor-status-text');

    // Reset editor
    if (groupEditorEmpty) groupEditorEmpty.hidden = false;
    if (groupEditorContent) groupEditorContent.hidden = true;
    if (groupDeleteBtn) groupDeleteBtn.hidden = true;
    if (groupEditorStatusText) groupEditorStatusText.textContent = 'No group selected';

    // Clear active state
    if (groupsList) {
      groupsList.querySelectorAll('.groups-list__item').forEach(item => {
        item.classList.remove('groups-list__item--active');
      });
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[Toast] ${type}: ${message}`);
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    const createGroupBtn = $('create-group-btn');
    const groupAddMemberBtn = $('group-add-member-btn');
    const groupSaveBtn = $('group-save-btn');
    const groupCancelBtn = $('group-cancel-btn');
    const groupDeleteBtn = $('group-delete-btn');
    const groupEditThreshold = $('group-edit-threshold');
    const groupsBackToHub = $('groups-back-to-hub');

    // Create group button
    if (createGroupBtn) {
      createGroupBtn.addEventListener('click', createGroup);
    }

    // Add member button
    if (groupAddMemberBtn) {
      groupAddMemberBtn.addEventListener('click', addMember);
    }

    // Save button
    if (groupSaveBtn) {
      groupSaveBtn.addEventListener('click', saveCurrentGroup);
    }

    // Cancel button
    if (groupCancelBtn) {
      groupCancelBtn.addEventListener('click', cancelEditing);
    }

    // Delete button
    if (groupDeleteBtn) {
      groupDeleteBtn.addEventListener('click', deleteCurrentGroup);
    }

    // Threshold input - update summary on change
    if (groupEditThreshold) {
      groupEditThreshold.addEventListener('input', updateSummary);
    }

    // Back to hub button
    if (groupsBackToHub) {
      groupsBackToHub.addEventListener('click', () => {
        // Show hub page
        const hubPage = document.getElementById('hub-page');
        const globalHeader = document.getElementById('global-header');
        const wizardShell = document.getElementById('wizard-shell');

        if (hubPage) hubPage.hidden = false;
        if (globalHeader) globalHeader.hidden = true;
        if (wizardShell) wizardShell.hidden = true;

        document.body.classList.remove('fullpage-mode');
      });
    }
  }

  /**
   * Initialize the groups page
   */
  function init() {
    console.log('[GroupsPage] Initializing groups page...');

    setupEventListeners();
    renderGroupsList();

    console.log('[GroupsPage] Groups page initialized');
  }

  // Expose for external use
  window.groupsPage = {
    render: renderGroupsList,
    getCount: () => getGroups().length,
    selectGroup: selectGroup
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
