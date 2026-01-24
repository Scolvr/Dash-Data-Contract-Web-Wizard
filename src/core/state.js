/**
 * State Management Module
 * Central state management for the Dash Token Wizard
 *
 * This module manages the wizard state including:
 * - Default state creation
 * - State persistence
 * - State hydration from storage
 * - State change notifications
 */

import { saveState, loadState } from './storage.js';
import {
  STEP_SEQUENCE,
  TRACKED_STEPS,
  MANUAL_ACTION_DEFINITIONS,
  AUTO_SAVE_DELAY_MS
} from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT STATE STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_KEEP_HISTORY = Object.freeze({
  transfers: false,
  mints: false,
  burns: false,
  freezes: false,
  purchases: false,
  directPricing: false
});

export const DEFAULT_CHANGE_CONTROL_FLAGS = Object.freeze({
  freeze: false,
  unfreeze: false,
  destroyFrozen: false,
  emergency: false,
  directPurchase: false,
  admin: false
});

export const DEFAULT_WALLET_STATE = Object.freeze({
  mnemonic: '',
  privateKey: '',
  address: '',
  balance: null,
  fingerprint: ''
});

export const DEFAULT_MANUAL_ACTION_STATE = Object.freeze({
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

export const DEFAULT_FREEZE_RULES_STATE = Object.freeze({
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

export const DEFAULT_IDENTITY_STATE = Object.freeze({ id: '' });

// ═══════════════════════════════════════════════════════════════════════════
// STATE FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a clone of the default wallet state
 */
export function createDefaultWalletState() {
  return { ...DEFAULT_WALLET_STATE };
}

/**
 * Creates a clone of the default identity state
 */
export function createDefaultIdentityState() {
  return { ...DEFAULT_IDENTITY_STATE };
}

/**
 * Creates a clone of the default manual action state
 */
export function createDefaultManualActionState() {
  return { ...DEFAULT_MANUAL_ACTION_STATE };
}

/**
 * Creates a clone of the default freeze state
 */
export function createDefaultFreezeState() {
  return {
    enabled: DEFAULT_FREEZE_RULES_STATE.enabled,
    perform: { ...DEFAULT_FREEZE_RULES_STATE.perform },
    changeRules: { ...DEFAULT_FREEZE_RULES_STATE.changeRules },
    flags: { ...DEFAULT_FREEZE_RULES_STATE.flags }
  };
}

/**
 * Creates the complete default wizard state
 */
export function createDefaultWizardState() {
  // Create step validity tracking
  const steps = TRACKED_STEPS.reduce((accumulator, id) => {
    accumulator[id] = { id, validity: 'unknown', touched: false };
    return accumulator;
  }, {});

  // Create manual action defaults
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
          amount: '',
          min: '10',
          max: '100',
          stepCount: '4',
          decreasePerIntervalNumerator: '1',
          decreasePerIntervalDenominator: '2',
          distributionStartAmount: '500',
          trailingDistributionIntervalAmount: '25',
          stepwise: [],
          linearStart: '',
          linearChange: '',
          exponentialInitial: '',
          exponentialRate: '',
          polyA: '',
          polyD: '',
          polyM: '',
          polyN: '',
          polyO: '',
          polyB: '',
          logA: '',
          logD: '',
          logM: '',
          logN: '',
          logO: '',
          logB: '',
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
        wallet: createDefaultWalletState(),
        identity: createDefaultIdentityState(),
        preflight: {
          det: { jsonDisplayed: false },
          self: { warningAcknowledged: false }
        }
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// Global state reference (will be set by initializeState)
let wizardState = null;

// Auto-save timer
let autoSaveTimer = null;

// State change listeners
const stateListeners = new Set();

/**
 * Initializes the wizard state from storage or creates default
 */
export function initializeState() {
  // Check for reset mode
  if (window.__WIZARD_RESET_MODE__) {
    console.log('[State] Reset mode active - creating fresh state');
    wizardState = createDefaultWizardState();
    return wizardState;
  }

  // Try to load from storage
  const savedState = loadState();
  if (savedState) {
    console.log('[State] Loaded state from storage');
    // Merge saved state with defaults to handle schema migrations
    wizardState = mergeWithDefaults(savedState);
  } else {
    console.log('[State] No saved state - creating default');
    wizardState = createDefaultWizardState();
  }

  return wizardState;
}

/**
 * Gets the current wizard state
 */
export function getState() {
  if (!wizardState) {
    wizardState = createDefaultWizardState();
  }
  return wizardState;
}

/**
 * Sets the entire wizard state (use with caution)
 */
export function setState(newState) {
  wizardState = newState;
  notifyListeners();
  schedulePersist();
}

/**
 * Updates a portion of the state
 */
export function updateState(path, value) {
  if (!wizardState) {
    wizardState = createDefaultWizardState();
  }

  // Parse path and set value
  const parts = path.split('.');
  let current = wizardState;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
  notifyListeners(path);
  schedulePersist();
}

/**
 * Merges saved state with default state (handles schema migrations)
 */
function mergeWithDefaults(saved) {
  const defaults = createDefaultWizardState();

  // Deep merge, preferring saved values
  return deepMerge(defaults, saved);
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }

  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Schedules state persistence (debounced)
 */
function schedulePersist() {
  if (window.__WIZARD_RESET_MODE__) {
    return; // Don't persist during reset
  }

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    persistStateNow();
  }, AUTO_SAVE_DELAY_MS);
}

/**
 * Immediately persists state to storage
 */
export function persistStateNow() {
  if (window.__WIZARD_RESET_MODE__) {
    console.log('[State] Skipping persist - reset mode active');
    return false;
  }

  if (!wizardState) {
    return false;
  }

  return saveState(wizardState);
}

/**
 * Adds a state change listener
 */
export function addStateListener(listener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/**
 * Notifies all state listeners
 */
function notifyListeners(changedPath = null) {
  for (const listener of stateListeners) {
    try {
      listener(wizardState, changedPath);
    } catch (error) {
      console.error('[State] Listener error:', error);
    }
  }
}

/**
 * Resets state to defaults
 */
export function resetState() {
  wizardState = createDefaultWizardState();
  notifyListeners();
  return wizardState;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

// Make state available globally for compatibility with existing code
if (typeof window !== 'undefined') {
  window.DashWizardState = {
    get: getState,
    set: setState,
    update: updateState,
    reset: resetState,
    persist: persistStateNow,
    initialize: initializeState,
    createDefault: createDefaultWizardState,
    addListener: addStateListener
  };
}
