/**
 * UI Enhancement utilities
 * Performance optimizations and UX improvements
 * @module ui/enhancements
 */

import { debounce, withTimeout } from '../utils/helpers.js';

/**
 * Create debounced validation function
 * @param {Function} validationFn - Validation function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced validation function
 */
export function createDebouncedValidation(validationFn, delay = 300) {
  return debounce(validationFn, delay);
}

/**
 * Add loading state to button
 * @param {string|HTMLElement} buttonIdOrElement - Button ID or element
 * @param {boolean} isLoading - Whether button is loading
 * @param {string} loadingText - Text to show while loading
 */
export function setButtonLoading(buttonIdOrElement, isLoading, loadingText = 'Loading...') {
  const button = typeof buttonIdOrElement === 'string'
    ? document.getElementById(buttonIdOrElement)
    : buttonIdOrElement;

  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.classList.add('is-loading');
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.classList.remove('is-loading');
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

/**
 * Show loading spinner in element
 * @param {string} elementId - ID of element
 * @param {boolean} show - Whether to show spinner
 */
export function showLoadingSpinner(elementId, show = true) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (show) {
    element.classList.add('loading');
    element.setAttribute('aria-busy', 'true');
  } else {
    element.classList.remove('loading');
    element.setAttribute('aria-busy', 'false');
  }
}

/**
 * Execute async function with timeout and loading state
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @param {string} options.buttonId - Button to show loading state
 * @param {string} options.loadingText - Loading button text
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {Promise} Promise that resolves/rejects
 */
export async function executeWithTimeout(asyncFn, options = {}) {
  const {
    timeout = 10000,
    buttonId,
    loadingText = 'Loading...',
    onSuccess,
    onError
  } = options;

  // Set loading state
  if (buttonId) {
    setButtonLoading(buttonId, true, loadingText);
  }

  try {
    const result = await withTimeout(asyncFn(), timeout);

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      console.error('Async operation failed:', error);
    }
    throw error;
  } finally {
    // Remove loading state
    if (buttonId) {
      setButtonLoading(buttonId, false);
    }
  }
}

/**
 * Smooth scroll to element
 * @param {string|HTMLElement} targetIdOrElement - Target ID or element
 * @param {Object} options - Scroll options
 */
export function smoothScrollTo(targetIdOrElement, options = {}) {
  const target = typeof targetIdOrElement === 'string'
    ? document.getElementById(targetIdOrElement)
    : targetIdOrElement;

  if (!target) return;

  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
    ...options
  };

  target.scrollIntoView(defaultOptions);
}

/**
 * Add ripple effect to element on click
 * @param {HTMLElement} element - Element to add ripple to
 */
export function addRippleEffect(element) {
  if (!element) return;

  element.classList.add('ripple-effect');

  element.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    this.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast toast--${type} toast-enter`;
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    background: var(--color-surface);
    color: var(--color-text);
    padding: var(--space-4) var(--space-6);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    border-left: 4px solid var(--color-${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'});
    min-width: 250px;
    max-width: 400px;
  `;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 200ms ease-in';

    setTimeout(() => {
      toast.remove();

      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 200);
  }, duration);
}

/**
 * Animate element entrance
 * @param {string|HTMLElement} elementIdOrElement - Element ID or element
 * @param {string} animation - Animation class ('slide-in-up', 'fade-in-slow', etc.)
 */
export function animateEntrance(elementIdOrElement, animation = 'slide-in-up') {
  const element = typeof elementIdOrElement === 'string'
    ? document.getElementById(elementIdOrElement)
    : elementIdOrElement;

  if (!element) return;

  element.classList.add(animation);

  // Remove animation class after it completes
  element.addEventListener('animationend', () => {
    element.classList.remove(animation);
  }, { once: true });
}

/**
 * Highlight element temporarily
 * @param {string|HTMLElement} elementIdOrElement - Element ID or element
 * @param {number} duration - Duration in ms (default: 2000)
 */
export function highlightElement(elementIdOrElement, duration = 2000) {
  const element = typeof elementIdOrElement === 'string'
    ? document.getElementById(elementIdOrElement)
    : elementIdOrElement;

  if (!element) return;

  const originalBackground = element.style.background;
  element.style.transition = 'background 200ms ease';
  element.style.background = 'var(--color-primary-light)';

  setTimeout(() => {
    element.style.background = originalBackground;
    setTimeout(() => {
      element.style.transition = '';
    }, 200);
  }, duration);
}

/**
 * Copy text to clipboard with feedback
 * @param {string} text - Text to copy
 * @param {string} successMessage - Success message to show
 * @returns {Promise<boolean>} True if successful
 */
export async function copyWithFeedback(text, successMessage = 'Copied to clipboard!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success', 2000);
    return true;
  } catch (error) {
    showToast('Failed to copy to clipboard', 'error', 3000);
    console.error('Copy failed:', error);
    return false;
  }
}

/**
 * Create progressive disclosure (show more/less)
 * @param {string} contentId - ID of content to toggle
 * @param {string} toggleButtonId - ID of toggle button
 * @param {Object} options - Options
 */
export function createProgressiveDisclosure(contentId, toggleButtonId, options = {}) {
  const content = document.getElementById(contentId);
  const button = document.getElementById(toggleButtonId);

  if (!content || !button) return;

  const {
    showText = 'Show more',
    hideText = 'Show less',
    initiallyHidden = true
  } = options;

  // Set initial state
  if (initiallyHidden) {
    content.hidden = true;
    button.textContent = showText;
    button.setAttribute('aria-expanded', 'false');
  } else {
    content.hidden = false;
    button.textContent = hideText;
    button.setAttribute('aria-expanded', 'true');
  }

  // Toggle handler
  button.addEventListener('click', () => {
    const isHidden = content.hidden;

    content.hidden = !isHidden;
    button.textContent = isHidden ? hideText : showText;
    button.setAttribute('aria-expanded', isHidden ? 'true' : 'false');

    if (!isHidden) {
      smoothScrollTo(button);
    }
  });
}

/**
 * Auto-resize textarea as user types
 * @param {string|HTMLElement} textareaIdOrElement - Textarea ID or element
 */
export function autoResizeTextarea(textareaIdOrElement) {
  const textarea = typeof textareaIdOrElement === 'string'
    ? document.getElementById(textareaIdOrElement)
    : textareaIdOrElement;

  if (!textarea || textarea.tagName !== 'TEXTAREA') return;

  function resize() {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  textarea.addEventListener('input', resize);
  resize(); // Initial resize
}

/**
 * Debounced auto-save for form
 * @param {Function} saveFn - Function to call for saving
 * @param {number} delay - Delay in ms (default: 1000)
 * @returns {Function} Debounced save function
 */
export function createAutoSave(saveFn, delay = 1000) {
  const debouncedSave = debounce(() => {
    saveFn();
    showToast('Changes saved', 'success', 1500);
  }, delay);

  return debouncedSave;
}
