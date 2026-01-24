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
    /templates   - Token templates
    /documents   - Document storage and management
    /groups      - Group management for multi-sig governance
  /ui            - Shared UI components
    /header      - Global header controller
    /sidebar     - Mobile sidebar and navigation
  /utils         - Utility modules (constants, formatters, validation)
  /contract      - Contract generation for Dash Platform
  /integrations  - External integrations (Dash SDK wrapper)
  index.js       - Main exports
  main.js        - Application entry point
```

## Modules Overview

### `/core` - Core Application

**constants.js** (200+ lines, 30+ exports)
- All application-wide constants
- Step sequences and navigation maps
- Default state objects
- Storage keys and configuration values

**storage.js** (160+ lines, 10+ exports)
- Local storage abstraction
- State persistence
- Theme storage

**state.js** (350+ lines, 20+ exports)
- State management
- Default state creation
- State listeners and persistence

**navigation.js** (250+ lines, 10+ exports)
- Step loading and preloading
- Navigation state management

### `/utils` - Utility Modules

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

**helpers.js** (100+ lines, 10+ exports)
- Utility helper functions

### `/ui` - UI Components

**Toast.js** - Toast notification system
**LoadingSpinner.js** - Loading spinner component
**theme.js** - Theme management (light/dark mode)
**header/header.js** (400+ lines) - Global header controller with:
  - Page navigation
  - Theme switching
  - Reset functionality
  - Register button with missing steps dropdown

**sidebar/mobile.js** (200+ lines) - Mobile UI with:
  - Mobile navigation drawer
  - Mobile sidebar toggle
  - Responsive behavior

### `/features` - Feature Modules

**templates/** - Token template system
- TOKEN_TEMPLATES data
- Template selection and application

**documents/** - Document storage (350+ lines)
- CRUD operations for saved configurations
- Import/export functionality
- Search and filtering
- Listener management

**groups/** - Group management (700+ lines)
- Multi-signature group creation
- Member management
- Base58 identity validation
- Group validation
- Power/threshold configuration

**naming/** - Token naming (extracted)
- Token name validation
- Localization management

### `/contract` - Contract Generation

**generator.js** (700+ lines) - Full contract generation:
- `generatePlatformContractJSON()` - Main contract builder
- `encodeAuthorizedActionTaker()` - Permission encoding
- `transformDistributionRules()` - Distribution transformation
- `transformMarketplaceRules()` - Marketplace rules
- `buildEmissionFunction()` - Emission function building

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

### Using Modules in Browser Console

When the app is running, modules are available globally:

```javascript
// Access via window.DashWizardModules
window.DashWizardModules.validation.validateTokenName("MyToken");
window.DashWizardModules.formatters.formatWalletBalance(100000000);
window.DashWizardModules.constants.STEP_SEQUENCE;

// Or use specific modules
window.ContractGenerator.generatePlatformContractJSON(state);
window.DocumentStorage.create(name, notes, data);
window.GroupsPage.createGroup();
window.GlobalHeader.switchPage('documents');
```

## Migration Status

### Phase 4 - COMPLETED

- [x] Extract core state management (`core/state.js`)
- [x] Extract navigation logic (`core/navigation.js`)
- [x] Extract storage layer (`core/storage.js`)
- [x] Extract theme management (`ui/theme.js`)
- [x] Extract templates data (`features/templates/data.js`)
- [x] Extract contract generator (`contract/generator.js`)
- [x] Extract document storage (`features/documents/storage.js`)
- [x] Extract groups page (`features/groups/groups.js`)
- [x] Extract global header (`ui/header/header.js`)
- [x] Extract mobile sidebar (`ui/sidebar/mobile.js`)

### Phase 5 (Future) - Planned

- [ ] Extract step modules (permissions, distribution, advanced)
- [ ] Complete migration from app.js
- [ ] Remove legacy app.js
- [ ] Production build optimization
- [ ] Documentation completion

## File Size Summary

| Module | Lines | Exports | Status |
|--------|-------|---------|--------|
| core/constants.js | 200+ | 30+ | Complete |
| core/storage.js | 160+ | 10+ | Complete |
| core/state.js | 350+ | 20+ | Complete |
| core/navigation.js | 250+ | 10+ | Complete |
| utils/formatters.js | 250 | 15+ | Complete |
| utils/validation.js | 307 | 15+ | Complete |
| utils/helpers.js | 100+ | 10+ | Complete |
| ui/theme.js | 150+ | 10+ | Complete |
| ui/header/header.js | 400+ | 15+ | Complete |
| ui/sidebar/mobile.js | 200+ | 10+ | Complete |
| features/templates/data.js | 400+ | 5 | Complete |
| features/documents/storage.js | 350+ | 15+ | Complete |
| features/groups/groups.js | 700+ | 20+ | Complete |
| contract/generator.js | 700+ | 15+ | Complete |
| **Total** | **~4500+** | **200+** | **Phase 4 Complete** |

## Import Examples

```javascript
// Named imports (recommended)
import { STEP_SEQUENCE, MAX_U32 } from './src/core/constants.js';
import { generatePlatformContractJSON } from './src/contract/generator.js';
import { createDocument, loadDocuments } from './src/features/documents/storage.js';
import { initGroupsPage, validateGroup } from './src/features/groups/groups.js';
import { switchPage, initGlobalHeader } from './src/ui/header/header.js';

// Namespace imports
import * as ContractGenerator from './src/contract/generator.js';
import * as DocumentStorage from './src/features/documents/storage.js';
import * as GroupsPage from './src/features/groups/groups.js';
```

## Path Aliases

Vite is configured with path aliases for cleaner imports:

- `@` -> `/src`
- `@core` -> `/src/core`
- `@features` -> `/src/features`
- `@ui` -> `/src/ui`
- `@utils` -> `/src/utils`
- `@integrations` -> `/src/integrations`

## Code Splitting

Vite is configured to split code into chunks:

- `vendor` - node_modules
- `core` - `/core/*`
- `ui` - `/ui/*`
- `header` - `/ui/header/*`
- `sidebar` - `/ui/sidebar/*`
- `templates` - `/features/templates/*`
- `documents` - `/features/documents/*`
- `groups` - `/features/groups/*`
- `naming` - `/features/naming/*`
- `contract` - `/contract/*`

## Notes

- All modules use ES6 syntax
- No CommonJS or legacy JavaScript
- Supports modern browsers with ES2020+
- Top-level await supported (esnext target)
- Source maps enabled for debugging
- HMR (Hot Module Replacement) enabled in dev mode
- Legacy app.js coexists during transition period
