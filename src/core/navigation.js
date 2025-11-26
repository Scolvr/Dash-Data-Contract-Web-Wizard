/**
 * Navigation Utility with Dynamic Imports
 * Lazy loads wizard step modules on demand
 */

import { markPerformance, measurePerformance } from '../utils/performance.js';
import { trackError, ErrorSeverity } from '../utils/errorTracking.js';

/**
 * Cache for loaded step modules
 */
const loadedSteps = new Map();

/**
 * Loading states
 */
const loadingStates = new Map();

/**
 * Dynamically load a wizard step module
 * @param {string} stepId - Step identifier (naming, permissions, distribution, advanced, registration)
 * @returns {Promise<Object>} - Step module exports
 */
export async function loadStep(stepId) {
  // Return cached module if already loaded
  if (loadedSteps.has(stepId)) {
    return loadedSteps.get(stepId);
  }

  // Return existing loading promise if already loading
  if (loadingStates.has(stepId)) {
    return loadingStates.get(stepId);
  }

  // Start performance measurement
  markPerformance(`load-step-${stepId}-start`);

  // Show loading indicator
  showStepLoadingIndicator(stepId);

  // Create loading promise
  const loadingPromise = (async () => {
    try {
      let module;

      switch (stepId) {
        case 'naming':
          module = await import('../features/naming/index.js');
          break;

        case 'permissions':
          module = await import('../features/permissions/index.js');
          break;

        case 'distribution':
          module = await import('../features/distribution/index.js');
          break;

        case 'advanced':
          module = await import('../features/advanced/index.js');
          break;

        case 'registration':
          module = await import('../features/registration/index.js');
          break;

        default:
          throw new Error(`Unknown step: ${stepId}`);
      }

      // Cache the loaded module
      loadedSteps.set(stepId, module);

      // Measure load time
      markPerformance(`load-step-${stepId}-end`);
      measurePerformance(
        `step-${stepId}-load-time`,
        `load-step-${stepId}-start`,
        `load-step-${stepId}-end`
      );

      return module;

    } catch (error) {
      trackError(error, ErrorSeverity.HIGH, {
        type: 'dynamic-import',
        stepId
      });

      console.error(`Failed to load step "${stepId}":`, error);

      // Show error to user
      showStepLoadingError(stepId, error);

      throw error;

    } finally {
      // Clear loading state
      loadingStates.delete(stepId);
      hideStepLoadingIndicator(stepId);
    }
  })();

  // Store loading promise
  loadingStates.set(stepId, loadingPromise);

  return loadingPromise;
}

/**
 * Preload a step module in the background
 * Useful for prefetching the next step
 * @param {string} stepId - Step identifier
 */
export function preloadStep(stepId) {
  // Don't preload if already loaded or loading
  if (loadedSteps.has(stepId) || loadingStates.has(stepId)) {
    return Promise.resolve();
  }

  // Load silently in background
  return loadStep(stepId).catch(() => {
    // Ignore errors for preloading
  });
}

/**
 * Preload the next step based on current step
 * @param {string} currentStepId - Current step identifier
 */
export function preloadNextStep(currentStepId) {
  const stepOrder = ['naming', 'permissions', 'distribution', 'advanced', 'registration'];
  const currentIndex = stepOrder.indexOf(currentStepId);

  if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
    const nextStepId = stepOrder[currentIndex + 1];
    preloadStep(nextStepId);
  }
}

/**
 * Check if a step is loaded
 * @param {string} stepId - Step identifier
 * @returns {boolean}
 */
export function isStepLoaded(stepId) {
  return loadedSteps.has(stepId);
}

/**
 * Check if a step is currently loading
 * @param {string} stepId - Step identifier
 * @returns {boolean}
 */
export function isStepLoading(stepId) {
  return loadingStates.has(stepId);
}

/**
 * Clear all loaded step modules
 * Useful for testing or memory management
 */
export function clearLoadedSteps() {
  loadedSteps.clear();
  loadingStates.clear();
}

/**
 * Get statistics about loaded steps
 * @returns {Object}
 */
export function getLoadStats() {
  return {
    loaded: Array.from(loadedSteps.keys()),
    loading: Array.from(loadingStates.keys()),
    totalLoaded: loadedSteps.size,
    totalLoading: loadingStates.size
  };
}

// UI Helper Functions

/**
 * Show loading indicator for a step
 * @param {string} stepId - Step identifier
 */
function showStepLoadingIndicator(stepId) {
  const screen = document.querySelector(`[data-screen="${stepId}"]`);
  if (!screen) return;

  // Add loading class
  screen.classList.add('step-loading');

  // Create loading overlay if it doesn't exist
  let overlay = screen.querySelector('.step-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'step-loading-overlay';
    overlay.innerHTML = `
      <div class="step-loading-spinner">
        <div class="spinner"></div>
        <p>Loading step...</p>
      </div>
    `;
    screen.appendChild(overlay);
  }

  overlay.style.display = 'flex';
}

/**
 * Hide loading indicator for a step
 * @param {string} stepId - Step identifier
 */
function hideStepLoadingIndicator(stepId) {
  const screen = document.querySelector(`[data-screen="${stepId}"]`);
  if (!screen) return;

  screen.classList.remove('step-loading');

  const overlay = screen.querySelector('.step-loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Show error message when step fails to load
 * @param {string} stepId - Step identifier
 * @param {Error} error - Error object
 */
function showStepLoadingError(stepId, error) {
  const screen = document.querySelector(`[data-screen="${stepId}"]`);
  if (!screen) return;

  hideStepLoadingIndicator(stepId);

  // Show error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'step-loading-error';
  errorDiv.innerHTML = `
    <div class="error-content">
      <h3>Failed to Load Step</h3>
      <p>We couldn't load the "${stepId}" step. Please try again.</p>
      <button class="btn-primary" onclick="location.reload()">Reload Page</button>
    </div>
  `;

  screen.appendChild(errorDiv);
}
