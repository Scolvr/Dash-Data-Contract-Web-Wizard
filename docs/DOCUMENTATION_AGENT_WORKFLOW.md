# Documentation Agent Workflow

**Agent:** Documentation
**Mission:** Create beginner-friendly documentation so non-technical users can create tokens without help

**Dependencies:** Wait for QA Agent to provide feature list and test results

---

## Task 1: Write README.md

**Objective:** Comprehensive project overview

**Sections:**
1. Project description and purpose
2. Quick start guide (3 steps)
3. Feature highlights
4. Link to detailed USER_GUIDE.md
5. Deployment info (GitHub Pages URL)
6. Dash Platform integration notes
7. Contributing guidelines
8. License

**Input:** `docs/FEATURE_LIST.md` from QA Agent
**Deliverable:** `README.md` (root directory)

---

## Task 2: Write USER_GUIDE.md

**Objective:** Step-by-step walkthrough of entire wizard

**Structure:**
1. Introduction to Dash Platform tokens
2. Wizard overview
3. Step-by-step for each screen:
   - **Welcome**: Template selection
   - **Naming**: Token name, localization, update rules
   - **Permissions**: Supply, minting, burning, freezing, max supply rules
   - **Advanced**: History tracking, launch settings, root config
   - **Distribution**: Cadence, emission, recipient, rules
   - **Search**: Keywords and description
   - **Registration**: Three methods (Mobile/DET/Self-service)
4. Best practices
5. Example configurations

**Input:** `docs/FEATURE_LIST.md`, `docs/FEATURE_TEST_RESULTS.md` from QA Agent
**Deliverable:** `docs/USER_GUIDE.md`

---

## Task 3: Write FAQ.md

**Objective:** Answer 10+ common questions

**Required questions:**
1. What is the Dash Token Wizard?
2. Do I need coding experience?
3. What is Dash Platform?
4. How do I register my token?
5. What's the difference between base supply and max supply?
6. What are governance safeguards?
7. Can I change settings after deployment?
8. What are identity IDs and where do I get one?
9. What's the difference between Mobile, DET, and Self-service registration?
10. How do I test on testnet?
11. What are evonodes?
12. What does "change control" mean?

**Input:** `docs/COMMON_ERRORS.md` from QA Agent
**Deliverable:** `docs/FAQ.md`

---

## Task 4: Write TROUBLESHOOTING.md

**Objective:** Common issues and solutions

**Sections:**
1. Browser compatibility issues
2. Validation errors and fixes
3. State persistence issues (localStorage)
4. QR code not generating
5. Dash SDK errors
6. JSON format validation
7. Identity ID format errors
8. Mobile responsiveness issues

**Input:** `docs/COMMON_ERRORS.md` from QA Agent
**Deliverable:** `docs/TROUBLESHOOTING.md`

---

## Task 5: Write TOOLTIP_CONTENT.md

**Objective:** Provide tooltip text for 25+ complex fields

**Format for each tooltip:**
```markdown
### Field: [field-id]
**Title:** [Short heading]
**Content:** [2-3 sentence explanation]
**Example:** [Example value if applicable]
**Learn more:** [Link to USER_GUIDE section]
```

**Input:** `docs/TOOLTIP_FIELDS.md` from QA Agent
**Deliverable:** `docs/TOOLTIP_CONTENT.md`

---

## Handoff to Frontend Agent

**Files to provide:**
1. `docs/TOOLTIP_CONTENT.md` - All tooltip text ready to implement
2. `docs/USER_GUIDE.md` - For "Learn more" links in tooltips

**Action Required:** Frontend Agent implements tooltips in UI using design system

---

**Status:** Waiting for QA Agent handoff
