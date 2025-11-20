# Dash Token Wizard

A guided web application for creating custom tokens on the Dash Platform. This wizard walks users through a multi-step process to configure and deploy tokens with complex rule sets, without requiring any coding knowledge.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Dash-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## Overview

The Dash Token Wizard is a **zero-dependency, static web application** that provides an intuitive interface for creating sophisticated token configurations on the Dash Platform. Whether you're creating a simple fixed-supply token or a complex token with dynamic emissions, freeze controls, and committee governance, this wizard guides you through every step.

## Features

### ✅ Supported Token Configurations

- **✓ Token Naming & Localization**
  - Multi-language support with automatic capitalization rules
  - Token name, symbol, and decimal configuration
  - Localized singular/plural forms for international use

- **✓ Supply Management**
  - Fixed supply or max supply limits
  - Base supply initialization
  - Configurable decimal precision (0-18 decimals)

- **✓ Permissions & Controls**
  - **Group-based permissions** - Create control groups with specific roles
  - **Standardized authorization system** - Consistent dropdowns across all permission types
  - **Four authorization options**: No One, Contract Owner, Specific Identity, Specific Group
  - **Governance safeguards** - Separate "who can perform action" vs "who can change rules"
  - Freeze/unfreeze token balances
  - Pause/unpause token operations
  - Transfer controls including frozen balance transfers
  - Mint, burn, and history tracking toggles
  - Emergency actions and destroy frozen tokens controls

- **✓ Distribution Schedules**
  - **Block-based distribution** - Release tokens every N blocks
  - **Time-based distribution** - Release tokens every N hours
  - **Epoch-based distribution** - Release tokens based on named epochs

- **✓ Emission Functions**
  - **Fixed Amount** - Constant emission per interval
  - **Exponential** - Exponential growth/decay curves
  - **Linear** - Linear increase/decrease over time
  - **Random** - Random amounts within min/max bounds
  - **Step Decreasing** - Halving-style emission reduction
  - **Stepwise** - Custom step-based emission schedules
  - **Polynomial** - Complex polynomial curves
  - **Logarithmic** - Logarithmic growth curves
  - **Inverted Logarithmic** - Inverted log curves

- **✓ Marketplace Controls**
  - Tokens currently deploy as **Not Tradeable** (marketplace trading is coming soon)
  - Pre-configure who can enable future trade modes once Dash Platform unlocks them

- **✓ Change Control**
  - Owner-only controls
  - Committee-approved changes
  - Fine-grained permission toggles

### 🚧 Current Limitations

- **Groups**: Group-based permissions are fully supported in configuration, but **documents can currently only be posted in JSON format** (UI-based document posting coming soon)
- **Advanced Distributions**: Pre-programmed distribution schedules and recipient configuration are not yet available in the UI (coming in future release)

### 📱 Registration Methods

The wizard supports three ways to register your token on Dash Platform:

1. **Mobile QR Code** - Generate animated QR codes to scan with mobile wallet apps
2. **DET (Dash Evo Tool)** - Export raw JSON for use with external tooling
3. **Self-Service** - Import your wallet mnemonic and register directly from the browser

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- For self-service registration: A Dash testnet wallet with funded identity

### Installation

**Option 1: Use Directly (No Installation)**

Simply open `index.html` in your web browser. No server required!

```bash
# Clone the repository
git clone https://github.com/Scolvr/Dash-Data-Contract-Web-Wizard.git
cd Dash-Data-Contract-Web-Wizard

# Open in browser
open index.html
```

**Option 2: Run with Local Development Server**

For development or testing with the mock validation endpoint:

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev

# In another terminal, open the app in your browser
open http://localhost:5173
```

## Usage

### Step-by-Step Guide

1. **Naming**
   - Enter your token name and symbol
   - Add localized names for different languages
   - Configure decimal places

2. **Permissions**
   - Set base supply and max supply
   - Configure history tracking options
   - Set up freeze controls and pause settings
   - Define permission groups (optional)

3. **Distribution** (Optional)
   - Choose a release schedule (block/time/epoch-based)
   - Select an emission function (or skip for no automatic distribution)

4. **Advanced**
   - Marketplace trading is fixed to Not Tradeable (feature coming soon)
   - Set change control permissions

5. **Registration**
   - Choose your registration method
   - Follow on-screen instructions to deploy your token

### Example: Creating a Simple Fixed-Supply Token

1. **Naming**: Name: "MyToken", Symbol: "MTK", Decimals: 2
2. **Permissions**: Base Supply: 1,000,000, No max supply
3. **Distribution**: Skip (no automatic distribution)
4. **Advanced**: Not Tradeable (current default), owner-only controls
5. **Registration**: Use DET method to export JSON

### Example: Creating a Bitcoin-Style Halving Token

1. **Naming**: Name: "HalvingCoin", Symbol: "HALV", Decimals: 8
2. **Permissions**: Base Supply: 0, Max Supply: 21,000,000
3. **Distribution**:
   - Schedule: Block-based, every 100 blocks
   - Emission: Step Decreasing, starting at 50 tokens, halving every 210,000 intervals
4. **Advanced**: Not Tradeable (current default)
5. **Registration**: Self-service or QR code

## Architecture

### Technology Stack

- **Frontend**: Pure HTML5, CSS3, vanilla JavaScript (ES6+)
- **Architecture**: Modular ES6 with enhancement system
- **Styling**: Custom CSS with CSS variables, glassmorphism, and dark mode support
- **State Management**: Hybrid client-side state machine with localStorage persistence and security-conscious mnemonic handling
- **SDK**: Dash JavaScript SDK v5 (loaded from CDN)
- **Testing**: Playwright for E2E, Vitest for unit tests
- **Server** (optional): Minimal Node.js HTTP server for development

### File Structure

```
/
├── index.html              # Main application entry point
├── app.js                  # Complete wizard logic (~15,000+ lines)
├── styles.css              # Complete styling with theme support
├── server.js               # Development server (optional)
├── js/                     # ES6 module system
│   ├── wizard-enhancements.js  # Main enhancement loader
│   ├── state/              # State management modules
│   ├── ui/                 # UI component modules
│   ├── utils/              # Utility functions
│   ├── validation/         # Validation logic
│   └── integration/        # Third-party integrations
├── docs/                   # Project documentation
│   ├── FEATURE_LIST.md     # Comprehensive feature inventory
│   ├── COMMON_ERRORS.md    # Troubleshooting guide
│   ├── TOOLTIP_CONTENT.md  # Help text and tooltips
│   └── TOOLTIP_FIELDS.md   # Field-specific help
├── contracts/              # Reference Rust data structures
│   ├── token_configuration_v0.rs
│   └── token_distribution_rules_v0.rs
├── .claude/                # Claude Code configuration
├── CLAUDE.md               # Project instructions for Claude Code
├── LICENSE                 # MIT License
└── README.md               # This file
```

### Key Design Principles

- **Zero Build Step**: Works directly in the browser
- **Progressive Enhancement**: Works offline after first load
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive**: Mobile-first design with breakpoints for all screen sizes
- **Theme Support**: Auto/light/dark modes with system preference detection

## JSON Output Format

The wizard generates JSON conforming to Dash Platform's token contract schemas. Example output:

```json
{
  "conventions": {
    "name": "MyToken",
    "symbol": "MTK",
    "decimals": 2,
    "localizations": {
      "en": {
        "singular_form": "Token",
        "plural_form": "Tokens",
        "should_capitalize": true
      }
    }
  },
  "supply_rules": {
    "base_supply": "100000000",
    "max_supply": "1000000000"
  },
  "distribution_rules": {
    "cadence": {
      "type": "BlockBasedDistribution",
      "interval_blocks": 100
    },
    "emission": {
      "type": "FixedAmount",
      "amount": "1000"
    }
  }
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Development

### Running Locally

```bash
# Start development server
node server.js

# Server runs on http://localhost:5173
```

The development server provides:

- Static file serving
- Mock `/api/validate` endpoint for testing
- CORS headers for local development

### Testing

#### Automated Test Suites

**E2E Tests (Playwright)**

The e2e suite fuzzes several token configurations and ensures the registration step never shows "Contract validation failed".

```bash
npm run test:e2e
```

If you install a fresh version of Playwright, download the browser binaries once:

```bash
npx playwright install
```

**Unit Tests (Vitest)**

Unit tests for validation logic, state management, and utility functions.

```bash
npm run test        # Run all unit tests
npm run test:watch  # Run in watch mode
```

#### Manual Smoke Test

- Open the wizard in your browser
- Walk through the multi-step flow
- Try different registration methods
- Test authorization dropdowns (No One, Contract Owner, Specific Identity, Specific Group)
- Verify identity panel shows when selecting "Specific Identity"
- Verify group panel shows when selecting "Specific Group"
- The mock `/api/validate` endpoint returns valid responses during local development

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes with descriptive messages
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use semantic HTML5 elements
- Follow BEM methodology for CSS class names
- Use ES6+ features (const/let, arrow functions, template literals)
- Document complex logic with comments
- Maintain accessibility standards (ARIA, keyboard navigation)

## Roadmap

### Upcoming Features

- [ ] **Advanced Distribution UI** - Pre-programmed schedules and recipient configuration
- [ ] **Document Posting UI** - GUI for posting group documents (currently JSON-only)
- [ ] **Multi-Token Management** - Manage multiple token configurations
- [ ] **Template Library** - Pre-configured templates for common token types
- [ ] **Advanced Validation** - Real-time validation against Dash Platform rules
- [ ] **Export/Import** - Save and load token configurations
- [ ] **Mainnet Support** - Production deployment on Dash mainnet

### Completed

- [x] Core wizard functionality
- [x] All common token configurations
- [x] Group-based permissions with UI
- [x] Distribution schedules and emission functions
- [x] Three registration methods (QR, DET, Self-service)
- [x] Theme support (auto/light/dark) and responsive design
- [x] Standardized authorization dropdown system
- [x] Governance safeguards (action vs rule change permissions)
- [x] Modular ES6 architecture with enhancement system
- [x] Hybrid storage with security-conscious mnemonic handling
- [x] Comprehensive help system with tooltips and guides
- [x] Automated testing (Playwright E2E, Vitest unit tests)

## Common Issues

### Validation Errors

**"Base supply cannot exceed max supply"**
- Ensure your initial supply is less than or equal to the max supply cap
- Either increase max supply or decrease base supply

**"Invalid identity ID format"**
- Identity IDs must be Base58 format, 43-44 characters
- Example: `GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec`
- Get your identity ID from a Dash Platform wallet or dash-evo-tool

**"Decimals must be between 0 and 18"**
- Choose 0-18 decimal places (8 is common for currency-like tokens)

**"Evonodes recipient only available for Epoch-based distribution"**
- Change cadence to Epoch-based, or choose a different recipient type

### Browser Compatibility

**Recommended browsers:**
- Chrome 120+ (Recommended)
- Firefox 120+
- Safari 17+
- Edge 120+

**Known issues:**
- IE 11 not supported (use a modern browser)
- Safari < 16 may have glassmorphism rendering issues

### Performance

**Wizard loads slowly**
- Clear browser cache and localStorage
- Disable unnecessary browser extensions
- Check network connection (Dash SDK loads from CDN)

**QR code not appearing**
- Complete all required fields and fix validation errors first
- For very large configurations, use DET or Self-service registration instead

For more detailed troubleshooting, see the [docs/COMMON_ERRORS.md](docs/COMMON_ERRORS.md) file.

## Security Considerations

- **Never share your wallet mnemonic**: The self-service registration stores your mnemonic in browser memory only during the session
- **Use testnet first**: Always test your token configuration on testnet before deploying to mainnet
- **Review JSON output**: Double-check the generated JSON before submission
- **Secure your device**: This application runs client-side - ensure your device is secure
- **Identity IDs are public**: They are visible on the blockchain - do not use personally identifiable information
- **Testnet tokens have no value**: This wizard connects to Dash Platform Testnet

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Dash Platform ecosystem
- Inspired by the need for accessible token creation tools
- Developed with guidance from Dash Platform documentation
- UI/UX influenced by modern web design best practices

## Support

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/Scolvr/Dash-Data-Contract-Web-Wizard/issues)
- **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/Scolvr/Dash-Data-Contract-Web-Wizard/discussions)
- **Dash Platform Docs**: <https://docs.dash.org/projects/platform/>

## Links

- **Repository**: <https://github.com/Scolvr/Dash-Data-Contract-Web-Wizard>
- **Dash Platform**: <https://dashplatform.readme.io/>
- **Dash Evo Tool**: <https://github.com/dashpay/dash-evo-tool>

---

**Made with ❤️ for the Dash community by Scolvr**
