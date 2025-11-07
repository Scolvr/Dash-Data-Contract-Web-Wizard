# Dash Token Wizard - Complete Flow Documentation

**Version:** 1.0
**Last Updated:** 2025-01-06
**Project:** Dash Platform Token Creation Wizard

---

## Table of Contents

1. [Token Contract Structure](#1-token-contract-structure)
2. [Application Architecture](#2-application-architecture)
3. [Wizard Flow](#3-wizard-flow)
4. [State Management](#4-state-management)
5. [Validation System](#5-validation-system)
6. [Navigation & Progression](#6-navigation--progression)
7. [Registration Methods](#7-registration-methods)
8. [Contract Generation](#8-contract-generation)
9. [Technical Implementation](#9-technical-implementation)

---

## 1. Token Contract Structure

### 1.1 Complete Contract Schema

The wizard generates a **Dash Platform Data Contract** with the following structure:

```json
{
  "$format_version": "1",
  "id": "<generated-by-platform>",
  "ownerId": "<identity-id>",
  "version": 1,

  "config": {
    "$format_version": "0",
    "canBeDeletedByOwner": false,
    "readonly": false,
    "keepsHistory": false,
    "documentsKeepHistoryContractDefault": false,
    "documentsMutableContractDefault": true,
    "documentsCanBeDeletedByOwnerDefault": false,
    "requiresIdentityEncryptionBoundedKey": null,
    "requiresIdentityDecryptionBoundedKey": null
  },

  "tokens": {
    "0": {
      "$format_version": "0",
      "conventions": { /* Token naming and localization */ },
      "conventionsChangeRules": { /* Who can change conventions */ },
      "baseSupply": 1000000,
      "maxSupply": 10000000,
      "keepsHistory": { /* History tracking config */ },
      "transferable": true,
      "startAsPaused": false,
      "allowTransferToFrozenBalance": false,
      "maxSupplyChangeRules": { /* Supply change governance */ },
      "manualMintingRules": { /* Manual mint permissions */ },
      "manualBurningRules": { /* Manual burn permissions */ },
      "freezeRules": { /* Freeze permissions */ },
      "unfreezeRules": { /* Unfreeze permissions */ },
      "destroyFrozenFundsRules": { /* Destroy frozen funds */ },
      "emergencyActionRules": { /* Emergency controls */ },
      "distributionRules": { /* Emission schedule */ },
      "marketplaceRules": { /* Trading permissions */ },
      "transferNotesConfig": { /* Transfer memo config */ },
      "mainControlGroup": null,
      "mainControlGroupCanBeModified": "ContractOwner",
      "description": "Token description"
    }
  },

  "groups": {
    "0": {
      "members": [
        {"identity": "identity-id-1", "power": 10},
        {"identity": "identity-id-2", "power": 5}
      ],
      "requiredPower": 10
    }
  },

  "documentSchemas": {},
  "keywords": ["token", "currency"],
  "description": "Contract description"
}
```

### 1.2 Contract Sections Breakdown

#### A. Conventions (Token Identity)

**Purpose:** Define the token's name, symbol, and multi-language support.

```json
{
  "$format_version": "0",
  "localizations": {
    "en": {
      "shouldCapitalize": true,
      "singularForm": "Token",
      "pluralForm": "Tokens",
      "$format_version": "0"
    },
    "es": {
      "shouldCapitalize": true,
      "singularForm": "Ficha",
      "pluralForm": "Fichas",
      "$format_version": "0"
    }
  },
  "decimals": 8
}
```

**Fields:**
- `localizations`: Map of language code → localization data
  - Language code: 2-letter ISO code (e.g., "en", "es", "fr")
  - `shouldCapitalize`: Boolean - capitalize in UI
  - `singularForm`: Token name (3-25 chars)
  - `pluralForm`: Plural form (3-25 chars)
- `decimals`: 0-16 (number of decimal places)

---

#### B. Supply Rules

**Purpose:** Control token supply limits and change permissions.

```json
{
  "baseSupply": 1000000,
  "maxSupply": 10000000,
  "maxSupplyChangeRules": {
    "$format_version": "0",
    "isEnabled": true,
    "authorizedToMakeChange": {
      "Owner": {}
    },
    "adminActionTakers": {
      "Owner": {}
    },
    "governanceFlags": {
      "allowAuthorizedToMakeChangeToBeNone": false,
      "allowAdminActionTakersToBeNone": false,
      "allowAdminActionTakersToChangeSelf": true
    }
  }
}
```

**Fields:**
- `baseSupply`: Initial token supply (respects decimals)
- `maxSupply`: Maximum possible supply (null = unlimited)
- `maxSupplyChangeRules`: V0 Rule defining who can modify max supply
  - `isEnabled`: Can max supply be changed post-deployment?
  - `authorizedToMakeChange`: Who can perform the change
  - `adminActionTakers`: Who can modify the rule itself
  - `governanceFlags`: Safety constraints

---

#### C. History Tracking

**Purpose:** Configure on-chain history retention for operations.

```json
{
  "keepsTransferHistory": true,
  "keepsMintingHistory": true,
  "keepsBurningHistory": false,
  "keepsFreezingHistory": false,
  "$format_version": "0"
}
```

**Impact:**
- `true`: Operation history stored on-chain (increases data costs)
- `false`: No history retained (lower costs, less auditability)

---

#### D. Distribution Rules (Emission)

**Purpose:** Define token emission schedule and destination.

```json
{
  "$format_version": "0",
  "perpetualDistribution": {
    "cadence": {
      "BlockBasedDistribution": {
        "intervalBlocks": 100,
        "startBlock": 0
      }
    },
    "emissionFunction": {
      "FixedAmount": {
        "amount": 1000
      }
    }
  },
  "preProgrammedDistribution": [],
  "newTokensDestinationIdentity": null,
  "mintingAllowChoosingDestination": false,
  "changeDirectPurchasePricingRules": { /* V0 Rule */ }
}
```

**Cadence Types:**
1. **BlockBasedDistribution**: Emit every N blocks
   - `intervalBlocks`: Number of blocks between emissions
   - `startBlock`: Block number to begin emissions (0 = immediate)

2. **TimeBasedDistribution**: Emit every N seconds
   - `intervalSeconds`: Seconds between emissions
   - `startTimestamp`: Unix timestamp to begin (0 = immediate)

3. **EpochBasedDistribution**: Emit on time epochs
   - `epoch`: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

**Emission Functions:**

1. **FixedAmount**: Constant emission per interval
   ```json
   {"FixedAmount": {"amount": 1000}}
   ```

2. **Random**: Random amount between min/max
   ```json
   {"Random": {"min": 10, "max": 100}}
   ```

3. **StepDecreasing**: Bitcoin-style halving
   ```json
   {
     "StepDecreasing": {
       "initialAmount": 5000,
       "halvingIntervals": 10000,
       "finalAmount": 1
     }
   }
   ```

4. **Linear**: Slope-based growth/decay
   ```json
   {
     "Linear": {
       "intercept": 100,
       "slope": 5,
       "minValue": 0,
       "maxValue": 10000
     }
   }
   ```

5. **Exponential**: Power function
   ```json
   {
     "Exponential": {
       "base": 1000,
       "rate": 1.05,
       "minValue": 1,
       "maxValue": 100000
     }
   }
   ```

6. **Polynomial**: Power polynomial
   ```json
   {
     "Polynomial": {
       "coefficient": 10,
       "power": 2,
       "minValue": 0,
       "maxValue": 50000
     }
   }
   ```

7. **Logarithmic**: Log growth
   ```json
   {
     "Logarithmic": {
       "scale": 100,
       "offset": 10,
       "minValue": 0,
       "maxValue": 10000
     }
   }
   ```

8. **InvertedLogarithmic**: Inverse log decay
   ```json
   {
     "InvertedLogarithmic": {
       "scale": 100,
       "offset": 10,
       "minValue": 1,
       "maxValue": 10000
     }
   }
   ```

9. **Stepwise**: Custom step schedule
   ```json
   {
     "Stepwise": {
       "steps": [
         {"threshold": 1000, "value": 100},
         {"threshold": 5000, "value": 50},
         {"threshold": 10000, "value": 10}
       ]
     }
   }
   ```

---

#### E. Manual Action Rules

**Purpose:** Define permissions for manual operations (mint, burn, freeze).

Each action has a V0 Rule structure:

```json
{
  "$format_version": "0",
  "isEnabled": true,
  "authorizedToMakeChange": {
    "Owner": {}
  },
  "adminActionTakers": {
    "SpecificIdentity": "identity-id-here"
  },
  "governanceFlags": {
    "allowAuthorizedToMakeChangeToBeNone": true,
    "allowAdminActionTakersToBeNone": false,
    "allowAdminActionTakersToChangeSelf": true
  }
}
```

**Authorization Types:**
- `Owner`: Contract owner (identity that deployed the contract)
- `SpecificIdentity`: A single Dash Platform identity ID
- `Group`: A governance group (index reference)
- `NoOne`: Action disabled (can be re-enabled if governance allows)

**Rules Applied To:**
- `manualMintingRules`: Who can manually create new tokens
- `manualBurningRules`: Who can destroy tokens
- `freezeRules`: Who can freeze token balances
- `unfreezeRules`: Who can unfreeze balances
- `destroyFrozenFundsRules`: Who can destroy frozen funds
- `emergencyActionRules`: Who can pause the entire token

---

#### F. Marketplace Rules

**Purpose:** Define trading permissions.

```json
{
  "$format_version": "0",
  "tradeMode": "NotTradeable",
  "tradeModeChangeRules": {
    "$format_version": "0",
    "isEnabled": true,
    "authorizedToMakeChange": {"Owner": {}},
    "adminActionTakers": {"Owner": {}},
    "governanceFlags": {
      "allowAuthorizedToMakeChangeToBeNone": true,
      "allowAdminActionTakersToBeNone": false,
      "allowAdminActionTakersToChangeSelf": true
    }
  }
}
```

**Trade Modes (current & planned):**
- `NotTradeable`: Token cannot be traded (transfer only) — **only option available today**
- `Permissionless` *(reserved)*: Anyone can trade freely once marketplaces launch
- `ApprovalRequired` *(reserved)*: Trades require owner/committee approval once supported

---

#### G. Transfer Notes Configuration

**Purpose:** Allow memos/notes on transfers.

```json
{
  "$format_version": "0",
  "allowedNoteTypes": ["Public", "SharedEncrypted", "PrivateEncrypted"]
}
```

**Note Types:**
- `Public`: Plain text visible to everyone
- `SharedEncrypted`: Encrypted, visible to sender and recipient
- `PrivateEncrypted`: Encrypted, visible only to sender

---

#### H. Groups (Governance)

**Purpose:** Multi-signature governance groups.

```json
{
  "0": {
    "members": [
      {"identity": "identity-id-1", "power": 10},
      {"identity": "identity-id-2", "power": 5},
      {"identity": "identity-id-3", "power": 3}
    ],
    "requiredPower": 10
  }
}
```

**Fields:**
- `members`: Array of identity + voting power pairs
  - `identity`: Dash Platform identity ID (Base58 encoded)
  - `power`: Integer voting weight (1-255)
- `requiredPower`: Minimum combined power to execute actions

**Usage:**
- Groups can be assigned as `authorizedToMakeChange` or `adminActionTakers`
- Example: 3-of-5 multisig = 5 members with power 1, requiredPower = 3

---

## 2. Application Architecture

### 2.1 Technology Stack

**Frontend:**
- Pure HTML5, CSS3, vanilla JavaScript (no frameworks)
- ES6+ features (modules, async/await, destructuring)
- CSS Custom Properties for theming
- Responsive design (mobile-first)

**Backend:**
- Static site (no server-side processing)
- Local development server: `server.js` (Node.js HTTP server)
- Dash SDK integration via CDN

**Build:**
- No build step required
- Direct file serving
- Optional: Vite for development (not currently used)

### 2.2 File Structure

```
/
├── index.html          # Single-page application shell (6800+ lines)
├── app.js              # Complete wizard logic (9900+ lines)
├── styles.css          # Complete styling (4600+ lines)
├── server.js           # Local dev server
├── contracts/          # Reference Rust data structures
│   ├── token_configuration_v0.rs
│   ├── token_distribution_rules_v0.rs
│   └── ...
├── CLAUDE.md           # Project documentation for AI
├── README.md           # User-facing documentation
└── FullFlow.md         # This file
```

### 2.3 Core Design Patterns

**1. State Machine Architecture**
- Single source of truth: `wizardState` object
- All UI derives from state
- Validation gates control progression
- LocalStorage provides persistence

**2. Event-Driven UI**
- Input events trigger validation
- State changes propagate to UI
- Debounced server validation
- Immediate client-side feedback

**3. Progressive Disclosure**
- Linear step sequence
- Conditional substeps
- Inline panels for complex options
- Collapsible advanced settings

**4. Validation-First Navigation**
- Cannot advance without valid current step
- Cannot skip steps (furthestValidIndex gate)
- Can always navigate backward
- Manual navigation requires validation

---

## 3. Wizard Flow

### 3.1 Step Sequence

The wizard follows a strict 7-step sequence:

```
1. Welcome       → Template selection / introduction
2. Naming        → Token name + localization
3. Permissions   → Supply, decimals, history, groups, manual actions
4. Advanced      → Trading rules, change control flags
5. Distribution  → Emission cadence and functions
6. Search        → Keywords and description (optional)
7. Registration  → Deploy via QR / DET / Self-service
```

**Step Navigation Rules:**
- User must complete steps in order
- Can revisit previous steps anytime
- Cannot skip ahead (controlled by `furthestValidIndex`)
- Welcome step is always valid (intro only)

### 3.2 Substep Structure

Each main step contains substeps for detailed configuration:

#### Naming Substeps
1. `naming` - Token name input
2. `naming-localization` - Multi-language support
3. `naming-update` - Review and finalize

#### Permissions Substeps
1. `permissions` - Base supply, decimals, max supply
2. `permissions-transfer` - Transfer settings
3. `permissions-manual-mint` - Manual minting permissions
4. `permissions-manual-burn` - Manual burning permissions
5. `permissions-freeze` - Freeze permissions
6. `permissions-unfreeze` - Unfreeze permissions
7. `permissions-destroy-frozen` - Destroy frozen funds
8. `permissions-emergency` - Emergency pause controls

#### Advanced Substeps
1. `advanced-history` - History tracking configuration
2. `advanced` - Trading mode and change control
3. `advanced-launch` - Launch state (paused/unpaused)

#### Distribution Substeps
1. `distribution-preprogrammed` - Pre-scheduled distributions
2. `distribution-perpetual` - Ongoing emission schedule

#### Search Substeps
1. `search` - Keywords and description

#### Registration Substeps
1. `registration` - Choose method and deploy

### 3.3 User Journey Flow

```
┌─────────────────┐
│  Page Load      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Load State     │ ← Restore from localStorage
│  (line 5238)    │   or create default state
└────────┬────────┘
         ↓
┌─────────────────┐
│  Initialize UI  │ ← Hydrate forms, evaluate steps
│  (line 1871)    │   update progress indicator
└────────┬────────┘
         ↓
┌─────────────────┐
│  Show Screen    │ ← Display 'naming' step
│  (line 4651)    │   (or last active step)
└────────┬────────┘
         ↓
┌─────────────────────────────────────┐
│         USER INTERACTION            │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  User enters token name     │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  Evaluate Naming (2404)     │  │
│  │  • Validate name            │  │
│  │  • Validate plural          │  │
│  │  • Validate localizations   │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  Update Step State          │  │
│  │  • validity = 'valid'       │  │
│  │  • touched = true           │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  Persist State              │  │
│  │  • Save to localStorage     │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  Update UI                  │  │
│  │  • Enable Next button       │  │
│  │  • Show checkmark           │  │
│  │  • Clear error messages     │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  User clicks Next           │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  goToNextScreen() (8310)    │  │
│  │  • Validate current step    │  │
│  │  • Get next substep         │  │
│  │  • Show next screen         │  │
│  └──────────┬──────────────────┘  │
│             ↓                      │
│  ┌─────────────────────────────┐  │
│  │  Update furthestValidIndex  │  │
│  │  • User can now access      │  │
│  │    next step from sidebar   │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Repeat for     │
│  each step      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Registration   │ ← Final step
│  Step Reached   │
└────────┬────────┘
         ↓
┌─────────────────────────────────┐
│  User chooses method:           │
│  • Mobile (QR)                  │
│  • DET (JSON export)            │
│  • Self-service (wallet import) │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Generate Contract JSON         │
│  (line 8623)                    │
│  • Transform wizardState.form   │
│  • Apply V0 rule structures     │
│  • Include groups               │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Output (depends on method):    │
│  • QR codes (mobile)            │
│  • JSON file (DET)              │
│  • Dash SDK deployment (self)   │
└─────────────────────────────────┘
```

---

## 4. State Management

### 4.1 wizardState Object

**Location:** Created by `createDefaultWizardState()` at line 435

**Structure:**

```javascript
{
  // Navigation
  active: 'naming',              // Current screen ID
  furthestValidIndex: -1,        // Highest validated step index

  // Step Tracking (for each main step)
  steps: {
    naming: {
      id: 'naming',
      validity: 'unknown',       // 'unknown' | 'valid' | 'invalid'
      touched: false             // Has user interacted?
    },
    permissions: { ... },
    distribution: { ... },
    advanced: { ... },
    search: { ... },
    registration: { ... }
  },

  // Runtime (not persisted)
  runtime: {
    walletClient: null,          // Dash.Client instance
    walletClientFingerprint: null,
    walletInitializationError: '',
    walletInfoLoading: false
  },

  // Form Data (persisted)
  form: {
    tokenName: '',
    naming: { /* naming data */ },
    permissions: { /* permissions data */ },
    distribution: { /* distribution data */ },
    advanced: { /* advanced data */ },
    search: { /* search data */ },
    registration: { /* registration data */ }
  }
}
```

### 4.2 State Lifecycle

**1. Initialization**
```javascript
// Page load
loadState()  // Line 5238
  ↓
// If localStorage has valid state:
  Restore wizardState from localStorage
// Else:
  wizardState = createDefaultWizardState()  // Line 435
  ↓
initialiseUI()  // Line 1871
  ↓
Hydrate all form inputs from wizardState.form
Evaluate all steps (silent: true if untouched)
Update progress indicator
Show initial screen
```

**2. User Interaction**
```javascript
// User changes input
Event listener fires
  ↓
Read value from DOM
Update wizardState.form[step][field]
  ↓
evaluateStep(stepId, { touched: true })  // Line 3048
  ↓
Validate all fields for step
Update wizardState.steps[stepId].validity
Update wizardState.steps[stepId].touched
  ↓
persistState()  // Line 5512 (save to localStorage)
  ↓
Update UI (error messages, buttons, progress)
```

**3. Navigation**
```javascript
// User clicks Next/Back
goToNextScreen(currentId)  // Line 8310
  ↓
Validate current parent step
if (not valid) { return; }
  ↓
Get next substep ID
  ↓
showScreen(nextId)  // Line 4651
  ↓
Update active screen
Evaluate new screen
Update progress indicator
Persist state
```

### 4.3 State Persistence

**Saved to localStorage:**
- Key: `'dashTokenWizardState'`
- Frequency: On every state change
- Excluded: Wallet mnemonic/private key (security)
- Format: JSON serialized object

**Restoration:**
- On page load
- Validates structure
- Falls back to default if corrupt
- Preserves furthestValidIndex (user progress)

---

## 5. Validation System

### 5.1 Validation Levels

**Client-Side (Immediate)**
- Field format validation
- Range checks
- Required field checks
- Cross-field validation
- Regex pattern matching

**Server-Side (Deferred)**
- Uniqueness checks (e.g., token name)
- Platform compatibility validation
- 300ms debounce to avoid spam

### 5.2 Validation States

Each step has a `validity` state:

```
unknown  → Initial state, no validation yet
valid    → All checks passed
invalid  → At least one check failed (only set if touched)
```

**State Transitions:**
```
DEFAULT: validity = 'unknown', touched = false

User interacts:
  ↓ touched = true
  ↓ Run validation
  ↓
  ├─ All valid?    → validity = 'valid'
  └─ Any invalid?  → validity = 'invalid'

Navigation allowed only if: validity === 'valid'
```

### 5.3 Step-Specific Validation Rules

#### Naming Step (Line 2404)
```javascript
evaluateNaming({ touched, silent })
  ↓
1. Validate tokenName:
   • Length: 3-25 characters
   • Pattern: alphanumeric + hyphen + underscore
   • No leading/trailing spaces
   • Not all whitespace
  ↓
2. Validate pluralForm:
   • Length: 3-25 characters
   • Same pattern as singular
  ↓
3. Validate localizations:
   • Language code: 2-letter lowercase
   • Singular form: 3-25 chars
   • Plural form: 3-25 chars
   • No duplicate language codes
  ↓
4. Schedule server validation (uniqueness check)
  ↓
Return { valid: boolean, message: string }
```

#### Permissions Step (Line 2499)
```javascript
evaluatePermissions({ touched, silent })
  ↓
1. Validate decimals:
   • Integer: 0-16
  ↓
2. Validate baseSupply:
   • Numeric
   • > 0
   • Respects decimal places
  ↓
3. Validate maxSupply (if enabled):
   • Numeric
   • >= baseSupply
   • Respects decimal places
  ↓
4. Validate groups:
   • Each member has valid identity ID
   • Powers are positive integers
   • Required power <= total power
  ↓
Return { valid: boolean, message: string }
```

#### Distribution Step (Line 2664)
```javascript
evaluateDistribution({ touched, silent })
  ↓
1. If perpetual distribution enabled:
   a. Validate cadence:
      • BlockBased: intervalBlocks > 0
      • TimeBased: intervalSeconds > 0
      • EpochBased: valid epoch type
   b. Validate emission (if type selected):
      • FixedAmount: amount > 0
      • Random: min < max, both > 0
      • StepFunction: all thresholds/values valid
      • Linear/Exponential: parameters in range
  ↓
2. If pre-programmed distribution enabled:
   • All entries have valid timestamp + amount
   • Timestamps are in future
   • No duplicate timestamps
  ↓
Return { valid: boolean, message: string }
```

#### Registration Step (Line 2846)
```javascript
evaluateRegistration({ touched, silent })
  ↓
1. Check selected method:
   • If 'mobile': qrGenerated === true
   • If 'det': jsonDisplayed === true
   • If 'self': identity.id exists + wallet credentials exist
  ↓
Return { valid: boolean, message: string }
```

### 5.4 Validation Flow Diagram

```
User Action (keystroke/change)
  ↓
Event Handler
  ↓
evaluateStep(stepId, { touched: true, silent: false })
  ↓
getParentStep(substepId)  // Resolve to main step
  ↓
Specific Validation Function
  ├─ Read form values
  ├─ Apply validation rules
  ├─ Generate result { valid, message }
  ↓
updateStepStatusFromValidation()  // Line 5186
  ├─ Set validity: 'valid' | 'invalid' | 'unknown'
  ├─ Set touched: true
  ↓
persistState()  // Save to localStorage
  ↓
updateProgressIndicator()  // Update UI
  ↓
scheduleServerValidation()  // Debounced server check (if needed)
```

---

## 6. Navigation & Progression

### 6.1 Navigation Functions

**Primary Navigation:**

| Function | Line | Purpose |
|----------|------|---------|
| `goToNextScreen(fromId)` | 8310 | Advance to next substep |
| `goToPreviousScreen(fromId)` | 8364 | Go back to previous substep |
| `showScreen(targetId)` | 4651 | Display specific screen |
| `getNextSubstep(currentId)` | 8243 | Calculate next substep ID |
| `getPreviousSubstep(currentId)` | 8331 | Calculate previous substep ID |
| `resolveStepTargetId(targetId)` | 4610 | Validate target step accessibility |

**Access Control:**

```javascript
function resolveStepTargetId(targetId) {
  // 1. Check if target is valid substep
  if (!isValidSubstep(targetId)) return null;

  // 2. Get parent step
  const parentStep = getParentStep(targetId);

  // 3. Check furthestValidIndex
  const targetIndex = STEP_SEQUENCE.indexOf(parentStep);
  const canAccess = targetIndex <= (wizardState.furthestValidIndex + 1);

  // 4. Allow if:
  //    - Target is current or previous step
  //    - Target is next step AND current step is valid
  if (!canAccess) return null;

  return targetId;
}
```

### 6.2 furthestValidIndex Mechanism

**Purpose:** Track user's maximum validated step for access control.

**Calculation:**
```javascript
function computeFurthestValidIndexFromSteps(steps) {
  let furthest = -1;
  STEP_SEQUENCE.forEach((stepId, index) => {
    if (steps[stepId]?.validity === 'valid') {
      furthest = index;
    }
  });
  return furthest;
}
```

**Example:**
```
Steps: [welcome, naming, permissions, advanced, distribution, search, registration]
Indices: [0, 1, 2, 3, 4, 5, 6]

Scenario 1: User completes naming
  steps.naming.validity = 'valid'
  furthestValidIndex = 1
  User can access: welcome (0), naming (1), permissions (2)

Scenario 2: User completes permissions
  steps.permissions.validity = 'valid'
  furthestValidIndex = 2
  User can access: welcome (0), naming (1), permissions (2), advanced (3)

Scenario 3: User invalidates naming (e.g., clears name)
  steps.naming.validity = 'invalid'
  furthestValidIndex = 0 (recomputed, only welcome valid)
  User blocked from: permissions, advanced, etc.
```

### 6.3 Step Progression Logic

**Forward Navigation:**

```
User clicks "Next" on naming step
  ↓
goToNextScreen('naming')
  ↓
1. Get parent step: 'naming'
  ↓
2. Check validity:
   if (steps.naming.validity !== 'valid') {
     return; // Blocked
   }
  ↓
3. Get next substep:
   getNextSubstep('naming') → 'naming-localization'
  ↓
4. Show screen:
   showScreen('naming-localization')
  ↓
5. Update furthestValidIndex:
   If last substep of naming:
     updateFurthestValidIndex() → furthestValidIndex = 1
```

**Backward Navigation:**

```
User clicks "Back" on permissions step
  ↓
goToPreviousScreen('permissions')
  ↓
1. Get previous substep:
   getPreviousSubstep('permissions') → 'naming-update'
  ↓
2. Show screen:
   showScreen('naming-update')
  ↓
No validation required for backward navigation
```

**Manual Navigation (Sidebar):**

```
User clicks "Permissions" in sidebar
  ↓
resolveStepTargetId('permissions')
  ↓
1. Check if 'permissions' is valid substep: YES
  ↓
2. Get parent step: 'permissions'
  ↓
3. Get step index: 2
  ↓
4. Check access:
   furthestValidIndex = 1
   canAccess = (2 <= 1 + 1) → YES (next step allowed)
  ↓
5. If naming is valid:
   showScreen('permissions')
   Else:
   return null (blocked)
```

---

## 7. Registration Methods

### 7.1 Mobile (QR Code) Method

**Purpose:** Generate animated QR codes for mobile wallet import.

**Flow:**
```
1. User selects "Mobile Registration"
  ↓
2. User clicks "Generate QR Codes"
  ↓
3. generatePlatformContractJSON() (line 8623)
   • Builds complete contract JSON from wizardState.form
  ↓
4. renderQRPreview() (line ~9500)
   • Splits JSON into chunks (QR code size limit)
   • Generates QR code for each chunk
   • Displays animated sequence
  ↓
5. User scans QR codes with Dash mobile wallet
   • Wallet reconstructs contract JSON
   • User reviews and deploys from mobile
```

**QR Code Structure:**
- Multi-part QR sequence (if JSON exceeds single QR capacity)
- Each QR contains: chunk index, total chunks, chunk data
- Animated display cycles through all QR codes

**Pros:**
- No wallet import to browser (security)
- Mobile-friendly workflow
- No browser Dash SDK needed

**Cons:**
- Requires Dash mobile wallet
- Manual scanning process
- Limited to mobile deployment

---

### 7.2 DET (Dash Evo Tool) Method

**Purpose:** Export JSON for command-line deployment with DET.

**Flow:**
```
1. User selects "Dash Evo Tool (DET)"
  ↓
2. System displays JSON preview in panel
  ↓
3. generatePlatformContractJSON() (line 8623)
   • Builds complete contract JSON
   • Displays in <pre> block with syntax highlighting
  ↓
4. User clicks "Copy JSON" or "Download Contract"
  ↓
5. copyJsonPayload() (line 5656) OR downloadContract()
   • Copies to clipboard / saves as .json file
  ↓
6. User opens terminal and runs DET:
   $ dash-evo-tool contract create --file token-contract.json
  ↓
7. DET deploys contract to Dash Platform
```

**JSON Export Format:**
```json
{
  "$format_version": "1",
  "tokens": { /* complete token config */ },
  "groups": { /* groups if defined */ },
  "documentSchemas": {},
  "description": "Token description",
  "keywords": ["token", "currency"]
}
```

**Pros:**
- Full control via command-line
- No browser wallet import
- Advanced users can edit JSON before deployment

**Cons:**
- Requires DET installation
- Command-line knowledge needed
- Extra steps vs. self-service

---

### 7.3 Self-Service (Browser Wallet) Method

**Purpose:** Direct deployment from browser using Dash SDK.

**Flow:**
```
1. User selects "Self-Service Registration"
  ↓
2. User imports wallet mnemonic (12/24 words)
  ↓
3. initializeWalletClient() (line 2227)
   • Creates Dash.Client instance:
     new Dash.Client({
       network: 'testnet',
       wallet: { mnemonic: userMnemonic }
     })
   • Stores in wizardState.runtime.walletClient
  ↓
4. Fetch wallet info:
   • Address: client.wallet.getAccount().getUnusedAddress()
   • Balance: check account balance
   • Display in UI
  ↓
5. User clicks "Register Identity" (if not already registered)
  ↓
6. registerIdentity() (line 2329)
   • Calls: client.platform.identities.register()
   • Costs Dash credits from wallet
   • Returns identity ID
   • Stores in wizardState.form.registration.identity.id
  ↓
7. User acknowledges warning and clicks "Create Token"
  ↓
8. generatePlatformContractJSON() (line 8623)
   • Builds contract JSON with identity ID as ownerId
  ↓
9. Deploy contract (implementation in app.js)
   • Call: client.platform.contracts.create(contractJSON)
   • Submit to Dash Platform blockchain
   • Return contract ID
  ↓
10. Display success message with contract ID
```

**Wallet Initialization:**
```javascript
const client = new window.Dash.Client({
  network: 'testnet',
  wallet: {
    mnemonic: userMnemonic,  // 12 or 24 words
    unsafeOptions: {
      skipSynchronizationBeforeHeight: 1000000
    }
  }
});

wizardState.runtime.walletClient = client;
```

**Identity Registration:**
```javascript
const identity = await client.platform.identities.register();
const identityId = identity.getId().toString();
wizardState.form.registration.identity.id = identityId;
```

**Contract Deployment:**
```javascript
const contract = await client.platform.contracts.create(
  contractJSON,
  identity
);
await client.platform.contracts.publish(contract, identity);
```

**Pros:**
- Single-click deployment from browser
- Immediate feedback
- No external tools needed

**Cons:**
- Requires wallet mnemonic import (security risk)
- Requires Dash credits in wallet
- Browser must support Dash SDK

**Security Notes:**
- Wallet mnemonic NEVER persisted to localStorage
- Mnemonic cleared on page refresh
- Warning displayed before wallet import
- Testnet only (production would need extra warnings)

---

## 8. Contract Generation

### 8.1 Contract Building Process

**Main Function:** `generatePlatformContractJSON()` (Line 8623)

**High-Level Flow:**
```
wizardState.form (user input)
  ↓
Transform each section:
  ├─ conventions (naming + localizations)
  ├─ supply rules (base, max, change control)
  ├─ keepsHistory (transfer, mint, burn, freeze)
  ├─ manualMintingRules (mint permissions)
  ├─ manualBurningRules (burn permissions)
  ├─ freezeRules / unfreezeRules
  ├─ destroyFrozenFundsRules
  ├─ emergencyActionRules
  ├─ distributionRules (cadence + emission)
  ├─ marketplaceRules (trade mode)
  ├─ transferNotesConfig
  ├─ groups (if defined)
  ↓
Combine into Platform Contract JSON
  ↓
Return complete contract object
```

### 8.2 Transformation Helper Functions

**Located within `generatePlatformContractJSON()` closure:**

#### 1. createRuleV0(isEnabled, actionTaker, governanceFlags)
**Line:** 8628
**Purpose:** Convert boolean change control flags to V0 rule structure.

```javascript
Input:
  isEnabled: boolean
  actionTaker: { type: 'owner'|'identity'|'group'|'no-one', value: string }
  governanceFlags: {
    allowAuthorizedToMakeChangeToBeNone: boolean,
    allowAdminActionTakersToBeNone: boolean,
    allowAdminActionTakersToChangeSelf: boolean
  }

Output:
  {
    "$format_version": "0",
    "isEnabled": boolean,
    "authorizedToMakeChange": { Owner: {} } | { SpecificIdentity: "id" } | { Group: index } | { NoOne: {} },
    "adminActionTakers": { ... },
    "governanceFlags": { ... }
  }
```

#### 2. transformLocalizations(localizations)
**Line:** 8735
**Purpose:** Convert snake_case localization keys to camelCase.

```javascript
Input:
  {
    "en": {
      singular_form: "Token",
      plural_form: "Tokens",
      should_capitalize: true
    }
  }

Output:
  {
    "en": {
      "$format_version": "0",
      "shouldCapitalize": true,
      "singularForm": "Token",
      "pluralForm": "Tokens"
    }
  }
```

#### 3. transformDistributionRules()
**Line:** 8749
**Purpose:** Build complete distribution rules from wizard state.

```javascript
Reads:
  wizardState.form.distribution.enablePerpetual
  wizardState.form.distribution.cadence { type, intervalBlocks, etc. }
  wizardState.form.distribution.emission { type, amount, etc. }

Returns:
  {
    "$format_version": "0",
    "perpetualDistribution": {
      "cadence": { BlockBasedDistribution: { ... } },
      "emissionFunction": { FixedAmount: { amount: 1000 } }
    } | null,
    "preProgrammedDistribution": [ ... ],
    "newTokensDestinationIdentity": "identity-id" | null,
    "mintingAllowChoosingDestination": boolean,
    "changeDirectPurchasePricingRules": { V0 Rule }
  }
```

#### 4. buildEmissionFunction(emission)
**Line:** 8838
**Purpose:** Build emission function object from wizard state.

```javascript
Input:
  {
    type: 'FixedAmount',
    amount: '1000'
  }

Output:
  {
    "FixedAmount": {
      "amount": 1000
    }
  }

Supports:
  - FixedAmount: { amount }
  - Random: { min, max }
  - StepDecreasing: { initialAmount, halvingIntervals, finalAmount }
  - Linear: { intercept, slope, minValue, maxValue }
  - Exponential: { base, rate, minValue, maxValue }
  - Polynomial: { coefficient, power, minValue, maxValue }
  - Logarithmic: { scale, offset, minValue, maxValue }
  - InvertedLogarithmic: { scale, offset, minValue, maxValue }
  - Stepwise: { steps: [{ threshold, value }, ...] }
```

### 8.3 Complete Contract Assembly

**Final Structure Built by generatePlatformContractJSON():**

```javascript
return {
  $format_version: '1',
  id: '<generated-by-platform>',
  ownerId: wizardState.form.registration.identity.id || '<identity-id>',
  version: 1,

  config: {
    $format_version: '0',
    canBeDeletedByOwner: false,
    readonly: false,
    keepsHistory: false,
    documentsKeepHistoryContractDefault: false,
    documentsMutableContractDefault: true,
    documentsCanBeDeletedByOwnerDefault: false,
    requiresIdentityEncryptionBoundedKey: null,
    requiresIdentityDecryptionBoundedKey: null
  },

  tokens: {
    '0': {
      $format_version: '0',
      conventions: transformConventions(),
      conventionsChangeRules: createRuleV0(...),
      baseSupply: parseSupply(wizardState.form.permissions.baseSupply),
      maxSupply: parseSupply(wizardState.form.permissions.maxSupply) || null,
      keepsHistory: transformKeepsHistory(wizardState.form.permissions.keepsHistory),
      transferable: true,
      startAsPaused: wizardState.form.permissions.startAsPaused,
      allowTransferToFrozenBalance: false,
      maxSupplyChangeRules: createRuleV0(...),
      manualMintingRules: createPermissionChangeRule(wizardState.form.permissions.manualMint),
      manualBurningRules: createPermissionChangeRule(wizardState.form.permissions.manualBurn),
      freezeRules: createPermissionChangeRule(wizardState.form.permissions.freeze),
      unfreezeRules: createPermissionChangeRule(wizardState.form.permissions.unfreeze),
      destroyFrozenFundsRules: createPermissionChangeRule(wizardState.form.permissions.destroyFrozen),
      emergencyActionRules: createPermissionChangeRule(wizardState.form.permissions.emergency),
      distributionRules: transformDistributionRules(),
      marketplaceRules: transformMarketplaceRules(),
      transferNotesConfig: transformTransferNotesConfig(),
      mainControlGroup: wizardState.form.permissions.mainControlGroupIndex,
      mainControlGroupCanBeModified: getActorFromAuthorization(...),
      description: wizardState.form.search.description || ''
    }
  },

  groups: transformGroups(wizardState.form.permissions.groups),

  documentSchemas: {},

  keywords: wizardState.form.search.keywords.split(',').map(k => k.trim()).filter(k => k),

  description: wizardState.form.search.description || ''
};
```

---

## 9. Technical Implementation

### 9.1 Key Implementation Patterns

#### Pattern 1: State-Driven UI
```javascript
// All UI updates derive from wizardState
function updateTokenNameUI() {
  const name = wizardState.form.tokenName;
  tokenNameInput.value = name;

  // UI follows state
  if (wizardState.steps.naming.validity === 'valid') {
    tokenNameInput.classList.add('valid');
    nextButton.disabled = false;
  } else {
    tokenNameInput.classList.remove('valid');
    nextButton.disabled = true;
  }
}
```

#### Pattern 2: Validation Before Navigation
```javascript
function goToNextScreen(fromId) {
  const parentStep = getParentStep(fromId);
  const step = wizardState.steps[parentStep];

  // Gate: must be valid to proceed
  if (!step || step.validity !== 'valid') {
    return; // Blocked
  }

  const nextId = getNextSubstep(fromId);
  showScreen(nextId);
}
```

#### Pattern 3: Silent vs. Touched Evaluation
```javascript
// Initial load: don't show errors for untouched fields
evaluateStep('naming', { silent: true, touched: false });

// After user interaction: show validation feedback
tokenNameInput.addEventListener('input', () => {
  evaluateStep('naming', { silent: false, touched: true });
});
```

#### Pattern 4: Deferred Server Validation
```javascript
let validationTimeout = null;

function scheduleServerValidation(stepId, payloadBuilder) {
  clearTimeout(validationTimeout);

  // Wait 300ms for user to stop typing
  validationTimeout = setTimeout(async () => {
    const payload = payloadBuilder();
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    // Update validation state based on server response
  }, 300);
}
```

### 9.2 Event Handling Architecture

**Global Event Delegation:**
```javascript
// Navigation buttons
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-step-next]')) {
    const fromId = e.target.dataset.stepNext;
    goToNextScreen(fromId);
  }

  if (e.target.matches('[data-step-back]')) {
    const fromId = e.target.dataset.stepBack;
    goToPreviousScreen(fromId);
  }
});

// Inline panel toggles
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-toggle-panel]')) {
    const panelId = e.target.dataset.togglePanel;
    const panel = document.getElementById(panelId);
    panel.hidden = !e.target.checked;
  }
});
```

**Input Validation:**
```javascript
// Token name input
tokenNameInput.addEventListener('input', () => {
  wizardState.form.tokenName = tokenNameInput.value;
  evaluateNaming({ touched: true });
  persistState();
});

// Decimals input
decimalsInput.addEventListener('change', () => {
  wizardState.form.permissions.decimals = parseInt(decimalsInput.value, 10);
  evaluatePermissions({ touched: true });
  persistState();
});
```

### 9.3 LocalStorage Persistence

**Save Strategy:**
```javascript
function persistState() {
  const stateToSave = {
    active: wizardState.active,
    furthestValidIndex: wizardState.furthestValidIndex,
    steps: wizardState.steps,
    form: {
      ...wizardState.form,
      registration: {
        ...wizardState.form.registration,
        wallet: {
          // Security: Never persist actual secrets
          mnemonic: wizardState.form.registration.wallet.mnemonic ? '__present__' : '',
          privateKey: wizardState.form.registration.wallet.privateKey ? '__present__' : '',
          // But do persist non-secret metadata
          address: wizardState.form.registration.wallet.address,
          balance: wizardState.form.registration.wallet.balance,
          fingerprint: wizardState.form.registration.wallet.fingerprint
        }
      }
    }
  };

  localStorage.setItem('dashTokenWizardState', JSON.stringify(stateToSave));
}
```

**Load Strategy:**
```javascript
function loadState() {
  try {
    const saved = localStorage.getItem('dashTokenWizardState');
    if (!saved) return createDefaultWizardState();

    const parsed = JSON.parse(saved);

    // Validate structure
    if (!parsed.active || !parsed.steps || !parsed.form) {
      return createDefaultWizardState();
    }

    // Validate active step
    if (!isValidSubstep(parsed.active)) {
      parsed.active = 'naming';
    }

    // Restore but keep runtime fields empty
    return {
      ...parsed,
      runtime: createDefaultWizardState().runtime
    };
  } catch (error) {
    console.error('State load failed:', error);
    return createDefaultWizardState();
  }
}
```

### 9.4 UI Synchronization Functions

**Progress Indicator:**
```javascript
function updateProgressIndicator(activeScreenId) {
  const activeParent = getParentStep(activeScreenId);

  STEP_SEQUENCE.forEach((stepId, index) => {
    const stepElement = document.querySelector(`[data-step-id="${stepId}"]`);
    const step = wizardState.steps[stepId];

    // Visual states
    stepElement.classList.remove('active', 'completed', 'locked');

    if (stepId === activeParent) {
      stepElement.classList.add('active');
    } else if (step?.validity === 'valid') {
      stepElement.classList.add('completed');
    } else if (index > wizardState.furthestValidIndex + 1) {
      stepElement.classList.add('locked');
    }

    // Update checkmark / icon
    const icon = stepElement.querySelector('.step-icon');
    if (step?.validity === 'valid') {
      icon.textContent = '✓';
    } else {
      icon.textContent = index + 1;
    }
  });
}
```

**Step Status Update:**
```javascript
function updateStepStatusUI(stepId) {
  const step = wizardState.steps[stepId];
  const nextButton = document.querySelector(`[data-step-next="${stepId}"]`);

  if (step.validity === 'valid') {
    nextButton.disabled = false;
    nextButton.classList.add('enabled');
  } else {
    nextButton.disabled = true;
    nextButton.classList.remove('enabled');
  }
}
```

### 9.5 Responsive Design Strategy

**Breakpoints:**
```css
/* Mobile first approach */
:root {
  --bp-xs: 480px;
  --bp-sm: 600px;
  --bp-md: 900px;
  --bp-lg: 1200px;
}

/* Hide page guide on small screens */
@media (max-width: 1200px) {
  .page-guide {
    display: none;
  }
}

/* Stack wizard outline on mobile */
@media (max-width: 900px) {
  .wizard-outline {
    position: static;
    width: 100%;
  }

  .wizard-screen__inner {
    max-width: 100%;
  }
}

/* Compact form cards on mobile */
@media (max-width: 600px) {
  .form-card {
    padding: var(--space-4);
  }

  .wizard-button {
    min-height: 48px; /* Better touch targets */
  }
}
```

### 9.6 Accessibility Features

**ARIA Labels:**
```html
<!-- Progress indicator -->
<nav aria-label="Wizard progress">
  <ol class="wizard-outline">
    <li class="wizard-step" data-step-id="naming" aria-current="step">
      <span class="wizard-step__label">Token Naming</span>
    </li>
  </ol>
</nav>

<!-- Form validation -->
<input
  id="token-name"
  aria-describedby="token-name-hint token-name-error"
  aria-invalid="false"
>
<span id="token-name-hint">Enter your token name (3-25 characters)</span>
<span id="token-name-error" role="alert" aria-live="polite"></span>
```

**Keyboard Navigation:**
```javascript
// Tab order management
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.wizard-button--primary')) {
    goToNextScreen(wizardState.active);
  }

  if (e.key === 'Escape' && e.target.matches('.wizard-info-panel')) {
    closeInfoPanel(e.target.id);
  }
});
```

**Screen Reader Announcements:**
```javascript
function announce(message) {
  const announcer = document.getElementById('sr-announcer');
  announcer.textContent = message;
  // ARIA live region will announce to screen readers
}

// Usage:
announce('Step validation complete. You may proceed to the next step.');
```

---

## 10. Conclusion

The Dash Token Wizard is a comprehensive single-page application that guides users through creating complex token contracts for Dash Platform. Its architecture combines:

- **State machine design** for predictable flow
- **Validation-gated progression** for data integrity
- **Multiple deployment options** for flexibility
- **Local persistence** for resilience
- **Responsive design** for accessibility

The wizard transforms user-friendly form inputs into production-ready Dash Platform contracts through a series of transformation functions that map wizard state to Platform-compliant JSON schemas.

---

## Appendix A: Key Function Reference

| Function | Line | Purpose |
|----------|------|---------|
| `createDefaultWizardState()` | 435 | Initialize wizard state |
| `loadState()` | 5238 | Load from localStorage |
| `persistState()` | 5512 | Save to localStorage |
| `initialiseUI()` | 1871 | Hydrate UI on page load |
| `showScreen(targetId)` | 4651 | Display specific screen |
| `goToNextScreen(fromId)` | 8310 | Navigate forward |
| `goToPreviousScreen(fromId)` | 8364 | Navigate backward |
| `evaluateStep(stepId)` | 3048 | Validate step |
| `evaluateNaming()` | 2404 | Validate naming step |
| `evaluatePermissions()` | 2499 | Validate permissions |
| `evaluateDistribution()` | 2664 | Validate distribution |
| `evaluateRegistration()` | 2846 | Validate registration |
| `updateStepStatusFromValidation()` | 5186 | Update step state |
| `updateFurthestValidIndex()` | 8457 | Update progress |
| `generatePlatformContractJSON()` | 8623 | Build contract JSON |
| `initializeWalletClient()` | 2227 | Initialize Dash SDK |
| `registerIdentity()` | 2329 | Register Platform identity |

---

## Appendix B: Wizard State Example

```javascript
{
  active: 'permissions',
  furthestValidIndex: 1,
  steps: {
    naming: { id: 'naming', validity: 'valid', touched: true },
    permissions: { id: 'permissions', validity: 'unknown', touched: true },
    distribution: { id: 'distribution', validity: 'unknown', touched: false },
    advanced: { id: 'advanced', validity: 'unknown', touched: false },
    search: { id: 'search', validity: 'unknown', touched: false },
    registration: { id: 'registration', validity: 'unknown', touched: false }
  },
  runtime: {
    walletClient: null,
    walletClientFingerprint: null,
    walletInitializationError: '',
    walletInfoLoading: false
  },
  form: {
    tokenName: 'MyToken',
    naming: {
      singular: 'MyToken',
      plural: 'MyTokens',
      capitalize: true,
      conventions: {
        localizations: {
          'en': {
            should_capitalize: true,
            singular_form: 'MyToken',
            plural_form: 'MyTokens'
          }
        }
      },
      rows: [
        { id: 'row-0', code: 'en', singular: 'MyToken', plural: 'MyTokens', capitalize: true }
      ]
    },
    permissions: {
      decimals: 8,
      baseSupply: '1000000',
      useMaxSupply: true,
      maxSupply: '10000000',
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: false,
        freezes: false
      },
      startAsPaused: false,
      groups: [],
      mainControlGroupIndex: -1
    },
    distribution: {
      enablePreProgrammed: false,
      enablePerpetual: true,
      cadence: {
        type: 'BlockBasedDistribution',
        intervalBlocks: '100',
        startBlock: '0'
      },
      emission: {
        type: 'FixedAmount',
        amount: '1000'
      },
      recipient: {
        type: 'contract-owner',
        identityId: ''
      }
    },
    advanced: {
      tradeMode: 'permissionless',
      changeControl: {
        freeze: true,
        unfreeze: true,
        destroyFrozen: false,
        emergency: false,
        directPurchase: false,
        admin: true
      }
    },
    search: {
      keywords: 'token, currency',
      description: 'My custom token for rewards'
    },
    registration: {
      method: null,
      wallet: {
        mnemonic: '',
        privateKey: '',
        address: '',
        balance: null,
        fingerprint: ''
      },
      identity: {
        id: ''
      },
      preflight: {
        mobile: { qrGenerated: false },
        det: { jsonDisplayed: false },
        self: { warningAcknowledged: false }
      }
    }
  }
}
```

---

**End of Documentation**
