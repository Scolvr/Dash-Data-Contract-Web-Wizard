## EvonodesByParticipation (Epoch-only)

- rs-dpp
  - TokenDistributionRecipient includes EvonodesByParticipation.
  - Path: packages/rs-dpp/src/data_contract/associated_token/token_perpetual_distribution/distribution_recipient.rs:26
  - Only valid with EpochBasedDistribution; resolution methods assume epoch context.
- Current UI
  - Recipient selector supports “contract-owner” and “specific-identity” only.
  - Mapping in JSON: generatePlatformContractJSON() sets distributionRecipient to 'ContractOwner' or { Identity: id } (packages/rs-dpp/ui/app.js:9120–9158).
- UI plan
  - Add a third recipient option visible when cadence.type === 'EpochBasedDistribution':
    - HTML: radio “Evonodes by participation”.
    - State: wizardState.form.distribution.recipient = { type: 'evonodes-by-participation' }.
    - JSON: if recipient.type === 'evonodes-by-participation' then distributionRecipient = 'EvonodesByParticipation'.
  - Guardrails: disable or hide this option for Block/Time cadences; if user switches away from Epoch, reset recipient back to ContractOwner.

## Max Supply Change Rules (maxSupplyChangeRules)

- rs-dpp
  - TokenConfigurationV0::max_supply_change_rules (ChangeControlRules).
  - Path: packages/rs-dpp/src/data_contract/associated_token/token_configuration/v0/mod.rs:67–71
- Current UI
  - Always disabled: createRuleV0(false, 'ContractOwner', wizardState.form.permissions.changeMaxSupply || {}).
  - Path: packages/rs-dpp/ui/app.js:9431–9437
- UI plan
  - Add panel in Permissions (same style as manual mint/burn/freeze):
    - Toggle: “Max supply can be changed”.
    - Actor picker: owner | identity | group | main-group.
    - Governance flags: allowChangeAuthorizedToNone, allowChangeAdminToNone, allowSelfChangeAdmin.
    - State schema: wizardState.form.permissions.changeMaxSupply = { enabled, perform, changeRules, allowChangeAuthorizedToNone, allowChangeAdminToNone,
            allowSelfChangeAdmin } (use the same structure used by other rules the app already handles).
    - JSON mapping: reuse createPermissionChangeRule(wizardState.form.permissions.changeMaxSupply); set maxSupplyChangeRules to that output.

## Distribution Change-Control Rules (perpetual/pre-programmed/destination/pricing)

- rs-dpp
  - TokenDistributionRulesV0:
    - perpetual_distribution_rules
    - pre_programmed_distribution_rules
    - new_tokens_destination_identity_rules
    - minting_allow_choosing_destination_rules
    - change_direct_purchase_pricing_rules
  - Path: packages/rs-dpp/src/data_contract/associated_token/token_distribution_rules/v0/mod.rs:1
- Current UI
  - We set these rules automatically using createRuleV0() or createPermissionChangeRule() defaults, no UI:
    - perpetualDistributionRules = createRuleV0(false)
    - preProgrammedDistributionRules = createRuleV0(false)
    - newTokensDestinationIdentityRules = createRuleV0(true)
    - mintingAllowChoosingDestinationRules = createRuleV0(true)
    - changeDirectPurchasePricingRules = createPermissionChangeRule(wizardState.form.permissions.directPricing)
  - Path: packages/rs-dpp/ui/app.js:9106–9113, 9151, 9172, 9381
- UI plan
  - Add “Who can change distribution settings?” subpanel in the Distribution step:
    - For each rule, provide an actor picker + flags, mirroring other permission editors:
      - “Perpetual distribution rules”
      - “Pre-programmed distribution rules”
      - “Default mint destination identity rules”
      - “Allow choosing destination rules”
      - “Direct purchase pricing rules” (already partially wired)
    - State schema (examples):
      - wizardState.form.distribution.rules.perpetualChange = { enabled, perform, changeRules, allow* flags }
      - wizardState.form.distribution.rules.preProgrammedChange = { ... }
      - wizardState.form.distribution.rules.mintDestinationChange = { ... }
      - wizardState.form.distribution.rules.allowChoosingDestinationChange = { ... }
      - wizardState.form.permissions.directPricing (already exists)
    - JSON mapping:
      - perpetualDistributionRules = createPermissionChangeRule(wizardState.form.distribution.rules.perpetualChange)
      - preProgrammedDistributionRules = createPermissionChangeRule(wizardState.form.distribution.rules.preProgrammedChange)
      - newTokensDestinationIdentityRules = createPermissionChangeRule(wizardState.form.distribution.rules.mintDestinationChange)
      - mintingAllowChoosingDestinationRules = createPermissionChangeRule(wizardState.form.distribution.rules.allowChoosingDestinationChange)
      - changeDirectPurchasePricingRules (unchanged)

## Root Config Advanced (bounded keys and sizedIntegerTypes)

- rs-dpp
  - DataContractConfigV1 (serde camelCase, defaulted):
    - requiresIdentityEncryptionBoundedKey (Option<StorageKeyRequirements>)
    - requiresIdentityDecryptionBoundedKey (Option<StorageKeyRequirements>)
    - sizedIntegerTypes (bool)
  - Path: packages/rs-dpp/src/data_contract/config/v1/mod.rs:1
- Current UI
  - Always sets requires...BoundedKey = null; sizedIntegerTypes not present in our config object.
  - Path: packages/rs-dpp/ui/app.js:9556–9568
- UI plan
  - Add “Advanced contract settings” panel (could be in Advanced or Search step):
    - Fields:
      - Encryption bounded key requirement: numeric code (u8), or selector listing supported values.
      - Decryption bounded key requirement: numeric code (u8).
      - Checkbox: “Use sized integer types for integers” (default true).
    - State: wizardState.form.rootConfig = { requiresEncryptionBoundedKey?: string|number|null, requiresDecryptionBoundedKey?: string|number|null, sizedIntegerTypes?:
            boolean }.
    - JSON mapping:
      - platformContract.config.requiresIdentityEncryptionBoundedKey = number|null
      - platformContract.config.requiresIdentityDecryptionBoundedKey = number|null
      - platformContract.config.sizedIntegerTypes = boolean

## keepsDirectPricingHistory toggle

- rs-dpp
  - TokenKeepsHistoryRulesV0 includes keeps_direct_pricing_history.
  - Path: packages/rs-dpp/src/data_contract/associated_token/token_keeps_history_rules/v0/mod.rs:1
- Current UI
  - transformKeepsHistory() forces keepsDirectPricingHistory: true; no UI to toggle.
  - Path: packages/rs-dpp/ui/app.js:9069–9090
- UI plan
  - In Permissions → History section, add checkbox: “Keep direct pricing history”.
    - State: wizardState.form.permissions.keepsHistory = { transfers, mints, burns, freezes, purchases, directPricing }.
    - JSON mapping: transformKeepsHistory() should map directPricing → keepsDirectPricingHistory accordingly.

## Where to plug UI changes

- Recipient options (EvoNodes)
  - HTML: add a radio/option under the Distribution recipient group; wire click/change handlers where other recipient options are bound.
  - State reducer: set wizardState.form.distribution.recipient to { type: 'evonodes-by-participation' }.
  - JSON mapping: in transformDistributionRules() choose 'EvonodesByParticipation' for Epoch cadence.
- Permissions subpanels (max supply and rule editors)
  - Mirror existing manual action panels (manualFreeze/unfreeze/destroy) that use:
    - performerType, performerReference (owner/identity/group/main-group)
    - governance flags
    - Enabled toggle
  - These are handled in helper functions like createPermissionChangeRule() and createRuleV0() (packages/rs-dpp/ui/app.js:8951–9050). Reuse those.
- Root config advanced
  - config.sizedIntegerTypes

## Extend Playwright tests

- Evonodes: Build Epoch cadence + recipient = evonodes; assert distributionRecipient === 'EvonodesByParticipation'.
- Max supply change rules: Seed permissions.changeMaxSupply for actors; assert token.maxSupplyChangeRules.V0.authorized_to_make_change matches expected AuthorizedActionTakers.
- Distribution rule editors: Seed each rule and assert corresponding fields under token.distributionRules.*Rules.V0.authorized_to_make_change.
- Root config keys: Assert config.requiresIdentity*BoundedKey and config.sizedIntegerTypes.
- Direct pricing history: Toggle off; assert token.keepsHistory.V0.keeps_direct_pricing_history === false.
