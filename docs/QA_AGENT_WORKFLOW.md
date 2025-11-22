# QA Agent Workflow

**Agent:** QA & Testing
**Mission:** Test all features, document functionality, create comprehensive feature list for Documentation Agent

---

## Task 1: Feature Testing (Complete Feature Inventory)

**Objective:** Document every feature in the wizard with descriptions

**Steps:**
1. Navigate through entire wizard flow (Welcome → Registration)
2. Document each step and substep
3. Test each input field and interaction
4. Note what each feature does
5. Identify which fields need tooltips/help text

**Deliverable:** `docs/FEATURE_LIST.md`

---

## Task 2: Test Critical Features from REMAINING_FEATURES_PLAN.md

**Features to verify:**
- ✅ Feature 2: EvonodesByParticipation recipient (shows only for Epoch cadence)
- ✅ Feature 3: Max Supply Change Rules (JSON uses user config, not hardcoded)
- ✅ Feature 4a: Perpetual Distribution Rules
- ✅ Feature 4c: Mint Destination Rules
- ✅ Feature 4d: Allow Choosing Destination Rules
- ✅ Feature 5: Root Config Advanced Settings

**Test each feature:**
- Navigate to location
- Test all input combinations
- Verify JSON output
- Document any issues

**Deliverable:** `docs/FEATURE_TEST_RESULTS.md`

---

## Task 3: Document Common Errors

**Objective:** Find validation errors users will encounter

**Test scenarios:**
- Empty required fields
- Invalid formats (identity IDs, numbers)
- Boundary values (negative, zero, max uint32)
- Special characters in text fields
- Rapid navigation between steps

**Deliverable:** `docs/COMMON_ERRORS.md`

---

## Task 4: Identify Tooltip Candidates

**Objective:** List 25+ fields that need help text

**Criteria for tooltips:**
- Complex technical terms
- Non-obvious behavior
- Fields with validation rules
- Advanced/expert features

**Deliverable:** `docs/TOOLTIP_FIELDS.md` (list of field IDs + why they need tooltips)

---

## Handoff to Documentation Agent

**Files to provide:**
1. `docs/FEATURE_LIST.md` - Complete feature inventory
2. `docs/FEATURE_TEST_RESULTS.md` - Test results
3. `docs/COMMON_ERRORS.md` - Error scenarios
4. `docs/TOOLTIP_FIELDS.md` - Fields needing tooltips

**Action Required:** Documentation Agent uses these to write README, USER_GUIDE, FAQ, TROUBLESHOOTING, and TOOLTIP_CONTENT

---

**Status:** Ready to execute
