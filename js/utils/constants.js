/**
 * Constants and configuration for Dash Token Wizard
 * @module utils/constants
 */

// Storage keys
export const STATE_STORAGE_KEY = 'dashTokenWizardState';
export const SENSITIVE_DATA_KEY = 'dashTokenWizardIdentities';
export const THEME_STORAGE_KEY = 'ui.theme';

// Step sequences - order matters!
export const STEP_SEQUENCE = Object.freeze([
  'welcome',
  'naming',
  'permissions',
  'advanced',
  'distribution',
  'search',
  'registration'
]);

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

// Manual action definitions for permissions
export const MANUAL_ACTION_DEFINITIONS = Object.freeze([
  { key: 'manualMint', stepId: 'permissions-manual-mint', domPrefix: 'manual-mint' },
  { key: 'manualBurn', stepId: 'permissions-manual-burn', domPrefix: 'manual-burn' },
  { key: 'manualFreeze', stepId: 'permissions-manual-freeze', domPrefix: 'manual-freeze' },
  { key: 'emergencyAction', stepId: 'permissions-emergency', domPrefix: 'emergency' },
  { key: 'conventionsChange', stepId: 'permissions-conventions-change', domPrefix: 'conventions-change' },
  { key: 'marketplaceTradeMode', stepId: 'permissions-marketplace-trade-mode-change', domPrefix: 'marketplace-trade-mode' },
  { key: 'directPricing', stepId: 'permissions-direct-pricing-change', domPrefix: 'direct-pricing' },
  { key: 'mainControl', stepId: 'permissions-main-control-change', domPrefix: 'main-control' }
]);

// Info step parent mapping (substeps to main steps)
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
    'permissions-conventions-change',
    'permissions-marketplace-trade-mode-change',
    'permissions-direct-pricing-change',
    'permissions-main-control-change'
  ],
  advanced: ['advanced-history', 'advanced', 'advanced-launch'],
  distribution: ['distribution-preprogrammed', 'distribution-perpetual'],
  search: ['search'],
  registration: ['registration']
});

// Numeric constants
export const MAX_U32 = 4294967295;

// Step labels for display
export const STEP_LABELS = Object.freeze({
  welcome: 'Welcome',
  naming: 'Naming',
  permissions: 'Permissions',
  distribution: 'Distribution',
  advanced: 'Advanced',
  search: 'Search',
  registration: 'Registration'
});

// Validation patterns
export const BASE58_PATTERN = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

// Version information
export const APP_VERSION = '23.0.0';
export const APP_NAME = 'Dash Token Wizard';
