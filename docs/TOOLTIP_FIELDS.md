# Tooltip Field Candidates

**Created by:** QA Agent
**Date:** 2025-11-14
**Purpose:** List of 30+ fields needing tooltip help text

---

## Priority 1: Critical Concepts (Must Have)

### 1. Decimals (`decimals`)
**Why:** Fundamental concept affecting all token amounts
**Location:** Permissions → Token Supply
**Complexity:** High - users don't understand divisibility

### 2. Base Supply (`base-supply`)
**Why:** Confused with max supply
**Location:** Permissions → Token Supply
**Complexity:** Medium - need to explain initial vs maximum

### 3. Max Supply (`max-supply`)
**Why:** Critical economic decision
**Location:** Permissions → Token Supply
**Complexity:** Medium - capped vs uncapped implications

### 4. Max Supply Change Rules (`change-max-supply-enabled`)
**Why:** Security and governance implications
**Location:** Permissions → Max Supply section
**Complexity:** High - governance concept

### 5. Manual Minting (`manual-mint-enabled`)
**Why:** Inflationary mechanism
**Location:** Permissions → Manual Minting
**Complexity:** High - economic implications

### 6. Manual Burning (`manual-burn-enabled`)
**Why:** Deflationary mechanism
**Location:** Permissions → Manual Burning
**Complexity:** High - economic implications

### 7. Manual Freezing (`manual-freeze-enabled`)
**Why:** Regulatory/security feature
**Location:** Permissions → Manual Freezing
**Complexity:** High - legal implications

### 8. Actor Types (owner/identity/group/main-group/no-one)
**Why:** Repeated concept throughout wizard
**Location:** Multiple (all permission screens)
**Complexity:** High - governance model explanation

### 9. Governance Safeguards (3 checkboxes)
**Why:** Advanced governance concept
**Location:** Multiple permission panels
**Complexity:** Very High - experts only

### 10. Owner Identity ID (`owner-identity-id`)
**Why:** Required but users don't know how to get one
**Location:** Registration step
**Complexity:** High - external prerequisite

---

## Priority 2: Distribution & Economics (Important)

### 11. Cadence Type (Block/Time/Epoch)
**Why:** Different timing mechanisms
**Location:** Distribution → Perpetual
**Complexity:** High - blockchain concepts

### 12. Block-based Distribution (`cadence-type-block`)
**Why:** Block timing explanation
**Location:** Distribution → Perpetual
**Complexity:** Medium - blockchain 101

### 13. Time-based Distribution (`cadence-type-time`)
**Why:** Real-world timing
**Location:** Distribution → Perpetual
**Complexity:** Low - but needs example

### 14. Epoch-based Distribution (`cadence-type-epoch`)
**Why:** Advanced Dash Platform concept
**Location:** Distribution → Perpetual
**Complexity:** Very High - what are epochs?

### 15. Evonodes by Participation (`recipient-evonodes`)
**Why:** Unique to Dash Platform
**Location:** Distribution → Perpetual (Epoch only)
**Complexity:** Very High - Dash-specific concept

### 16. Emission Functions (Fixed/Random/Step Decreasing)
**Why:** Economic distribution models
**Location:** Distribution → Perpetual
**Complexity:** High - mathematical formulas

### 17. Step Decreasing Amount (all fields)
**Why:** Complex mathematical formula
**Location:** Distribution → Perpetual → Step Decreasing
**Complexity:** Very High - requires detailed explanation

### 18. Perpetual Distribution Rules (`perpetual-perform-action`)
**Why:** Governance for distributions
**Location:** Distribution → Perpetual
**Complexity:** High

---

## Priority 3: History & Advanced (Nice to Have)

### 19. Keeps Transfer History (`keeps-history-transfers`)
**Why:** Storage cost implications
**Location:** Advanced → History Tracking
**Complexity:** Medium - tradeoffs

### 20. Keeps Direct Pricing History (`keeps-history-direct-pricing`)
**Why:** New feature, not obvious
**Location:** Advanced → History Tracking
**Complexity:** Medium

### 21. Encryption Bounded Key (`encryption-bounded-key`)
**Why:** Advanced cryptography
**Location:** Advanced → Advanced Contract Settings
**Complexity:** Very High - expert feature

### 22. Decryption Bounded Key (`decryption-bounded-key`)
**Why:** Advanced cryptography
**Location:** Advanced → Advanced Contract Settings
**Complexity:** Very High - expert feature

### 23. Sized Integer Types (`sized-integer-types`)
**Why:** Performance vs compatibility tradeoff
**Location:** Advanced → Advanced Contract Settings
**Complexity:** High - technical decision

---

## Priority 4: Naming & Localization

### 24. Localization (`naming-localization`)
**Why:** ISO language codes not obvious
**Location:** Naming → Localization
**Complexity:** Medium - need examples

### 25. Update Naming Rules (`naming-update-enabled`)
**Why:** Security implications of allowing updates
**Location:** Naming → Update
**Complexity:** High - mutable vs immutable

---

## Priority 5: Permissions Details

### 26. Mint Destination (`manual-mint-destination`)
**Why:** Where tokens go when minted
**Location:** Permissions → Manual Minting
**Complexity:** Medium

### 27. Allow Custom Destination (`manual-mint-allow-custom`)
**Why:** Flexibility vs control tradeoff
**Location:** Permissions → Manual Minting
**Complexity:** Medium

### 28. Mint Destination Rules
**Why:** Governance for destination changes
**Location:** Permissions → Manual Minting
**Complexity:** High

### 29. Allow Choosing Destination Rules
**Why:** Governance for custom destination setting
**Location:** Permissions → Manual Minting
**Complexity:** High

### 30. Unfreeze Rules (`unfreeze-rules`)
**Why:** Separate from freeze permissions
**Location:** Permissions → Manual Freezing
**Complexity:** High

### 31. Destroy Frozen Funds Rules (`destroy-frozen-rules`)
**Why:** Permanent destruction, extreme action
**Location:** Permissions → Manual Freezing
**Complexity:** Very High - irreversible

### 32. Emergency Action Rules (`emergency-action-rules`)
**Why:** Override mechanism
**Location:** Permissions → Emergency Actions
**Complexity:** Very High - when to use

---

## Priority 6: Registration

### 33. Mobile Registration (QR Code)
**Why:** How to use QR codes with wallet
**Location:** Registration → Method Selection
**Complexity:** Medium - workflow explanation

### 34. DET Registration (`registration-method-det`)
**Why:** What is dash-evo-tool?
**Location:** Registration → Method Selection
**Complexity:** High - external tool

### 35. Self-service Registration (`registration-method-self`)
**Why:** Security warnings about mnemonic
**Location:** Registration → Method Selection
**Complexity:** High - security critical

### 36. Mnemonic Phrase (`wallet-mnemonic`)
**Why:** Security warnings
**Location:** Registration → Self-service
**Complexity:** Very High - must warn about security

---

## Summary

**Total Fields Identified:** 36
**Priority 1 (Critical):** 10 fields
**Priority 2 (Important):** 8 fields
**Priority 3 (Nice to Have):** 5 fields
**Priority 4-6:** 13 fields

**Complexity Breakdown:**
- Very High: 12 fields (expert concepts)
- High: 18 fields (advanced users)
- Medium: 6 fields (some explanation needed)
- Low: 0 fields (all complex enough for tooltips)

---

## Recommendations for Documentation Agent

1. **Start with Priority 1** - Critical concepts that block users
2. **Group related concepts** - Explain actor types once, reference elsewhere
3. **Use progressive disclosure** - Basic explanation + "Learn more" link
4. **Include examples** - Concrete values help understanding
5. **Warn about irreversible actions** - Especially destroy, emergency actions
6. **Link to Dash Platform docs** - For platform-specific concepts (evonodes, epochs)

---

**For Documentation Agent:**
- Create tooltip text for all 36 fields
- Use format specified in DOCUMENTATION_AGENT_WORKFLOW.md
- Reference USER_GUIDE.md sections in "Learn more" links

**Handoff ready:** ✅
