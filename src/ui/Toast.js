/**
 * Toast Notification Component
 * Displays temporary notification messages to the user
 */

const TOAST_DURATION_DEFAULT = 3000; // 3 seconds
const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Toast notification class
 */
export class Toast {
  /**
   * Shows a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Toast type (info, success, warning, error)
   * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
   * @returns {HTMLElement} The toast element
   */
  static show(message, type = TOAST_TYPES.INFO, duration = TOAST_DURATION_DEFAULT) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
      container = this.createContainer();
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = this.createToast(message, type);
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Auto-dismiss after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Shows an info toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The toast element
   */
  static info(message, duration = TOAST_DURATION_DEFAULT) {
    return this.show(message, TOAST_TYPES.INFO, duration);
  }

  /**
   * Shows a success toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The toast element
   */
  static success(message, duration = TOAST_DURATION_DEFAULT) {
    return this.show(message, TOAST_TYPES.SUCCESS, duration);
  }

  /**
   * Shows a warning toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The toast element
   */
  static warning(message, duration = TOAST_DURATION_DEFAULT) {
    return this.show(message, TOAST_TYPES.WARNING, duration);
  }

  /**
   * Shows an error toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
   * @returns {HTMLElement} The toast element
   */
  static error(message, duration = 0) {
    return this.show(message, TOAST_TYPES.ERROR, duration);
  }

  /**
   * Dismisses a toast
   * @param {HTMLElement} toast - The toast element to dismiss
   */
  static dismiss(toast) {
    if (!toast || !toast.parentNode) {
      return;
    }

    toast.classList.remove('toast--visible');
    toast.classList.add('toast--dismissed');

    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Dismisses all toasts
   */
  static dismissAll() {
    const container = document.getElementById('toast-container');
    if (!container) {
      return;
    }

    const toasts = container.querySelectorAll('.toast');
    toasts.forEach(toast => this.dismiss(toast));
  }

  /**
   * Creates the toast container
   * @returns {HTMLElement} The container element
   * @private
   */
  static createContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    return container;
  }

  /**
   * Creates a toast element
   * @param {string} message - The message to display
   * @param {string} type - Toast type
   * @returns {HTMLElement} The toast element
   * @private
   */
  static createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const icon = this.getIconForType(type);
    const iconElement = document.createElement('span');
    iconElement.className = 'toast__icon';
    iconElement.textContent = icon;

    const messageElement = document.createElement('span');
    messageElement.className = 'toast__message';
    messageElement.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.className = 'toast__close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.dismiss(toast));

    toast.appendChild(iconElement);
    toast.appendChild(messageElement);
    toast.appendChild(closeButton);

    return toast;
  }

  /**
   * Gets the icon for a toast type
   * @param {string} type - Toast type
   * @returns {string} Icon character
   * @private
   */
  static getIconForType(type) {
    const icons = {
      [TOAST_TYPES.INFO]: 'ℹ',
      [TOAST_TYPES.SUCCESS]: '✓',
      [TOAST_TYPES.WARNING]: '⚠',
      [TOAST_TYPES.ERROR]: '✗'
    };
    return icons[type] || icons[TOAST_TYPES.INFO];
  }
}

// Export toast types
export { TOAST_TYPES };
