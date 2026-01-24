/**
 * Dash Token Wizard - Modular Architecture Entry Point
 * This file serves as the main entry point for the modularized application
 *
 * Usage: import * as WizardModules from './src/index.js';
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE MODULES
// ═══════════════════════════════════════════════════════════════════════════

// Constants
export * from './core/constants.js';

// Storage
export {
  saveState,
  loadState,
  clearState,
  saveTheme,
  loadTheme,
  getStorage,
  isLocalStorageAvailable,
  STATE_STORAGE_KEY,
  SENSITIVE_DATA_KEY,
  THEME_STORAGE_KEY
} from './core/storage.js';

// State Management
export {
  createDefaultWizardState,
  createDefaultWalletState,
  createDefaultIdentityState,
  createDefaultManualActionState,
  createDefaultFreezeState,
  initializeState,
  getState,
  setState,
  updateState,
  persistStateNow,
  resetState,
  addStateListener,
  DEFAULT_KEEP_HISTORY,
  DEFAULT_CHANGE_CONTROL_FLAGS,
  DEFAULT_WALLET_STATE,
  DEFAULT_MANUAL_ACTION_STATE,
  DEFAULT_FREEZE_RULES_STATE,
  DEFAULT_IDENTITY_STATE
} from './core/state.js';

// Navigation
export {
  loadStep,
  preloadStep,
  preloadNextStep,
  isStepLoaded,
  isStepLoading,
  clearLoadedSteps,
  getLoadStats
} from './core/navigation.js';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY MODULES
// ═══════════════════════════════════════════════════════════════════════════

export * from './utils/helpers.js';
export * from './utils/formatters.js';
export * from './utils/validation.js';

// ═══════════════════════════════════════════════════════════════════════════
// UI MODULES
// ═══════════════════════════════════════════════════════════════════════════

export { Toast, TOAST_TYPES } from './ui/Toast.js';
export { LoadingSpinner } from './ui/LoadingSpinner.js';
export {
  getTheme,
  setTheme,
  toggleTheme,
  getSystemTheme,
  initializeTheme,
  setupThemeToggleListeners,
  addThemeListener
} from './ui/theme.js';

// Header
export {
  setupGlobalHeader,
  initGlobalHeader,
  switchPage,
  getCurrentPage,
  applyTheme,
  setTheme as setHeaderTheme,
  getTheme as getHeaderTheme,
  showResetModal,
  hideResetModal,
  handleRegisterClick,
  getMissingRequiredSteps
} from './ui/header/index.js';

// Mobile Sidebar
export {
  initMobileUI,
  openMobileNav,
  closeMobileNav,
  toggleMobileNav,
  openMobileSidebar,
  closeMobileSidebar,
  setupMobileNavigation,
  setupMobileSidebar
} from './ui/sidebar/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE MODULES
// ═══════════════════════════════════════════════════════════════════════════

// Naming
export * from './features/naming/index.js';

// Templates
export {
  TOKEN_TEMPLATES,
  getTemplate,
  getTemplateKeys,
  hasTemplate
} from './features/templates/index.js';

// Documents
export {
  loadDocuments,
  saveDocuments,
  getAllDocuments,
  getDocumentCount,
  generateDocumentId,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  clearAllDocuments,
  exportDocument,
  exportAllDocuments,
  importDocuments,
  getTokenSummary,
  formatRelativeDate,
  addDocumentListener
} from './features/documents/index.js';

// Groups
export {
  initGroupsPage,
  renderGroupsList,
  getGroups,
  saveGroups,
  getGroupCount,
  getSelectedGroupId,
  selectGroup,
  createGroup,
  saveCurrentGroup,
  deleteCurrentGroup,
  cancelEditing,
  addMember,
  validateGroup,
  validateBase58Identity,
  generateGroupId,
  generateMemberId,
  getGroupDisplayName,
  getSortedGroups
} from './features/groups/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export {
  generatePlatformContractJSON,
  encodeAuthorizedActionTaker,
  createRuleV0,
  getActorFromPerformer,
  createPermissionChangeRuleFromNewFormat,
  transformKeepsHistory,
  transformLocalizations,
  buildEmissionFunction,
  transformDistributionRules,
  transformMarketplaceRules
} from './contract/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE INFO
// ═══════════════════════════════════════════════════════════════════════════

export const MODULE_INFO = {
  version: '2.1.0',
  build: 'modular',
  features: {
    core: {
      constants: 'complete',
      storage: 'complete',
      state: 'complete',
      navigation: 'complete'
    },
    utils: {
      helpers: 'complete',
      formatters: 'complete',
      validation: 'complete'
    },
    ui: {
      toast: 'complete',
      loadingSpinner: 'complete',
      theme: 'complete',
      header: 'complete',
      sidebar: 'complete'
    },
    features: {
      naming: 'extracted',
      permissions: 'in-progress',
      distribution: 'in-progress',
      advanced: 'in-progress',
      templates: 'complete',
      documents: 'complete',
      groups: 'complete'
    },
    contract: {
      generator: 'complete'
    }
  }
};

// Log module info on load (development only)
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  console.log('📦 Dash Token Wizard Modules loaded:', MODULE_INFO);
}
