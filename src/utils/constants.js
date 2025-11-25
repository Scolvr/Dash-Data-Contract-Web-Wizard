/**
 * Constants Module
 * Extracted from app.js for modular architecture
 * All application-wide constants and configuration values
 */

// Storage Keys
export const STATE_STORAGE_KEY = 'dashTokenWizardState';
export const SENSITIVE_DATA_KEY = 'dashTokenWizardIdentities';
export const THEME_STORAGE_KEY = 'ui.theme';
export const STORAGE_KEY_COLLAPSED = 'dash-wizard-guide-collapsed';
export const STORAGE_KEY_ACTIVE_PANEL = 'dash-wizard-active-panel';

// Performance Settings
export const AUTO_SAVE_DELAY_MS = 5000; // Save after 5 seconds of inactivity

// Step Sequences
// FIXED: Correct order matching sidebar navigation
// Note: 'overview' removed from sequence - accessible only from Document tab
export const STEP_SEQUENCE = ['welcome', 'naming', 'permissions', 'advanced', 'distribution', 'search', 'registration'];

export const INFO_STEPS = Object.freeze([
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

export const TRACKED_STEPS = Object.freeze([...STEP_SEQUENCE, ...INFO_STEPS]);

export const MANUAL_ACTION_DEFINITIONS = Object.freeze([
  { key: 'manualMint', stepId: 'permissions-manual-mint', domPrefix: 'manual-mint' },
  { key: 'manualBurn', stepId: 'permissions-manual-burn', domPrefix: 'manual-burn' },
  { key: 'manualFreeze', stepId: 'permissions-manual-freeze', domPrefix: 'manual-freeze' },
  { key: 'emergencyAction', stepId: 'permissions-emergency', domPrefix: 'emergency' },
  { key: 'marketplaceTradeMode', stepId: 'permissions-marketplace-trade-mode-change', domPrefix: 'marketplace-trade-mode' },
  { key: 'directPricing', stepId: 'permissions-direct-pricing-change', domPrefix: 'direct-pricing' },
  { key: 'mainControl', stepId: 'permissions-main-control-change', domPrefix: 'main-control' }
]);

export const INFO_STEP_PARENT = Object.freeze({
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
// registration: Register Token (no substeps)
export const SUBSTEP_SEQUENCES = Object.freeze({
  welcome: ['welcome'],
  naming: ['naming', 'naming-localization', 'naming-update'],
  permissions: ['permissions', 'permissions-transfer', 'permissions-manual-mint', 'permissions-manual-burn', 'permissions-manual-freeze', 'permissions-emergency', 'permissions-marketplace-trade-mode-change', 'permissions-direct-pricing-change', 'permissions-main-control-change'],
  advanced: ['advanced-history', 'advanced', 'advanced-launch'],
  distribution: ['distribution-preprogrammed', 'distribution-perpetual'],
  search: ['search'],
  registration: ['registration']
});

// Numeric Limits
export const MAX_U32 = 4294967295;

// Step Labels
export const STEP_LABELS = {
  welcome: 'Welcome',
  naming: 'Naming',
  permissions: 'Permissions',
  distribution: 'Distribution',
  advanced: 'Advanced',
  overview: 'Overview',
  registration: 'Registration',
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

// Progress Step Map
export const PROGRESS_STEP_MAP = {
  'welcome': 0,
  'naming': 1,
  'permissions': 2,
  'distribution': 3,
  'advanced': 4,
  'registration': 5
};

// Error Patterns
export const CHUNK_ERROR_PATTERN = /(ChunkLoadError|Loading chunk|dynamically imported module)/i;
export const CHUNK_RECOVERY_FLAG = 'dashWizardChunkRecoveryPending';

// Validation Patterns
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

// Default States
export const DEFAULT_KEEP_HISTORY = {
  transfers: false,
  mints: false,
  burns: false,
  freezes: false,
  purchases: false,
  directPricing: false
};

export const DEFAULT_CHANGE_CONTROL_FLAGS = {
  freeze: false,
  unfreeze: false,
  destroyFrozen: false,
  emergency: false,
  directPurchase: false,
  admin: false
};

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

// Feature Detection
export const hasBigIntSupport = typeof BigInt !== 'undefined';
