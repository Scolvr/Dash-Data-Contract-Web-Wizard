# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Dash Token Wizard** - a guided web application for creating custom tokens on the Dash Platform. The wizard walks users through a multi-step process (Naming, Permissions, Distribution, Advanced, Registration) to configure and deploy tokens with complex rule sets.

The project is a **static web application** (HTML/CSS/vanilla JavaScript) with no build step. It integrates with the Dash Platform via the Dash JavaScript SDK loaded from CDN.

## Development Commands

### Running the Application

```bash
# Start local development server
node server.js

# Server runs on http://localhost:5173 (or PORT env variable)
```

The `server.js` file is a minimal Node.js HTTP server that:
- Serves static files (HTML, CSS, JS) from the project root
- Provides a mock `/api/validate` endpoint for development/testing
- Requires no npm dependencies

### Testing

- Open the wizard in a browser and test the multi-step flow manually
- The validation endpoint at `/api/validate` always returns valid during local development
- Test with different registration methods (Mobile QR, DET, Self-service with wallet)

## Architecture

### Core Application Flow

The wizard uses a **state machine architecture** centered around `app.js`:

1. **State Management**: All wizard state is stored in a single object (`wizardState`) with:
   - `active`: current step ID
   - `furthestValidIndex`: tracks progression
   - `steps`: validation state for each step
   - `form`: all user input data organized by step
   - `runtime`: transient objects (Dash SDK client, wallet info)

2. **Step Progression**: Users navigate through 5 steps sequentially:
   - `naming`: Token name + localization (multi-language support)
   - `permissions`: Supply, decimals, history tracking, pause settings
   - `distribution`: Emission cadence and function
   - `advanced`: Trading rules, change control flags
   - `registration`: Choose method (QR/DET/Self-service) and register on Dash Platform

3. **Validation**: Each step validates input before allowing progression. Valid steps enable "Next" buttons and update the sidebar navigation.

4. **State Persistence**: UI state is saved to localStorage (but never wallet mnemonics or private keys).

### Key Files

- **index.html**: Single-page application shell with all wizard screens embedded
- **app.js**: Complete wizard logic (~4900+ lines) - state management, validation, Dash SDK integration, UI updates
- **styles.css**: Complete styling with theme support (auto/light/dark), responsive layout, design system with CSS variables
- **server.js**: Local development server with mock validation endpoint
- **contracts/*.rs**: Reference Rust data structures showing the expected JSON schema for token configuration on Dash Platform

### Dash Platform Integration

The wizard generates a JSON payload conforming to Dash Platform token contract schemas (see `contracts/` for Rust reference types). The final registration step:

1. **Mobile (QR)**: Generates animated QR codes containing the token configuration payload
2. **DET (Dash Evo Tool)**: Displays raw JSON for import into external tooling
3. **Self-service**: Uses Dash SDK directly to register identity and submit contract (requires wallet import)

#### Dash SDK Usage Pattern

```javascript
// Wallet initialization (Registration step, self-service flow)
const client = new Dash.Client({
  network: 'testnet',
  wallet: { mnemonic: userProvidedMnemonic }
});
await client.wallet.getAccount();
```

The SDK is loaded from CDN: `https://cdn.jsdelivr.net/npm/dash@5/dist/dash.min.js`

### State Structure Deep Dive

```javascript
{
  active: 'naming',              // Current step ID
  furthestValidIndex: -1,        // Highest validated step (enables step navigation)
  steps: {
    naming: { id: 'naming', validity: 'valid', touched: true },
    permissions: { ... },
    // ... other steps
  },
  form: {
    tokenName: 'MyToken',
    naming: {
      conventions: {
        localizations: {          // Map of language code -> localization data
          'en': {
            singular_form: 'Token',
            plural_form: 'Tokens',
            should_capitalize: true
          }
        }
      },
      rows: [...]                 // UI representation of localization entries
    },
    permissions: {
      decimals: 8,
      baseSupply: '1000000',
      maxSupply: '10000000',
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false },
      startAsPaused: false,
      // ...
    },
    distribution: {
      cadence: {
        type: 'BlockBasedDistribution',  // or TimeBasedDistribution / EpochBasedDistribution
        intervalBlocks: '100',
        // ...
      },
      emission: {
        type: 'FixedAmount',             // or Exponential / StepFunction / Linear
        amount: '100',
        // ...
      }
    },
    advanced: {
      tradeMode: 'permissionless',       // or 'committee-approved'
      changeControl: { freeze: true, unfreeze: true, ... }
    },
    registration: {
      method: 'mobile',                  // or 'det' / 'self'
      wallet: { mnemonic: '', address: '', balance: null, ... },
      identity: { id: '' },
      preflight: { ... }
    }
  }
}
```

### Important Implementation Notes

#### Localization System

The `naming` step includes a **dynamic localization builder**:
- Users can add/remove language entries
- Each entry has: language code (2-letter ISO), singular/plural forms, capitalization flag
- The UI dynamically creates/removes DOM elements (`localization-row`) as entries are added/removed
- Language codes must match pattern `/^[a-z]{2}$/`

#### Theme System

The application supports three themes (auto/light/dark):
- Controlled via `data-theme` attribute on `<html>`
- CSS variables in `:root` define light theme
- `html[data-theme='dark']` and `@media (prefers-color-scheme: dark)` override for dark mode
- Theme selection is in header, persisted to localStorage

#### Responsive Design

- Mobile-first approach with breakpoints at 480px, 600px, 900px, 1200px
- Wizard outline (step navigation) becomes static on mobile (<900px)
- Button layouts stack vertically on small screens (<480px)
- Safe area insets for iOS notches

## Common Patterns

### Adding a New Input Field

1. Add HTML input to the appropriate `<section class="wizard-screen">` in `index.html`
2. Add default value to `createDefaultWizardState()` in `app.js`
3. Wire up event listener in the step initialization function (e.g., `initNamingStep()`)
4. Update validation logic for the step
5. Ensure the value is included in final JSON payload generation

### Modifying Validation Logic

Validation functions are step-specific (e.g., `validateNaming()`, `validatePermissions()`). They:
- Read current form state from `wizardState.form[stepId]`
- Check required fields and business rules
- Update `wizardState.steps[stepId].validity` to 'valid', 'invalid', or 'unknown'
- Return boolean indicating validity

### Working with Dash SDK

The Dash SDK client is initialized lazily when needed (registration step, self-service flow):
- Check if `window.Dash` is available (CDN script must load first)
- Create client with testnet network and wallet configuration
- Store reference in `wizardState.runtime.walletClient`
- Always handle async operations with try/catch and user-friendly error messages

## File Organization

```
/
├── index.html              Main application entry point
├── app.js                  Complete wizard logic (state, validation, Dash integration)
├── styles.css              Complete styling with theme support
├── server.js               Development server
├── package-lock.json       Minimal (no dependencies)
├── contracts/              Reference Rust data structures for Dash Platform
│   ├── token_configuration_v0.rs
│   ├── token_distribution_rules_v0.rs
│   └── ...
├── orig/                   Original versions before edits (backup)
├── server/                 Node server dependencies (minimal)
└── .gitignore             Git ignore rules
```

## Dash Platform Token Configuration

The wizard generates JSON matching Dash Platform's Rust contract structures. Key configuration areas:

- **Conventions**: Name, symbol, decimals, localization
- **Supply Rules**: Base supply, max supply, change control rules
- **History Tracking**: Which operations to track (transfers, mints, burns, freezes)
- **Distribution**: Cadence (block/time/epoch) + emission function (fixed/exponential/step/linear)
- **Marketplace**: Trading permissions and rules
- **Change Control**: Who can modify various aspects (owner-only vs committee approval)

See `contracts/` directory for authoritative schema definitions.
- can we implement the rest the same way we used to do befor? can you do that as a professional webdesigner and senior developer in specifics of organisaiton?