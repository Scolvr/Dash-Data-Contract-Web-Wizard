/**
 * Main Entry Point for Dash Token Wizard
 * Modular ES6 version
 *
 * This initializes the modular architecture alongside the existing app.js
 * The modular system provides:
 * - Clean, testable utility functions
 * - Centralized state management (ready for future migration)
 * - Theme system
 * - Template data
 *
 * During the transition, app.js remains the primary working code.
 */

// Import core modules
import * as constants from './core/constants.js';
import * as storage from './core/storage.js';
import * as state from './core/state.js';

// Import utilities
import * as formatters from './utils/formatters.js';
import * as validation from './utils/validation.js';
import * as helpers from './utils/helpers.js';
import * as contractSchema from './utils/contractSchema.js';

// Import UI modules
import * as theme from './ui/theme.js';

// Import feature modules
import { TOKEN_TEMPLATES, getTemplate, getTemplateKeys } from './features/templates/index.js';

// Import monitoring (optional, may not exist)
let performance, errorTracking;
try {
  performance = await import('./utils/performance.js');
  errorTracking = await import('./utils/errorTracking.js');
} catch (e) {
  // Performance/error tracking modules optional
  console.log('[Modules] Performance monitoring not loaded');
}

// Version info
const WIZARD_VERSION = '23.0';
const BUILD_MODE = import.meta.env?.MODE || 'development';

/**
 * Initialize the modular system
 */
function initializeModules() {
  console.log('%c═══════════════════════════════════════════════════════', 'color: #008de4; font-weight: bold');
  console.log(`%c🚀 Dash Token Wizard v${WIZARD_VERSION} (Modular)`, 'color: #008de4; font-weight: bold; font-size: 16px;');
  console.log(`%c📦 Build Mode: ${BUILD_MODE}`, 'color: #00ff00;');
  console.log('%c═══════════════════════════════════════════════════════\n', 'color: #008de4; font-weight: bold');

  // Log loaded modules
  console.log('📊 Loaded Modules:');
  console.log('  ✓ Constants:', Object.keys(constants).length, 'exports');
  console.log('  ✓ Storage:', Object.keys(storage).length, 'exports');
  console.log('  ✓ State:', Object.keys(state).length, 'exports');
  console.log('  ✓ Formatters:', Object.keys(formatters).length, 'exports');
  console.log('  ✓ Validation:', Object.keys(validation).length, 'exports');
  console.log('  ✓ Helpers:', Object.keys(helpers).length, 'exports');
  console.log('  ✓ Contract Schema:', Object.keys(contractSchema).length, 'exports');
  console.log('  ✓ Theme:', Object.keys(theme).length, 'exports');
  console.log('  ✓ Templates:', Object.keys(TOKEN_TEMPLATES).length, 'templates');

  // Check for BigInt support
  if (constants.hasBigIntSupport) {
    console.log('  ✓ BigInt: Supported');
  } else {
    console.warn('  ⚠ BigInt: Not supported (using fallback)');
  }

  // Expose modules globally for compatibility with app.js
  window.DashWizardModules = {
    // Core
    constants,
    storage,
    state,

    // Utilities
    formatters,
    validation,
    helpers,
    contractSchema,

    // UI
    theme,

    // Features
    templates: {
      all: TOKEN_TEMPLATES,
      get: getTemplate,
      keys: getTemplateKeys
    },

    // Meta
    version: WIZARD_VERSION,
    buildMode: BUILD_MODE
  };

  // Expose ContractSchema globally for use by app.js
  window.ContractSchema = contractSchema;

  console.log('\n💡 Modules available globally via window.DashWizardModules');
  console.log('Example: window.DashWizardModules.validation.validateTokenName("MyToken")');
  console.log('Example: window.DashWizardModules.templates.get("utility")');
  console.log('Example: window.ContractSchema.validateContract(contractJSON)');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModules);
} else {
  initializeModules();
}

// Hot Module Replacement (HMR) support for development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 Hot Module Replacement: Modules updated');
  });
}

// Export for use by other modules
export {
  constants,
  storage,
  state,
  formatters,
  validation,
  helpers,
  contractSchema,
  theme,
  TOKEN_TEMPLATES,
  WIZARD_VERSION,
  BUILD_MODE
};
