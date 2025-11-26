/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and custom performance metrics
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

/**
 * Performance metrics storage
 */
const metrics = {
  cls: null,
  inp: null,
  fcp: null,
  lcp: null,
  ttfb: null
};

/**
 * Log metric to console (dev mode only)
 */
function logMetric(metric) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id
    });
  }

  // Store metric
  metrics[metric.name.toLowerCase()] = {
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta
  };

  // Store in localStorage for analysis
  try {
    const perfData = JSON.parse(localStorage.getItem('dash-wizard-perf') || '{}');
    perfData[metric.name] = {
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now()
    };
    localStorage.setItem('dash-wizard-perf', JSON.stringify(perfData));
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Send metrics to analytics endpoint (optional)
 * Replace with your analytics service
 */
function sendToAnalytics(metric) {
  // Example: Send to custom analytics
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   body: JSON.stringify(metric)
  // });

  // For now, just log
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Analytics] Would send metric:`, metric.name);
  }
}

/**
 * Initialize performance monitoring
 * Tracks all Core Web Vitals metrics
 */
export function initPerformanceMonitoring() {
  try {
    // Cumulative Layout Shift (CLS)
    // Measures visual stability
    // Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
    onCLS((metric) => {
      logMetric(metric);
      sendToAnalytics(metric);
    });

    // Interaction to Next Paint (INP)
    // Measures interactivity (replaces FID in Web Vitals v4)
    // Good: < 200ms, Needs Improvement: 200-500ms, Poor: > 500ms
    onINP((metric) => {
      logMetric(metric);
      sendToAnalytics(metric);
    });

    // First Contentful Paint (FCP)
    // Measures perceived load speed
    // Good: < 1.8s, Needs Improvement: 1.8-3s, Poor: > 3s
    onFCP((metric) => {
      logMetric(metric);
      sendToAnalytics(metric);
    });

    // Largest Contentful Paint (LCP)
    // Measures loading performance
    // Good: < 2.5s, Needs Improvement: 2.5-4s, Poor: > 4s
    onLCP((metric) => {
      logMetric(metric);
      sendToAnalytics(metric);
    });

    // Time to First Byte (TTFB)
    // Measures server response time
    // Good: < 800ms, Needs Improvement: 800-1800ms, Poor: > 1800ms
    onTTFB((metric) => {
      logMetric(metric);
      sendToAnalytics(metric);
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Performance] Monitoring initialized');
    }
  } catch (error) {
    console.error('[Performance] Failed to initialize monitoring:', error);
  }
}

/**
 * Get current metrics
 */
export function getMetrics() {
  return { ...metrics };
}

/**
 * Track custom performance marks
 */
export function markPerformance(name) {
  if (window.performance && window.performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measurePerformance(name, startMark, endMark) {
  if (window.performance && window.performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      }

      return measure.duration;
    } catch (e) {
      console.warn(`[Performance] Failed to measure ${name}:`, e);
    }
  }
  return null;
}

/**
 * Track wizard step navigation performance
 */
export function trackStepNavigation(stepName) {
  markPerformance(`step-${stepName}-start`);

  // Measure from page load to step
  if (performance.getEntriesByName('navigationStart').length > 0) {
    measurePerformance(
      `time-to-${stepName}`,
      'navigationStart',
      `step-${stepName}-start`
    );
  }
}

/**
 * Track wizard completion time
 */
export function trackWizardCompletion() {
  markPerformance('wizard-complete');

  if (performance.getEntriesByName('navigationStart').length > 0) {
    const duration = measurePerformance(
      'total-wizard-time',
      'navigationStart',
      'wizard-complete'
    );

    if (duration) {
      console.log(`[Performance] Total wizard completion time: ${(duration / 1000).toFixed(2)}s`);
    }
  }
}

/**
 * Clear performance data
 */
export function clearPerformanceData() {
  try {
    localStorage.removeItem('dash-wizard-perf');
  } catch (e) {
    // Ignore
  }
}
