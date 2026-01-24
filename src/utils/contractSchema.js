/**
 * Dash Platform Token Contract Schema Validation
 *
 * This file contains the strict schema definitions for Dash Platform token contracts.
 * Update this file when the Dash Platform schema changes.
 *
 * Last updated: 2025-01-25
 * Based on: Dash Platform v2.x token contract specification
 */

// =============================================================================
// SCHEMA VERSION
// =============================================================================

export const SCHEMA_VERSION = '1.0.0';
export const DASH_PLATFORM_VERSION = '2.x';

// =============================================================================
// VALID FIELD NAMES
// =============================================================================

/**
 * Valid fields for V0 change rules (used in manualMintingRules, freezeRules, etc.)
 */
export const V0_RULE_FIELDS = [
  'authorized_to_make_change',
  'admin_action_takers',
  'changing_authorized_action_takers_to_no_one_allowed',
  'changing_admin_action_takers_to_no_one_allowed',
  'self_changing_admin_action_takers_allowed'
];

/**
 * Valid values for authorization fields
 */
export const VALID_AUTHORIZATION_VALUES = [
  'NoOne',
  'ContractOwner',
  'MainGroup'
  // Can also be a number (group index) or identity string
];

/**
 * Valid fields for token configuration
 */
export const TOKEN_CONFIG_FIELDS = [
  '$format_version',
  'conventions',
  'conventionsChangeRules',
  'baseSupply',
  'maxSupply',
  'keepsHistory',
  'startAsPaused',
  'allowTransferToFrozenBalance',
  'allowTransferToFrozenBalanceChangeRules',
  'maxSupplyChangeRules',
  'manualMintingRules',
  'manualBurningRules',
  'freezeRules',
  'unfreezeRules',
  'destroyFrozenFundsRules',
  'emergencyActionRules',
  'mainControlGroup',
  'mainControlGroupCanBeModified',
  'marketplaceRules',
  'description',
  'newTokensDestination',
  'newTokensDestinationChangeRules',
  'distributionRules'
];

/**
 * Valid fields for conventions object
 */
export const CONVENTIONS_FIELDS = [
  '$format_version',
  'localizations',
  'decimals'
];

/**
 * Valid fields for localization entry
 */
export const LOCALIZATION_FIELDS = [
  '$format_version',
  'shouldCapitalize',
  'singularForm',
  'pluralForm'
];

/**
 * Valid fields for keepsHistory object
 */
export const KEEPS_HISTORY_FIELDS = [
  '$format_version',
  'keepsTransferHistory',
  'keepsMintingHistory',
  'keepsBurningHistory',
  'keepsFreezingHistory',
  'keepsDirectPricingHistory',
  'keepsDirectPurchaseHistory'
];

/**
 * Valid fields for marketplaceRules object
 */
export const MARKETPLACE_RULES_FIELDS = [
  '$format_version',
  'tradeMode',
  'tradeModeChangeRules'
];

/**
 * Valid tradeMode values
 */
export const VALID_TRADE_MODES = [
  'NotTradeable',
  'DirectPurchaseOnly',
  'AskingPriceOnly',
  'BothDirectAndAsking'
];

/**
 * Valid fields for root contract object
 */
export const CONTRACT_ROOT_FIELDS = [
  '$format_version',
  'id',
  'ownerId',
  'version',
  'config',
  'schemaDefs',
  'documentSchemas',
  'tokens',
  'keywords',
  'description',
  'groups'
];

/**
 * Valid fields for contract config object
 */
export const CONTRACT_CONFIG_FIELDS = [
  '$format_version',
  'canBeDeleted',
  'readonly',
  'keepsHistory',
  'documentsKeepHistoryContractDefault',
  'documentsMutableContractDefault',
  'documentsCanBeDeletedContractDefault',
  'requiresIdentityEncryptionBoundedKey',
  'requiresIdentityDecryptionBoundedKey',
  'sizedIntegerTypes'
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates that an object only contains expected fields
 * @param {Object} obj - Object to validate
 * @param {string[]} validFields - Array of valid field names
 * @param {string} context - Description for error messages
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateFields(obj, validFields, context = 'object') {
  const errors = [];
  const warnings = [];

  if (!obj || typeof obj !== 'object') {
    errors.push(`${context}: Expected object, got ${typeof obj}`);
    return { valid: false, errors, warnings };
  }

  const validSet = new Set(validFields);
  const objKeys = Object.keys(obj);

  for (const key of objKeys) {
    if (!validSet.has(key)) {
      errors.push(`${context}: Unknown field "${key}"`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a V0 change rule object
 * @param {Object} rule - The rule object (should have V0 property)
 * @param {string} ruleName - Name of the rule for error messages
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateV0Rule(rule, ruleName) {
  const errors = [];
  const warnings = [];

  if (!rule || typeof rule !== 'object') {
    errors.push(`${ruleName}: Expected object, got ${typeof rule}`);
    return { valid: false, errors, warnings };
  }

  // Check for V0 wrapper
  if (!rule.V0) {
    errors.push(`${ruleName}: Missing V0 wrapper`);
    return { valid: false, errors, warnings };
  }

  // Validate V0 fields
  const v0 = rule.V0;
  const fieldResult = validateFields(v0, V0_RULE_FIELDS, `${ruleName}.V0`);
  errors.push(...fieldResult.errors);
  warnings.push(...fieldResult.warnings);

  // Validate required fields exist
  for (const field of V0_RULE_FIELDS) {
    if (!(field in v0)) {
      errors.push(`${ruleName}.V0: Missing required field "${field}"`);
    }
  }

  // Validate authorization values
  const authFields = ['authorized_to_make_change', 'admin_action_takers'];
  for (const field of authFields) {
    if (field in v0) {
      const value = v0[field];
      if (typeof value === 'string' && !VALID_AUTHORIZATION_VALUES.includes(value)) {
        // Could be an identity string - check if it looks like Base58
        const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43,44}$/;
        if (!base58Pattern.test(value)) {
          warnings.push(`${ruleName}.V0.${field}: "${value}" may not be a valid authorization value`);
        }
      }
    }
  }

  // Validate boolean fields
  const boolFields = [
    'changing_authorized_action_takers_to_no_one_allowed',
    'changing_admin_action_takers_to_no_one_allowed',
    'self_changing_admin_action_takers_allowed'
  ];
  for (const field of boolFields) {
    if (field in v0 && typeof v0[field] !== 'boolean') {
      errors.push(`${ruleName}.V0.${field}: Expected boolean, got ${typeof v0[field]}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates token conventions object
 * @param {Object} conventions - The conventions object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateConventions(conventions) {
  const errors = [];
  const warnings = [];

  if (!conventions || typeof conventions !== 'object') {
    errors.push('conventions: Expected object');
    return { valid: false, errors, warnings };
  }

  // Validate fields
  const fieldResult = validateFields(conventions, CONVENTIONS_FIELDS, 'conventions');
  errors.push(...fieldResult.errors);

  // Validate decimals
  if ('decimals' in conventions) {
    const d = conventions.decimals;
    if (typeof d !== 'number' || d < 0 || d > 18 || !Number.isInteger(d)) {
      errors.push('conventions.decimals: Must be integer 0-18');
    }
  } else {
    errors.push('conventions: Missing required field "decimals"');
  }

  // Validate localizations
  if (!conventions.localizations || typeof conventions.localizations !== 'object') {
    errors.push('conventions: Missing or invalid "localizations"');
  } else {
    for (const [lang, loc] of Object.entries(conventions.localizations)) {
      // Validate language code
      if (!/^[a-z]{2}$/.test(lang)) {
        warnings.push(`conventions.localizations: "${lang}" is not a valid 2-letter language code`);
      }

      // Validate localization fields
      const locResult = validateFields(loc, LOCALIZATION_FIELDS, `conventions.localizations.${lang}`);
      errors.push(...locResult.errors);

      // Check required fields
      if (!loc.singularForm) {
        errors.push(`conventions.localizations.${lang}: Missing "singularForm"`);
      }
      if (!loc.pluralForm) {
        errors.push(`conventions.localizations.${lang}: Missing "pluralForm"`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates keepsHistory object
 * @param {Object} history - The keepsHistory object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateKeepsHistory(history) {
  const errors = [];
  const warnings = [];

  if (!history || typeof history !== 'object') {
    errors.push('keepsHistory: Expected object');
    return { valid: false, errors, warnings };
  }

  // Validate fields
  const fieldResult = validateFields(history, KEEPS_HISTORY_FIELDS, 'keepsHistory');
  errors.push(...fieldResult.errors);

  // Validate boolean fields
  const boolFields = KEEPS_HISTORY_FIELDS.filter(f => f !== '$format_version');
  for (const field of boolFields) {
    if (field in history && typeof history[field] !== 'boolean') {
      errors.push(`keepsHistory.${field}: Expected boolean, got ${typeof history[field]}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates marketplaceRules object
 * @param {Object} rules - The marketplaceRules object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateMarketplaceRules(rules) {
  const errors = [];
  const warnings = [];

  if (!rules || typeof rules !== 'object') {
    errors.push('marketplaceRules: Expected object');
    return { valid: false, errors, warnings };
  }

  // Validate fields
  const fieldResult = validateFields(rules, MARKETPLACE_RULES_FIELDS, 'marketplaceRules');
  errors.push(...fieldResult.errors);

  // Validate tradeMode
  if ('tradeMode' in rules) {
    if (!VALID_TRADE_MODES.includes(rules.tradeMode)) {
      errors.push(`marketplaceRules.tradeMode: Invalid value "${rules.tradeMode}". Valid: ${VALID_TRADE_MODES.join(', ')}`);
    }
  }

  // Validate tradeModeChangeRules
  if (rules.tradeModeChangeRules) {
    const ruleResult = validateV0Rule(rules.tradeModeChangeRules, 'marketplaceRules.tradeModeChangeRules');
    errors.push(...ruleResult.errors);
    warnings.push(...ruleResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete token configuration
 * @param {Object} token - The token configuration object
 * @param {string} tokenId - Token ID for error messages
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateTokenConfig(token, tokenId = '0') {
  const errors = [];
  const warnings = [];
  const context = `tokens.${tokenId}`;

  if (!token || typeof token !== 'object') {
    errors.push(`${context}: Expected object`);
    return { valid: false, errors, warnings };
  }

  // Validate top-level fields
  const fieldResult = validateFields(token, TOKEN_CONFIG_FIELDS, context);
  errors.push(...fieldResult.errors);

  // Validate conventions
  if (token.conventions) {
    const convResult = validateConventions(token.conventions);
    errors.push(...convResult.errors);
    warnings.push(...convResult.warnings);
  } else {
    errors.push(`${context}: Missing required "conventions"`);
  }

  // Validate keepsHistory
  if (token.keepsHistory) {
    const histResult = validateKeepsHistory(token.keepsHistory);
    errors.push(...histResult.errors);
    warnings.push(...histResult.warnings);
  }

  // Validate marketplaceRules
  if (token.marketplaceRules) {
    const marketResult = validateMarketplaceRules(token.marketplaceRules);
    errors.push(...marketResult.errors);
    warnings.push(...marketResult.warnings);
  }

  // Validate all V0 rules
  const ruleFields = [
    'conventionsChangeRules',
    'allowTransferToFrozenBalanceChangeRules',
    'maxSupplyChangeRules',
    'manualMintingRules',
    'manualBurningRules',
    'freezeRules',
    'unfreezeRules',
    'destroyFrozenFundsRules',
    'emergencyActionRules',
    'newTokensDestinationChangeRules'
  ];

  for (const ruleField of ruleFields) {
    if (token[ruleField]) {
      const ruleResult = validateV0Rule(token[ruleField], `${context}.${ruleField}`);
      errors.push(...ruleResult.errors);
      warnings.push(...ruleResult.warnings);
    }
  }

  // Validate baseSupply
  if (!('baseSupply' in token)) {
    errors.push(`${context}: Missing required "baseSupply"`);
  } else if (typeof token.baseSupply !== 'number' || token.baseSupply < 0) {
    errors.push(`${context}.baseSupply: Must be a non-negative number`);
  }

  // Validate startAsPaused
  if ('startAsPaused' in token && typeof token.startAsPaused !== 'boolean') {
    errors.push(`${context}.startAsPaused: Expected boolean`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete Dash Platform token contract
 * @param {Object} contract - The full contract object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateContract(contract) {
  const errors = [];
  const warnings = [];

  if (!contract || typeof contract !== 'object') {
    errors.push('Contract: Expected object');
    return { valid: false, errors, warnings };
  }

  // Validate root fields
  const rootResult = validateFields(contract, CONTRACT_ROOT_FIELDS, 'Contract');
  errors.push(...rootResult.errors);

  // Validate required root fields
  if (!contract.ownerId) {
    errors.push('Contract: Missing required "ownerId"');
  }

  // Validate config
  if (contract.config) {
    const configResult = validateFields(contract.config, CONTRACT_CONFIG_FIELDS, 'Contract.config');
    errors.push(...configResult.errors);
  }

  // Validate tokens
  if (contract.tokens && typeof contract.tokens === 'object') {
    for (const [tokenId, token] of Object.entries(contract.tokens)) {
      const tokenResult = validateTokenConfig(token, tokenId);
      errors.push(...tokenResult.errors);
      warnings.push(...tokenResult.warnings);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export default {
  // Version info
  SCHEMA_VERSION,
  DASH_PLATFORM_VERSION,

  // Field definitions
  V0_RULE_FIELDS,
  VALID_AUTHORIZATION_VALUES,
  TOKEN_CONFIG_FIELDS,
  CONVENTIONS_FIELDS,
  LOCALIZATION_FIELDS,
  KEEPS_HISTORY_FIELDS,
  MARKETPLACE_RULES_FIELDS,
  VALID_TRADE_MODES,
  CONTRACT_ROOT_FIELDS,
  CONTRACT_CONFIG_FIELDS,

  // Validation functions
  validateFields,
  validateV0Rule,
  validateConventions,
  validateKeepsHistory,
  validateMarketplaceRules,
  validateTokenConfig,
  validateContract
};
