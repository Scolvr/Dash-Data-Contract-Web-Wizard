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
