/**
 * Naming Step Module - Main Entry Point
 * Exports all naming-related functionality
 */

// Export validation functions
export {
  validateTokenName,
  validateBase58Identity,
  validatePluralForm,
  validateLocalizationRow,
  validateLocalizationRows,
  evaluateNaming
} from './namingValidation.js';

// Export state management functions
export {
  createDefaultNamingState,
  normalizeLocalizationRowData,
  limitLocalizationRows,
  limitLocalizationRecord,
  createLocalizationRecordFromRow,
  ensureNamingFormState,
  syncToEnglishLocalization,
  updateNamingState,
  getNamingFormData
} from './namingState.js';

// Note: UI initialization is complex and involves DOM manipulation
// For now, UI initialization remains in the main app.js
// Future work: Extract to namingUI.js module
// export { initNamingStep, renderNamingUI } from './namingUI.js';
