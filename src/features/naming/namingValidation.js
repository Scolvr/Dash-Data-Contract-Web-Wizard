/**
 * Naming Step Validation Module
 * Handles all validation logic for the token naming step
 */

// Language code pattern (2-letter lowercase ISO 639-1)
const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

// Token name pattern (letters, numbers, spaces, hyphen, underscore, emoji)
const TOKEN_NAME_PATTERN = /^[\p{L}\p{N}\p{Z}\p{Emoji}\-_]+$/u;

/**
 * Validates a token name
 * @param {string} rawValue - The raw token name input
 * @returns {{valid: boolean, message: string, normalized: string}} Validation result
 */
export function validateTokenName(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed !== rawValue) {
    return { valid: false, message: 'Remove leading or trailing spaces.', normalized: trimmed };
  }
  if (trimmed.length === 0 || trimmed.length < 2 || trimmed.length > 64) {
    return { valid: false, message: 'Please enter a token name (2–64 characters).', normalized: trimmed };
  }
  if (!TOKEN_NAME_PATTERN.test(trimmed)) {
    return { valid: false, message: 'Use letters, numbers, spaces, hyphen, underscore, or emoji only.', normalized: trimmed };
  }
  return { valid: true, message: '', normalized: trimmed };
}

/**
 * Validates a Base58-encoded identity ID
 * @param {string} rawValue - The raw identity ID input
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validateBase58Identity(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed !== rawValue) {
    return { valid: false, message: 'Remove leading or trailing spaces.' };
  }
  if (trimmed.length === 0) {
    return { valid: false, message: 'Owner identity ID is required.' };
  }
  if (trimmed.length < 43 || trimmed.length > 44) {
    return { valid: false, message: 'Identity ID must be 43-44 characters.' };
  }
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
  if (!base58Pattern.test(trimmed)) {
    return { valid: false, message: 'Invalid Base58 format. Use only Base58 characters.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates plural form
 * @param {string} plural - The plural form input
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validatePluralForm(plural) {
  const trimmed = plural.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: 'Enter a plural name.' };
  }
  if (trimmed.length < 3 || trimmed.length > 25) {
    return { valid: false, message: 'Must be 3-25 characters.' };
  }
  if (trimmed !== plural) {
    return { valid: false, message: 'Remove leading or trailing spaces.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates localization row data
 * @param {Object} data - Localization row data
 * @param {string} data.code - Language code
 * @param {string} data.singularForm - Singular form
 * @param {string} data.pluralForm - Plural form
 * @param {boolean} showErrors - Whether to show validation errors
 * @returns {{errors: Object, isValid: boolean}} Validation result with errors object
 */
export function validateLocalizationRow(data, showErrors = false) {
  const trimmedCode = data.code.trim();
  const trimmedSingular = (data.singularForm || '').trim();
  const trimmedPlural = (data.pluralForm || '').trim();
  const errors = { code: '', singular: '', plural: '' };

  // Validate language code
  if (trimmedCode.length === 0) {
    if (showErrors) {
      errors.code = 'Select a language code.';
    }
  } else if (!LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
    errors.code = 'Use a 2-letter lowercase code.';
  }

  // If language code is entered, validate singular and plural forms
  if (trimmedCode.length > 0 && LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
    if (trimmedSingular.length === 0) {
      errors.singular = 'Enter singular form.';
    } else if (trimmedSingular.length < 3 || trimmedSingular.length > 25) {
      errors.singular = 'Must be 3-25 characters.';
    }

    if (trimmedPlural.length === 0) {
      errors.plural = 'Enter plural form.';
    } else if (trimmedPlural.length < 3 || trimmedPlural.length > 25) {
      errors.plural = 'Must be 3-25 characters.';
    }
  }

  const isValid = !errors.code && !errors.singular && !errors.plural && trimmedCode.length > 0;

  return { errors, isValid };
}

/**
 * Validates all localization rows
 * @param {Array} rowsData - Array of localization row data
 * @param {boolean} touched - Whether the form has been touched
 * @param {boolean} silent - Whether to suppress error messages
 * @returns {{valid: boolean, record: Object, reasons: Array}} Validation result
 */
export function validateLocalizationRows(rowsData, touched = false, silent = false) {
  const reasons = [];
  const record = {};
  let hasValidEntry = false;

  const hasAnyInput = rowsData.some((data) => {
    return data.code.trim().length > 0;
  });

  rowsData.forEach((data, index) => {
    const showRowErrors = touched || hasAnyInput;
    const { errors, isValid } = validateLocalizationRow(data, showRowErrors);

    // Collect error reasons for display
    if (showRowErrors) {
      if (errors.code && !LANGUAGE_CODE_PATTERN.test(data.code.trim())) {
        reasons.push(`Localization ${index + 1} language code: Select a valid ISO 639-1 language.`);
      }
      if (errors.singular && data.code.trim().length > 0 && LANGUAGE_CODE_PATTERN.test(data.code.trim())) {
        reasons.push(`Localization ${index + 1}: ${errors.singular}`);
      }
      if (errors.plural && data.code.trim().length > 0 && LANGUAGE_CODE_PATTERN.test(data.code.trim())) {
        reasons.push(`Localization ${index + 1}: ${errors.plural}`);
      }
    }

    // Only add to record if all fields are valid
    if (isValid) {
      hasValidEntry = true;
      record[data.code.trim()] = {
        should_capitalize: Boolean(data.shouldCapitalize),
        singular_form: data.singularForm.trim(),
        plural_form: data.pluralForm.trim()
      };
    }
  });

  // Sort record by language code
  const sortedRecord = {};
  Object.keys(record)
    .sort()
    .forEach((key) => {
      sortedRecord[key] = record[key];
    });

  // Make localization optional - only require validation if user has started adding localizations
  if (!hasValidEntry && hasAnyInput) {
    reasons.push('Complete the localization entries or remove them.');
  }

  const valid = hasValidEntry || !hasAnyInput;

  return { valid, record: sortedRecord, reasons };
}

/**
 * Complete naming step validation
 * @param {Object} formData - Form data to validate
 * @param {boolean} touched - Whether the form has been touched
 * @returns {{valid: boolean, errors: Object}} Complete validation result
 */
export function evaluateNaming(formData, touched = false) {
  const errors = {
    tokenName: '',
    identity: '',
    plural: '',
    localization: []
  };

  // Validate token name
  const nameResult = validateTokenName(formData.tokenName);
  if (!nameResult.valid) {
    errors.tokenName = nameResult.message;
  }

  // Validate owner identity (if provided)
  if (formData.ownerIdentityId) {
    const identityResult = validateBase58Identity(formData.ownerIdentityId);
    if (!identityResult.valid) {
      errors.identity = identityResult.message;
    }
  }

  // Validate plural form
  const pluralResult = validatePluralForm(formData.plural);
  if (!pluralResult.valid) {
    errors.plural = pluralResult.message;
  }

  // Validate localization rows
  const localizationResult = validateLocalizationRows(
    formData.localizationRows || [],
    touched,
    false
  );
  if (!localizationResult.valid) {
    errors.localization = localizationResult.reasons;
  }

  const valid = nameResult.valid &&
                (!formData.ownerIdentityId || validateBase58Identity(formData.ownerIdentityId).valid) &&
                pluralResult.valid &&
                localizationResult.valid;

  return { valid, errors, localizationRecord: localizationResult.record };
}
