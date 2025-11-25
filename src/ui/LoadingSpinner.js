/**
 * Loading Spinner Component
 * Displays a loading spinner with optional message
 */

/**
 * LoadingSpinner class for showing/hiding loading indicators
 */
export class LoadingSpinner {
  /**
   * Shows a loading spinner
   * @param {string} message - Optional loading message
   * @param {HTMLElement} targetElement - Optional target element (defaults to body)
   * @returns {HTMLElement} The spinner element
   */
  static show(message = 'Loading...', targetElement = null) {
    const target = targetElement || document.body;

    // Create spinner if it doesn't exist
    let spinner = target.querySelector('.loading-spinner');
    if (!spinner) {
      spinner = this.create(message);
      target.appendChild(spinner);
    } else {
      // Update message if spinner already exists
      const messageElement = spinner.querySelector('.loading-spinner__message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }

    // Show spinner
    spinner.classList.add('loading-spinner--visible');
    spinner.removeAttribute('aria-hidden');

    return spinner;
  }

  /**
   * Hides the loading spinner
   * @param {HTMLElement} targetElement - Optional target element (defaults to body)
   */
  static hide(targetElement = null) {
    const target = targetElement || document.body;
    const spinner = target.querySelector('.loading-spinner');

    if (spinner) {
      spinner.classList.remove('loading-spinner--visible');
      spinner.setAttribute('aria-hidden', 'true');

      // Remove from DOM after animation
      setTimeout(() => {
        if (spinner.parentNode) {
          spinner.parentNode.removeChild(spinner);
        }
      }, 300);
    }
  }

  /**
   * Creates a loading spinner element
   * @param {string} message - Loading message
   * @returns {HTMLElement} The spinner element
   * @private
   */
  static create(message) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-live', 'polite');

    const overlay = document.createElement('div');
    overlay.className = 'loading-spinner__overlay';

    const content = document.createElement('div');
    content.className = 'loading-spinner__content';

    const spinnerIcon = document.createElement('div');
    spinnerIcon.className = 'loading-spinner__icon';

    const messageElement = document.createElement('p');
    messageElement.className = 'loading-spinner__message';
    messageElement.textContent = message;

    content.appendChild(spinnerIcon);
    content.appendChild(messageElement);
    spinner.appendChild(overlay);
    spinner.appendChild(content);

    return spinner;
  }

  /**
   * Updates the loading message
   * @param {string} message - New message
   * @param {HTMLElement} targetElement - Optional target element (defaults to body)
   */
  static updateMessage(message, targetElement = null) {
    const target = targetElement || document.body;
    const spinner = target.querySelector('.loading-spinner');

    if (spinner) {
      const messageElement = spinner.querySelector('.loading-spinner__message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  }

  /**
   * Creates an inline spinner (smaller, no overlay)
   * @param {string} message - Optional loading message
   * @returns {HTMLElement} The inline spinner element
   */
  static createInline(message = '') {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner--inline';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-live', 'polite');
    spinner.setAttribute('aria-label', message || 'Loading');

    const spinnerIcon = document.createElement('span');
    spinnerIcon.className = 'loading-spinner__icon--inline';

    spinner.appendChild(spinnerIcon);

    if (message) {
      const messageElement = document.createElement('span');
      messageElement.className = 'loading-spinner__message--inline';
      messageElement.textContent = message;
      spinner.appendChild(messageElement);
    }

    return spinner;
  }
}
