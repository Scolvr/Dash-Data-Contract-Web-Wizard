# Tooltip Content for Dash Token Wizard

**Created by:** Documentation Agent
**Date:** 2025-11-14
**Purpose:** Tooltip help text for 36 identified fields
**Format:** Field ID → Tooltip text (max 2-3 sentences)

---

## Priority 1: Critical Concepts (Must Have)

### 1. Decimals (`decimals`)
**Location:** Permissions → Token Supply

**Tooltip:**
"Number of decimal places for token divisibility. For example, 8 decimals means tokens can be divided into 0.00000001 units (like Bitcoin). Higher decimals = more divisibility but larger numbers to handle."

**Example:** 8 decimals, 2 decimals (like cents), 0 decimals (whole units only)

---

### 2. Base Supply (`base-supply`)
**Location:** Permissions → Token Supply

**Tooltip:**
"Initial number of tokens created when your token launches. This is different from max supply - base supply is how many tokens exist at the start, while max supply is the eventual limit."

**Example:** Base supply: 1,000,000 tokens created at launch

---

### 3. Max Supply (`max-supply`)
**Location:** Permissions → Token Supply

**Tooltip:**
"Maximum number of tokens that can ever exist. Leave unchecked for unlimited supply (tokens can be minted forever). Check to set a hard cap (like Bitcoin's 21 million limit)."

**Warning:** Once set and deployed without change control, this limit is permanent.

---

### 4. Max Supply Change Rules (`change-max-supply-enabled`)
**Location:** Permissions → Max Supply section

**Tooltip:**
"Control who can modify the max supply cap after deployment. If set to 'No One', the max supply becomes permanently fixed. This is a critical security and economic decision."

**Options:** Owner / Identity / Group / Main Group / No One

**Warning:** Setting to "No One" makes max supply immutable forever.

---

### 5. Manual Minting (`manual-mint-enabled`)
**Location:** Permissions → Manual Minting

**Tooltip:**
"Allow creating new tokens on demand, increasing the total supply. This is an inflationary mechanism - new tokens can be minted at any time by the authorized actor. Useful for rewards programs or gradual token releases."

**Use case:** Minting tokens for ecosystem rewards, staking incentives, or team allocation

**Warning:** Minting increases supply and can dilute existing holders.

---

### 6. Manual Burning (`manual-burn-enabled`)
**Location:** Permissions → Manual Burning

**Tooltip:**
"Allow permanently destroying tokens to reduce total supply. This is a deflationary mechanism - burned tokens are removed from circulation forever. Useful for creating scarcity or implementing buy-and-burn programs."

**Use case:** Fee burning, supply reduction, deflationary tokenomics

**Warning:** Burning is irreversible - burned tokens cannot be recovered.

---

### 7. Manual Freezing (`manual-freeze-enabled`)
**Location:** Permissions → Manual Freezing

**Tooltip:**
"Allow locking specific token balances to prevent transfers. Frozen tokens cannot be moved until unfrozen. Commonly used for regulatory compliance, security holds, or vesting periods."

**Use case:** Regulatory compliance, security investigations, vesting lockups

**Warning:** Freezing can restrict user access to their tokens - use responsibly.

---

### 8. Actor Types
**Location:** Multiple (all permission screens)

**Tooltip:**
"Who can perform actions or change rules:
- **Owner**: The contract owner's identity (single person)
- **Identity**: A specific Dash Platform identity ID
- **Group**: A defined control group (requires group configuration)
- **Main Group**: The primary control group for governance
- **No One**: Action is permanently disabled - cannot be changed"

**Warning:** "No One" is irreversible - the action becomes permanently locked.

---

### 9. Governance Safeguards (3 checkboxes)
**Location:** Multiple permission panels

**Tooltip:**
"Advanced governance controls that determine if permissions can be permanently locked:
- **Allow changing authorized to 'No One'**: Permits disabling the action forever
- **Allow changing admin to 'No One'**: Permits permanently locking rule changes
- **Allow self-changing admin**: Admin can change their own permissions

Uncheck these to prevent accidental permanent lockouts. For experts only."

**Warning:** These settings are complex - default is safe (unchecked). Only enable if you understand the implications.

---

### 10. Owner Identity ID (`owner-identity-id`)
**Location:** Registration step

**Tooltip:**
"Your Dash Platform identity ID that will own this token contract. Must be Base58 format, 43-44 characters. Get your identity ID from:
1. Dash Platform wallet (mobile/desktop)
2. dash-evo-tool command line tool
3. Leave empty to create a new identity during self-service registration"

**Example:** `GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec`

**Warning:** This identity will have permanent ownership - double-check before submitting.

---

## Priority 2: Distribution & Economics (Important)

### 11. Cadence Type (Block/Time/Epoch)
**Location:** Distribution → Perpetual

**Tooltip:**
"How to schedule token distributions:
- **Block-based**: Release tokens every N blocks (e.g., every 100 blocks)
- **Time-based**: Release tokens every N seconds (e.g., every hour)
- **Epoch-based**: Release tokens based on Dash Platform epochs (advanced - requires understanding of epoch system)"

**Example:** Block-based every 100 blocks = ~4 hours on Dash

---

### 12. Block-based Distribution (`cadence-type-block`)
**Location:** Distribution → Perpetual

**Tooltip:**
"Distribute tokens based on blockchain block height. Specify interval in blocks (e.g., 100 blocks) and starting block number. Dash Platform produces ~1 block per 2.5 minutes on average."

**Example:** Every 100 blocks = approximately 4 hours between distributions

---

### 13. Time-based Distribution (`cadence-type-time`)
**Location:** Distribution → Perpetual

**Tooltip:**
"Distribute tokens based on real-world time. Specify interval in seconds (3600 = 1 hour) and starting timestamp. More predictable than block-based for users familiar with calendar time."

**Example:** Every 86400 seconds = daily distributions

---

### 14. Epoch-based Distribution (`cadence-type-epoch`)
**Location:** Distribution → Perpetual

**Tooltip:**
"Distribute tokens based on Dash Platform epochs. Epochs are periods defined by the Dash network for validator rotation and governance. This is an advanced feature - only use if you understand Dash Platform's epoch system."

**Warning:** Requires deep understanding of Dash Platform architecture.

---

### 15. Evonodes by Participation (`recipient-evonodes`)
**Location:** Distribution → Perpetual (Epoch only)

**Tooltip:**
"Distribute tokens to Dash evonodes (validator nodes) based on their participation in the network. Only available for epoch-based distribution. This rewards network validators proportionally to their contribution."

**Requirement:** Must use Epoch-based cadence

**Use case:** Incentivizing network validators, decentralized distribution

---

### 16. Emission Functions (Fixed/Random/Step Decreasing)
**Location:** Distribution → Perpetual

**Tooltip:**
"How many tokens are released per distribution:
- **Fixed Amount**: Same amount every time (e.g., 100 tokens)
- **Random Amount**: Random amount between min/max each time
- **Step Decreasing**: Amount reduces over time (like Bitcoin halving)

Choose based on your economic model."

---

### 17. Step Decreasing Amount (all fields)
**Location:** Distribution → Perpetual → Step Decreasing

**Tooltip:**
"Create a halving-style emission schedule where the distributed amount decreases over time. Configure:
- **Step count**: How many distributions before amount decreases
- **Numerator/Denominator**: Reduction fraction (e.g., 1/2 = halve the amount)
- **Start amount**: Initial distribution amount
- **Trailing amount**: Minimum amount after all reductions

This creates predictable, deflationary emissions like Bitcoin."

**Example:** Start at 50 tokens, halve every 210,000 distributions → 50, 25, 12.5, 6.25...

---

### 18. Perpetual Distribution Rules (`perpetual-perform-action`)
**Location:** Distribution → Perpetual

**Tooltip:**
"Control who can perform distributions and who can change distribution rules after deployment. This governance layer determines if your distribution schedule is fixed or can be modified later."

**Options:** Owner / Identity / Group / Main Group / No One

**Warning:** Setting to "No One" makes distribution schedule immutable.

---

## Priority 3: History & Advanced (Nice to Have)

### 19. Keeps Transfer History (`keeps-history-transfers`)
**Location:** Advanced → History Tracking

**Tooltip:**
"Record all token transfers on-chain for complete transaction history. Enables tracking but increases storage costs. Turn off to reduce blockchain storage fees if you don't need transfer records."

**Tradeoff:** Historical data vs. storage cost

---

### 20. Keeps Direct Pricing History (`keeps-history-direct-pricing`)
**Location:** Advanced → History Tracking

**Tooltip:**
"Record pricing changes for your token on-chain. Useful if you plan to implement direct pricing mechanisms or want to track price history. Increases storage requirements."

**Use case:** Price discovery, historical analytics

---

### 21. Encryption Bounded Key (`encryption-bounded-key`)
**Location:** Advanced → Advanced Contract Settings

**Tooltip:**
"Advanced cryptography: Specify a storage key requirement (0-255) for identity-based encryption. Only use if you understand Dash Platform's encryption-bounded storage system. Leave empty for standard configurations."

**Warning:** Expert feature - incorrect values can break functionality.

---

### 22. Decryption Bounded Key (`decryption-bounded-key`)
**Location:** Advanced → Advanced Contract Settings

**Tooltip:**
"Advanced cryptography: Specify a storage key requirement (0-255) for identity-based decryption. Only use if you understand Dash Platform's encryption-bounded storage system. Leave empty for standard configurations."

**Warning:** Expert feature - incorrect values can break functionality.

---

### 23. Sized Integer Types (`sized-integer-types`)
**Location:** Advanced → Advanced Contract Settings

**Tooltip:**
"Use explicit integer size declarations (uint32, uint64) instead of variable-length integers. Improves performance and reduces storage costs, but may affect compatibility with future Dash Platform versions. Default: checked (recommended)."

**Tradeoff:** Performance vs. forward compatibility

---

## Priority 4: Naming & Localization

### 24. Localization (`naming-localization`)
**Location:** Naming → Localization

**Tooltip:**
"Add multi-language support for your token name. Use 2-letter ISO language codes (en, es, fr, de, ja, zh) and provide singular/plural forms for each language. Improves international accessibility."

**Example:** en: Token/Tokens, es: Ficha/Fichas, fr: Jeton/Jetons

**Format:** Language code must be 2 lowercase letters (ISO 639-1)

---

### 25. Update Naming Rules (`naming-update-enabled`)
**Location:** Naming → Update

**Tooltip:**
"Allow token names to be updated after deployment. Enable this if you want flexibility to rebrand or correct names later. Disable to make names immutable and permanent."

**Security:** Immutable names prevent confusion but remove flexibility.

**Tradeoff:** Flexibility vs. permanence

---

## Priority 5: Permissions Details

### 26. Mint Destination (`manual-mint-destination`)
**Location:** Permissions → Manual Minting

**Tooltip:**
"Where newly minted tokens are sent:
- **Contract Owner**: Tokens go to the owner's identity
- **Specific Identity**: Tokens go to a designated identity ID
- **Allow Custom Destination**: Minter can choose destination each time

Choose based on your distribution strategy."

---

### 27. Allow Custom Destination (`manual-mint-allow-custom`)
**Location:** Permissions → Manual Minting

**Tooltip:**
"Let the authorized minter choose where tokens are sent each time they mint. Enables flexible distribution but gives minter more control. Disable to always send to a fixed destination."

**Tradeoff:** Flexibility vs. control

---

### 28. Mint Destination Rules
**Location:** Permissions → Manual Minting

**Tooltip:**
"Control who can change the mint destination settings after deployment. This governance layer determines if your mint destination is fixed or can be modified later."

**Options:** Owner / Identity / Group / Main Group / No One

---

### 29. Allow Choosing Destination Rules
**Location:** Permissions → Manual Minting

**Tooltip:**
"Control who can change the 'Allow Custom Destination' setting after deployment. This determines if the flexibility to choose mint destinations can be toggled on/off later."

**Options:** Owner / Identity / Group / Main Group / No One

---

### 30. Unfreeze Rules (`unfreeze-rules`)
**Location:** Permissions → Manual Freezing

**Tooltip:**
"Control who can unfreeze frozen tokens. This is separate from freeze permissions - you might want different people to freeze vs. unfreeze. Creates checks and balances for token lockups."

**Use case:** Separation of duties, multi-sig unfreezing

---

### 31. Destroy Frozen Funds Rules (`destroy-frozen-rules`)
**Location:** Permissions → Manual Freezing

**Tooltip:**
"Control who can permanently destroy frozen tokens. This is an extreme action - frozen tokens are completely removed from circulation and cannot be recovered. Use for regulatory compliance or security incidents only."

**Warning:** This is irreversible - destroyed tokens cannot be recovered under any circumstances.

---

### 32. Emergency Action Rules (`emergency-action-rules`)
**Location:** Permissions → Emergency Actions

**Tooltip:**
"Emergency override permissions for critical situations. Allows bypassing normal governance rules in emergencies (security breaches, regulatory orders, critical bugs). Use with extreme caution."

**Warning:** Emergency actions should have strong governance - consider requiring multi-sig approval.

**Use case:** Security incidents, regulatory compliance, critical bug fixes

---

## Priority 6: Registration

### 33. Mobile Registration (QR Code)
**Location:** Registration → Method Selection

**Tooltip:**
"Generate animated QR codes containing your token configuration. Scan the QR code sequence with a Dash Platform mobile wallet to register your token. Best for mobile users and simple configurations."

**Workflow:**
1. Complete wizard configuration
2. Generate QR codes
3. Open Dash wallet on mobile device
4. Scan QR code sequence
5. Confirm registration in wallet

**Limitation:** Very large configurations may create QR codes too complex to scan.

---

### 34. DET Registration (`registration-method-det`)
**Location:** Registration → Method Selection

**Tooltip:**
"Export your token configuration as raw JSON for use with dash-evo-tool (DET), the official Dash Platform command-line tool. Best for advanced users, automated deployments, or programmatic registration."

**Requirements:**
- Install dash-evo-tool: `npm install -g dash-evo-tool`
- Have a funded Dash Platform identity

**Workflow:**
1. Download JSON file
2. Run: `dash-evo-tool contract register <json-file>`

---

### 35. Self-service Registration (`registration-method-self`)
**Location:** Registration → Method Selection

**Tooltip:**
"Import your wallet mnemonic phrase and register directly from the browser using Dash SDK. Most convenient method but requires careful mnemonic handling. Your mnemonic is NEVER sent to any server - it stays in browser memory only."

**Security warnings:**
- Only use on trusted, secure devices
- Mnemonic is stored in memory only (not saved)
- Close browser immediately after registration
- Consider using DET method for high-value tokens

**Requirements:** 12 or 24-word BIP39 mnemonic phrase

---

### 36. Mnemonic Phrase (`wallet-mnemonic`)
**Location:** Registration → Self-service

**Tooltip:**
"Your 12 or 24-word recovery phrase for your Dash wallet. This grants full access to your wallet - never share it with anyone. The wizard uses it ONLY to register your token contract and does NOT save it."

**Security:**
- ⚠️ NEVER share your mnemonic with anyone
- ⚠️ Only enter on trusted, secure devices
- ⚠️ Not sent to any server - stays in browser memory
- ⚠️ Close browser tab immediately after registration

**Format:** 12 or 24 words separated by spaces (BIP39 word list)

**Alternative:** Use DET or Mobile registration to avoid entering mnemonic in browser

---

## Implementation Notes for Frontend Agent

### Tooltip UI Pattern

Each tooltip should follow this structure:

```html
<label>
  Field Name
  <button class="help-icon" aria-label="Help for [Field Name]">
    <svg><!-- info icon --></svg>
  </button>
</label>
<div class="tooltip" role="tooltip" hidden>
  <p>[Tooltip text from above]</p>
  <a href="docs/USER_GUIDE.md#[section]" target="_blank">Learn more</a>
</div>
```

### Accessibility Requirements

- Use `aria-label` on help icons
- Use `role="tooltip"` on tooltip content
- Support keyboard navigation (Tab, Escape to close)
- Support screen readers (announce tooltip content)
- Tooltips should be dismissible with Escape key
- Tooltips should close when clicking outside

### Progressive Disclosure

For complex tooltips (Priority 1-2), provide:
1. **Basic explanation** (1-2 sentences)
2. **Example** (if applicable)
3. **"Learn more" link** to detailed documentation

### Warning Indicators

For fields with irreversible actions, include visual warning:
```html
<div class="tooltip warning">
  <span class="warning-icon">⚠️</span>
  <p>[Tooltip text with warning]</p>
</div>
```

Fields requiring warnings:
- Max Supply Change Rules (if set to "No One")
- Manual Burning (irreversible)
- Destroy Frozen Funds (extremely irreversible)
- Governance Safeguards (can cause permanent lockouts)
- Mnemonic Phrase (security critical)

---

## Summary

**Total Tooltips:** 36
**Priority 1 (Critical):** 10 tooltips - MUST implement
**Priority 2 (Important):** 8 tooltips - SHOULD implement
**Priority 3-6:** 18 tooltips - NICE TO HAVE

**Complexity:**
- Very High (12 tooltips): Require detailed explanations, examples, warnings
- High (18 tooltips): Require clear explanations with context
- Medium (6 tooltips): Require simple explanations

**Handoff to Frontend Agent:**
- All tooltip text ready for implementation
- UI pattern specified
- Accessibility requirements defined
- Progressive disclosure strategy outlined
- Warning indicators identified

**Status:** ✅ Ready for implementation

---

**Created by:** Documentation Agent
**Date:** 2025-11-14
**Handoff:** Frontend Agent can begin implementation immediately
