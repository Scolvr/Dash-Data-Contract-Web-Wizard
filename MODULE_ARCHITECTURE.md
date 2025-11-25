# Module Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Dash Token Wizard                       │
│                   (Modular Architecture)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │         src/main.js                 │
        │      (Application Entry)            │
        └─────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
    ┌────────┐  ┌─────────┐  ┌──────────┐
    │ Core   │  │Features │  │ UI/Utils │
    └────────┘  └─────────┘  └──────────┘
```

## Detailed Module Structure

```
┌─────────────────────────────────────────────────────────────┐
│                       /src/index.js                         │
│                   (Module Aggregator)                       │
│  Exports: All modules for external consumption             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   CORE      │      │  FEATURES   │      │  UI/UTILS   │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Core Modules (`/src/core/`)

```
┌────────────────────────────────────────┐
│           constants.js                 │
│  • STEP_SEQUENCE                       │
│  • INFO_STEPS                          │
│  • SUBSTEP_SEQUENCES                   │
│  • STEP_LABELS                         │
│  • VALIDITY_STATES                     │
│  • REGISTRATION_METHODS                │
│  • Validation patterns                 │
│  Exports: 30+ constants                │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│           storage.js                   │
│  • saveState(state)                    │
│  • loadState()                         │
│  • clearState()                        │
│  • saveTheme(theme)                    │
│  • loadTheme()                         │
│  • isLocalStorageAvailable()           │
│  Exports: 8 functions                  │
└────────────────────────────────────────┘
```

## Feature Modules (`/src/features/`)

### Naming Step (✅ Complete)

```
┌──────────────────────────────────────────────────────┐
│         features/naming/index.js                     │
│              (Public API)                            │
└──────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼                           ▼
┌───────────────────┐      ┌───────────────────┐
│ namingValidation  │      │   namingState     │
│                   │      │                   │
│ • validateToken   │      │ • createDefault   │
│   Name()          │      │   NamingState()   │
│ • validateBase58  │      │ • normalizeRow    │
│   Identity()      │      │   Data()          │
│ • validatePlural  │      │ • limitRows()     │
│   Form()          │      │ • ensureState()   │
│ • validateLocal   │      │ • updateState()   │
│   izationRow()    │      │ • getFormData()   │
│ • evaluateNaming()│      │                   │
│                   │      │                   │
│ Exports: 6 funcs  │      │ Exports: 9 funcs  │
└───────────────────┘      └───────────────────┘
```

### Other Steps (🔄 Pending)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  permissions/   │  │ distribution/   │  │   advanced/     │
│                 │  │                 │  │                 │
│  • validation   │  │ • validation    │  │ • validation    │
│  • state        │  │ • state         │  │ • state         │
│  • UI (TBD)     │  │ • UI (TBD)      │  │ • UI (TBD)      │
│                 │  │                 │  │                 │
│  Status: TODO   │  │ Status: TODO    │  │ Status: TODO    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐
│ registration/   │
│                 │
│ • validation    │
│ • state         │
│ • wallet        │
│ • QR codes      │
│                 │
│ Status: TODO    │
└─────────────────┘
```

## UI Components (`/src/ui/`)

```
┌────────────────────────────────────────┐
│            Toast.js                    │
│  Toast Notification System             │
│  • show(msg, type, duration)           │
│  • info(msg)                           │
│  • success(msg)                        │
│  • warning(msg)                        │
│  • error(msg)                          │
│  • dismiss(toast)                      │
│  • dismissAll()                        │
│  Exports: Toast class + TOAST_TYPES    │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│       LoadingSpinner.js                │
│  Loading Indicator Component           │
│  • show(msg, target)                   │
│  • hide(target)                        │
│  • updateMessage(msg)                  │
│  • createInline(msg)                   │
│  Exports: LoadingSpinner class         │
└────────────────────────────────────────┘
```

## Utility Modules (`/src/utils/`)

```
┌────────────────────────────────────────┐
│          helpers.js                    │
│  Common Utility Functions              │
│  • generateId()                        │
│  • normaliseUnsignedValue()            │
│  • debounce() / throttle()             │
│  • deepClone()                         │
│  • isEmpty()                           │
│  • safeJsonParse()                     │
│  • escapeHtml()                        │
│  • formatNumber()                      │
│  • truncate()                          │
│  • capitalize()                        │
│  • safeBigIntCompare()                 │
│  • announce()                          │
│  Exports: 20+ functions                │
└────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│constants│ │formatter│ │validati │
│   .js   │ │   s.js  │ │  on.js  │
│ (legacy)│ │ (legacy)│ │ (legacy)│
└─────────┘ └─────────┘ └─────────┘
```

## Integration Layer (`/src/integrations/`)

```
┌────────────────────────────────────────┐
│          dashSDK.js (TODO)             │
│  Dash Platform Integration             │
│  • DashSDKClient class                 │
│    - initialize(mnemonic)              │
│    - registerIdentity()                │
│    - submitContract(data)              │
│    - getBalance()                      │
│    - waitForConfirmation()             │
│  Exports: DashSDKClient + helpers      │
│  Status: Pending Phase 5               │
└────────────────────────────────────────┘
```

## Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   User   │───▶│   DOM    │───▶│ Feature  │───▶│  State   │
│  Input   │    │  Event   │    │  Module  │    │ Storage  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │Validation│
                               │  Logic   │
                               └──────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │   UI     │
                               │ Update   │
                               └──────────┘
```

## Module Dependencies (Naming Step Example)

```
app.js (legacy)
    │
    │ (coexists with)
    │
    ▼
src/main.js ──────────┐
                      │
                      ▼
        ┌─────────────────────────┐
        │  features/naming/       │
        │                         │
        │  index.js               │
        │    │                    │
        │    ├─▶ validation.js    │
        │    │   (no deps)        │
        │    │                    │
        │    └─▶ state.js         │
        │        (no deps)        │
        └─────────────────────────┘
```

**Key Points:**
- ✅ No circular dependencies
- ✅ Pure functions (validation & state)
- ✅ UI layer separated (TBD)
- ✅ Loose coupling between modules

## Testing Architecture

```
┌────────────────────────────────────────┐
│       features/naming/namingTest.js    │
│                                        │
│  import { validateTokenName, ... }    │
│  from './index.js';                   │
│                                        │
│  Test Cases:                          │
│  ✓ Token name validation              │
│  ✓ Plural form validation             │
│  ✓ Complete form evaluation           │
│  ✓ State management                   │
└────────────────────────────────────────┘
                 │
                 ▼
        Run: npm run test:module
                 │
                 ▼
        ┌────────────────┐
        │  Test Results  │
        │  ✓ All Passing │
        └────────────────┘
```

## Build Pipeline

```
┌──────────────┐
│  Source Code │
│  (src/*.js)  │
└──────────────┘
       │
       ▼ npm run dev
┌──────────────┐
│     Vite     │
│ Dev Server   │
│  • HMR       │
│  • No bundle │
└──────────────┘
       │
       ▼ npm run build
┌──────────────┐
│     Vite     │
│  Build Tool  │
│  • Bundle    │
│  • Minify    │
│  • Tree-shake│
└──────────────┘
       │
       ▼
┌──────────────┐
│  dist/       │
│  (optimized) │
└──────────────┘
```

## Migration Strategy

```
PHASE 3 (Completed)
┌─────────────────────────────────────┐
│ • Build system (Vite)               │
│ • Directory structure               │
│ • Constants extracted               │
│ • Utilities extracted               │
└─────────────────────────────────────┘
                 │
                 ▼
PHASE 4 (Current - Partially Complete)
┌─────────────────────────────────────┐
│ ✅ Naming step extracted            │
│ ✅ UI components (Toast, Spinner)   │
│ ✅ Storage layer                    │
│ 🔄 Remaining steps (4)              │
└─────────────────────────────────────┘
                 │
                 ▼
PHASE 5 (Next)
┌─────────────────────────────────────┐
│ • Extract permissions step          │
│ • Extract distribution step         │
│ • Extract advanced step             │
│ • Extract registration step         │
│ • Create Dash SDK integration       │
└─────────────────────────────────────┘
                 │
                 ▼
PHASE 6 (Future)
┌─────────────────────────────────────┐
│ • Wire modules to actual UI         │
│ • Disable corresponding app.js code │
│ • Remove app.js entirely            │
│ • Production optimization           │
└─────────────────────────────────────┘
```

## File Size Visualization

```
app.js (15,123 lines)
███████████████████████████████████████████████████ 100%

Extracted so far (2,326 lines)
███████ 15%

Remaining (12,797 lines)
████████████████████████████████████████████ 85%
```

## Module Loading Order

```
1. index.html
      │
      ├─▶ styles.css (existing)
      │
      ├─▶ app.js (legacy - coexists)
      │
      └─▶ src/main.js (new)
            │
            ├─▶ utils/constants.js
            ├─▶ utils/formatters.js
            ├─▶ utils/validation.js
            ├─▶ utils/helpers.js
            │
            ├─▶ core/constants.js
            ├─▶ core/storage.js
            │
            ├─▶ ui/Toast.js
            ├─▶ ui/LoadingSpinner.js
            │
            └─▶ features/naming/
                  ├─▶ namingValidation.js
                  ├─▶ namingState.js
                  └─▶ index.js
```

---

**Legend:**
- ✅ Complete and tested
- 🔄 In progress
- ❌ Not started
- TBD - To be determined

**Document Version:** 1.0
**Last Updated:** November 24, 2025
