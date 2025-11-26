/**
 * Error Tracking Utility
 * Captures and logs errors for debugging and monitoring
 */

/**
 * Error storage for analysis
 */
const errorLog = [];
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Log error to console and storage
 */
function logError(error, severity = ErrorSeverity.MEDIUM, context = {}) {
  const errorEntry = {
    timestamp: new Date().toISOString(),
    message: error.message || String(error),
    stack: error.stack || null,
    severity,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Add to in-memory log
  errorLog.push(errorEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift(); // Remove oldest
  }

  // Store in localStorage for debugging
  try {
    const storedErrors = JSON.parse(localStorage.getItem('dash-wizard-errors') || '[]');
    storedErrors.push(errorEntry);

    // Keep only last 20 errors
    if (storedErrors.length > 20) {
      storedErrors.shift();
    }

    localStorage.setItem('dash-wizard-errors', JSON.stringify(storedErrors));
  } catch (e) {
    // Ignore localStorage errors
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error ${severity.toUpperCase()}]`, error.message, {
      context,
      stack: error.stack
    });
  }

  return errorEntry;
}

/**
 * Send error to analytics/monitoring service
 * Replace with your error tracking service (e.g., Sentry)
 */
function sendToErrorTracking(errorEntry) {
  // Example: Send to Sentry or custom endpoint
  // Sentry.captureException(error);

  // For now, just log in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Error Tracking] Would send error:', errorEntry.message);
  }

  // Example: Send to custom endpoint
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorEntry)
  // }).catch(() => {
  //   // Fail silently
  // });
}

/**
 * Track specific error with context
 */
export function trackError(error, severity = ErrorSeverity.MEDIUM, context = {}) {
  const errorEntry = logError(error, severity, context);
  sendToErrorTracking(errorEntry);
}

/**
 * Track validation errors
 */
export function trackValidationError(field, message, stepId) {
  const error = new Error(`Validation error: ${message}`);
  trackError(error, ErrorSeverity.LOW, {
    type: 'validation',
    field,
    stepId
  });
}

/**
 * Track API errors
 */
export function trackApiError(endpoint, error, statusCode) {
  trackError(error, ErrorSeverity.HIGH, {
    type: 'api',
    endpoint,
    statusCode
  });
}

/**
 * Track Dash SDK errors
 */
export function trackDashError(operation, error) {
  trackError(error, ErrorSeverity.HIGH, {
    type: 'dash-sdk',
    operation
  });
}

/**
 * Track wallet errors
 */
export function trackWalletError(operation, error) {
  trackError(error, ErrorSeverity.CRITICAL, {
    type: 'wallet',
    operation
  });
}

/**
 * Initialize global error tracking
 */
export function initErrorTracking() {
  // Global error handler
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), ErrorSeverity.HIGH, {
      type: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    trackError(error, ErrorSeverity.HIGH, {
      type: 'unhandled-promise',
      promise: event.promise
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Error Tracking] Initialized');
  }
}

/**
 * Get error log
 */
export function getErrorLog() {
  return [...errorLog];
}

/**
 * Get stored errors from localStorage
 */
export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem('dash-wizard-errors') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clear error log
 */
export function clearErrorLog() {
  errorLog.length = 0;

  try {
    localStorage.removeItem('dash-wizard-errors');
  } catch (e) {
    // Ignore
  }
}

/**
 * Check if there are critical errors
 */
export function hasCriticalErrors() {
  return errorLog.some(e => e.severity === ErrorSeverity.CRITICAL);
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  const stats = {
    total: errorLog.length,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    byType: {}
  };

  errorLog.forEach(error => {
    stats.bySeverity[error.severity]++;

    const type = error.context?.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  return stats;
}
