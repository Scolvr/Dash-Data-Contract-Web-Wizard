# Burning Sub-Navigation Page

**Complete HTML structure for the Burning sub-step in the Dash Token Wizard**

**UPDATED**: The burning page now uses the **standard manual action structure** (wizard-screen--info) to properly integrate with the JavaScript data collection system.

---

## Full HTML Code

```html
<section class="wizard-screen wizard-screen--info" id="screen-permissions-manual-burn" data-step="permissions-manual-burn" hidden>

  <!-- Right Side Guide Panel -->
  <aside class="page-guide" aria-label="Page guide">
    <div class="page-guide__content">
      <h2 class="page-guide__title">Manual Burn Permission</h2>
      <p class="page-guide__intro">Define how tokens can be permanently destroyed.</p>

      <div class="page-guide__section">
        <h3 class="page-guide__section-title">Detailed Guide</h3>

        <h4 class="page-guide__step-heading">Enable Manual Burning</h4>
        <p><strong>If enabled:</strong> Tokens can be removed from circulation. Useful for deflation, refunds, or correcting mistakes.</p>
        <p><strong>If disabled:</strong> Tokens cannot be destroyed, supply remains permanent.</p>

        <h4 class="page-guide__step-heading">Burn Source</h4>
        <ul style="margin: var(--space-2) 0; padding-left: var(--space-5); list-style: disc;">
          <li><strong>Owner-only:</strong> Centralized control</li>
          <li><strong>Any Holder:</strong> Allows users to burn their own tokens voluntarily</li>
          <li><strong>Specific Identity / Group:</strong> Shared or delegated burn authority</li>
        </ul>
        <p><strong>What it means:</strong> Allowing anyone to burn adds transparency but can't reverse accidental burns.</p>

        <h4 class="page-guide__step-heading">Who Can Change This Rule</h4>
        <p>Lock it ("No One") for irreversible supply behavior, or allow updates for governance flexibility.</p>
      </div>

      <div class="page-guide__section">
        <h3 class="page-guide__section-title">Best Practice</h3>
        <ul style="margin: var(--space-2) 0 0 0; padding-left: var(--space-5); list-style: disc;">
          <li><strong>Public, deflationary tokens:</strong> allow any holder to burn.</li>
          <li><strong>Treasury tokens:</strong> restrict to Owner or Group for control.</li>
          <li>Avoid giving burn power to arbitrary identities — it can break supply integrity.</li>
        </ul>
      </div>
    </div>
  </aside>

  <div class="wizard-screen__inner">
    <form class="wizard-form" id="permissions-manual-burn-form" novalidate>
      <h1 class="wizard-screen__title" id="title-permissions-manual-burn" tabindex="-1">Can this token be burned?</h1>
      <p class="wizard-screen__subtitle">Configure permissions for destroying tokens (reducing supply).</p>

      <!-- Enable/Disable Burning Card -->
      <div class="form-card" style="max-width: 100%;">
        <div class="form-card__header">
          <h3 class="form-card__title">Burning</h3>
          <p class="form-card__description">Choose whether tokens can be permanently destroyed</p>
        </div>
        <div class="form-card__body">
          <fieldset class="wizard-fieldset">
            <legend class="wizard-field__label">Enable burning?</legend>

            <!-- No Option -->
            <label class="wizard-choice">
              <input class="wizard-choice__input" type="radio" name="manual-burn-enabled" value="disabled" checked>
              <span class="wizard-choice__content">
                <span class="wizard-choice__title">No</span>
                <span class="wizard-choice__hint">Tokens cannot be destroyed</span>
              </span>
            </label>

            <!-- Yes Option -->
            <label class="wizard-choice">
              <input class="wizard-choice__input" type="radio" name="manual-burn-enabled" value="enabled" data-toggle-panel="manual-burn-permissions-panel">
              <span class="wizard-choice__content">
                <span class="wizard-choice__title">Yes</span>
                <span class="wizard-choice__hint">Allow destroying tokens to reduce supply</span>
              </span>
            </label>
          </fieldset>

          <!-- Permission Configuration (shown only when Yes is selected) -->
          <div class="distribution-inline-panel" id="manual-burn-permissions-panel" hidden>
            <fieldset class="wizard-fieldset" style="margin-top: var(--space-6);">
              <legend class="wizard-field__label">Who is allowed to burn the token?</legend>

              <!-- Owner Only Option -->
              <label class="wizard-choice">
                <input class="wizard-choice__input" type="radio" name="manual-burn-permission" value="owner-only" checked>
                <span class="wizard-choice__content">
                  <span class="wizard-choice__title">Owner Only</span>
                  <span class="wizard-choice__hint">Only the contract owner can burn tokens</span>
                </span>
              </label>

              <!-- Specific Identity Option -->
              <label class="wizard-choice">
                <input class="wizard-choice__input" type="radio" name="manual-burn-permission" value="specific-identity" data-toggle-panel="manual-burn-panel-identity">
                <span class="wizard-choice__content">
                  <span class="wizard-choice__title">Specific Identity</span>
                  <span class="wizard-choice__hint">Only a designated identity can burn tokens</span>
                </span>
              </label>
              <div class="distribution-inline-panel" id="manual-burn-panel-identity" hidden>
                <div class="field-group">
                  <label class="wizard-field__label" for="manual-burn-identity-id">Identity ID</label>
                  <input class="wizard-field__input" type="text" id="manual-burn-identity-id" name="manual-burn-identity-id" placeholder="Enter the Base58 ID">
                  <span class="field-hint">Enter the Dash Platform identity ID that can burn tokens</span>
                </div>
              </div>

              <!-- Group Option -->
              <label class="wizard-choice">
                <input class="wizard-choice__input" type="radio" name="manual-burn-permission" value="group" data-toggle-panel="manual-burn-panel-group">
                <span class="wizard-choice__content">
                  <span class="wizard-choice__title">Group</span>
                  <span class="wizard-choice__hint">Members of a designated group can burn</span>
                </span>
              </label>
              <div class="distribution-inline-panel" id="manual-burn-panel-group" hidden>
              <div class="field-group" id="manual-burn-group-selector-container">
                <label class="wizard-field__label" for="manual-burn-group-id">Select group</label>
                <select class="wizard-field__input" id="manual-burn-group-id" name="manual-burn-group-id">
                  <option value="">Select a group...</option>
                </select>
                <span class="field-hint" id="manual-burn-group-hint">Choose which group can perform this action</span>
              </div>
              <div class="field-message field-message--info" id="manual-burn-no-groups-message" hidden>
                <p>No group has been created yet.</p>
                <button class="wizard-button wizard-button--secondary wizard-button--small" type="button" id="manual-burn-create-group-btn">Create Group</button>
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      <p class="wizard-field__message" id="permissions-manual-burn-message" role="status" aria-live="polite"></p>
      <div class="wizard-actions wizard-actions--between wizard-actions--sticky">
        <button class="wizard-button wizard-button--secondary" type="button" data-step-back="permissions-manual-burn">← Back</button>
        <button class="wizard-button wizard-button--secondary" type="button" id="contract-preview-btn">📄 Contract Preview</button>
        <button class="wizard-button wizard-button--primary" id="permissions-manual-burn-next" type="submit">Continue →</button>
      </div>
    </form>
  </div>
</section>
```

---

## Key Structure Elements

### 1. Section Container
- **ID**: `screen-permissions-manual-burn`
- **Data attributes**:
  - `data-step="permissions"`
  - `data-substep="permissions-manual-burn"`
  - `data-tab="token"`
  - `data-version="102-wide"` (version tracking)
- **Class**: `wizard-screen`
- **Hidden by default**: `hidden` attribute

### 2. Guide Panel (Right Sidebar)
- **Class**: `page-guide`
- Contains detailed help text organized in sections:
  - Manual Burn Permission overview
  - Detailed Guide (Enable Manual Burning, Burn Source, Change Rules)
  - Best Practice recommendations

### 3. Main Content Area
- **Class**: `wizard-screen__inner`
- Contains the form with all interactive elements

### 4. Form Structure
- **Form ID**: `permissions-manual-burn-form`
- **Class**: `wizard-form`
- **Validation**: `novalidate` attribute

### 5. Title and Subtitle
- **Title**: "Can this token be burned?"
  - Class: `wizard-screen__title`
  - ID: `title-permissions-manual-burn`
- **Subtitle**: "Configure permissions for destroying tokens (reducing supply)."
  - Class: `wizard-screen__subtitle`

### 6. Form Card
- **IMPORTANT**: `style="max-width: 100%;"` inline style for proper width
- Contains:
  - Card header with title and description
  - Card body with radio button groups

### 7. Radio Button Groups

#### First Level: Enable Burning?
- **No** (default checked): Disables burning
- **Yes**: Enables burning and shows permission panel

#### Second Level (Conditional): Who Can Burn?
Shown only when "Yes" is selected:
- **Owner Only** (default)
- **Specific Identity** (shows identity input field)
- **Group** (shows group selector dropdown)

### 8. Action Buttons
- **Back**: Goes to previous step
- **Contract Preview**: Shows contract preview modal
- **Continue**: Proceeds to next step (primary action)

---

## Important CSS Classes Used

### Layout Classes
- `wizard-screen`: Main screen container
- `wizard-screen__inner`: Inner content wrapper (default max-width: 680px)
- `wizard-form`: Form container
- `page-guide`: Right sidebar guide panel

### Form Components
- `form-card`: Card container for form sections
- `form-card__header`: Card header area
- `form-card__title`: Card title
- `form-card__description`: Card description text
- `form-card__body`: Card body content

### Input Components
- `wizard-fieldset`: Fieldset wrapper
- `wizard-field__label`: Label for form fields
- `wizard-choice`: Radio button container
- `wizard-choice__input`: Radio input element
- `wizard-choice__content`: Radio button content wrapper
- `wizard-choice__title`: Radio button title
- `wizard-choice__hint`: Radio button hint text

### Progressive Disclosure
- `distribution-inline-panel`: Collapsible panel for conditional content
- Controlled by `data-toggle-panel` attribute on radio inputs

### Buttons
- `wizard-actions`: Button container
- `wizard-actions--between`: Space-between layout
- `wizard-actions--sticky`: Sticky positioning at bottom
- `wizard-button`: Base button class
- `wizard-button--primary`: Primary action button (blue)
- `wizard-button--secondary`: Secondary action button (gray)

---

## Navigation Integration

### Sidebar Navigation Link
The burning page is linked from the sidebar navigation with:
```html
<a href="#" class="wizard-nav-subitem" data-substep="permissions-manual-burn">
  <span class="wizard-nav-subitem__text">Burning</span>
</a>
```

### Data Attributes
- `data-substep="permissions-manual-burn"` connects navigation to screen
- JavaScript uses this to show/hide the correct screen

---

## Form Field IDs

All form fields have unique IDs for JavaScript interaction:

| Field | ID | Purpose |
|-------|-----|---------|
| Enable burning radio | `manual-burn-enabled` | Toggle burning on/off |
| Permission selection | `manual-burn-permission` | Select who can burn |
| Identity input | `manual-burn-identity-id` | Enter specific identity ID |
| Group selector | `manual-burn-group-id` | Select burn authority group |
| Permission panel | `manual-burn-permissions-panel` | Conditional panel container |
| Identity panel | `manual-burn-panel-identity` | Identity input panel |
| Group panel | `manual-burn-panel-group` | Group selector panel |
| Form message | `permissions-manual-burn-message` | Validation messages |
| Next button | `permissions-manual-burn-next` | Continue button |

---

## CSS Variables Used

- `--space-2`: Small spacing (8px)
- `--space-5`: Medium spacing (20px)
- `--space-6`: Large spacing (24px)

---

## CRITICAL: Inline Style

**DO NOT REMOVE** this inline style from the form-card:
```html
<div class="form-card" style="max-width: 100%;">
```

This ensures the card expands to fill the full available width and matches other pages like Token Name, Freezing, etc. Without this inline style, the burning page content box will appear narrower than other pages.

---

## Location in index.html

- **Start line**: 1188
- **End line**: 1325
- **Section**: Permissions step, Burning sub-step

---

## Notes

1. The page uses progressive disclosure - additional options appear when users select "Yes" for burning
2. The group selector is dynamically populated by JavaScript based on created groups
3. All validation is handled by JavaScript in app.js
4. The page follows the same structure as other permission pages (Minting, Freezing)
5. The `data-version="102-wide"` attribute can be used to verify the correct version is loaded
