# Modular Source Architecture

This directory contains the modularized ES6 version of the Dash Token Wizard application.

## Directory Structure

```
/src
  /core          - Core application logic (state management, storage, navigation)
  /features      - Feature modules (one per wizard step)
    /naming      - Token naming and localization
    /permissions - Token permissions and access control
    /distribution - Token distribution rules
    /advanced    - Advanced settings (history, trading rules, launch)
    /registration - Token registration on Dash Platform
  /ui            - Shared UI components (Toast, LoadingSpinner, etc.)
  /utils         - Utility modules (constants, formatters, validation)
  /integrations  - External integrations (Dash SDK wrapper)
  main.js        - Application entry point
```

## Modules Overview

### `/utils` - Utility Modules

**constants.js** (202 lines, 30+ exports)
- All application-wide constants
- Step sequences and navigation maps
- Default state objects
- Storage keys and configuration values

**formatters.js** (250 lines, 15+ exports)
- Pure formatting functions
- Number normalization
- BigInt utilities
- Wallet balance formatting
- ID generation

**validation.js** (307 lines, 15+ exports)
- Pure validation functions with no side effects
- Token name/symbol validation
- Identity ID validation
- Supply/decimals validation
- Mnemonic validation

### `/core` - Core Application

(To be implemented in next phase)
- State management
- Local storage abstraction
- Navigation logic
- Event bus

### `/features` - Feature Modules

(Partially implemented, to be completed in next phase)
- Each wizard step will be a self-contained module
- Includes state, validation, and UI logic
- Example: `/features/naming` has state, validation, and tests

### `/ui` - Shared UI Components

(Partially implemented)
- Reusable UI components
- Toast notifications
- Loading spinners
- Modal dialogs

### `/integrations` - External Integrations

(To be implemented)
- Dash SDK wrapper
- API client
- External service connectors

## Usage

### Development

```bash
npm run dev
```

Starts Vite dev server on http://localhost:5173 with:
- Hot Module Replacement (HMR)
- Fast refresh
- Source maps
- ES6 module imports

### Testing Modules

```bash
# Open test page in browser
npm run dev
# Navigate to: http://localhost:5173/test-modules.html
```

The test page verifies all three utility modules are working correctly.

### Using Modules in Browser Console

When the app is running, modules are available globally:

```javascript
// Access via window.DashWizardModules
window.DashWizardModules.validation.validateTokenName("MyToken");
window.DashWizardModules.formatters.formatWalletBalance(100000000);
window.DashWizardModules.constants.STEP_SEQUENCE;
```

## Migration Status

### Phase 3 (Current) - COMPLETED ✓
- [x] Vite build system configured
- [x] Directory structure created
- [x] Constants extracted (202 lines)
- [x] Formatters extracted (250 lines)
- [x] Validators extracted (307 lines)
- [x] Main entry point created
- [x] Dual-mode HTML (both app.js and modular)
- [x] Dev server working
- [x] Test page created

### Phase 4 (Next) - Planned
- [ ] Extract core state management
- [ ] Extract navigation logic
- [ ] Extract storage layer
- [ ] Create feature modules (naming, permissions, etc.)
- [ ] Migrate UI components
- [ ] Create Dash SDK integration wrapper

### Phase 5 (Future) - Planned
- [ ] Complete migration from app.js
- [ ] Remove legacy app.js
- [ ] Production build optimization
- [ ] Documentation completion

## File Size Summary

| Module | Lines | Exports | Status |
|--------|-------|---------|--------|
| constants.js | 202 | 30+ | ✓ Complete |
| formatters.js | 250 | 15+ | ✓ Complete |
| validation.js | 307 | 15+ | ✓ Complete |
| main.js | 77 | 5 | ✓ Complete |
| **Total** | **836** | **65+** | **Phase 3 Complete** |

## Import Examples

```javascript
// Named imports (recommended)
import { STEP_SEQUENCE, MAX_U32 } from '@utils/constants.js';
import { formatWalletBalance, normaliseUnsignedValue } from '@utils/formatters.js';
import { validateTokenName, validateBase58Identity } from '@utils/validation.js';

// Namespace imports
import * as constants from '@utils/constants.js';
import * as formatters from '@utils/formatters.js';
import * as validation from '@utils/validation.js';
```

## Path Aliases

Vite is configured with path aliases for cleaner imports:

- `@` → `/src`
- `@core` → `/src/core`
- `@features` → `/src/features`
- `@ui` → `/src/ui`
- `@utils` → `/src/utils`
- `@integrations` → `/src/integrations`

## Notes

- All modules use ES6 syntax
- No CommonJS or legacy JavaScript
- Supports modern browsers with ES2020+
- Top-level await supported (esnext target)
- Source maps enabled for debugging
- HMR (Hot Module Replacement) enabled in dev mode
- Legacy app.js coexists during transition period
