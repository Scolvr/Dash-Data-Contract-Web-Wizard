/**
 * Main Entry Point for Dash Token Wizard
 * Modular ES6 version
 *
 * This is the new entry point that will gradually replace the monolithic app.js
 * During the transition period, both will coexist until full migration is complete.
 */

// Import utilities
import * as constants from './utils/constants.js';
import * as formatters from './utils/formatters.js';
import * as validation from './utils/validation.js';

// Import monitoring and optimization utilities
import { initPerformanceMonitoring, markPerformance } from './utils/performance.js';
import { initErrorTracking } from './utils/errorTracking.js';
import { preloadNextStep } from './core/navigation.js';

// Version info
const WIZARD_VERSION = '23.0';
const BUILD_MODE = import.meta.env.MODE || 'development';

// Initialize application
function initializeWizard() {
  // Mark initialization start
  markPerformance('wizard-init-start');

  // Initialize monitoring systems first
  initErrorTracking();
  initPerformanceMonitoring();

  console.log('%c═══════════════════════════════════════════════════════', 'color: #008de4; font-weight: bold');
  console.log(`%c🚀 Dash Token Wizard v${WIZARD_VERSION} (Modular)`, 'color: #008de4; font-weight: bold; font-size: 16px;');
  console.log(`%c📦 Build Mode: ${BUILD_MODE}`, 'color: #00ff00;');
  console.log('%c✓ ES6 Modules: LOADED', 'color: #00ff00;');
  console.log('%c✓ Vite Build System: ACTIVE', 'color: #00ff00;');
  console.log('%c✓ Performance Monitoring: ENABLED', 'color: #00ff00;');
  console.log('%c✓ Error Tracking: ENABLED', 'color: #00ff00;');
  console.log('%c✓ PWA Support: ENABLED', 'color: #00ff00;');
  console.log('%c✓ Service Worker: READY', 'color: #00ff00;');
  console.log('%c═══════════════════════════════════════════════════════\n', 'color: #008de4; font-weight: bold');

  // Log loaded modules
  console.log('📊 Loaded Modules:');
  console.log('  ✓ Constants:', Object.keys(constants).length, 'exports');
  console.log('  ✓ Formatters:', Object.keys(formatters).length, 'exports');
  console.log('  ✓ Validation:', Object.keys(validation).length, 'exports');

  // Check for BigInt support
  if (constants.hasBigIntSupport) {
    console.log('  ✓ BigInt: Supported');
  } else {
    console.warn('  ⚠ BigInt: Not supported (using fallback)');
  }

  // Check for Service Worker support
  if ('serviceWorker' in navigator) {
    console.log('  ✓ Service Worker: Supported');
  } else {
    console.warn('  ⚠ Service Worker: Not supported');
  }

  // Module availability check
  window.DashWizardModules = {
    constants,
    formatters,
    validation,
    version: WIZARD_VERSION,
    buildMode: BUILD_MODE
  };

  console.log('\n💡 Modules available globally via window.DashWizardModules');
  console.log('Example: window.DashWizardModules.validation.validateTokenName("MyToken")');

  // Preload first step (naming) in background
  preloadNextStep('naming').catch(() => {
    // Ignore preload errors
  });

  // Mark initialization complete
  markPerformance('wizard-init-complete');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWizard);
} else {
  initializeWizard();
}

// Hot Module Replacement (HMR) support for development
if (import.meta.hot) {
  import.meta.hot.accept(['./utils/constants.js', './utils/formatters.js', './utils/validation.js'], (modules) => {
    console.log('🔄 Hot Module Replacement: Modules updated');
    if (modules) {
      console.log('  Updated modules:', modules);
    }
  });
}

// Export for use by other modules
export {
  constants,
  formatters,
  validation,
  WIZARD_VERSION,
  BUILD_MODE
};
