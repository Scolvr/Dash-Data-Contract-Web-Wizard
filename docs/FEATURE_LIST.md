# Dash Token Wizard - Complete Feature List

**Created by:** QA Agent
**Date:** 2025-11-14
**Purpose:** Comprehensive inventory of all features for documentation

---

## Wizard Steps Overview

The wizard consists of 7 main steps with multiple substeps:

1. **Welcome** - Template selection
2. **Naming** - Token identity and localization
3. **Permissions** - Supply, minting, burning, freezing rules
4. **Advanced** - History tracking, launch settings, root configuration
5. **Distribution** - Token distribution schedules and rules
6. **Search** - SEO metadata
7. **Registration** - Deploy to Dash Platform

---

## STEP 1: WELCOME

### Template Library
- **Feature:** Pre-configured token templates
- **Location:** Welcome screen
- **Description:** Choose from preset templates (Basic Token, Governance Token, etc.) or start from scratch
- **User Value:** Quick start with sensible defaults

---

## STEP 2: NAMING

### Substep: Token Name

#### Token Name (Required)
- **Field ID:** `token-name`
- **Type:** Text input
- **Description:** Primary identifier for the token
- **Validation:** Required, used to generate symbol
- **Tooltip Needed:** No (self-explanatory)

#### Token Plural Form
- **Field ID:** `token-plural`
- **Type:** Text input
- **Description:** Plural form of token name
- **Example:** "Token" → "Tokens"
- **Tooltip Needed:** No

#### Capitalize Toggle
- **Field ID:** `token-capitalize`
- **Type:** Checkbox
- **Description:** Apply title case formatting to token name
- **Tooltip Needed:** No

### Substep: Localization

#### Add Localization
- **Feature:** Multi-language support
- **Description:** Define token names in multiple languages
- **Fields per entry:**
  - Language code (2-letter ISO)
  - Singular form
  - Plural form
  - Capitalization toggle
- **User Value:** International token accessibility
- **Tooltip Needed:** **YES** - Explain language codes and purpose

### Substep: Update Rules

#### Enable Updating Names
- **Field ID:** `naming-update-enabled`
- **Type:** Radio (Yes/No)
- **Description:** Allow token names to be changed after deployment
- **Default:** No
- **Tooltip Needed:** **YES** - Security implications of allowing updates

#### Who Can Update (if enabled)
- **Field ID:** `naming-update-performer`
- **Type:** Radio group
- **Options:** Owner / Identity / Group / Main Group / No One
- **Tooltip Needed:** **YES** - Explain actor types

#### Who Can Change Rules
- **Field ID:** `naming-update-rule-changer`
- **Type:** Radio group
- **Description:** Who can modify the update permissions themselves
- **Tooltip Needed:** **YES** - Governance concept explanation

---

## STEP 3: PERMISSIONS

### Substep: Token Supply

#### Decimals
- **Field ID:** `decimals`
- **Type:** Number input (0-18)
- **Description:** Number of decimal places for token divisibility
- **Example:** 8 = divisible to 0.00000001
- **Tooltip Needed:** **YES** - Critical concept, affects all amounts

#### Base Supply (Required)
- **Field ID:** `base-supply`
- **Type:** Number input
- **Description:** Initial token supply at deployment
- **Validation:** Must be ≤ max supply (if set)
- **Tooltip Needed:** **YES** - Difference from max supply

#### Max Supply
- **Field ID:** `max-supply`
- **Type:** Number input
- **Description:** Maximum tokens that can ever exist
- **Checkbox:** Enable/disable max supply cap
- **Tooltip Needed:** **YES** - Implications of capped vs uncapped

#### Can Max Supply Be Changed?
- **Field ID:** `change-max-supply-enabled`
- **Type:** Radio (Yes/No)
- **Feature:** **RECENTLY IMPLEMENTED** (Feature 3)
- **Description:** Control who can modify max supply cap
- **Sub-fields:**
  - Authorized to perform action
  - Authorized to change rules
  - Governance safeguards (3 checkboxes)
- **Tooltip Needed:** **YES** - Security and governance implications

### Substep: Manual Minting

#### Enable Manual Minting
- **Field ID:** `manual-mint-enabled`
- **Type:** Radio (Yes/No)
- **Description:** Allow creating new tokens on demand
- **Tooltip Needed:** **YES** - Inflationary implications

#### Authorized to Perform Minting
- **Field ID:** `manual-mint-performer`
- **Type:** Radio group
- **Options:** Owner / Identity / Group / Main Group / No One
- **Tooltip Needed:** **YES** - Actor type explanation

#### Authorized to Change Minting Rules
- **Field ID:** `manual-mint-rule-changer`
- **Type:** Radio group
- **Tooltip Needed:** **YES** - Governance explanation

#### Governance Safeguards (Minting)
- **Fields:** 3 checkboxes
  - Allow changing authorized to "No One"
  - Allow changing admin to "No One"
  - Allow self-changing admin
- **Tooltip Needed:** **YES** - Advanced governance concept

#### Mint Destination
- **Feature:** Control where newly minted tokens go
- **Options:**
  - Contract owner
  - Specific identity
  - Allow custom destination (checkbox)
- **Tooltip Needed:** **YES** - Explain destination types

#### Mint Destination Rules (Feature 4c)
- **Description:** Control who can change mint destination settings
- **Tooltip Needed:** **YES**

#### Allow Choosing Destination Rules (Feature 4d)
- **Description:** Control whether minters can choose custom destinations
- **Tooltip Needed:** **YES**

### Substep: Manual Burning

#### Enable Manual Burning
- **Field ID:** `manual-burn-enabled`
- **Type:** Radio (Yes/No)
- **Description:** Allow destroying tokens to reduce supply
- **Tooltip Needed:** **YES** - Deflationary mechanism

[Similar structure to Manual Minting for performer, rule changer, governance]

### Substep: Manual Freezing

#### Enable Manual Freezing
- **Field ID:** `manual-freeze-enabled`
- **Type:** Radio (Yes/No)
- **Description:** Allow locking specific token balances
- **Tooltip Needed:** **YES** - Regulatory/security use cases

[Similar structure for freeze permissions]

#### Unfreeze Rules
- **Description:** Control who can unfreeze frozen tokens
- **Tooltip Needed:** **YES**

#### Destroy Frozen Funds Rules
- **Description:** Control who can permanently destroy frozen tokens
- **Tooltip Needed:** **YES** - Extreme action explanation

### Substep: Emergency Actions

#### Emergency Action Rules
- **Description:** Emergency override permissions
- **Tooltip Needed:** **YES** - When to use, implications

### Other Permission Fields

#### Start as Paused
- **Field ID:** `start-as-paused`
- **Type:** Checkbox
- **Description:** Launch token in paused state (no transfers)
- **Tooltip Needed:** **YES** - Launch strategy explanation

#### Allow Transfer to Frozen Balance
- **Field ID:** `allow-transfer-to-frozen`
- **Type:** Checkbox
- **Description:** Allow sending tokens to frozen addresses
- **Tooltip Needed:** **YES** - Edge case behavior

---

## STEP 4: ADVANCED (Usage)

### Substep: History Tracking

#### Keeps History: Transfers
- **Field ID:** `keeps-history-transfers`
- **Type:** Checkbox
- **Description:** Record all token transfers on-chain
- **Tooltip Needed:** **YES** - Storage cost implications

#### Keeps History: Mints
- **Field ID:** `keeps-history-mints`
- **Type:** Checkbox
- **Tooltip Needed:** **YES**

#### Keeps History: Burns
- **Field ID:** `keeps-history-burns`
- **Type:** Checkbox
- **Tooltip Needed:** **YES**

#### Keeps History: Freezes
- **Field ID:** `keeps-history-freezes`
- **Type:** Checkbox
- **Tooltip Needed:** **YES**

#### Keeps Direct Pricing History
- **Field ID:** `keeps-history-direct-pricing`
- **Type:** Checkbox
- **Feature:** **RECENTLY IMPLEMENTED** (Feature 1)
- **Description:** Record pricing changes
- **Tooltip Needed:** **YES**

#### Keeps Purchase History
- **Field ID:** `keeps-history-purchases`
- **Type:** Checkbox
- **Tooltip Needed:** **YES**

### Advanced Contract Settings (Feature 5)

#### Encryption Bounded Key Requirement
- **Field ID:** `encryption-bounded-key`
- **Type:** Number input (0-255, optional)
- **Description:** Storage key requirement for identity encryption
- **Tooltip Needed:** **YES** - Advanced cryptography concept

#### Decryption Bounded Key Requirement
- **Field ID:** `decryption-bounded-key`
- **Type:** Number input (0-255, optional)
- **Tooltip Needed:** **YES**

#### Use Sized Integer Types
- **Field ID:** `sized-integer-types`
- **Type:** Checkbox
- **Default:** Checked
- **Description:** Store integers with explicit size declarations
- **Tooltip Needed:** **YES** - Performance vs compatibility tradeoff

---

## STEP 5: DISTRIBUTION

### Substep: Perpetual Distribution

#### Cadence Type (Required)
- **Field ID:** `cadence-type-perpetual`
- **Type:** Radio group
- **Options:**
  - Block-based Distribution
  - Time-based Distribution
  - Epoch-based Distribution
- **Tooltip Needed:** **YES** - Explain each type

#### Block-based Fields
- **Interval (blocks):** How many blocks between distributions
- **Start block:** When to begin distributions
- **Tooltip Needed:** **YES**

#### Time-based Fields
- **Interval (seconds):** Time between distributions
- **Start timestamp:** When to begin
- **Tooltip Needed:** **YES**

#### Epoch-based Fields
- **Epoch number:** Which epoch to distribute
- **Tooltip Needed:** **YES** - What are epochs?

#### Emission Function (Required)
- **Field ID:** `emission-type-perpetual`
- **Type:** Radio group
- **Options:**
  - Fixed Amount
  - Random Amount
  - Step Decreasing Amount
- **Tooltip Needed:** **YES** - Explain each function type

#### Fixed Amount Field
- **Amount per distribution**
- **Tooltip Needed:** No

#### Random Amount Fields
- **Min amount**
- **Max amount**
- **Tooltip Needed:** **YES** - Use cases for randomness

#### Step Decreasing Fields
- **Step count**
- **Decrease numerator/denominator**
- **Distribution start amount**
- **Trailing amount**
- **Start decreasing offset** (optional)
- **Max interval count** (optional)
- **Min value** (optional)
- **Tooltip Needed:** **YES** - Complex mathematical formula

#### Recipient (Required)
- **Field ID:** `recipient-type-perpetual`
- **Type:** Radio group
- **Options:**
  - Contract Owner
  - Specific Identity
  - **Evonodes by Participation** (Feature 2 - Epoch only)
- **Tooltip Needed:** **YES** - Explain each recipient type

#### Perpetual Distribution Rules (Feature 4a)
- **Authorized to perform action**
- **Authorized to change rules**
- **Governance safeguards** (3 checkboxes)
- **Tooltip Needed:** **YES**

### Substep: Pre-programmed Distribution

#### Schedule Entries
- **Feature:** Create timed distribution events
- **Fields per entry:**
  - Trigger (block/time/epoch)
  - Amount
  - Recipient
- **Tooltip Needed:** **YES** - Vesting schedule use cases

---

## STEP 6: SEARCH

#### Keywords
- **Field ID:** `search-keywords`
- **Type:** Text input (comma-separated)
- **Description:** SEO keywords for token discovery
- **Tooltip Needed:** No

#### Description
- **Field ID:** `search-description`
- **Type:** Textarea
- **Description:** Full description for search engines
- **Tooltip Needed:** No

---

## STEP 7: REGISTRATION

### Registration Method Selection

#### Mobile (QR Code)
- **Description:** Generate animated QR codes with token configuration
- **Use case:** Register via mobile Dash wallet
- **Tooltip Needed:** **YES** - How to use QR codes

#### DET (Dash Evo Tool)
- **Description:** Export JSON for use with dash-evo-tool CLI
- **Use case:** Advanced users, programmatic registration
- **Tooltip Needed:** **YES** - What is dash-evo-tool?

#### Self-service (Wallet Import)
- **Description:** Import wallet mnemonic and register directly
- **Fields:**
  - Mnemonic phrase (12/24 words)
  - Identity ID (optional - create new if empty)
- **Tooltip Needed:** **YES** - Security warnings about mnemonic

### Contract Configuration Review

#### Owner Identity ID
- **Field ID:** `owner-identity-id`
- **Type:** Text input (Base58, 43-44 chars)
- **Description:** Identity that will own the token contract
- **Validation:** Base58 format
- **Tooltip Needed:** **YES** - What is an identity? How to get one?

#### Contract ID Preview
- **Feature:** Shows generated contract ID
- **Tooltip Needed:** No

#### Final JSON Output
- **Feature:** Complete contract JSON ready for submission
- **Actions:**
  - Copy to clipboard
  - Download as file
  - View in modal
- **Tooltip Needed:** No

---

## Summary Statistics

**Total Features:** 80+ distinct features/fields
**Fields Needing Tooltips:** 30+ identified
**Main Steps:** 7
**Substeps:** 15+
**Form Inputs:** 100+

---

## Features by Implementation Status

### ✅ Fully Implemented
- All 7 wizard steps
- Feature 2: EvonodesByParticipation recipient
- Feature 3: Max Supply Change Rules (fixed JSON generation)
- Feature 4a: Perpetual Distribution Rules
- Feature 4c: Mint Destination Rules
- Feature 4d: Allow Choosing Destination Rules
- Feature 5: Root Config Advanced Settings
- State persistence (localStorage)
- Theme switcher (light/dark/auto)
- Templates library
- JSON export/download
- QR code generation (Mobile)
- Dash SDK integration (Self-service)

### ⚠️ Partial / Default Behavior
- Pre-programmed distribution rules (hardcoded to "NoOne")
- Identity/Group inputs for some rule actors (dropdowns exist but no input fields for IDs)

---

**Next Steps for Documentation Agent:**
- Use this list to write USER_GUIDE.md sections
- Create tooltips for 30+ identified fields
- Write FAQ based on complex features

**Handoff ready:** ✅
