/**
 * Default state constants for wizard
 * @module state/defaults
 */

import { TRACKED_STEPS, MANUAL_ACTION_DEFINITIONS } from '../utils/constants.js';

// Default history tracking settings
export const DEFAULT_KEEP_HISTORY = Object.freeze({
  transfers: false,
  mints: false,
  burns: false,
  freezes: false,
  purchases: false,
  directPricing: false
});

// Default change control flags
export const DEFAULT_CHANGE_CONTROL_FLAGS = Object.freeze({
  freeze: false,
  unfreeze: false,
  destroyFrozen: false,
  emergency: false,
  directPurchase: false,
  admin: false
});

// Default wallet state
export const DEFAULT_WALLET_STATE = Object.freeze({
  mnemonic: '',
  privateKey: '',
  address: '',
  balance: null,
  fingerprint: ''
});

// Default manual action state (mint, burn, freeze, etc.)
export const DEFAULT_MANUAL_ACTION_STATE = Object.freeze({
  enabled: false,
  performerType: 'none',
  performerReference: '',
  ruleChangerType: 'owner',
  ruleChangerReference: '',
  allowChangeAuthorizedToNone: false,
  allowChangeAdminToNone: false,
  allowSelfChangeAdmin: false,
  destinationType: 'contract-owner',
  destinationIdentity: '',
  allowCustomDestination: false
});

// Default freeze rules state
export const DEFAULT_FREEZE_RULES_STATE = Object.freeze({
  enabled: false,
  perform: {
    type: 'none',
    identity: ''
  },
  changeRules: {
    type: 'owner',
    identity: ''
  },
  flags: {
    changeAuthorizedToNoOneAllowed: false,
    changeAdminToNoOneAllowed: false,
    selfChangeAdminAllowed: false
  }
});

// Default identity state
export const DEFAULT_IDENTITY_STATE = Object.freeze({
  id: ''
});

/**
 * Clone default wallet state (unfreezes it)
 * @returns {Object} Wallet state
 */
export function cloneDefaultWalletState() {
  return { ...DEFAULT_WALLET_STATE };
}

/**
 * Clone default identity state
 * @returns {Object} Identity state
 */
export function cloneDefaultIdentityState() {
  return { ...DEFAULT_IDENTITY_STATE };
}

/**
 * Create default manual action state (mint/burn/freeze)
 * @returns {Object} Manual action state
 */
export function createDefaultManualActionState() {
  return { ...DEFAULT_MANUAL_ACTION_STATE };
}

/**
 * Create default freeze state with deep clones
 * @returns {Object} Freeze state
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
 * Create empty localization row data
 * @returns {Object} Localization row
 */
export function createEmptyLocalizationRowData() {
  return {
    code: '',
    singularForm: '',
    pluralForm: '',
    shouldCapitalize: true
  };
}

/**
 * Normalize localization row data
 * @param {Object} row - Row to normalize
 * @returns {Object} Normalized row
 */
export function normalizeLocalizationRowData(row) {
  if (!row || typeof row !== 'object') {
    return createEmptyLocalizationRowData();
  }
  const shouldCapitalize =
    typeof row.shouldCapitalize === 'boolean'
      ? row.shouldCapitalize
      : typeof row.should_capitalize === 'boolean'
        ? row.should_capitalize
        : Boolean(row.should_capitalize);
  return {
    code: typeof row.code === 'string' ? row.code : '',
    singularForm: typeof row.singularForm === 'string' ? row.singularForm : (typeof row.singular === 'string' ? row.singular : ''),
    pluralForm: typeof row.pluralForm === 'string' ? row.pluralForm : (typeof row.plural === 'string' ? row.plural : ''),
    shouldCapitalize
  };
}

/**
 * Limit/normalize array of localization rows
 * @param {Array} rows - Rows to normalize
 * @returns {Array} Normalized rows
 */
export function limitLocalizationRows(rows) {
  const candidates = Array.isArray(rows) ? rows : [];
  if (candidates.length === 0) {
    return [];
  }
  return candidates.map(row => normalizeLocalizationRowData(row));
}

/**
 * Create localization record from row
 * @param {Object} row - Row data
 * @returns {Object} Localization record
 */
export function createLocalizationRecordFromRow(row) {
  const normalized = normalizeLocalizationRowData(row);
  const code = typeof normalized.code === 'string' ? normalized.code.trim() : '';
  if (!code) {
    return {};
  }
  return {
    [code]: {
      should_capitalize: Boolean(normalized.shouldCapitalize),
      singular_form: normalized.singularForm || '',
      plural_form: normalized.pluralForm || ''
    }
  };
}

/**
 * Limit/normalize localization record
 * @param {Object} record - Record to normalize
 * @returns {Object} Normalized record
 */
export function limitLocalizationRecord(record) {
  if (!record || typeof record !== 'object') {
    return {};
  }
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return {};
  }

  const result = {};
  for (const key of keys) {
    const entry = record[key];
    if (entry && typeof entry === 'object') {
      result[key] = {
        should_capitalize: Boolean(entry.should_capitalize ?? entry.shouldCapitalize),
        singular_form:
          typeof entry.singular_form === 'string'
            ? entry.singular_form
            : typeof entry.singular === 'string'
              ? entry.singular
              : '',
        plural_form:
          typeof entry.plural_form === 'string'
            ? entry.plural_form
            : typeof entry.plural === 'string'
              ? entry.plural
              : ''
      };
    }
  }
  return result;
}
