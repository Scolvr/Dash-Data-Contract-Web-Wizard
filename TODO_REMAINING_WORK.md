# Remaining Work - Dash Token Wizard

This document outlines the remaining work needed to complete the Phase 6 optimization implementation.

---

## URGENT: Icon Files (Required for PWA)

### Status: 🔴 BLOCKING PWA INSTALLATION

Currently, the icon files are HTML comment placeholders. Real PNG images are needed for PWA to work properly.

### Files to Replace:

**Location:** `/public/`

1. **icon-192x192.png** (192x192 pixels)
   - Purpose: Standard PWA icon
   - Format: PNG
   - Requirements: Square, solid background, clear symbol

2. **icon-512x512.png** (512x512 pixels)
   - Purpose: High-res PWA icon, maskable
   - Format: PNG
   - Requirements: Square, solid background, padding for maskable

3. **apple-touch-icon.png** (180x180 pixels)
   - Purpose: iOS home screen icon
   - Format: PNG
   - Requirements: Square, no transparency

### Design Guidelines:

**Dash Token Wizard Icon Suggestions:**
- Use Dash blue (#0E76FD) as primary color
- Consider incorporating:
  - Dash logo/symbol
  - Token/coin imagery
  - Wizard hat or magic wand (if playful)
  - Document/contract symbol
- Keep it simple and recognizable at small sizes
- Test on both light and dark backgrounds

### How to Create:

**Option 1: Use Figma/Sketch**
```
1. Create artboard 512x512
2. Design icon with 64px padding (for maskable)
3. Export as PNG:
   - 512x512 (with padding)
   - 192x192 (scaled down)
   - 180x180 (for iOS)
```

**Option 2: Use Icon Generator**
```
1. Use PWA Asset Generator: https://www.pwabuilder.com/
2. Upload single icon design
3. Generate all required sizes
4. Replace files in /public/
```

**Option 3: Use AI Image Generator**
```
Prompt: "Simple, modern icon for a cryptocurrency token wizard,
Dash blue color #0E76FD, square format, clean design, professional"
```

### Testing:

After replacing icons:
```bash
npm run build
npm run preview
# Open http://localhost:5173
# Check Application tab in DevTools
# Verify icons load correctly
```

---

## HIGH PRIORITY: Analytics Integration

### Status: 🟡 OPTIONAL BUT RECOMMENDED

Currently, performance metrics and errors are logged but not sent to analytics services.

### Files to Update:

1. **`/src/utils/performance.js`**
   - Function: `sendToAnalytics(metric)`
   - Currently: Just logs to console
   - Needs: Real analytics endpoint

2. **`/src/utils/errorTracking.js`**
   - Function: `sendToErrorTracking(errorEntry)`
   - Currently: Just logs to console
   - Needs: Real error tracking service

### Recommended Services:

**Option 1: Google Analytics 4**
```javascript
// In performance.js
function sendToAnalytics(metric) {
  if (window.gtag) {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating
    });
  }
}
```

**Option 2: Plausible (Privacy-friendly)**
```javascript
// In performance.js
function sendToAnalytics(metric) {
  if (window.plausible) {
    plausible('Web Vitals', {
      props: {
        metric: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating
      }
    });
  }
}
```

**Option 3: Custom Endpoint**
```javascript
// In performance.js
function sendToAnalytics(metric) {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now()
    })
  }).catch(() => {
    // Fail silently
  });
}
```

### Error Tracking Integration:

**Option 1: Sentry**
```bash
npm install @sentry/browser
```

```javascript
// In errorTracking.js
import * as Sentry from '@sentry/browser';

export function initErrorTracking() {
  // Initialize Sentry
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0
  });

  // Existing error handlers...
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error);
    // Existing code...
  });
}
```

**Option 2: Custom Error Endpoint**
```javascript
// In errorTracking.js
function sendToErrorTracking(errorEntry) {
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorEntry)
  }).catch(() => {
    // Fail silently
  });
}
```

---

## MEDIUM PRIORITY: Feature Module Implementation

### Status: 🟡 PLACEHOLDERS EXIST

Four wizard step modules have placeholder exports but need full implementation.

### Modules to Implement:

1. **`/src/features/permissions/index.js`**
   - Supply settings (base, max)
   - Decimals configuration
   - History tracking toggles
   - Pause settings
   - Status: Placeholder with exports

2. **`/src/features/distribution/index.js`**
   - Cadence selection (block/time/epoch)
   - Emission function (fixed/exponential/step/linear)
   - Distribution parameters
   - Status: Placeholder with exports

3. **`/src/features/advanced/index.js`**
   - Trading mode (permissionless/committee)
   - Change control flags
   - Advanced rules
   - Status: Placeholder with exports

4. **`/src/features/registration/index.js`**
   - Registration method selection
   - Wallet integration
   - Identity creation
   - Token submission
   - Status: Placeholder with exports

### Implementation Pattern:

Follow the naming module structure:

```javascript
// Example: permissions/index.js
export default {
  name: 'permissions',
  version: '1.0.0',
  init: (state) => {
    // Initialize UI
    // Attach event listeners
    // Load saved state
  }
};

export function initPermissionsStep(state) {
  // Setup step
}

export function validatePermissions(state) {
  // Validate form
  return { valid: true, errors: [] };
}

export function getPermissionsData(state) {
  // Extract form data
  return { ... };
}
```

### Benefits of Full Implementation:

- Proper code splitting (larger modules = bigger savings)
- Lazy loading saves bandwidth
- Faster initial page load
- Better user experience

---

## LOW PRIORITY: Testing

### Status: 🟢 NOT BLOCKING

Comprehensive testing should be added but isn't blocking deployment.

### Test Files to Create:

1. **`/src/utils/performance.test.js`**
   - Test metric logging
   - Test localStorage persistence
   - Test performance marks/measures

2. **`/src/utils/errorTracking.test.js`**
   - Test error capture
   - Test severity classification
   - Test statistics

3. **`/src/core/navigation.test.js`**
   - Test dynamic imports
   - Test caching
   - Test preloading

4. **Integration tests for PWA:**
   - Service worker registration
   - Offline functionality
   - Cache strategies

### Running Tests:

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Replace placeholder icons
- [ ] Configure analytics (optional)
- [ ] Configure error tracking (optional)
- [ ] Test on multiple browsers
- [ ] Test PWA installation
- [ ] Test offline mode
- [ ] Review bundle sizes

### Server Setup

- [ ] Configure HTTPS (required for PWA)
- [ ] Configure compression (serve .br then .gz)
- [ ] Set cache headers
- [ ] Test service worker registration
- [ ] Configure analytics (if using)

### Post-Deployment

- [ ] Monitor performance metrics
- [ ] Check error rates
- [ ] Verify service worker adoption
- [ ] Monitor bundle sizes
- [ ] Track PWA installs (if analytics configured)

---

## OPTIONAL ENHANCEMENTS

### Nice-to-Have Features

1. **Background Sync**
   - Allow token creation while offline
   - Sync when connection restored

2. **Push Notifications**
   - Notify on token creation completion
   - Alert on contract updates

3. **Share Target API**
   - Allow sharing from other apps to wizard

4. **Shortcuts**
   - Quick access to specific steps
   - Add to PWA manifest

5. **Install Prompt**
   - Custom UI for PWA installation
   - Better UX than browser default

6. **Advanced Preloading**
   - Preload all steps on idle
   - Reduce perceived load times

7. **Performance Budget**
   - Fail builds exceeding size limits
   - Automated bundle size monitoring

8. **A/B Testing**
   - Test different loading strategies
   - Optimize based on user behavior

---

## ESTIMATED TIME TO COMPLETE

### Immediate (< 1 hour):
- Replace icon files

### Short-term (2-4 hours):
- Analytics integration
- Error tracking integration

### Medium-term (1-2 weeks):
- Complete feature module implementations

### Long-term (Optional):
- Comprehensive testing
- Advanced PWA features
- Performance optimization iterations

---

## CURRENT STATUS SUMMARY

✅ **COMPLETE:**
- Code splitting infrastructure
- Service worker configuration
- PWA manifest
- Performance monitoring system
- Error tracking system
- Dynamic import system
- Build optimizations
- Compression setup

🟡 **IN PROGRESS:**
- Icon design (placeholders exist)
- Analytics integration (logging only)
- Feature modules (placeholders exist)

🔴 **BLOCKING:**
- None (can deploy with current state)

⚠️ **RECOMMENDED BEFORE PRODUCTION:**
- Replace icon files (for full PWA functionality)
- Add analytics integration (for monitoring)

---

## CONTACT & SUPPORT

For questions about implementation:
- Review `/PHASE_6_OPTIMIZATION_REPORT.md` for details
- Review `/OPTIMIZATION_QUICK_GUIDE.md` for quick reference
- Check browser console for performance/error logs
- Use `dist/stats.html` for bundle analysis

---

**Last Updated:** November 25, 2025
**Phase 6 Status:** ✅ CORE COMPLETE
**Ready for Deployment:** Yes (with placeholder icons)
**Recommended Next Step:** Replace icon files
