/**
 * Wizard Enhancements Integration
 * Adds accessibility and UX improvements to existing wizard without modifying core logic
 * @module wizard-enhancements
 */

import {
  announceToScreenReader,
  updateInputValidity,
  addAriaInvalid,
  focusFirstInput,
  announceStepChange,
  markRequired,
  addSkipLink
} from './ui/accessibility.js';

import {
  showToast,
  smoothScrollTo,
  showLoadingSpinner,
  animateEntrance
} from './ui/enhancements.js';

// Wait for both DOM and existing app.js to be ready
function waitForWizard() {
  return new Promise((resolve) => {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit more for app.js to initialize
        setTimeout(resolve, 500);
      });
    } else {
      // DOM already ready, wait for app.js
      setTimeout(resolve, 500);
    }
  });
}

// Initialize when ready
waitForWizard().then(() => {
  try {
    initEnhancements();
  } catch (error) {
    console.error('Enhancement initialization failed (non-critical):', error);
  }
});

/**
 * Initialize all enhancements (with defensive checks)
 */
function initEnhancements() {
  console.log('🎨 Initializing wizard enhancements...');

  try {
    // Add skip link for keyboard navigation
    const wizardElement = document.getElementById('wizard');
    if (wizardElement) {
      addSkipLink('wizard', 'Skip to wizard content');
    }
  } catch (e) {
    console.warn('Skip link failed:', e);
  }

  try {
    // Mark required fields with aria-required
    markRequiredFields();
  } catch (e) {
    console.warn('Required fields marking failed:', e);
  }

  try {
    // Enhance step navigation announcements
    enhanceStepNavigation();
  } catch (e) {
    console.warn('Step navigation enhancement failed:', e);
  }

  try {
    // Add focus management
    enhanceFocusManagement();
  } catch (e) {
    console.warn('Focus management failed:', e);
  }

  try {
    // Enhance validation feedback
    enhanceValidationFeedback();
  } catch (e) {
    console.warn('Validation feedback enhancement failed:', e);
  }

  try {
    // Add entrance animations to screens
    enhanceScreenTransitions();
  } catch (e) {
    console.warn('Screen transitions enhancement failed:', e);
  }

  console.log('✅ Wizard enhancements initialized (some features may be limited)');
}

/**
 * Mark all required fields with aria-required
 */
function markRequiredFields() {
  const requiredInputs = [
    'token-name',
    'owner-identity-id',
    'token-plural'
  ].filter(id => document.getElementById(id)); // Only mark if element exists

  if (requiredInputs.length > 0) {
    markRequired(requiredInputs);
  }
}

/**
 * Enhance step navigation with screen reader announcements
 */
function enhanceStepNavigation() {
  // Observe navigation items
  const navItems = document.querySelectorAll('.wizard-nav-item, .wizard-nav-subitem');

  if (navItems.length === 0) {
    console.warn('No navigation items found');
    return;
  }

  navItems.forEach(item => {
    // Don't double-attach listeners
    if (item.dataset.enhancementAttached) return;
    item.dataset.enhancementAttached = 'true';

    item.addEventListener('click', function(e) {
      // Announce step change after a brief delay
      setTimeout(() => {
        try {
          const stepId = this.getAttribute('data-step') || this.getAttribute('data-substep');
          if (stepId) {
            const stepLabel = this.textContent.trim();
            if (stepLabel) {
              announceStepChange(stepLabel);
            }
          }
        } catch (err) {
          console.warn('Step announcement failed:', err);
        }
      }, 200);
    });
  });
}

/**
 * Add focus management to screens
 */
function enhanceFocusManagement() {
  // Observer for screen changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const screen = mutation.target;
        if (screen.classList.contains('wizard-screen') && screen.classList.contains('wizard-screen--active')) {
          try {
            const screenId = screen.id || screen.getAttribute('data-screen');
            if (screenId) {
              // Focus first input in the newly active screen
              focusFirstInput(screenId, 400);
            }
          } catch (err) {
            console.warn('Focus management failed:', err);
          }
        }
      }
    });
  });

  // Observe all wizard screens
  const screens = document.querySelectorAll('.wizard-screen');
  if (screens.length === 0) {
    console.warn('No wizard screens found');
    return;
  }

  screens.forEach(screen => {
    observer.observe(screen, {
      attributes: true,
      attributeFilter: ['class']
    });
  });
}

/**
 * Enhance validation feedback with ARIA
 */
function enhanceValidationFeedback() {
  // Monitor validation messages
  const messageElements = document.querySelectorAll('[id$="-message"]');

  if (messageElements.length === 0) {
    console.warn('No message elements found');
    return;
  }

  messageElements.forEach(messageEl => {
    const inputId = messageEl.id.replace('-message', '');
    const input = document.getElementById(inputId);

    if (!input) return;

    // Observer for message changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          try {
            const message = messageEl.textContent.trim();
            const hasError = messageEl.classList.contains('wizard-field__message--error');

            // Update aria-invalid on the input
            if (input) {
              addAriaInvalid(inputId, hasError && message.length > 0);
            }
          } catch (err) {
            console.warn('ARIA update failed:', err);
          }
        }
      });
    });

    observer.observe(messageEl, {
      childList: true,
      characterData: true,
      subtree: true
    });
  });
}

/**
 * Add entrance animations to screen transitions
 */
function enhanceScreenTransitions() {
  const screens = document.querySelectorAll('.wizard-screen');

  if (screens.length === 0) {
    console.warn('No screens found for transitions');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const screen = mutation.target;
        if (screen.classList.contains('wizard-screen--active')) {
          try {
            // Animate screen entrance
            animateEntrance(screen, 'slide-in-up');
          } catch (err) {
            console.warn('Animation failed:', err);
          }
        }
      }
    });
  });

  screens.forEach(screen => {
    observer.observe(screen, {
      attributes: true,
      attributeFilter: ['class']
    });
  });
}

/**
 * Utility: Show success toast
 * Can be called from window for backward compatibility
 */
window.showSuccessToast = function(message) {
  try {
    showToast(message, 'success', 3000);
  } catch (err) {
    console.error('Toast failed:', err);
  }
};

/**
 * Utility: Show error toast
 * Can be called from window for backward compatibility
 */
window.showErrorToast = function(message) {
  try {
    showToast(message, 'error', 4000);
  } catch (err) {
    console.error('Toast failed:', err);
  }
};

/**
 * Utility: Announce to screen reader
 * Can be called from window for backward compatibility
 */
window.announceToScreenReader = function(message, priority) {
  try {
    announceToScreenReader(message, priority);
  } catch (err) {
    console.error('Announcement failed:', err);
  }
};

/**
 * Utility: Smooth scroll to element
 * Can be called from window for backward compatibility
 */
window.smoothScrollTo = function(target, options) {
  try {
    smoothScrollTo(target, options);
  } catch (err) {
    console.error('Smooth scroll failed:', err);
  }
};

// Export for module usage
export {
  announceToScreenReader,
  updateInputValidity,
  addAriaInvalid,
  focusFirstInput,
  announceStepChange,
  showToast,
  smoothScrollTo,
  showLoadingSpinner
};
