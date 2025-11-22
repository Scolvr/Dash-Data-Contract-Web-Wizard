# DevOps Agent Workflow

**Agent:** DevOps & Deployment
**Mission:** Deploy to GitHub Pages and verify production environment

**Dependencies:** Wait for all other agents to complete

---

## Task 1: Pre-Deployment Checklist

**Verify:**
- [ ] All features tested by QA Agent
- [ ] Documentation complete (README, USER_GUIDE, FAQ, TROUBLESHOOTING)
- [ ] Tooltips implemented by Frontend Agent
- [ ] No console errors in browser
- [ ] All CDN links working (Dash SDK: https://cdn.jsdelivr.net/npm/dash@5/dist/dash.min.js)
- [ ] No hardcoded localhost URLs

---

## Task 2: Configure GitHub Pages

**Steps:**
1. Ensure repository exists on GitHub
2. Go to repository Settings → Pages
3. Configure source:
   - Branch: `main` or `gh-pages`
   - Folder: `/` (root) or `/docs`
4. Save configuration
5. Note the published URL: `https://[username].github.io/[repo-name]/`

**If using custom domain:**
- Add CNAME file
- Configure DNS records
- Enable HTTPS in GitHub Pages settings

---

## Task 3: Deploy Application

**Files to ensure are in repo:**
- `index.html`
- `app.js`
- `styles.css`
- `README.md`
- `docs/*.md` (all documentation)
- `server.js` (for local dev only, not needed for GitHub Pages)

**Deployment:**
```bash
git add .
git commit -m "docs: complete documentation and tooltips for production"
git push origin main
```

**Wait for GitHub Actions to complete** (if configured)

---

## Task 4: Production Testing

**Test on deployed URL:**
- [ ] Navigate through entire wizard
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on mobile (iOS and Android)
- [ ] Verify tooltips work
- [ ] Test Dash Platform integration (testnet)
- [ ] Verify HTTPS is working
- [ ] Check no mixed content warnings
- [ ] Test QR code generation (Mobile registration)
- [ ] Test JSON export (DET registration)

---

## Task 5: Create Deployment Documentation

**File:** `DEPLOYMENT.md`

**Content:**
1. How to deploy updates (git workflow)
2. GitHub Pages configuration
3. Testing checklist before deployment
4. Rollback procedure (revert commit)
5. Production URL
6. Monitoring/analytics (if applicable)

---

## Task 6: Update README with Production URL

**Add to README.md:**
```markdown
## Live Demo

🚀 **Try it now:** https://[your-url].github.io/token-wizard/

Hosted on GitHub Pages | Connects to Dash Platform Testnet
```

---

## Final Handoff

**Deliverables:**
1. Live site on GitHub Pages
2. `DEPLOYMENT.md` created
3. README.md updated with production URL
4. Production environment tested and verified

**Status:** Project complete and deployed

---

**Status:** Waiting for all agents to complete
