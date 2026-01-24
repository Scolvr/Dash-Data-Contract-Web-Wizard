/**
 * Global Header Controller Module
 * Handles navigation, theme switching, reset, and registration dropdown
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const THEME_KEY = 'ui.theme';
const darkModeQuery = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentPage = 'tokens';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current page
 * @returns {string} Current page ID
 */
export function getCurrentPage() {
  return currentPage;
}

/**
 * Switch to a different page
 * @param {string} pageId - Page ID to switch to
 */
export function switchPage(pageId) {
  currentPage = pageId;

  // Update header nav active state
  const headerNavLinks = document.querySelectorAll('.global-header__link');
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
    if (typeof window.showScreen === 'function') {
      const activeStep = window.wizardState?.active || 'naming';
      window.showScreen(activeStep);
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
  const registerDropdown = document.getElementById('register-dropdown');
  if (registerDropdown) {
    registerDropdown.hidden = true;
  }

  console.log('[GlobalHeader] Switched to page:', pageId);
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply theme to document and update UI
 * @param {string} theme - Theme name ('light' or 'dark')
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Update header button states
  const headerThemeBtns = document.querySelectorAll('.global-header__theme-btn');
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

/**
 * Set theme from header controls
 * @param {string} theme - Theme name
 * @param {boolean} persist - Whether to persist to localStorage
 */
export function setTheme(theme, persist = true) {
  applyTheme(theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
  console.log('[GlobalHeader] Theme set to:', theme, persist ? '(saved)' : '(system)');
}

/**
 * Get current theme
 * @returns {string} Current theme
 */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Get system theme preference
 * @returns {string} System theme ('light' or 'dark')
 */
export function getSystemTheme() {
  return darkModeQuery?.matches ? 'dark' : 'light';
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemTheme = getSystemTheme();
  const initialTheme = savedTheme || systemTheme;

  // Apply initial theme (don't persist if following system)
  applyTheme(initialTheme);

  // Listen for system theme changes
  if (darkModeQuery) {
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
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER BUTTON & DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get display name for a step
 * @param {string} stepId - Step ID
 * @returns {string} Display name
 */
export function getStepDisplayName(stepId) {
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

/**
 * Get issue description for a step
 * @param {string} stepId - Step ID
 * @returns {string} Issue description
 */
export function getStepIssue(stepId) {
  const issues = {
    'naming': 'Token name required',
    'permissions': 'Supply settings required',
    'distribution': 'Distribution settings needed',
    'advanced': 'Configuration needed',
    'search': 'Search settings needed'
  };
  return issues[stepId] || 'Configuration incomplete';
}

/**
 * Get missing required steps
 * @returns {Array} Array of missing step objects
 */
export function getMissingRequiredSteps() {
  // Required steps that must be valid before registration
  const required = ['naming', 'permissions'];
  const missing = [];

  if (typeof window.wizardState !== 'undefined' && window.wizardState.steps) {
    required.forEach(stepId => {
      const state = window.wizardState.steps[stepId];
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

/**
 * Show register dropdown with missing steps
 * @param {Array} missingSteps - Array of missing step objects
 */
export function showRegisterDropdown(missingSteps) {
  const registerDropdown = document.getElementById('register-dropdown');
  const missingStepsList = document.getElementById('missing-steps-list');

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
      if (typeof window.showScreen === 'function') {
        window.showScreen(link.dataset.step);
      }
    });
  });
}

/**
 * Handle register button click
 */
export function handleRegisterClick() {
  const missingSteps = getMissingRequiredSteps();

  if (missingSteps.length === 0) {
    // All complete - go to export
    switchPage('tokens');
    if (typeof window.showScreen === 'function') {
      window.showScreen('export');
    }
  } else {
    // Show dropdown with missing steps
    showRegisterDropdown(missingSteps);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Show reset confirmation modal
 */
export function showResetModal() {
  const fullResetModal = document.getElementById('full-reset-modal');
  if (fullResetModal) {
    fullResetModal.removeAttribute('hidden');
    console.log('[GlobalHeader] Reset modal shown');
  } else {
    console.error('[GlobalHeader] Reset modal not found!');
  }
}

/**
 * Hide reset confirmation modal
 */
export function hideResetModal() {
  const fullResetModal = document.getElementById('full-reset-modal');
  if (fullResetModal) {
    fullResetModal.setAttribute('hidden', '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup global header event listeners
 */
export function setupGlobalHeader() {
  const globalHeader = document.getElementById('global-header');
  const headerNavLinks = document.querySelectorAll('.global-header__link');
  const headerThemeBtns = document.querySelectorAll('.global-header__theme-btn');
  const headerResetBtn = document.getElementById('header-reset-btn');
  const headerRegisterBtn = document.getElementById('header-register-btn');
  const registerDropdown = document.getElementById('register-dropdown');
  const headerBrandLink = document.getElementById('header-brand-link');

  if (!globalHeader) {
    console.log('[GlobalHeader] Global header not found, skipping initialization');
    return;
  }

  console.log('[GlobalHeader] Initializing global header...');

  // Page Navigation
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

  // Theme Toggle
  headerThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (theme) {
        setTheme(theme, true); // User click = persist
      }
    });
  });

  // Initialize theme
  initializeTheme();

  // Reset Button
  if (headerResetBtn) {
    headerResetBtn.addEventListener('click', showResetModal);
  }

  // Full Reset Modal Handlers
  const fullResetModal = document.getElementById('full-reset-modal');
  const fullResetCancelBtn = document.getElementById('full-reset-cancel-btn');

  if (fullResetModal) {
    // Cancel button
    if (fullResetCancelBtn) {
      fullResetCancelBtn.addEventListener('click', hideResetModal);
    }

    // Overlay click to close
    const overlay = fullResetModal.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', hideResetModal);
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !fullResetModal.hasAttribute('hidden')) {
        hideResetModal();
      }
    });
  }

  // Register Button
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

  // Fire custom event to signal app is ready for navigation
  window.dispatchEvent(new CustomEvent('wizardAppReady', { detail: { globalHeader: window.globalHeader } }));
  window.wizardAppReady = true;

  console.log('[GlobalHeader] Global header initialized successfully');
}

/**
 * Initialize the global header module
 */
export function initGlobalHeader() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalHeader);
  } else {
    setupGlobalHeader();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EXPOSURE
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.GlobalHeader = {
    init: initGlobalHeader,
    switchPage,
    setTheme,
    getTheme,
    getSystemTheme,
    getCurrentPage,
    showResetModal,
    hideResetModal,
    handleRegisterClick,
    getMissingRequiredSteps
  };
}
