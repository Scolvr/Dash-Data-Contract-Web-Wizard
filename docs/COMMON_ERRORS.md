# Common Errors & Edge Cases

**Created by:** QA Agent
**Date:** 2025-11-14
**Purpose:** Document validation errors and edge cases for troubleshooting

---

## Validation Errors

### Token Name / Text Fields

**Error:** "Token name is required"
- **Cause:** Empty or whitespace-only token name field
- **Solution:** Enter a valid token name (at least 1 character)

**Error:** Invalid characters in token name
- **Cause:** Special characters that can't be converted to symbol
- **Solution:** Use alphanumeric characters; symbol will be generated automatically

### Numeric Fields

**Error:** "Decimals must be between 0 and 18"
- **Cause:** Decimal value outside valid range
- **Solution:** Choose 0-18 decimals (8 is common for currency-like tokens)

**Error:** "Base supply cannot exceed max supply"
- **Cause:** Base supply set higher than max supply cap
- **Solution:** Either increase max supply or decrease base supply

**Error:** "Value must be a positive number"
- **Cause:** Negative numbers or zero in amount fields
- **Solution:** Enter positive values only

**Error:** "Value exceeds maximum (4,294,967,295)"
- **Cause:** Number larger than uint32 max value
- **Solution:** Use smaller values or consider token economics

### Identity ID Format

**Error:** "Invalid identity ID format"
- **Cause:** Identity ID is not valid Base58 or wrong length
- **Expected Format:** Base58 string, 43-44 characters
- **Example:** `GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec`
- **Solution:** Get identity ID from Dash Platform wallet or dash-evo-tool

**Common mistake:** Pasting contract ID instead of identity ID
- **How to tell:** Identity IDs are 43-44 chars, contract IDs vary

### Localization

**Error:** "Language code must be 2 letters"
- **Cause:** Invalid ISO language code format
- **Valid examples:** `en`, `es`, `fr`, `de`, `ja`, `zh`
- **Invalid examples:** `eng`, `english`, `EN` (must be lowercase)

**Error:** "Duplicate language code"
- **Cause:** Trying to add same language twice
- **Solution:** Edit existing entry instead of creating duplicate

### Distribution Configuration

**Error:** "Interval must be greater than zero"
- **Cause:** Block interval, time interval, or epoch set to 0 or negative
- **Solution:** Enter positive values (e.g., 100 blocks, 3600 seconds, epoch 1)

**Error:** "Invalid emission configuration"
- **Cause:** Missing required fields for selected emission function
- **Solution:**
  - Fixed Amount: Enter amount
  - Random Amount: Enter both min and max
  - Step Decreasing: Fill all required fields (step count, numerator, denominator, start amount, trailing amount)

**Error:** "Min amount cannot exceed max amount"
- **Cause:** Random emission min > max
- **Solution:** Ensure min < max

**Error:** "Evonodes recipient only available for Epoch-based distribution"
- **Cause:** Selected Evonodes recipient with Block or Time cadence
- **Solution:** Change cadence to Epoch-based, or choose different recipient

### Wallet / Registration

**Error:** "Invalid mnemonic phrase"
- **Cause:** Incorrect number of words or invalid BIP39 words
- **Expected:** 12 or 24 words from BIP39 wordlist
- **Solution:** Double-check mnemonic from backup

**Error:** "Could not connect to Dash Platform"
- **Cause:** Network issues, testnet down, or invalid SDK configuration
- **Solution:**
  - Check internet connection
  - Verify Dash Platform testnet status
  - Try again later

**Error:** "Insufficient funds for registration"
- **Cause:** Wallet doesn't have enough Dash to pay for contract registration
- **Solution:** Fund wallet with testnet Dash from faucet

---

## Edge Cases & Gotchas

### State Persistence

**Issue:** Changes lost after browser refresh
- **Cause:** localStorage disabled or full
- **Solution:**
  - Enable localStorage in browser settings
  - Clear old localStorage data
  - Use "Download JSON" to backup configuration

**Issue:** "Old" configuration appears after returning
- **Cause:** State cached in localStorage from previous session
- **Solution:** Use "Clear State" or "Start Fresh" option

### Navigation

**Issue:** Can't proceed to next step
- **Cause:** Current step validation failed
- **Look for:** Red validation messages under fields
- **Solution:** Fix all validation errors before proceeding

**Issue:** "Back" button removes unsaved changes
- **Cause:** Browser back button bypasses wizard state
- **Solution:** Use wizard's "Previous" button instead of browser back

### Template Loading

**Issue:** Template doesn't fully apply
- **Cause:** Some values conflict with wizard defaults
- **Solution:** Review all fields after loading template

### QR Code Generation

**Issue:** QR code not appearing
- **Cause:** Configuration incomplete or invalid
- **Solution:** Complete all required fields and fix validation errors first

**Issue:** QR code too complex to scan
- **Cause:** Very large configuration creates dense QR code
- **Solution:** Use DET or Self-service registration instead

### JSON Export

**Issue:** Downloaded JSON has wrong format
- **Cause:** Browser encoding issues
- **Solution:** Use "Copy to Clipboard" and paste into text editor, save as UTF-8

### Theme / Display

**Issue:** UI looks broken in dark mode
- **Cause:** Browser doesn't support CSS color-mix or backdrop-filter
- **Solution:** Update browser or switch to light theme

**Issue:** Sidebar doesn't scroll on mobile
- **Cause:** Device height too small for all navigation items
- **Solution:** Rotate device or use desktop browser

### Dash SDK Integration

**Issue:** Self-service registration stuck "Loading..."
- **Cause:** Dash SDK not loaded from CDN
- **Solution:**
  - Check internet connection
  - Verify CDN URL: `https://cdn.jsdelivr.net/npm/dash@5/dist/dash.min.js`
  - Check browser console for errors

**Issue:** "Identity not found" error
- **Cause:** Identity ID doesn't exist on testnet
- **Solution:** Create identity first using dash-evo-tool or leave empty to create new

---

## Performance Issues

### Slow Loading

**Issue:** Wizard loads slowly
- **Cause:** Large localStorage, slow network (CDN), or many browser extensions
- **Solution:**
  - Clear browser cache
  - Disable unnecessary extensions
  - Check network speed

### Browser Compatibility

**Tested Browsers:**
- ✅ Chrome 120+ (Recommended)
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

**Known Issues:**
- ⚠️ IE 11: Not supported (use modern browser)
- ⚠️ Safari < 16: Backdrop-filter may not work (glassmorphism disabled)

---

## Security Warnings

### Mnemonic Handling

⚠️ **CRITICAL:** Never share your mnemonic phrase
- The wizard stores it in memory ONLY during self-service registration
- It is NOT sent to any server
- It is NOT saved to localStorage
- Close the browser tab immediately after registration

### Identity ID Privacy

⚠️ **Note:** Identity IDs are public on Dash Platform
- They are visible in blockchain explorer
- Do not use personally identifiable information

### Testing vs Production

⚠️ **Important:** This wizard connects to **Dash Platform Testnet**
- Testnet tokens have NO REAL VALUE
- Test configurations thoroughly before deploying to mainnet
- Mainnet deployment requires different tooling

---

## Common User Questions (for FAQ)

1. "Why can't I set base supply higher than max supply?"
   - Max supply is a hard cap; base supply is initial amount

2. "What happens if I select 'No One' for all permissions?"
   - Token becomes immutable; no changes possible after deployment

3. "Can I change these settings after registration?"
   - Only if you enabled change control rules during setup

4. "Do I need an identity ID to create a token?"
   - Yes, all Dash Platform contracts require an owner identity

5. "What's the difference between owner and main control group?"
   - Owner is a single identity; main control group is multi-sig governance

6. "How do I test my token before mainnet?"
   - Use testnet registration, test all features, then recreate for mainnet

7. "Why does my token symbol look weird?"
   - Auto-generated from token name; use 3-6 uppercase alphanumeric chars

8. "What are governance safeguards?"
   - Checkboxes that allow/prevent permanently locking permissions

---

## Testing Checklist for Users

Before registering your token:

- [ ] Test token name and symbol generation
- [ ] Verify decimal places match your needs
- [ ] Confirm base supply and max supply values
- [ ] Review all enabled permissions
- [ ] Test distribution schedule (if using perpetual/pre-programmed)
- [ ] Verify governance rules are correct
- [ ] Download JSON backup
- [ ] Test QR code scanning (if using mobile registration)
- [ ] Confirm identity ID is correct
- [ ] Review final JSON one more time

---

**For Documentation Agent:**
- Use error messages for TROUBLESHOOTING.md
- Convert user questions to FAQ.md
- Reference edge cases in USER_GUIDE.md warnings

**Handoff ready:** ✅
