/**
 * Dash Token Wizard - Modular Architecture Entry Point
 * This file serves as the main entry point for the modularized application
 */

// Export core modules
export * from './core/constants.js';
export * from './core/storage.js';

// Export utility functions
export * from './utils/helpers.js';

// Export UI components
export { Toast, TOAST_TYPES } from './ui/Toast.js';
export { LoadingSpinner } from './ui/LoadingSpinner.js';

// Export feature modules
export * from './features/naming/index.js';

// Module information
export const MODULE_INFO = {
  version: '1.0.0',
  build: 'modular',
  features: {
    naming: 'extracted',
    permissions: 'pending',
    distribution: 'pending',
    advanced: 'pending',
    registration: 'pending'
  }
};

console.log('Dash Token Wizard Modules loaded:', MODULE_INFO);
