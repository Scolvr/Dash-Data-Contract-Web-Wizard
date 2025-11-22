/**
 * Accessibility enhancement utilities
 * Improves ARIA implementation, screen reader support, and focus management
 * @module ui/accessibility
 */

/**
 * Announce message to screen readers via live region
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  const liveRegion = document.getElementById('global-live-region');
  if (!liveRegion) {
    console.warn('Global live region not found');
    return;
  }

  // Set priority
  liveRegion.setAttribute('aria-live', priority);

  // Clear and announce (clear first to ensure announcement even if same text)
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}

/**
 * Update input validity state with ARIA attributes
 * @param {string} inputId - ID of the input element
 * @param {boolean} isValid - Whether the input is valid
 * @param {string} message - Error or success message
 */
export function updateInputValidity(inputId, isValid, message = '') {
  const input = document.getElementById(inputId);
  const messageEl = document.getElementById(`${inputId}-message`);

  if (!input) {
    console.warn(`Input element not found: ${inputId}`);
    return;
  }

  // Update aria-invalid attribute
  input.setAttribute('aria-invalid', isValid ? 'false' : 'true');

  // Update message element if it exists
  if (messageEl) {
    messageEl.textContent = message;

    // Add/remove error class
    if (isValid) {
      messageEl.classList.remove('wizard-field__message--error');
      messageEl.classList.add('wizard-field__message--success');
    } else if (message) {
      messageEl.classList.add('wizard-field__message--error');
      messageEl.classList.remove('wizard-field__message--success');
    } else {
      messageEl.classList.remove('wizard-field__message--error', 'wizard-field__message--success');
    }
  }
}

/**
 * Add aria-invalid attribute to input
 * @param {string} inputId - ID of the input element
 * @param {boolean} isInvalid - Whether input is invalid
 */
export function addAriaInvalid(inputId, isInvalid) {
  const input = document.getElementById(inputId);
  if (input) {
    input.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  }
}

/**
 * Focus the first input in a screen/section
 * @param {string} screenId - ID of the screen or section
 * @param {number} delay - Delay before focusing (ms)
 */
export function focusFirstInput(screenId, delay = 200) {
  const screen = document.querySelector(`[data-screen="${screenId}"]`) ||
                 document.getElementById(screenId);

  if (!screen) {
    console.warn(`Screen not found: ${screenId}`);
    return;
  }

  // Find first focusable element
  const firstFocusable = screen.querySelector(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (firstFocusable) {
    setTimeout(() => {
      firstFocusable.focus();
    }, delay);
  }
}

/**
 * Announce step change to screen readers
 * @param {string} stepName - Display name of the step
 * @param {string} stepNumber - Step number (optional)
 */
export function announceStepChange(stepName, stepNumber = '') {
  const announcement = stepNumber
    ? `Now viewing Step ${stepNumber}: ${stepName}. Use Tab to navigate through form fields.`
    : `Now viewing: ${stepName}. Use Tab to navigate through form fields.`;

  announceToScreenReader(announcement, 'polite');
}

/**
 * Manage focus trap for modals/dialogs
 * @param {HTMLElement} element - Container element to trap focus within
 * @returns {Function} Cleanup function to remove trap
 */
export function createFocusTrap(element) {
  if (!element) return () => {};

  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleTabKey(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Store previously focused element and restore it later
 * Useful for modals/dialogs
 */
export class FocusManager {
  constructor() {
    this.previousFocus = null;
  }

  /**
   * Save current focus
   */
  saveFocus() {
    this.previousFocus = document.activeElement;
  }

  /**
   * Restore previously saved focus
   */
  restoreFocus() {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }
}

/**
 * Add skip link for keyboard navigation
 * @param {string} targetId - ID of element to skip to
 * @param {string} label - Label for skip link
 */
export function addSkipLink(targetId, label = 'Skip to main content') {
  // Check if skip link already exists
  if (document.querySelector('.skip-link')) {
    return;
  }

  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = label;

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.addEventListener('blur', () => {
        target.removeAttribute('tabindex');
      }, { once: true });
    }
  });

  document.body.prepend(skipLink);
}

/**
 * Update ARIA live region for dynamic content updates
 * @param {string} regionId - ID of live region
 * @param {string} message - Message to announce
 * @param {string} politeness - 'off', 'polite', or 'assertive'
 */
export function updateLiveRegion(regionId, message, politeness = 'polite') {
  const region = document.getElementById(regionId);
  if (!region) {
    console.warn(`Live region not found: ${regionId}`);
    return;
  }

  region.setAttribute('aria-live', politeness);
  region.textContent = message;
}

/**
 * Add ARIA labels to elements that need them
 * @param {string} elementId - ID of element
 * @param {string} label - ARIA label text
 */
export function addAriaLabel(elementId, label) {
  const element = document.getElementById(elementId);
  if (element) {
    element.setAttribute('aria-label', label);
  }
}

/**
 * Set aria-required on form fields
 * @param {string[]} inputIds - Array of input IDs
 */
export function markRequired(inputIds) {
  inputIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.setAttribute('aria-required', 'true');
      if (!input.hasAttribute('required')) {
        input.setAttribute('required', '');
      }
    }
  });
}

/**
 * Create accessible error summary for forms
 * @param {Object[]} errors - Array of error objects {field, message}
 * @param {string} containerId - ID of container to place summary
 */
export function createErrorSummary(errors, containerId) {
  const container = document.getElementById(containerId);
  if (!container || errors.length === 0) return;

  const summary = document.createElement('div');
  summary.className = 'error-summary';
  summary.setAttribute('role', 'alert');
  summary.setAttribute('aria-labelledby', 'error-summary-title');

  const title = document.createElement('h2');
  title.id = 'error-summary-title';
  title.textContent = `There ${errors.length === 1 ? 'is' : 'are'} ${errors.length} error${errors.length === 1 ? '' : 's'} on this page`;
  summary.appendChild(title);

  const list = document.createElement('ul');
  errors.forEach(error => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${error.field}`;
    link.textContent = error.message;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const field = document.getElementById(error.field);
      if (field) {
        field.focus();
      }
    });
    item.appendChild(link);
    list.appendChild(item);
  });

  summary.appendChild(list);
  container.innerHTML = '';
  container.appendChild(summary);
}

/**
 * Remove error summary
 * @param {string} containerId - ID of container with error summary
 */
export function removeErrorSummary(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}
