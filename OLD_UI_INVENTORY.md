# OLD UI Inventory - Unused/Hidden Elements

This document catalogs all UI elements that exist in the codebase but are not shown/accessible on the website.

## Last Updated
2025-11-10

---

## 1. OLD FREEZE SYSTEM UI

### **Status:** ✅ DELETED (2025-11-10) - Was replaced by `permissions-manual-freeze`

### **HTML Location:**
- **File:** `index.html`
- **Lines:** 6603-6752 (150 lines)
- **Screen ID:** `screen-permissions-freeze`
- **Form ID:** `freeze-form`

### **HTML Elements:**
```
Radio Buttons:
- name="freeze-enabled" (id="freeze-enabled-yes", id="freeze-enabled-no")

Select Dropdowns:
- id="freeze-performer" (Who can freeze)
  - Options: none, owner, identity
- id="freeze-rule-changer" (Who can change rules)
  - Options: none, owner, identity

Identity Input Fields:
- id="freeze-performer-identity" (Performer identity ID)
- id="freeze-rule-identity" (Rule changer identity ID)

Checkboxes (Safeguards):
- id="freeze-allow-authorized-none"
- id="freeze-allow-admin-none"
- id="freeze-allow-self-change"

Containers:
- data-freeze-controls (Main controls panel)
- data-freeze-identity="perform" (Performer identity wrapper)
- data-freeze-identity="rules" (Rule changer identity wrapper)

Message Element:
- id="freeze-message" (Status message)
```

### **JavaScript Location:**
- **File:** `app.js`
- **Lines:** 6769-7020 (251 lines)
- **Function:** `createFreezeUI(form)`

### **JavaScript References:**
```javascript
Line 26:    'permissions-freeze' in INFO_STEPS array
Line 57:    'permissions-freeze': 'permissions' in INFO_STEP_PARENT
Line 110:   'permissions-freeze': 'Freeze' in STEP_TITLES
Line 1025:  const freezeForm = document.getElementById('freeze-form');
Line 1192:  freezeUI = createFreezeUI(freezeForm);
Line 6774:  const stepId = 'permissions-freeze';
```

### **State Path:**
- `wizardState.form.permissions.freeze`

### **State Structure:**
```javascript
{
  enabled: false,
  perform: {
    type: 'none',      // 'none', 'owner', 'identity'
    identity: ''
  },
  changeRules: {
    type: 'owner',     // 'none', 'owner', 'identity'
    identity: ''
  },
  flags: {
    changeAuthorizedToNoOneAllowed: false,
    changeAdminToNoOneAllowed: false,
    selfChangeAdminAllowed: false
  }
}
```

### **Why It's OLD:**
- There's a NEW freeze UI at `permissions-manual-freeze` (line 1937 in index.html)
- The NEW UI uses the standard manual action pattern with radio buttons
- The NEW UI is actively used in `MANUAL_ACTION_DEFINITIONS` (app.js:40)
- The OLD UI (`permissions-freeze`) is only in `INFO_STEPS` but not actively navigated to
- The OLD UI has a complex `createFreezeUI()` function (251 lines)
- The NEW UI uses simpler event listeners integrated with other permission features

### **Contract Generation:**
- Currently **FIXED** - Now reads from `manualFreeze` (the NEW UI) at app.js:9401-9410
- Previously was trying to read from `freeze` (this OLD UI) but incorrectly

### **Deletion Summary:**
✅ **COMPLETED** - All old freeze UI has been safely removed:
- Removed 158 lines from index.html (screen-permissions-freeze)
- Removed 266 lines from app.js (createFreezeUI, syncFreezeUI, variables, calls)
- Total: 424 lines of dead code removed
- Committed: 2025-11-10 (commit: 1e24a35)

---

## 2. COMMENTED-OUT DEAD CODE (DELETED 2025-11-10)

### **Status:** ✅ DELETED (2025-11-10)

### **JavaScript Location #1:**
- **File:** `app.js`
- **Lines:** 11587-11863 (277 lines)
- **Section:** Action Rules Presets
- **Marker:** `// REMOVED: Action rules presets functionality - no longer used`

### **What It Was:**
- Preset radio buttons functionality (`input[name="action-rules-preset"]`)
- 6 preset configurations: custom, most-restrictive, emergency-only, mint-burn, advanced, all-allowed
- Function: `initializeActionRulesPresets()`
- Applied preset configurations to manual actions and change control

### **Why Deleted:**
- HTML elements `name="action-rules-preset"` don't exist (confirmed via grep)
- Code was already commented out with REMOVED marker
- Function was never called (orphaned code)

### **JavaScript Location #2:**
- **File:** `app.js`
- **Lines:** 12084-12151 (65 lines)
- **Section:** Control Model - Groups Integration
- **Marker:** `// REMOVED: Permissions scope radios functionality - no longer used`

### **What It Was:**
- Permissions scope radio buttons (`input[name="permissions-scope"]`)
- Integration between scope selection and group checkbox
- Function: `initializeControlModelGroupsIntegration()`
- Auto-enabled groups when "groups" scope was selected

### **Why Deleted:**
- HTML elements `name="permissions-scope"` don't exist (confirmed via grep)
- Code was already commented out with REMOVED marker
- Function was never called (orphaned code)

### **Deletion Summary:**
✅ **COMPLETED** - All commented dead code has been safely removed:
- Removed 277 lines (action rules presets)
- Removed 65 lines (permissions scope radios)
- Total: 342 lines of commented dead code removed
- File reduced from ~12,806 lines to 12,464 lines
- JavaScript syntax verified valid

---

## 3. SUMMARY

### Total Old/Unused UI Elements Found:
1. **OLD Freeze System** (`permissions-freeze`, `freeze-form`)
   - HTML: 158 lines (DELETED)
   - JavaScript: 266 lines (DELETED)
   - State: `wizardState.form.permissions.freeze`
2. **Commented Dead Code** (Action Rules Presets + Permissions Scope)
   - JavaScript: 342 lines (DELETED)

### Other Screens Checked:
- ✅ **permissions-manual-freeze** - Active and used
- ✅ **permissions-manual-mint** - Active and used
- ✅ **permissions-manual-burn** - Active and used
- ✅ **permissions-emergency** - Active and used
- ✅ **permissions-unfreeze** - Active (embedded in manual-freeze screen)
- ✅ **permissions-destroy-frozen** - Active (embedded as separate screen)

### Duplicate Naming Patterns:
None found besides the freeze system. All other screens follow consistent naming:
- `permissions-X` for info screens
- `permissions-X-change` for change rule screens (conventions, marketplace, etc.)
- `permissions-manual-X` for manual action screens (mint, burn, freeze)

---

## 3. ACTION ITEMS

### Immediate:
- [x] Document old freeze UI
- [ ] Verify if `createFreezeUI()` is still called anywhere
- [ ] Check if removing old freeze UI would break anything

### Future:
- [ ] Remove old freeze UI from HTML if confirmed unused
- [ ] Remove `createFreezeUI()` function from app.js
- [ ] Remove `permissions-freeze` from INFO_STEPS array
- [ ] Clean up state references to old freeze structure

---

## 4. NOTES

- The website is currently using the NEW freeze UI successfully
- Contract generation has been fixed to use the NEW UI
- The OLD UI appears to be leftover from a previous refactor
- No user-visible impact from the OLD UI existing (it's hidden)
