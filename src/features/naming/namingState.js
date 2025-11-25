/**
 * Naming Step State Management Module
 * Handles state transformations and normalization for the naming step
 */

const MAX_LOCALIZATION_ROWS = 100;

/**
 * Creates default naming form state
 * @returns {Object} Default naming state
 */
export function createDefaultNamingState() {
  return {
    singular: '',
    plural: '',
    capitalize: false,
    conventions: {
      localizations: {}
    },
    rows: []
  };
}

/**
 * Normalizes localization row data
 * @param {Object} rowData - Raw row data
 * @returns {Object} Normalized row data
 */
export function normalizeLocalizationRowData(rowData) {
  return {
    code: String(rowData.code || '').trim(),
    singularForm: String(rowData.singularForm || '').trim(),
    pluralForm: String(rowData.pluralForm || '').trim(),
    shouldCapitalize: Boolean(rowData.shouldCapitalize)
  };
}

/**
 * Limits localization rows to maximum allowed
 * @param {Array} rows - Array of localization rows
 * @returns {Array} Limited array of rows
 */
export function limitLocalizationRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.slice(0, MAX_LOCALIZATION_ROWS);
}

/**
 * Limits localization record to maximum allowed entries
 * @param {Object} record - Localization record
 * @returns {Object} Limited localization record
 */
export function limitLocalizationRecord(record) {
  if (!record || typeof record !== 'object') {
    return {};
  }
  const entries = Object.entries(record).slice(0, MAX_LOCALIZATION_ROWS);
  return Object.fromEntries(entries);
}

/**
 * Creates localization record from a single row
 * @param {Object} row - Localization row data
 * @returns {Object} Localization record
 */
export function createLocalizationRecordFromRow(row) {
  if (!row || !row.code || !row.singularForm || !row.pluralForm) {
    return {};
  }

  const code = row.code.trim();
  if (code.length === 0) {
    return {};
  }

  return {
    [code]: {
      should_capitalize: Boolean(row.shouldCapitalize),
      singular_form: row.singularForm.trim(),
      plural_form: row.pluralForm.trim()
    }
  };
}

/**
 * Ensures naming form state is properly initialized
 * @param {Object} naming - Current naming state
 * @returns {Object} Properly initialized naming state
 */
export function ensureNamingFormState(naming) {
  if (!naming || typeof naming !== 'object') {
    return createDefaultNamingState();
  }

  // Ensure conventions exist
  if (!naming.conventions || typeof naming.conventions !== 'object') {
    naming.conventions = { localizations: {} };
  } else if (!naming.conventions.localizations || typeof naming.conventions.localizations !== 'object') {
    naming.conventions.localizations = {};
  }

  naming.conventions.localizations = limitLocalizationRecord(naming.conventions.localizations);

  // Ensure rows array exists
  if (!Array.isArray(naming.rows) || naming.rows.length === 0) {
    const record = naming.conventions.localizations || {};
    const [firstCode] = Object.keys(record);

    if (firstCode) {
      const entry = record[firstCode];
      const nextRow = normalizeLocalizationRowData({
        code: firstCode,
        shouldCapitalize: entry?.should_capitalize,
        singularForm: entry?.singular_form,
        pluralForm: entry?.plural_form
      });
      naming.rows = [nextRow];
    } else {
      naming.rows = [];
    }
  }

  naming.rows = limitLocalizationRows(naming.rows);

  // Sync primary row to conventions
  const [primaryRow] = naming.rows;
  if (primaryRow) {
    naming.conventions.localizations = createLocalizationRecordFromRow(primaryRow);
  }

  return naming;
}

/**
 * Syncs main token name fields to English localization
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form
 * @param {boolean} shouldCapitalize - Whether to capitalize
 * @returns {Object} English localization entry
 */
export function syncToEnglishLocalization(singular, plural, shouldCapitalize) {
  const trimmedSingular = singular.trim();
  const trimmedPlural = plural.trim();

  if (trimmedSingular.length === 0 || trimmedPlural.length === 0) {
    return null;
  }

  return {
    should_capitalize: Boolean(shouldCapitalize),
    singular_form: trimmedSingular,
    plural_form: trimmedPlural
  };
}

/**
 * Updates naming state with form data
 * @param {Object} currentState - Current naming state
 * @param {Object} formData - Form data to merge
 * @returns {Object} Updated naming state
 */
export function updateNamingState(currentState, formData) {
  const state = ensureNamingFormState(currentState);

  if (formData.tokenName !== undefined) {
    state.singular = formData.tokenName;
  }

  if (formData.plural !== undefined) {
    state.plural = formData.plural;
  }

  if (formData.capitalize !== undefined) {
    state.capitalize = formData.capitalize;
  }

  if (formData.localizationRows !== undefined) {
    state.rows = limitLocalizationRows(formData.localizationRows.map(normalizeLocalizationRowData));
  }

  return state;
}

/**
 * Gets naming form data from state
 * @param {Object} wizardState - Global wizard state
 * @returns {Object} Naming form data
 */
export function getNamingFormData(wizardState) {
  return {
    tokenName: wizardState.form.tokenName || '',
    ownerIdentityId: wizardState.form.ownerIdentityId || '',
    plural: wizardState.form.naming?.plural || '',
    capitalize: wizardState.form.naming?.capitalize || false,
    singular: wizardState.form.naming?.singular || '',
    localizationRows: wizardState.form.naming?.rows || []
  };
}
