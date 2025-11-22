# Frontend Agent Workflow

**Agent:** Frontend & UX
**Mission:** Add tooltips, improve accessibility, polish UI using design system

**Dependencies:** Wait for Documentation Agent to provide TOOLTIP_CONTENT.md

**Reference:** `FRONTEND_DESIGN_SYSTEM.md` (already created in planning phase)

---

## Task 1: Create Tooltip Component System

**Objective:** Build reusable tooltip infrastructure

**Requirements:**
- Help icon component (SVG)
- Tooltip popover with arrow
- Show/hide on click AND keyboard (Enter/Space)
- Position intelligently (avoid viewport overflow)
- Support light/dark themes
- Accessible (role="tooltip", aria-describedby)

**Files to create/modify:**
- `styles.css` - Add tooltip styles (use existing `.help-tooltip` as base)
- `app.js` - Add tooltip show/hide logic

---

## Task 2: Implement 25+ Tooltips

**Objective:** Add tooltips to all complex fields

**Process:**
1. Read `docs/TOOLTIP_CONTENT.md` from Documentation Agent
2. For each field:
   - Add help icon next to label
   - Wire up tooltip content
   - Ensure keyboard accessibility
   - Test positioning on mobile
3. Use design system variables from `FRONTEND_DESIGN_SYSTEM.md`:
   - Colors: `--color-*`
   - Spacing: `--space-4` for margins
   - Shadows: `--shadow-md`
   - Transitions: `--transition-base`

**Fields to implement:** (from Documentation Agent's TOOLTIP_CONTENT.md)

---

## Task 3: Accessibility Audit

**Checklist:**

**ARIA:**
- [ ] All tooltips have `role="tooltip"`
- [ ] Help icons have `aria-label="Help: [topic]"`
- [ ] Tooltips linked via `aria-describedby`
- [ ] Expandable tooltips have `aria-expanded`

**Keyboard Navigation:**
- [ ] All tooltips keyboard accessible (Tab + Enter/Space)
- [ ] Focus-visible states on help icons
- [ ] Escape key closes tooltips

**Screen Reader:**
- [ ] Tooltip content readable by screen readers
- [ ] No visual-only information

**Color Contrast:**
- [ ] All text meets WCAG AA (4.5:1)
- [ ] Tooltips work in light/dark themes
- [ ] Test with contrast checker

---

## Task 4: Polish & Error Messages

**Improvements:**
- Make validation messages more helpful
- Add "Learn more" links to USER_GUIDE.md
- Ensure all error states are clear

---

## Deliverables

1. Updated `index.html` with help icons and tooltip markup
2. Updated `styles.css` with tooltip styles
3. Updated `app.js` with tooltip logic
4. Accessibility checklist completed

---

## Handoff to DevOps Agent

**Signal:** All UI polish complete, ready for deployment

**Action Required:** DevOps Agent deploys to GitHub Pages

---

**Status:** Waiting for Documentation Agent handoff
