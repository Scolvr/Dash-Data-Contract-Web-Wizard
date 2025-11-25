/**
 * Application Constants
 * Centralized constant definitions used throughout the application
 */

// Step sequence (order matters for navigation)
export const STEP_SEQUENCE = [
  'welcome',
  'naming',
  'permissions',
  'advanced',
  'distribution',
  'search',
  'registration'
];

// Info steps (help/documentation screens)
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

// All tracked steps (main + info)
export const TRACKED_STEPS = Object.freeze([...STEP_SEQUENCE, ...INFO_STEPS]);

// Substep sequences for each main step
export const SUBSTEP_SEQUENCES = Object.freeze({
  welcome: ['welcome'],
  naming: ['naming', 'naming-localization', 'naming-update'],
  permissions: [
    'permissions',
    'permissions-transfer',
    'permissions-manual-mint',
    'permissions-manual-burn',
    'permissions-manual-freeze',
    'permissions-emergency',
    'permissions-marketplace-trade-mode-change',
    'permissions-direct-pricing-change',
    'permissions-main-control-change'
  ],
  advanced: ['advanced-history', 'advanced', 'advanced-launch'],
  distribution: ['distribution-preprogrammed', 'distribution-perpetual'],
  search: ['search'],
  registration: ['registration']
});

// Info step parent mapping (substep -> parent step)
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

// Step labels (for display)
export const STEP_LABELS = {
  welcome: 'Welcome',
  naming: 'Naming',
  permissions: 'Permissions',
  distribution: 'Distribution',
  advanced: 'Advanced',
  overview: 'Overview',
  registration: 'Registration',
  search: 'Search',
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

// Numeric constants
export const MAX_U32 = 4294967295;
export const MAX_LOCALIZATION_ROWS = 100;
export const AUTO_SAVE_DELAY_MS = 5000; // 5 seconds

// Validation patterns
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;
export const TOKEN_NAME_PATTERN = /^[\p{L}\p{N}\p{Z}\p{Emoji}\-_]+$/u;
export const BASE58_PATTERN = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

// Manual action definitions
export const MANUAL_ACTION_DEFINITIONS = Object.freeze([
  { key: 'manualMint', stepId: 'permissions-manual-mint', domPrefix: 'manual-mint' },
  { key: 'manualBurn', stepId: 'permissions-manual-burn', domPrefix: 'manual-burn' },
  { key: 'manualFreeze', stepId: 'permissions-manual-freeze', domPrefix: 'manual-freeze' },
  { key: 'emergencyAction', stepId: 'permissions-emergency', domPrefix: 'emergency' },
  { key: 'marketplaceTradeMode', stepId: 'permissions-marketplace-trade-mode-change', domPrefix: 'marketplace-trade-mode' },
  { key: 'directPricing', stepId: 'permissions-direct-pricing-change', domPrefix: 'direct-pricing' },
  { key: 'mainControl', stepId: 'permissions-main-control-change', domPrefix: 'main-control' }
]);

// Error patterns
export const CHUNK_ERROR_PATTERN = /(ChunkLoadError|Loading chunk|dynamically imported module)/i;
export const CHUNK_RECOVERY_FLAG = 'dashWizardChunkRecoveryPending';

// Step validity states
export const VALIDITY_STATES = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  UNKNOWN: 'unknown',
  PENDING: 'pending'
});

// Registration methods
export const REGISTRATION_METHODS = Object.freeze({
  MOBILE: 'mobile',
  DET: 'det',
  SELF_SERVICE: 'self'
});

// Theme values
export const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
});
