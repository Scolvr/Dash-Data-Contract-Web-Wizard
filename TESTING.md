# Testing Guide - Dash Token Wizard

This document provides comprehensive testing procedures for validating the Platform-compatible JSON output.

---

## Verification Checklist (UI → rs-dpp)

- [ ] Root contract uses `$format_version: "1"`, `id`, `ownerId`, `version`
- [ ] `config` keys match rs-dpp (`canBeDeleted`, `readonly`, `keepsHistory`, `documentsKeepHistoryContractDefault`, `documentsMutableContractDefault`, `documentsCanBeDeletedContractDefault`, `requiresIdentityEncryptionBoundedKey`, `requiresIdentityDecryptionBoundedKey`)
- [ ] `tokens` map has string index `'0'` → token config `$format_version: "0"`
- [ ] Token `conventions.localizations` use camelCase fields (`shouldCapitalize`, `singularForm`, `pluralForm`) and `decimals` is a number
- [ ] `baseSupply`/`maxSupply`/`decimals` are numbers (not strings); `maxSupply` null or number
- [ ] `keepsHistory` uses camelCase flags and `$format_version: "0"`
- [ ] Change-control rules fields exist in token and distribution rules; actors encode as AuthorizedActionTakers:
  - `"NoOne"`, `"ContractOwner"`, `"MainGroup"`, `{ "Group": <index> }`, `{ "Identity": "<id>" }`
- [ ] `distributionRules` structure matches rs-dpp V0:
  - `perpetualDistribution` → `{ $format_version: "0", distributionType, distributionRecipient }`
  - Time intervals are milliseconds (not seconds)
  - `preProgrammedDistribution` timestamps are epoch millis keys; nested identity→amount map
  - `mintingAllowChoosingDestination` boolean and related rules present
- [ ] Distribution functions encode exactly as rs-dpp variants:
  - `FixedAmount`, `Random`, `StepDecreasingAmount`, `Linear`, `Exponential`, `Polynomial`, `Logarithmic`, `InvertedLogarithmic`, `Stepwise`
  - Optional bounds use `min_value`/`max_value` (snake_case)
  - `Stepwise` is a map of `{ "<period>": <amount> }` (not an array)
- [ ] Recipient encodes as `"ContractOwner"` or `{ "Identity": "<id>" }`
- [ ] Root `groups` (if present): `$format_version: "0"`, `members` is a map of identity→power, `required_power` (snake_case)
- [ ] `mainControlGroup` is a number; `mainControlGroupCanBeModified` is AuthorizedActionTakers
- [ ] Remove unsupported fields (e.g., `transferable`, `transferNotesConfig`)
- [ ] `keywords` array and short `description` string (optional)

Track these items as you iterate. All boxes must be checked before shipping.

## 🧪 Automated Testing

### Running the Test Suite

1. Open `index.html` in your browser
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Run: `testPlatformContracts()`

### Test Coverage

The automated test suite validates:

#### **Test 1: Simple Fixed-Supply Token**

- ✅ Root structure with `$format_version: "1"`
- ✅ Token wrapped in `tokens.0`
- ✅ `baseSupply` and `maxSupply` are numbers (not strings)
- ✅ Field naming uses camelCase (`shouldCapitalize`, not `should_capitalize`)
- ✅ Localizations properly formatted

#### **Test 2: Bitcoin-Style Halving Token**

- ✅ Distribution rules present
- ✅ Perpetual distribution configured
- ✅ StepDecreasing emission function
- ✅ Block-based distribution interval
- ✅ Proper nesting of distribution structures

#### **Test 3: Token with Groups**

- ✅ Groups at contract root level (not in token)
- ✅ Groups indexed by position (`"0"`)
- ✅ Token references `mainControlGroup: 0`
- ✅ Members have integer `power` values
- ✅ `requiredPower` threshold configured

#### **Test 4: All Emission Function Types**

Tests all 9 supported emission functions:

- ✅ FixedAmount
- ✅ Random
- ✅ StepDecreasing
- ✅ Linear
- ✅ Exponential
- ✅ Polynomial
- ✅ Logarithmic
- ✅ InvertedLogarithmic
- ✅ Stepwise (if configured)

#### **Test 5: Transfer Notes**

- ✅ `transferNotesConfig` field present
- ✅ `allowedNoteTypes` array populated
- ✅ Only enabled note types included

---

## 🌐 CDN-Based Validation (Evo SDK)

The Playwright fuzzing tests also validate the generated JSON by calling Evo SDK’s `DataContract.fromJSON` loaded from the CDN (same integration the UI uses).

Notes:

- Requires network access to fetch `@dashevo/evo-sdk` from jsDelivr.
- Keeps this UI decoupled from local rs-dpp internals.

What happens in tests:

- Seed representative wizard states (see `tests/token-registration.spec.mjs`).
- Navigate to Registration; the UI runs validation automatically.
- Additionally, the test directly calls:

```js
await page.waitForFunction(() => Boolean(window.EvoSDK?.DataContract?.fromJSON));
const contract = await page.evaluate(() => window.generatePlatformContractJSON());
await page.evaluate(async (payload) => {
  await window.EvoSDK.DataContract.fromJSON(payload, 10);
}, contract);
```

This ensures the JSON is accepted by Evo SDK exactly as in the app.

---

## 📋 Manual Testing Checklist

### 1. Field Naming Convention

**Test:** Create any token and check JSON output

**Verify:**

- [ ] All fields use camelCase (not snake_case)
- [ ] `shouldCapitalize` (not `should_capitalize`)
- [ ] `singularForm` (not `singular_form`)
- [ ] `pluralForm` (not `plural_form`)
- [ ] `baseSupply` (not `base_supply`)
- [ ] `maxSupply` (not `max_supply`)
- [ ] `keepsTransferHistory` (not `keeps_transfer_history`)

**Command:** `generatePlatformContractJSON()`

---

### 2. Data Types

**Test:** Check supply and numeric values

**Verify:**

- [ ] `baseSupply` is a number: `1000000` (not `"1000000"`)
- [ ] `maxSupply` is a number or null
- [ ] `decimals` is a number
- [ ] Distribution intervals are numbers
- [ ] Emission amounts are numbers
- [ ] Group member `power` is a number

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('baseSupply type:', typeof contract.tokens['0'].baseSupply);
console.log('maxSupply type:', typeof contract.tokens['0'].maxSupply);
```

---

### 3. Root Contract Structure

**Test:** Verify top-level fields

**Verify:**

- [ ] `$format_version: "1"` at root
- [ ] `id: "<generated-by-platform>"`
- [ ] `ownerId: "<from-identity>"`
- [ ] `version: 1`
- [ ] `documentSchemas: {}`
- [ ] `tokens: { "0": {...} }`
- [ ] `groups` (if enabled)
- [ ] `keywords` array
- [ ] `description` string

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Root keys:', Object.keys(contract));
```

---

### 4. Token Structure

**Test:** Verify token-level fields

**Verify:**

- [ ] `$format_version: "0"` at token level
- [ ] `conventions` object with `$format_version: "0"`
- [ ] `baseSupply` (number)
- [ ] `maxSupply` (number or null)
- [ ] `transferable: true`
- [ ] `keepsHistory` object (not boolean)
- [ ] All change rules have `V0` wrapper
- [ ] `mainControlGroup` (null or number)
- [ ] `description` string (3-100 chars)

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Token 0:', contract.tokens['0']);
```

---

### 5. Change Control Rules

**Test:** Check all V0 rule structures

**Verify each rule has this structure:**

```javascript
{
  "V0": {
    "authorized_to_make_change": "ContractOwner" | "NoOne" | "Group",
    "admin_action_takers": "ContractOwner" | "NoOne" | "Group",
    "changing_authorized_action_takers_to_no_one_allowed": false,
    "changing_admin_action_takers_to_no_one_allowed": false,
    "self_changing_admin_action_takers_allowed": false
  }
}
```

**Rules to verify:**

- [ ] `conventionsChangeRules`
- [ ] `maxSupplyChangeRules`
- [ ] `manualMintingRules`
- [ ] `manualBurningRules`
- [ ] `freezeRules`
- [ ] `unfreezeRules`
- [ ] `destroyFrozenFundsRules`
- [ ] `emergencyActionRules`
- [ ] `perpetualDistributionRules` (if distribution enabled)
- [ ] `preProgrammedDistributionRules` (if pre-programmed enabled)
- [ ] `tradeModeChangeRules`

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Freeze rules:', contract.tokens['0'].freezeRules);
```

---

### 6. History Tracking

**Test:** Verify history structure

**Expected Structure:**

```javascript
{
  "$format_version": "0",
  "keepsTransferHistory": true,
  "keepsMintingHistory": true,
  "keepsBurningHistory": true,
  "keepsFreezingHistory": false,
  "keepsDirectPricingHistory": true,
  "keepsDirectPurchaseHistory": false
}
```

**Verify:**

- [ ] `keepsHistory` is an object (not boolean)
- [ ] Has `$format_version: "0"`
- [ ] All history fields use camelCase
- [ ] All values are booleans

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('History:', contract.tokens['0'].keepsHistory);
```

---

### 7. Distribution Rules

**Test:** Check distribution structure when emission is configured

**Verify:**

- [ ] `distributionRules` object exists
- [ ] Has `$format_version: "0"`
- [ ] `perpetualDistribution` (if emission configured)
- [ ] `preProgrammedDistribution` (if pre-programmed configured)
- [ ] `perpetualDistributionRules` has V0 structure
- [ ] Distribution type matches (BlockBased/TimeBased/EpochBased)
- [ ] Emission function matches selected type

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Distribution:', contract.tokens['0'].distributionRules);
```

---

### 8. Groups Configuration

**Test:** Enable groups and check placement

**Verify:**

- [ ] `groups` is at **contract root** (not in token)
- [ ] Groups indexed by position: `groups['0']`
- [ ] Each group has `members` array
- [ ] Each group has `requiredPower` number
- [ ] Members have `identity` (string) and `power` (number)
- [ ] Token has `mainControlGroup: 0` (if group enabled)

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Root groups:', contract.groups);
console.log('Token mainControlGroup:', contract.tokens['0'].mainControlGroup);
```

---

### 9. Marketplace Rules

**Test:** Check marketplace structure

**Expected Structure:**

```javascript
{
  "$format_version": "0",
  "tradeMode": "NotTradeable",
  "tradeModeChangeRules": {
    "V0": {...}
  }
}
```

**Verify:**

- [ ] `marketplaceRules` object exists
- [ ] Has `$format_version: "0"`
- [ ] `tradeMode` is a string
- [ ] `tradeModeChangeRules` has V0 structure

---

### 10. Transfer Notes

**Test:** Enable transfer notes and check output

**Steps:**

1. Go to Permissions → Transfer Settings
2. Enable transfer notes
3. Select note types (Public, Shared Encrypted, Private Encrypted)

**Verify:**

- [ ] `transferNotesConfig` exists (if enabled)
- [ ] `allowedNoteTypes` is an array
- [ ] Only selected types are included
- [ ] Types match: `["Public", "SharedEncrypted", "PrivateEncrypted"]`

**Command:**

```javascript
const contract = generatePlatformContractJSON();
console.log('Transfer notes:', contract.tokens['0'].transferNotesConfig);
```

---

### 11. Validation Constraints

**Test:** Field length and value limits

**Verify:**

- [ ] Decimals: max is **16** (not 18)
- [ ] Token singular form: 3-25 characters
- [ ] Token plural form: 3-25 characters
- [ ] Description: 3-100 characters
- [ ] Language code: 2-12 characters

---

## 🔍 Comparison with Real Contracts

### Test Against Known Contract

Compare wizard output with the real contract example:

**Reference Contract ID:** `AcYUCSvAmUwryNsQqkqqD1o3BnFuzepGtR3Mhh2swLk6`

**Verification Points:**

- [ ] Root structure matches
- [ ] Token nesting matches (`tokens.0`)
- [ ] Field names match exactly
- [ ] Data types match exactly
- [ ] Change rules structure matches
- [ ] History tracking structure matches

---

## 📊 Test Results Template

```
=== Test Results ===
Date: [YYYY-MM-DD]
Browser: [Chrome/Firefox/Safari]
Wizard Version: [version]

Test 1 - Simple Token: ✅ PASS / ❌ FAIL
Test 2 - Halving Token: ✅ PASS / ❌ FAIL
Test 3 - Groups Token: ✅ PASS / ❌ FAIL
Test 4 - Emission Types: ✅ PASS / ❌ FAIL
Test 5 - Transfer Notes: ✅ PASS / ❌ FAIL

Manual Checklist:
- Field Naming: ✅ / ❌
- Data Types: ✅ / ❌
- Root Structure: ✅ / ❌
- Token Structure: ✅ / ❌
- Change Rules: ✅ / ❌
- History Tracking: ✅ / ❌
- Distribution: ✅ / ❌
- Groups: ✅ / ❌
- Marketplace: ✅ / ❌
- Transfer Notes: ✅ / ❌
- Validation: ✅ / ❌

Issues Found:
[List any issues]

Notes:
[Any additional observations]
```

---

## 🐛 Common Issues to Check

### Issue 1: snake_case instead of camelCase

**Symptom:** Fields like `should_capitalize` appear in output
**Expected:** `shouldCapitalize`
**Fix:** Check localization transformation function

### Issue 2: Strings instead of numbers

**Symptom:** `"baseSupply": "1000000"`
**Expected:** `"baseSupply": 1000000`
**Fix:** Ensure `parseInt()` is used

### Issue 3: Groups in wrong location

**Symptom:** Groups inside `tokens.0`
**Expected:** Groups at contract root
**Fix:** Check group transformation logic

### Issue 4: Missing V0 wrapper

**Symptom:** Change rules are simple booleans
**Expected:** `{ V0: { authorized_to_make_change: ..., ... } }`
**Fix:** Check `createRuleV0()` function usage

### Issue 5: keepsHistory is boolean

**Symptom:** `"keepsHistory": true`
**Expected:** `"keepsHistory": { $format_version: "0", keepsTransferHistory: true, ... }`
**Fix:** Check `transformKeepsHistory()` function

---

## ✅ Success Criteria

All tests pass when:

1. ✅ Automated test suite shows all green checkmarks
2. ✅ Manual checklist fully completed
3. ✅ JSON structure matches Platform contracts exactly
4. ✅ All field names use camelCase
5. ✅ All numeric values are numbers (not strings)
6. ✅ All change rules have V0 structure
7. ✅ Groups are at root level
8. ✅ No console errors or warnings
9. ✅ Validation prevents invalid inputs
10. ✅ Output can be compared 1:1 with DET "View JSON"

---

## 📝 Next Steps After Testing

If all tests pass:

1. ✅ Commit Phase 4 changes
2. ✅ Update README with testing information
3. ✅ Push to GitHub
4. ✅ Test actual deployment on Platform testnet (if possible)
5. ✅ Document any Platform-specific deployment notes

If tests fail:

1. ❌ Document failing tests
2. ❌ Fix issues
3. ❌ Re-run tests
4. ❌ Repeat until all pass

---

# Testing MISSING.md Features

This section provides step-by-step testing procedures for the 5 features implemented from MISSING.md.

## Feature 1: EvonodesByParticipation (Epoch-only Recipient)

### Location
**Distribution → Perpetual Distribution → Recipient Selection**

### Test Steps

1. Navigate to **Distribution** step
2. Click **Perpetual Distribution** tab
3. Under "Emission Cadence", select **Epoch-Based Distribution**
   - Enter Epoch Count (e.g., "10")
4. Scroll to **"Who receives the distributed tokens?"** section
5. You should see **three recipient options**:
   - Contract Owner
   - Specific Identity
   - **Evonodes by Participation** ← NEW

### Verification

**Test 1A: Epoch with Evonodes**
- Select "Epoch-Based Distribution"
- Select "Evonodes by Participation" recipient
- Click "Contract Preview" button
- Find `distributionRecipient` under perpetual distribution in JSON
- ✅ **Expected**: `"distributionRecipient": "EvonodesByParticipation"`

**Test 1B: Block/Time hides Evonodes**
- Change cadence to "Block-Based Distribution"
- Evonodes option should be **hidden**
- Change to "Time-Based Distribution"
- Evonodes option should be **hidden**
- Only "Contract Owner" and "Specific Identity" visible

**Test 1C: Cadence switch resets recipient**
- Select Epoch + Evonodes
- Switch to Block cadence
- Switch back to Epoch
- ✅ **Expected**: Recipient resets to "Contract Owner"

---

## Feature 2: Max Supply Change Rules

### Location
**Permissions → Supply & Controls → Max Supply Change Rules**

### Test Steps

1. Navigate to **Permissions** step
2. Click **Supply & Controls** substep
3. Enter Max Supply (e.g., "10000000")
4. Find **"Max Supply Change Rules"** card
5. UI elements:
   - Radio: "Enabled" / "Disabled"
   - Dropdown: "Authorized to perform action"
   - Dropdown: "Who can change these rules?"
   - 3 governance checkboxes

### Verification

**Test 2A: Disabled (default)**
- Keep "Disabled" selected
- Click "Contract Preview"
- Find `maxSupplyChangeRules`
- ✅ **Expected**:
  ```json
  "maxSupplyChangeRules": {
    "V0": {
      "authorized_to_make_change": "NoOne",
      "admin_action_takers": "ContractOwner"
    }
  }
  ```

**Test 2B: Enabled with Owner**
- Select "Enabled"
- Set perform → "Contract Owner"
- Set change rules → "Contract Owner"
- ✅ **Expected**: `"authorized_to_make_change": "ContractOwner"`

**Test 2C: Enabled with Identity**
- Select "Enabled"
- Set perform → "Specific Identity"
- Enter ID: "GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31EC"
- ✅ **Expected**:
  ```json
  "authorized_to_make_change": {
    "Identity": "GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31EC"
  }
  ```

**Test 2D: Governance flags**
- Check all 3 safeguard checkboxes
- ✅ **Expected**:
  ```json
  "changing_authorized_action_takers_to_no_one_allowed": true,
  "changing_admin_action_takers_to_no_one_allowed": true,
  "self_changing_admin_action_takers_allowed": true
  ```

---

## Feature 3: Distribution Change-Control Rules

### 3A: Pre-programmed Distribution Rules

**Location**: Distribution → Pre-programmed Distribution → Bottom

1. Navigate to **Distribution** → **Pre-programmed Distribution**
2. Scroll to bottom
3. Find **"Pre-programmed Distribution Rules"** card
4. Configure:
   - Perform action → "Specific Identity"
   - Enter Identity ID
   - Change rules → "Contract Owner"
   - Toggle safeguards
5. Click "Contract Preview"
6. Find `preProgrammedDistributionRules`
7. ✅ **Expected**: Values match selections

### 3B: New Tokens Destination Identity Rules

**Location**: Permissions → Manual Mint → After "Default destination"

1. Navigate to **Permissions** → **Manual Mint**
2. Scroll past "Default destination for minted tokens"
3. Find **"New Tokens Destination Identity Rules"** (always visible)
4. Configure:
   - Perform → "Group"
   - Select group
   - Change rules → "Main Group"
5. Click "Contract Preview"
6. Find `newTokensDestinationIdentityRules`
7. ✅ **Expected**: Matches configuration

### 3C: Allow Choosing Destination Rules

**Location**: Permissions → Manual Mint → Conditional panel

1. Navigate to **Permissions** → **Manual Mint**
2. Find checkbox: **"Allow choosing different destination on each mint"**
3. **Test visibility**:
   - Unchecked → Panel HIDDEN
   - Check it → Panel APPEARS
4. In panel, configure:
   - Perform → "No One"
   - Change rules → "Specific Identity"
5. Click "Contract Preview"
6. Find `mintingAllowChoosingDestinationRules`
7. ✅ **Expected**: Matches configuration

---

## Feature 4: Root Config Advanced

### Location
**Advanced → Trading Rules → Contract Advanced Settings**

### Test Steps

1. Navigate to **Advanced** step
2. Click **Trading Rules** substep (this is the main Advanced screen)
3. Scroll down past the Trading Permissions card
4. Find **"Contract Advanced Settings"** card
5. Fields:
   - Number: "Encryption bounded key requirement"
   - Number: "Decryption bounded key requirement"
   - Checkbox: "Use sized integer types"

### Verification

**Test 4A: Default values**
- Leave encryption/decryption empty
- "Sized integer types" checked (default)
- Click "Contract Preview"
- Find `config` section
- ✅ **Expected**:
  ```json
  "config": {
    "requiresIdentityEncryptionBoundedKey": null,
    "requiresIdentityDecryptionBoundedKey": null,
    "sizedIntegerTypes": true
  }
  ```

**Test 4B: Custom values**
- Encryption → 3
- Decryption → 5
- Uncheck "sized integers"
- ✅ **Expected**:
  ```json
  "requiresIdentityEncryptionBoundedKey": 3,
  "requiresIdentityDecryptionBoundedKey": 5,
  "sizedIntegerTypes": false
  ```

**Test 4C: Cleared values**
- Clear both inputs
- ✅ **Expected**: Both `null`

---

## Feature 5: Keep Direct Pricing History

### Location
**Permissions → History → History Tracking Options**

### Test Steps

1. Navigate to **Permissions** → **History**
2. Find **"History Tracking Options"** card
3. See 6 checkboxes:
   - Keep transfer history
   - Keep freeze/unfreeze history
   - Keep mints history
   - Keep burns history
   - Keep direct purchases history
   - **Keep direct pricing changes history** ← Feature 5

### Verification

**Test 5A: Unchecked (default)**
- All unchecked
- Click "Contract Preview"
- Find `keepsHistory`
- ✅ **Expected**: `"keepsDirectPricingHistory": false`

**Test 5B: Checked**
- Check "Keep direct pricing changes"
- ✅ **Expected**: `"keepsDirectPricingHistory": true`

**Test 5C: Mixed selections**
- Check: transfers, mints, direct pricing
- Uncheck: others
- ✅ **Expected**:
  ```json
  "keepsTransferHistory": true,
  "keepsMintingHistory": true,
  "keepsDirectPricingHistory": true,
  "keepsBurningHistory": false
  ```

---

## Full Integration Test

Test all 5 features together:

### Setup
1. Start fresh (clear localStorage or incognito)
2. Fill wizard with all features:

**Naming**
- Token: "TestToken"
- Symbol: "TEST"

**Permissions**
- Decimals: 8
- Base: 1000000
- Max: 10000000
- ✅ Feature 2: Enable max supply change rules
- ✅ Feature 5: Check direct pricing history
- ✅ Feature 3B: Configure destination rules
- ✅ Feature 3C: Enable + configure choosing rules

**Distribution**
- ✅ Feature 1: Epoch + Evonodes
- ✅ Feature 3A: Configure pre-programmed rules

**Advanced → Trading Rules**
- ✅ Feature 4: Encryption=2, Decryption=4, Uncheck sized integers

### Verify JSON

Click "Contract Preview" and verify:
- ✅ `distributionRecipient: "EvonodesByParticipation"`
- ✅ `maxSupplyChangeRules.V0.authorized_to_make_change: "ContractOwner"`
- ✅ `preProgrammedDistributionRules` configured
- ✅ `newTokensDestinationIdentityRules` configured
- ✅ `mintingAllowChoosingDestinationRules` configured
- ✅ `config.requiresIdentityEncryptionBoundedKey: 2`
- ✅ `config.requiresIdentityDecryptionBoundedKey: 4`
- ✅ `config.sizedIntegerTypes: false`
- ✅ `keepsHistory.keepsDirectPricingHistory: true`

---

## Quick Visual Checklist

Open wizard and verify UI elements exist:

- [ ] Distribution → Perpetual → "Evonodes by Participation" (when Epoch)
- [ ] Permissions → Supply → "Max Supply Change Rules" card
- [ ] Permissions → Manual Mint → "New Tokens Destination Rules" (always visible)
- [ ] Permissions → Manual Mint → "Allow Choosing Rules" panel (conditional)
- [ ] Distribution → Pre-programmed → "Pre-programmed Rules" card
- [ ] Advanced → Trading Rules → "Contract Advanced Settings" card (scroll down)
- [ ] Permissions → History → "Keep direct pricing" checkbox (6th item)

---

## Success Criteria

All features working if:

1. ✅ All UI elements visible in correct locations
2. ✅ Conditional visibility works correctly
3. ✅ Form values persist across navigation
4. ✅ Contract Preview JSON contains all values
5. ✅ JSON structure matches rs-dpp specs
6. ✅ No console errors
7. ✅ Validation allows progression
8. ✅ State persists after reload

---

## Debugging

If features don't work:

1. Check browser console for errors
2. Verify element IDs match code expectations
3. Test state persistence (navigate away and back)
4. Clear localStorage if corrupted:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
5. Use Contract Preview after every change

---

## Expected JSON Structure

Complete example with all features:

```json
{
  "config": {
    "requiresIdentityEncryptionBoundedKey": 2,
    "requiresIdentityDecryptionBoundedKey": 4,
    "sizedIntegerTypes": false
  },
  "tokens": {
    "0": {
      "maxSupplyChangeRules": {
        "V0": { /* Feature 2 */ }
      },
      "keepsHistory": {
        "keepsDirectPricingHistory": true  /* Feature 5 */
      },
      "distributionRules": {
        "V0": {
          "preProgrammedDistributionRules": { /* Feature 3A */ },
          "newTokensDestinationIdentityRules": { /* Feature 3B */ },
          "mintingAllowChoosingDestinationRules": { /* Feature 3C */ }
        }
      },
      "perpetualDistribution": {
        "distributionRecipient": "EvonodesByParticipation"  /* Feature 1 */
      }
    }
  }
}
```
