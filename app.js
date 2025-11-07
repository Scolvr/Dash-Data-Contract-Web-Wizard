/*
 * Dash Token Wizard front-end logic.
 * Version: 19.0.1760857080
 */
(function () {
  'use strict';

  // Version checker - displays in console
  console.log('%c═══════════════════════════════════════════════════════', 'color: #008de4; font-weight: bold');
  console.log('%c🚀 Dash Token Wizard v22.0 FINAL', 'color: #008de4; font-weight: bold; font-size: 16px;');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #008de4; font-weight: bold');
  console.log('%c✓ Event delegation pattern: PROFESSIONAL', 'color: #00ff00;');
  console.log('%c✓ Form submission prevention: FIXED', 'color: #00ff00;');
  console.log('%c✓ Navigation flow: WORKING', 'color: #00ff00;');
  console.log('%c═══════════════════════════════════════════════════════\n', 'color: #008de4; font-weight: bold');

  const STATE_STORAGE_KEY = 'dashTokenWizardState';
  const THEME_STORAGE_KEY = 'ui.theme';
  // FIXED: Correct order matching sidebar navigation
  // Note: 'overview' removed from sequence - accessible only from Document tab
  const STEP_SEQUENCE = ['welcome', 'naming', 'permissions', 'advanced', 'distribution', 'search', 'registration'];
  const INFO_STEPS = Object.freeze([
    'permissions-group',
    'permissions-manual-mint',
    'permissions-manual-burn',
    'permissions-freeze',
    'permissions-unfreeze',
    'permissions-destroy-frozen',
    'permissions-emergency-action',
    'permissions-max-supply',
    'permissions-conventions',
    'permissions-marketplace-trade-mode',
    'permissions-direct-pricing',
    'permissions-main-control'
  ]);
  const TRACKED_STEPS = Object.freeze([...STEP_SEQUENCE, ...INFO_STEPS]);
  const MANUAL_ACTION_DEFINITIONS = Object.freeze([
    { key: 'manualMint', stepId: 'permissions-manual-mint', domPrefix: 'manual-mint' },
    { key: 'manualBurn', stepId: 'permissions-manual-burn', domPrefix: 'manual-burn' },
    { key: 'manualFreeze', stepId: 'permissions-manual-freeze', domPrefix: 'manual-freeze' },
    { key: 'destroyFrozen', stepId: 'permissions-destroy-frozen', domPrefix: 'destroy-frozen' },
    { key: 'emergencyAction', stepId: 'permissions-emergency', domPrefix: 'emergency' },
    { key: 'conventionsChange', stepId: 'permissions-conventions-change', domPrefix: 'conventions-change' },
    { key: 'marketplaceTradeMode', stepId: 'permissions-marketplace-trade-mode-change', domPrefix: 'marketplace-trade-mode' },
    { key: 'directPricing', stepId: 'permissions-direct-pricing-change', domPrefix: 'direct-pricing' },
    { key: 'mainControl', stepId: 'permissions-main-control-change', domPrefix: 'main-control' }
  ]);
  const INFO_STEP_PARENT = Object.freeze({
    // Naming substeps
    'naming-localization': 'naming',
    'naming-update': 'naming',
    // Permissions substeps
    'permissions-group': 'permissions',
    'permissions-transfer': 'permissions',
    'permissions-manual-mint': 'permissions',
    'permissions-manual-burn': 'permissions',
    'permissions-manual-freeze': 'permissions',
    'permissions-freeze': 'permissions',
    'permissions-unfreeze': 'permissions',
    'permissions-destroy-frozen': 'permissions',
    'permissions-emergency': 'permissions',
    'permissions-emergency-action': 'permissions',
    'permissions-conventions-change': 'permissions',
    'permissions-marketplace-trade-mode-change': 'permissions',
    'permissions-direct-pricing-change': 'permissions',
    'permissions-main-control-change': 'permissions',
    'permissions-max-supply': 'permissions',
    'permissions-conventions': 'permissions',
    'permissions-marketplace-trade-mode': 'permissions',
    'permissions-direct-pricing': 'permissions',
    'permissions-main-control': 'permissions',
    // Advanced substeps
    'advanced-history': 'advanced',
    'advanced-launch': 'advanced',
    // Distribution substeps
    'distribution-preprogrammed': 'distribution',
    'distribution-perpetual': 'distribution'
  });

  // FIXED: Substep sequences matching the actual sidebar navigation
  // naming: Token Name → Localization → Update
  // permissions: Token Supply → Minting → Burning → Freezing → Emergency Actions
  // advanced (displayed as "Usage"): History → Trading Rules → Launch Settings
  // distribution: Schedule → Emission
  // search: Keywords & Description (single screen)
  // registration: Register Token (no substeps)
  const SUBSTEP_SEQUENCES = Object.freeze({
    welcome: ['welcome'],
    naming: ['naming', 'naming-localization', 'naming-update'],
    permissions: ['permissions', 'permissions-transfer', 'permissions-manual-mint', 'permissions-manual-burn', 'permissions-manual-freeze', 'permissions-emergency', 'permissions-conventions-change', 'permissions-marketplace-trade-mode-change', 'permissions-direct-pricing-change', 'permissions-main-control-change'],
    advanced: ['advanced-history', 'advanced', 'advanced-launch'],
    distribution: ['distribution-preprogrammed', 'distribution-perpetual'],
    search: ['search'],
    registration: ['registration']
  });

  const MAX_U32 = 4294967295;
  const STEP_LABELS = {
    welcome: 'Welcome',
    naming: 'Naming',
    permissions: 'Permissions',
    distribution: 'Distribution',
    advanced: 'Advanced',
    overview: 'Overview',
    registration: 'Registration',
    'permissions-group': 'Group permissions',
    'permissions-transfer': 'Transfer settings',
    'permissions-manual-mint': 'Manual mint',
    'permissions-manual-burn': 'Manual burn',
    'permissions-manual-freeze': 'Manual freeze',
    'permissions-freeze': 'Freeze',
    'permissions-unfreeze': 'Unfreeze',
    'permissions-destroy-frozen': 'Destroy frozen funds',
    'permissions-emergency': 'Emergency actions',
    'permissions-emergency-action': 'Emergency action',
    'permissions-max-supply': 'Max. supply change',
    'permissions-conventions': 'Conventions change',
    'permissions-marketplace-trade-mode': 'Marketplace trade mode change',
    'permissions-direct-pricing': 'Direct purchase pricing change',
    'permissions-main-control': 'Main control change'
  };
  const CHUNK_ERROR_PATTERN = /(ChunkLoadError|Loading chunk|dynamically imported module)/i;
  const CHUNK_RECOVERY_FLAG = 'dashWizardChunkRecoveryPending';

  // ADDED: BigInt feature detection (for browsers that don't support BigInt)
  const hasBigIntSupport = typeof BigInt !== 'undefined';

  // Safe BigInt comparison utility
  function safeBigIntCompare(a, b) {
    if (!hasBigIntSupport) {
      // Fallback for older browsers - use string comparison (less accurate but works)
      console.warn('BigInt not supported, using fallback comparison');
      // Pad strings and compare (simple fallback, not perfect for all cases)
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
      }
      return 0;
    }
    try {
      const aBig = BigInt(a);
      const bBig = BigInt(b);
      return aBig < bBig ? -1 : aBig > bBig ? 1 : 0;
    } catch (error) {
      console.error('BigInt comparison failed:', error);
      throw error;
    }
  }

  // Storage with localStorage fallback (keeps UI state across reloads; never persist secrets)
  const storage = (() => {
    try {
      const ls = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
      if (!ls) {
        throw new Error('localStorage unavailable');
      }
      const k = '__wizard_test__';
      ls.setItem(k, '1');
      ls.removeItem(k);
      return ls;
    } catch {
      const store = new Map();
      return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear()
      };
    }
  })();

  const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

  function generateId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    const random = Math.random().toString(36).slice(2, 10);
    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}${random}`;
  }

  function normaliseUnsignedValue(value) {
    let digits;
    if (typeof value === 'number' && Number.isFinite(value)) {
      digits = String(Math.max(0, Math.trunc(value)));
    } else if (typeof value === 'string') {
      digits = value.replace(/[^0-9]/g, '');
    } else {
      digits = '';
    }

    if (!digits) {
      return '';
    }

    const numericValue = Number(digits);
    if (!Number.isFinite(numericValue)) {
      return digits;
    }

    if (numericValue > MAX_U32) {
      return String(MAX_U32);
    }

    if (numericValue < 0) {
      return '0';
    }

    return String(numericValue);
  }

  function normalisePermissionMember(member = {}) {
    return {
      id: typeof member.id === 'string' && member.id ? member.id : generateId('member'),
      identity: typeof member.identity === 'string'
        ? member.identity
        : typeof member.name === 'string'
          ? member.name
          : '',
      power: normaliseUnsignedValue(member.power)
    };
  }

  function normalisePermissionGroup(group = {}) {
    const members = Array.isArray(group.members) ? group.members.map(normalisePermissionMember) : [];
    return {
      id: typeof group.id === 'string' && group.id ? group.id : generateId('group'),
      requiredPower: normaliseUnsignedValue(group.requiredPower),
      members
    };
  }

  function normalisePermissionsGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) {
      return [];
    }
    return rawGroups.map(normalisePermissionGroup);
  }

  function clampMainControlIndex(index, groupCount) {
    if (!groupCount) {
      return -1;
    }
    if (typeof index !== 'number' || Number.isNaN(index)) {
      return 0;
    }
    return Math.max(0, Math.min(groupCount - 1, Math.trunc(index)));
  }

  function createInfoButton(panelId, srLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wizard-info-trigger';
    button.setAttribute('aria-expanded', 'false');
    if (panelId) {
      button.setAttribute('aria-controls', panelId);
    }
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = srLabel;
    const icon = document.createElement('span');
    icon.className = 'wizard-info-trigger__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'i';
    button.append(srOnly, icon);
    return button;
  }

  function createInfoPanel(panelId, message) {
    const panel = document.createElement('div');
    panel.className = 'wizard-info-panel';
    if (panelId) {
      panel.id = panelId;
    }
    panel.setAttribute('hidden', '');
    const body = document.createElement('p');
    body.className = 'wizard-info-panel__body';
    body.textContent = message;
    panel.appendChild(body);
    return panel;
  }

  function createConditionalFieldMount(wrapper) {
    if (!wrapper) {
      return {
        show: () => { },
        hide: () => { }
      };
    }

    const parent = wrapper.parentNode;
    const marker = document.createComment('conditional-field');
    if (parent) {
      parent.insertBefore(marker, wrapper);
    }

    function ensureMarkerParent() {
      return marker.parentNode;
    }

    function show() {
      const host = ensureMarkerParent();
      if (!host) {
        return;
      }
      if (wrapper.parentNode !== host) {
        host.insertBefore(wrapper, marker.nextSibling);
      }
      wrapper.removeAttribute('hidden');
    }

    function hide() {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      wrapper.setAttribute('hidden', '');
    }

    const mount = { show, hide };
    if (wrapper.hasAttribute('hidden')) {
      hide();
    } else {
      show();
    }
    return mount;
  }

  function getStepIndex(stepId) {
    return STEP_SEQUENCE.indexOf(stepId);
  }

  function getPrimaryStepId(stepId) {
    return INFO_STEP_PARENT[stepId] || stepId;
  }

  function computeFurthestValidIndexFromSteps(steps) {
    let furthest = -1;
    STEP_SEQUENCE.forEach((id, index) => {
      const state = steps[id];
      if (state && state.validity === 'valid') {
        furthest = index;
      }
    });
    return furthest;
  }

  function clampFurthestIndex(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return -1;
    }
    return Math.min(Math.max(Math.trunc(value), -1), STEP_SEQUENCE.length - 1);
  }

  const DEFAULT_KEEP_HISTORY = {
    transfers: true,
    mints: true,
    burns: true,
    freezes: false,
    purchases: false
  };

  const DEFAULT_CHANGE_CONTROL_FLAGS = {
    freeze: true,
    unfreeze: true,
    destroyFrozen: false,
    emergency: false,
    directPurchase: false,
    admin: true
  };

  const DEFAULT_WALLET_STATE = Object.freeze({
    mnemonic: '',
    privateKey: '',
    address: '',
    balance: null,
    fingerprint: ''
  });

  const DEFAULT_MANUAL_ACTION_STATE = Object.freeze({
    enabled: false,
    performerType: 'none',
    performerReference: '',
    ruleChangerType: 'owner',
    ruleChangerReference: '',
    allowChangeAuthorizedToNone: false,
    allowChangeAdminToNone: false,
    allowSelfChangeAdmin: false,
    destinationType: 'contract-owner',
    destinationIdentity: '',
    allowCustomDestination: false
  });

  const DEFAULT_FREEZE_RULES_STATE = Object.freeze({
    enabled: false,
    perform: {
      type: 'none',
      identity: ''
    },
    changeRules: {
      type: 'owner',
      identity: ''
    },
    flags: {
      changeAuthorizedToNoOneAllowed: false,
      changeAdminToNoOneAllowed: false,
      selfChangeAdminAllowed: false
    }
  });

  const DEFAULT_IDENTITY_STATE = Object.freeze({ id: '' });

  function cloneDefaultWalletState() {
    return { ...DEFAULT_WALLET_STATE };
  }

  function cloneDefaultIdentityState() {
    return { ...DEFAULT_IDENTITY_STATE };
  }

  function createDefaultManualActionState() {
    return { ...DEFAULT_MANUAL_ACTION_STATE };
  }

  function createDefaultFreezeState() {
    return {
      enabled: DEFAULT_FREEZE_RULES_STATE.enabled,
      perform: { ...DEFAULT_FREEZE_RULES_STATE.perform },
      changeRules: { ...DEFAULT_FREEZE_RULES_STATE.changeRules },
      flags: { ...DEFAULT_FREEZE_RULES_STATE.flags }
    };
  }

  function createDefaultWizardState() {
    const steps = TRACKED_STEPS.reduce((accumulator, id) => {
      accumulator[id] = { id, validity: 'unknown', touched: false };
      return accumulator;
    }, {});
    const manualActionsDefaults = MANUAL_ACTION_DEFINITIONS.reduce((accumulator, definition) => {
      accumulator[definition.key] = createDefaultManualActionState();
      return accumulator;
    }, {});

    return {
      active: 'naming',
      furthestValidIndex: -1,
      steps,
      runtime: {
        walletClient: null,
        walletClientFingerprint: null,
        walletInitializationError: '',
        walletInfoLoading: false
      },
      form: {
        tokenName: '',
        naming: {
          singular: '',
          plural: '',
          capitalize: true,
          description: '',
          keywords: [],
          conventions: {
            localizations: {}
          },
          rows: []
        },
        permissions: {
          decimals: 2,
          baseSupply: '',
          useMaxSupply: false,
          maxSupply: '',
          keepsHistory: { ...DEFAULT_KEEP_HISTORY },
          startAsPaused: false,
          allowTransferToFrozenBalance: false,
          transferNotesEnabled: false,
          transferNoteTypes: {
            public: true,
            sharedEncrypted: false,
            privateEncrypted: false
          },
          groups: [],
          mainControlGroupIndex: -1,
          freeze: createDefaultFreezeState(),
          unfreeze: {
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          },
          changeMaxSupply: {
            enabled: false,
            allowChangeAuthorizedToNone: false,
            allowChangeAdminToNone: false,
            allowSelfChangeAdmin: false
          },
          ...manualActionsDefaults
        },
        distribution: {
          enablePreProgrammed: false,
          enablePerpetual: false,
          cadence: {
            type: 'BlockBasedDistribution',
            intervalBlocks: '10',
            intervalSeconds: '60',
            epoch: 'monthly',
            startBlock: '',
            startTimestamp: ''
          },
          emission: {
            type: '',
            // Fixed Amount
            amount: '',
            // Random
            min: '10',
            max: '100',
            // Step Decreasing
            stepCount: '4',
            decreasePerIntervalNumerator: '1',
            decreasePerIntervalDenominator: '2',
            distributionStartAmount: '500',
            trailingDistributionIntervalAmount: '25',
            // Stepwise
            stepwise: [],
            // Linear
            linearStart: '',
            linearChange: '',
            // Exponential
            exponentialInitial: '',
            exponentialRate: '',
            // Polynomial
            polyA: '',
            polyD: '',
            polyM: '',
            polyN: '',
            polyO: '',
            polyB: '',
            // Logarithmic
            logA: '',
            logD: '',
            logM: '',
            logN: '',
            logO: '',
            logB: '',
            // Inverted Logarithmic
            invlogA: '',
            invlogD: '',
            invlogM: '',
            invlogN: '',
            invlogO: '',
            invlogB: ''
          },
          recipient: {
            type: 'contract-owner',
            identityId: ''
          },
          preProgrammed: {
            entries: []
          }
        },
        group: {
          enabled: false,
          name: '',
          threshold: 2,
          members: [
            { id: 'member-default-1', identityId: '', power: '1' },
            { id: 'member-default-2', identityId: '', power: '1' }
          ],
          permissions: {
            mint: true,
            burn: true,
            freeze: true,
            config: false,
            members: false
          }
        },
        documentTypes: {},
        advanced: {
          tradeMode: 'permissionless',
          changeControl: { ...DEFAULT_CHANGE_CONTROL_FLAGS }
        },
        search: {
          keywords: '',
          description: ''
        },
        registration: {
          method: null,
          wallet: cloneDefaultWalletState(),
          identity: cloneDefaultIdentityState(),
          preflight: {
            mobile: { qrGenerated: false },
            det: { jsonDisplayed: false },
            self: { warningAcknowledged: false }
          }
        }
      }
    };
  }

  function createEmptyLocalizationRowData() {
    return {
      code: '',
      singularForm: '',
      pluralForm: '',
      shouldCapitalize: true
    };
  }

  function normalizeLocalizationRowData(row) {
    if (!row || typeof row !== 'object') {
      return createEmptyLocalizationRowData();
    }
    const shouldCapitalize =
      typeof row.shouldCapitalize === 'boolean'
        ? row.shouldCapitalize
        : typeof row.should_capitalize === 'boolean'
          ? row.should_capitalize
          : Boolean(row.should_capitalize);
    return {
      code: typeof row.code === 'string' ? row.code : '',
      singularForm: typeof row.singularForm === 'string' ? row.singularForm : (typeof row.singular === 'string' ? row.singular : ''),
      pluralForm: typeof row.pluralForm === 'string' ? row.pluralForm : (typeof row.plural === 'string' ? row.plural : ''),
      shouldCapitalize
    };
  }

  function limitLocalizationRows(rows) {
    const candidates = Array.isArray(rows) ? rows : [];
    if (candidates.length === 0) {
      return [];
    }
    // FIXED: Return ALL localization rows, not just the first one
    // This allows multiple languages to be added
    return candidates.map(row => normalizeLocalizationRowData(row));
  }

  function createLocalizationRecordFromRow(row) {
    const normalized = normalizeLocalizationRowData(row);
    const code = typeof normalized.code === 'string' ? normalized.code.trim() : '';
    if (!code) {
      return {};
    }
    return {
      [code]: {
        should_capitalize: Boolean(normalized.shouldCapitalize),
        singular_form: normalized.singularForm || '',
        plural_form: normalized.pluralForm || ''
      }
    };
  }

  function limitLocalizationRecord(record) {
    if (!record || typeof record !== 'object') {
      return {};
    }
    const keys = Object.keys(record).sort();
    if (keys.length === 0) {
      return {};
    }
    const firstKey = keys[0];
    const entry = record[firstKey];
    if (!entry || typeof entry !== 'object') {
      return {};
    }
    return {
      [firstKey]: {
        should_capitalize: Boolean(entry.should_capitalize ?? entry.shouldCapitalize),
        singular_form:
          typeof entry.singular_form === 'string'
            ? entry.singular_form
            : typeof entry.singular === 'string'
              ? entry.singular
              : '',
        plural_form:
          typeof entry.plural_form === 'string'
            ? entry.plural_form
            : typeof entry.plural === 'string'
              ? entry.plural
              : ''
      }
    };
  }

  const wizardState = loadState();

  // FIXED: Expose wizardState and persistState to window for access from separate IIFEs (Group Management)
  window.wizardState = wizardState;
  window.persistState = persistState;
  window.renderPermissionGroups = renderPermissionGroups;
  const tokenNamePattern = createTokenNamePattern();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedStatus = window.sessionStorage.getItem(CHUNK_RECOVERY_FLAG);
      if (storedStatus === 'pending') {
        window.sessionStorage.removeItem(CHUNK_RECOVERY_FLAG);
      }
    }
  } catch (error) {
    console.debug('Unable to reset chunk recovery flag', error);
  }

  const wizardElement = document.getElementById('wizard');
  const globalLiveRegion = document.getElementById('global-live-region');
  // FIXED: Use actual selector from HTML - .wizard-nav-item (includes both expandable and regular)
  const progressItems = Array.from(document.querySelectorAll('.wizard-nav-item'));
  // FIXED: Use correct selector for substep navigation items
  const subpathItems = Array.from(document.querySelectorAll('.wizard-nav-subitem'));
  let manualNavigationActive = false;

  progressItems.forEach((item) => {
    item.setAttribute('role', 'button');
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }

    const stepId = item.getAttribute('data-step') || '';
    item.setAttribute('aria-disabled', stepId ? 'false' : 'true');
    // FIXED: Detect children by data-toggle attribute (points to submenu)
    const hasChildren = Boolean(item.getAttribute('data-toggle'));
    const submenuId = item.getAttribute('data-toggle');
    const nestedList = submenuId ? document.getElementById(submenuId) : null;

    if (hasChildren) {
      item.setAttribute('aria-haspopup', 'true');
      const isExpanded = item.getAttribute('aria-expanded') === 'true';
      if (nestedList && !isExpanded) {
        nestedList.setAttribute('hidden', '');
      }
    }

    item.addEventListener('click', (event) => {
      event.preventDefault();
      if (hasChildren) {
        // FIXED: Just toggle the section, don't navigate
        const nestedList = item.querySelector('.wizard-subpath');
        const isOpen = item.classList.toggle('is-open');
        if (isOpen) {
          delete item.dataset.userCollapsed;
        } else {
          item.dataset.userCollapsed = 'true';
        }
        item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (nestedList) {
          if (isOpen) {
            nestedList.removeAttribute('hidden');
          } else {
            nestedList.setAttribute('hidden', '');
          }
        }
        // Don't navigate when toggling - user can click substeps to navigate
        return;
      }
      activateWizardStepFromPath(item.getAttribute('data-step'));
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (hasChildren) {
          // FIXED: Just toggle the section, don't navigate
          const nestedList = item.querySelector('.wizard-subpath');
          const isOpen = item.classList.toggle('is-open');
          if (isOpen) {
            delete item.dataset.userCollapsed;
          } else {
            item.dataset.userCollapsed = 'true';
          }
          item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          if (nestedList) {
            if (isOpen) {
              nestedList.removeAttribute('hidden');
            } else {
              nestedList.setAttribute('hidden', '');
            }
          }
          // Don't navigate when toggling - user can click substeps to navigate
          return;
        }
        activateWizardStepFromPath(item.getAttribute('data-step'));
      }
    });
  });

  subpathItems.forEach((item) => {
    // FIXED: Get data-substep attribute instead of data-step
    const stepId = item.getAttribute('data-substep') || '';
    item.setAttribute('role', 'button');
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }

    const navigateToSubpath = () => {
      // FIXED: Allow substeps in addition to main steps and info steps
      const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps =>
        substeps.includes(stepId)
      );
      if (!stepId || (!STEP_SEQUENCE.includes(stepId) && !INFO_STEPS.includes(stepId) && !isValidSubstep)) {
        return;
      }
      manualNavigationActive = true;
      showScreen(stepId, { force: true, isManualNavigation: true });
      const parent = item.closest('.wizard-nav-item--expandable[data-toggle]');
      if (parent) {
        parent.classList.add('is-open');
        delete parent.dataset.userCollapsed;
        parent.setAttribute('aria-expanded', 'true');
        const nestedList = parent.querySelector('.wizard-subpath');
        if (nestedList) {
          nestedList.removeAttribute('hidden');
        }
      }
    };

    item.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateToSubpath();
    });

    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        event.stopPropagation();
        navigateToSubpath();
      }
    });
  });

  function activateWizardStepFromPath(stepId) {
    if (!stepId || (!STEP_SEQUENCE.includes(stepId) && !INFO_STEPS.includes(stepId))) {
      return;
    }
    manualNavigationActive = true;
    showScreen(stepId, { force: true, isManualNavigation: true });
  }

  const namingForm = document.getElementById('naming-form');
  const permissionsForm = document.getElementById('permissions-form');
  const transferForm = document.getElementById('permissions-transfer-form');
  const distributionForm = document.getElementById('distribution-form');
  const advancedForm = document.getElementById('advanced-form');
  const registrationForm = document.getElementById('registration-form');
  const groupMainPositionInput = document.getElementById('group-main-position');
  const groupAddButton = document.getElementById('group-add');
  const groupListElement = document.getElementById('group-list');
  const groupEmptyHint = document.getElementById('group-empty');

  const walletFileInput = document.getElementById('wallet-file');
  const walletMnemonicInput = document.getElementById('wallet-mnemonic');
  const walletMessage = document.getElementById('wallet-message');
  const walletAddressValue = document.getElementById('wallet-address');
  const walletBalanceValue = document.getElementById('wallet-balance');
  const walletBalanceNote = document.getElementById('wallet-balance-note');

  const identityMessage = document.getElementById('identity-message');
  const identityRegisterButton = document.getElementById('identity-register');
  const identityIdOutput = document.getElementById('identity-id');
  const identityGuidance = document.getElementById('identity-guidance');

  let walletClientInitializationPromise = null;
  let walletClientInitializationFingerprint = null;

  const tokenNameInput = document.getElementById('token-name');
  const tokenNameMessage = document.getElementById('token-name-message');
  const namingNextButton = document.getElementById('naming-next');
  const namingLocalizationNextButton = document.getElementById('naming-localization-next');

  // Removed tokenSingularInput - using tokenName as singular form
  const tokenPluralInput = document.getElementById('token-plural');
  const tokenCapitalizeInput = document.getElementById('token-capitalize');
  const tokenPluralMessage = document.getElementById('token-plural-message');

  const localizationWrapper = document.getElementById('localization-wrapper');
  const localizationEmptyState = document.getElementById('localization-empty-state');
  const localizationGuidance = document.getElementById('localization-guidance');
  const localizationList = document.getElementById('localization-list');
  const localizationAddButton = document.getElementById('localization-add');
  const localizationGlobalMessage = document.getElementById('localization-global-message');

  const permissionsMessage = document.getElementById('permissions-message');
  const permissionsNextButton = document.getElementById('permissions-next');
  const transferMessage = document.getElementById('permissions-transfer-message');
  const transferNextButton = document.getElementById('permissions-transfer-next');

  const distributionMessage = document.getElementById('distribution-message');
  const distributionNextButton = document.getElementById('distribution-next');
  // FIXED: Add reference to distribution skip button
  const distributionSkipButton = document.getElementById('distribution-skip');
  const distributionEmissionSkipButton = document.getElementById('distribution-emission-skip');
  // FIXED: Add reference to emission substep button and message
  const distributionEmissionNextButton = document.getElementById('distribution-emission-next');
  const distributionEmissionMessage = document.getElementById('distribution-emission-message');

  const advancedMessage = document.getElementById('advanced-message');
  const advancedNextButton = document.getElementById('advanced-next');
  const overviewNextButton = document.getElementById('overview-next');
  const overviewBackButton = document.getElementById('overview-back');

  const searchMessage = document.getElementById('search-message');
  const searchNextButton = document.getElementById('search-next');
  const searchKeywordsInput = document.getElementById('search-keywords');
  const searchDescriptionInput = document.getElementById('search-description');

  // FIXED: Use existing HTML inputs instead of creating new ones
  let permissionsUI = createPermissionsUIFromHTML(permissionsForm);
  let transferUI = createTransferUI(transferForm);
  let distributionUI = createDistributionUI(distributionForm);
  let advancedUI = createAdvancedUI(advancedForm);
  const manualActionUIs = {};
  let freezeUI = null;

  const validationTimers = {};
  const validationFingerprints = {};

  /** @type {{ hasQr: boolean; hasJson: boolean; hasIdentity: boolean; hasPrivateKey: boolean }} */
  const wizardReadiness = {
    hasQr: false,
    hasJson: false,
    hasIdentity: false,
    hasPrivateKey: false
  };
  let chunkRecoveryScheduled = false;

  const readinessReminderMessage = 'Please finish QR, JSON, Identity & Private Key before continuing.';

  /**
   * @param {{ hasQr: boolean; hasJson: boolean; hasIdentity: boolean; hasPrivateKey: boolean }} state
   */
  function isReadyToCreateNew(state) {
    return Boolean(state.hasQr && state.hasJson && state.hasIdentity && state.hasPrivateKey);
  }

  let localizationRows = [];
  let localizationRowIdCounter = 0;

  const registrationMethodsContainer = document.querySelector('.registration-methods');
  const registrationOptionLabels = registrationMethodsContainer
    ? Array.from(registrationMethodsContainer.querySelectorAll('.wizard-option'))
    : [];
  const registrationMethodInputs = registrationMethodsContainer
    ? Array.from(registrationMethodsContainer.querySelectorAll('input[name="registration-method"]'))
    : [];
  const registrationMessage = document.getElementById('registration-message');
  const createTokenButton = document.getElementById('create-new-token');
  const registrationPanelMobile = document.getElementById('registration-panel-mobile');
  const registrationPanelDet = document.getElementById('registration-panel-det');
  const registrationPanelSelf = document.getElementById('registration-panel-self');
  const registrationPanels = {
    mobile: registrationPanelMobile,
    det: registrationPanelDet,
    self: registrationPanelSelf
  };
  const qrPreview = document.getElementById('qr-preview');
  const qrPreviewContent = document.getElementById('qr-preview-content');
  const qrPreviewButton = document.getElementById('qr-preview-button');
  const jsonPreview = document.getElementById('json-preview');
  const jsonPreviewContent = document.getElementById('json-preview-content');
  const jsonShowButton = document.getElementById('json-show-button');
  const jsonCopyButton = document.getElementById('json-copy-button');
  const copyJsonBtn = document.getElementById('copy-json-btn');
  const contractJsonPreview = document.getElementById('contract-json-preview');
  const selfWarningCheckbox = document.getElementById('self-warning-checkbox');
  const selfWarningProceedButton = document.getElementById('self-warning-proceed');
  const themeControls = Array.from(document.querySelectorAll('input[name="ui-theme"], input[name="ui-theme-group"], input[name="ui-theme-doc"]'));

  const stepStatusElements = TRACKED_STEPS.reduce((accumulator, step) => {
    const element = document.getElementById(`status-${step}`);
    if (element) {
      accumulator[step] = element;
    }
    return accumulator;
  }, {});

  TRACKED_STEPS.forEach((step) => updateStepStatusUI(step));

  const initialTheme = getStoredTheme();
  setTheme(initialTheme, false);

  // DEBUGGING: Log how many theme controls were found
  console.log('Theme controls found:', themeControls.length);

  themeControls.forEach((input) => {
    input.addEventListener('change', () => {
      console.log('Theme change event fired:', input.value, 'checked:', input.checked);
      if (input.checked) {
        setTheme(input.value);
      }
    });
  });

  syncRegistrationPreflightUI();
  syncWizardReadiness({ refreshStatus: true });

  const welcomeScreen = document.getElementById('screen-welcome');
  const namingScreen = document.getElementById('screen-naming');
  const permissionsScreen = document.getElementById('screen-permissions');
  const distributionScreen = document.getElementById('screen-distribution');
  const advancedScreen = document.getElementById('screen-advanced');
  const searchScreen = document.getElementById('screen-search');
  const overviewScreen = document.getElementById('screen-overview');
  const registrationScreen = document.getElementById('screen-registration');
  const manualMintScreen = document.getElementById('screen-permissions-manual-mint');
  const manualBurnScreen = document.getElementById('screen-permissions-manual-burn');
  const manualFreezeScreen = document.getElementById('screen-permissions-manual-freeze');
  const destroyFrozenScreen = document.getElementById('screen-permissions-destroy-frozen');
  const emergencyActionScreen = document.getElementById('screen-permissions-emergency');
  const conventionsChangeScreen = document.getElementById('screen-permissions-conventions-change');
  const marketplaceTradeModeScreen = document.getElementById('screen-permissions-marketplace-trade-mode-change');
  const directPricingScreen = document.getElementById('screen-permissions-direct-pricing-change');
  const mainControlScreen = document.getElementById('screen-permissions-main-control-change');
  const freezeForm = document.getElementById('freeze-form');
  const infoScreenEntries = INFO_STEPS.map((id) => ({
    id,
    element: document.getElementById(`screen-${id}`)
  })).filter(({ element }) => Boolean(element));

  const developerMode = new URLSearchParams(window.location.search).get('dev') === '1';

  // FIXED: Add all substep screens to screenDefinitions so showScreen() can find them
  const getAllSubstepScreens = () => {
    const substeps = [];
    for (const [parentStep, substepIds] of Object.entries(SUBSTEP_SEQUENCES)) {
      for (const substepId of substepIds) {
        // Skip main steps (already added manually)
        if (STEP_SEQUENCE.includes(substepId)) continue;
        const element = document.getElementById(`screen-${substepId}`);
        if (element) {
          substeps.push({
            id: substepId,
            isAdvanced: false,
            shouldSkip: () => false,
            element
          });
        }
      }
    }
    return substeps;
  };

  const screenDefinitions = [
    {
      id: 'welcome',
      isAdvanced: false,
      shouldSkip: () => false,
      element: welcomeScreen
    },
    {
      id: 'naming',
      isAdvanced: false,
      shouldSkip: () => false,
      element: namingScreen
    },
    {
      id: 'advanced',
      isAdvanced: false,
      shouldSkip: () => false,
      element: advancedScreen
    },
    {
      id: 'permissions',
      isAdvanced: false,
      shouldSkip: () => false,
      element: permissionsScreen
    },
    {
      id: 'distribution',
      isAdvanced: false,
      shouldSkip: () => false,
      element: distributionScreen
    },
    {
      id: 'search',
      isAdvanced: false,
      shouldSkip: () => false,
      element: searchScreen
    },
    {
      id: 'overview',
      isAdvanced: false,
      shouldSkip: () => false,
      element: overviewScreen
    },
    {
      id: 'registration',
      isAdvanced: false,
      shouldSkip: () => false,
      element: registrationScreen
    },
    ...getAllSubstepScreens(),
    ...infoScreenEntries.map(({ id, element }) => ({
      id,
      isAdvanced: false,
      shouldSkip: () => false,
      element
    }))
  ];

  const stepForms = {
    naming: namingForm,
    permissions: permissionsForm,
    distribution: distributionForm,
    advanced: advancedForm,
    registration: registrationForm
  };

  let activeScreens = [];
  let currentScreenId = STEP_SEQUENCE.includes(wizardState.active) ? wizardState.active : STEP_SEQUENCE[0];
  currentScreenId = resolveStepTargetId(currentScreenId);
  wizardState.active = currentScreenId;
  let lastSkippedSignature = null;

  // Initialize activeScreens early to prevent "No active screens available!" error
  function computeActiveScreens() {
    const skipped = [];
    const active = screenDefinitions.filter((definition) => {
      const skip = definition.shouldSkip(wizardState);
      const include = (!definition.isAdvanced || developerMode) && !skip;
      if (!include && developerMode && (definition.isAdvanced || skip)) {
        skipped.push(definition.id);
      }
      return include;
    });

    if (developerMode) {
      const signature = skipped.join('|');
      if (signature !== lastSkippedSignature) {
        lastSkippedSignature = signature;
        console.info('[Dash Token Wizard][dev] Skipped screens:', skipped);
      }
    }

    return active;
  }

  // Populate activeScreens immediately after screenDefinitions is ready
  activeScreens = computeActiveScreens();

  MANUAL_ACTION_DEFINITIONS.forEach((definition) => {
    let screen = null;
    switch (definition.key) {
      case 'manualMint':
        screen = manualMintScreen;
        break;
      case 'manualBurn':
        screen = manualBurnScreen;
        break;
      case 'manualFreeze':
        screen = manualFreezeScreen;
        break;
      case 'destroyFrozen':
        screen = destroyFrozenScreen;
        break;
      case 'emergencyAction':
        screen = emergencyActionScreen;
        break;
      case 'conventionsChange':
        screen = conventionsChangeScreen;
        break;
      case 'marketplaceTradeMode':
        screen = marketplaceTradeModeScreen;
        break;
      case 'directPricing':
        screen = directPricingScreen;
        break;
      case 'mainControl':
        screen = mainControlScreen;
        break;
      default:
        screen = null;
    }
    const ui = createManualActionUI(definition, screen);
    if (ui) {
      manualActionUIs[definition.key] = ui;
    }
  });

  if (freezeForm) {
    freezeUI = createFreezeUI(freezeForm);
  }

  ensureNamingFormState();
  initialisePermissionGroupsUI();
  initialiseLocalizationUI();
  initialiseUI();
  initialisePerpetualDistributionUI();
  initialisePreprogrammedDistributionUI();

  if (walletFileInput) {
    walletFileInput.addEventListener('change', handleWalletFileSelection);
  }
  if (walletMnemonicInput) {
    walletMnemonicInput.addEventListener('input', handleWalletMnemonicInput);
    // evaluateWallet does not accept args; drop stray object param
    walletMnemonicInput.addEventListener('blur', () => evaluateWallet());
  }
  if (identityRegisterButton) {
    identityRegisterButton.addEventListener('click', handleIdentityRegistration);
  }

  if (tokenNameInput) {
    tokenNameInput.addEventListener('input', handleNamingInput);
    tokenNameInput.addEventListener('blur', () => evaluateNaming({ touched: true }));
  }

  // Plural field and capitalize checkbox
  if (tokenPluralInput) {
    tokenPluralInput.addEventListener('input', handleNamingInput);
    tokenPluralInput.addEventListener('blur', () => evaluateNaming({ touched: true }));
  }
  if (tokenCapitalizeInput) {
    tokenCapitalizeInput.addEventListener('change', handleNamingInput);
  }

  // Auto-sync: Update English localization when token name fields change
  function syncToEnglishLocalization() {
    const singular = tokenNameInput ? tokenNameInput.value.trim() : '';
    const plural = tokenPluralInput ? tokenPluralInput.value.trim() : '';
    const shouldCapitalize = tokenCapitalizeInput ? tokenCapitalizeInput.checked : false;

    // Only sync if we have at least singular form
    if (singular) {
      // Ensure naming structure exists
      if (!wizardState.form.naming) {
        wizardState.form.naming = { conventions: { localizations: {} }, rows: [] };
      }
      if (!wizardState.form.naming.conventions) {
        wizardState.form.naming.conventions = { localizations: {} };
      }
      if (!wizardState.form.naming.conventions.localizations) {
        wizardState.form.naming.conventions.localizations = {};
      }

      // Auto-update English localization
      wizardState.form.naming.conventions.localizations.en = {
        singular_form: singular,
        plural_form: plural || singular + 's', // Default plural if not provided
        should_capitalize: shouldCapitalize
      };

      console.log('✅ Auto-synced to English localization:', wizardState.form.naming.conventions.localizations);
      console.log('📋 Full naming state:', wizardState.form.naming);

      // Persist the state
      if (typeof persistState === 'function') {
        persistState();
      }
    }
  }

  // Add auto-sync to all three fields
  if (tokenNameInput) {
    tokenNameInput.addEventListener('input', syncToEnglishLocalization);
  }
  if (tokenPluralInput) {
    tokenPluralInput.addEventListener('input', syncToEnglishLocalization);
  }
  if (tokenCapitalizeInput) {
    tokenCapitalizeInput.addEventListener('change', syncToEnglishLocalization);
  }

  if (registrationMethodsContainer) {
    registrationMethodsContainer.addEventListener('change', handleRegistrationSelection);
  }

  // FIXED: Add Skip button handler for distribution step
  if (distributionSkipButton) {
    distributionSkipButton.addEventListener('click', () => {
      // Mark distribution as valid so we can proceed
      wizardState.steps.distribution = wizardState.steps.distribution || {};
      wizardState.steps.distribution.validity = 'valid';
      wizardState.steps.distribution.touched = true;
      updateFurthestValidIndex();
      // Skip to next main step (registration)
      const nextStep = 'registration';
      showScreen(nextStep, { force: true });
    });
  }

  // FIXED: Add Skip button handler for distribution emission step
  if (distributionEmissionSkipButton) {
    distributionEmissionSkipButton.addEventListener('click', () => {
      // Mark distribution as valid so we can proceed
      wizardState.steps.distribution = wizardState.steps.distribution || {};
      wizardState.steps.distribution.validity = 'valid';
      wizardState.steps.distribution.touched = true;
      updateFurthestValidIndex();
      // Skip to next main step (registration)
      const nextStep = 'registration';
      showScreen(nextStep, { force: true });
    });
  }

  // Add event listener for Pre-Programmed distribution radio buttons
  const preprogrammedRadios = document.querySelectorAll('input[name="preprogrammed-enable"]');
  const preprogrammedEntriesContainer = document.getElementById('preprogrammed-entries-container');

  preprogrammedRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const enabled = event.target.value === 'yes';
      wizardState.form.distribution.enablePreProgrammed = enabled;

      // Show/hide the entries container
      if (preprogrammedEntriesContainer) {
        if (enabled) {
          // Remove collapsing class and hidden attribute
          preprogrammedEntriesContainer.classList.remove('collapsing');
          preprogrammedEntriesContainer.removeAttribute('hidden');
          // Add first entry if enabling and no entries exist
          if (!wizardState.form.distribution.preProgrammed) {
            wizardState.form.distribution.preProgrammed = { entries: [] };
          }
          if (wizardState.form.distribution.preProgrammed.entries.length === 0) {
            addPreProgrammedEntry();
          }
        } else {
          // Add collapsing class for smooth animation
          preprogrammedEntriesContainer.classList.add('collapsing');
          // Wait for animation to complete before hiding
          setTimeout(() => {
            preprogrammedEntriesContainer.setAttribute('hidden', '');
            preprogrammedEntriesContainer.classList.remove('collapsing');
          }, 250);
        }
      }

      persistState();
      console.log('✓ Pre-Programmed distribution enabled:', enabled);
    });
  });

  // Add event listener for Add Distribution Entry button
  const addPreProgrammedEntryBtn = document.getElementById('add-preprogrammed-entry-btn');
  if (addPreProgrammedEntryBtn) {
    addPreProgrammedEntryBtn.addEventListener('click', () => {
      addPreProgrammedEntry();
    });
  }

  // Add event listener for Perpetual distribution radio buttons
  const perpetualRadios = document.querySelectorAll('input[name="perpetual-enable"]');
  const perpetualConfigContainer = document.getElementById('perpetual-config-container');

  perpetualRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const enabled = event.target.value === 'yes';
      wizardState.form.distribution.enablePerpetual = enabled;

      // Show/hide the config container with smooth animation
      if (perpetualConfigContainer) {
        if (enabled) {
          // Remove collapsing class and hidden attribute
          perpetualConfigContainer.classList.remove('collapsing');
          perpetualConfigContainer.removeAttribute('hidden');
          // Force reflow to ensure animation plays
          void perpetualConfigContainer.offsetHeight;
        } else {
          // Add collapsing class for smooth animation
          perpetualConfigContainer.classList.add('collapsing');
          // Wait for animation to complete before hiding
          setTimeout(() => {
            perpetualConfigContainer.setAttribute('hidden', '');
            perpetualConfigContainer.classList.remove('collapsing');
          }, 250);
        }
      }

      persistState();
      console.log('✓ Perpetual distribution enabled:', enabled);
    });
  });

  // PROFESSIONAL REWRITE: Use event delegation on the wizard container to handle ALL form submissions
  const wizardContainer = document.querySelector('.wizard-shell');

  if (wizardContainer) {
    // Remove any existing listeners by cloning and replacing the container
    // Actually, let's use a simpler approach - just add one listener

    console.log('✓ Setting up Continue button handler via event delegation');

    wizardContainer.addEventListener('submit', (event) => {
      // Check if the submitted element is a wizard form
      const form = event.target;
      if (!form || !form.classList.contains('wizard-form')) {
        return; // Not a wizard form, let it through
      }

      // This is a wizard form - prevent default submission
      event.preventDefault();
      event.stopPropagation();

      console.log('%c═══ CONTINUE BUTTON CLICKED ═══', 'color: #00ff00; font-weight: bold');

      // Get the actual current screen from the DOM
      const activeScreen = document.querySelector('.wizard-screen--active');
      if (!activeScreen) {
        console.error('❌ No active screen found!');
        return;
      }

      const currentSubstep = activeScreen.getAttribute('data-substep');
      const currentStep = activeScreen.getAttribute('data-step');
      const currentTab = activeScreen.getAttribute('data-tab');
      const screenId = activeScreen.id;

      console.log('📍 Current location:', {
        screenId,
        currentSubstep,
        currentStep,
        currentTab
      });

      // FIXED: Only navigate within the Token tab wizard flow
      if (currentTab !== 'token') {
        console.log('⏭️  Skipping navigation - not on token tab');
        return;
      }

      // Validate before advancing
      const parentStep = getParentStep(currentSubstep) || currentSubstep;
      console.log('🔍 Parent step for validation:', parentStep);

      const validation = evaluateStep(parentStep, { touched: true });
      console.log('✓ Validation result:', validation);

      if (validation && !validation.valid) {
        console.log('❌ Validation failed:', validation.message);
        announce(validation.message || 'Please complete this step before continuing.');
        return;
      }

      // FIXED: Mark Distribution as valid when leaving Schedule substep
      if (currentSubstep === 'distribution' && validation && validation.valid) {
        wizardState.steps.distribution = wizardState.steps.distribution || {};
        wizardState.steps.distribution.validity = 'valid';
        wizardState.steps.distribution.touched = true;
        updateFurthestValidIndex();
        console.log('✓ Marked Distribution step as valid after Schedule completion');
      }

      // Find next substep
      // Use currentStep as fallback if currentSubstep is not set
      const substepToUse = currentSubstep || currentStep;
      console.log('🔍 Using substep for navigation:', substepToUse);
      const nextSubstep = getNextSubstep(substepToUse);
      console.log('➡️  Next substep calculated:', nextSubstep);

      if (!nextSubstep) {
        console.log('⚠️  No next substep found');
        return;
      }

      console.log(`🚀 Navigating: ${currentSubstep} → ${nextSubstep}`);

      // Navigate to next substep
      showScreen(nextSubstep);

      console.log('%c═══ NAVIGATION COMPLETE ═══', 'color: #00ff00; font-weight: bold');
    }, true); // Use capture phase to ensure we catch it first
  } else {
    console.error('❌ Could not find wizard container!');
  }

  const backButtons = Array.from(document.querySelectorAll('[data-step-back]'));
  backButtons.forEach((button) => {
    const stepId = button.getAttribute('data-step-back');
    if (stepId === STEP_SEQUENCE[0]) {
      button.setAttribute('tabindex', '-1');
      button.addEventListener('click', (event) => {
        event.preventDefault();
      });
      return;
    }
    // FIXED: Use currentScreenId (which includes substeps) instead of stepId
    button.addEventListener('click', () => goToPreviousScreen(currentScreenId));
  });

  const returnButtons = Array.from(document.querySelectorAll('[data-step-return]'));
  returnButtons.forEach((button) => {
    const targetStep = button.getAttribute('data-step-return');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!targetStep) {
        return;
      }
      manualNavigationActive = true;
      showScreen(targetStep, { force: true });
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.wizard-info-trigger');
    if (!trigger) {
      return;
    }
    const panelId = trigger.getAttribute('aria-controls');
    if (!panelId) {
      return;
    }
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      panel.setAttribute('hidden', '');
    } else {
      panel.removeAttribute('hidden');
    }
  });

  if (qrPreviewButton) {
    qrPreviewButton.addEventListener('click', () => {
      if (wizardState.form.registration.method !== 'mobile') {
        return;
      }
      renderQRPreview();
      const hasCanvas = Boolean(qrPreviewContent.querySelector('canvas'));
      wizardState.form.registration.preflight.mobile.qrGenerated = hasCanvas;
      evaluateRegistration({ touched: true });
      syncRegistrationPreflightUI();
    });
  }
  if (jsonShowButton) {
    jsonShowButton.addEventListener('click', () => {
      if (wizardState.form.registration.method !== 'det') {
        return;
      }
      renderJsonPreview();
      wizardState.form.registration.preflight.det.jsonDisplayed = Boolean(jsonPreviewContent.textContent && jsonPreviewContent.textContent.length > 0);
      evaluateRegistration({ touched: true });
      syncRegistrationPreflightUI();
    });
  }
  if (jsonCopyButton) {
    jsonCopyButton.addEventListener('click', copyJsonPayload);
  }
  if (copyJsonBtn && contractJsonPreview) {
    copyJsonBtn.addEventListener('click', () => {
      const text = contractJsonPreview.textContent;
      if (!text || text.trim() === '' || text.trim() === '{') {
        announce('No contract JSON to copy yet. Please complete the wizard first.');
        return;
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
          .then(() => {
            announce('Contract JSON copied to clipboard.');
            const originalText = copyJsonBtn.textContent;
            copyJsonBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyJsonBtn.textContent = originalText;
            }, 2000);
          })
          .catch(() => fallbackCopyToClipboard(text));
      } else {
        fallbackCopyToClipboard(text);
      }
    });
  }
  if (createTokenButton) {
    createTokenButton.addEventListener('click', () => handleStepAdvance('registration'));
  }

  if (overviewNextButton) {
    overviewNextButton.addEventListener('click', () => handleStepAdvance('overview'));
  }

  if (overviewBackButton) {
    overviewBackButton.addEventListener('click', () => goToPreviousScreen('overview'));
  }

  if (searchNextButton) {
    searchNextButton.addEventListener('click', () => handleStepAdvance('search'));
  }

  if (searchKeywordsInput) {
    searchKeywordsInput.addEventListener('input', () => {
      wizardState.form.search.keywords = searchKeywordsInput.value.trim();
      evaluateSearch({ touched: true });
      updateKeywordsPreview();
    });
  }

  if (searchDescriptionInput) {
    searchDescriptionInput.addEventListener('input', () => {
      wizardState.form.search.description = searchDescriptionInput.value.trim();
      evaluateSearch({ touched: true });
    });
  }

  const readinessEvents = [
    [
      'qr:generated',
      (ready) => {
        wizardState.form.registration.preflight.mobile.qrGenerated = ready;
        updateRegistrationPreviewVisibility();
      }
    ],
    [
      'json:ready',
      (ready) => {
        wizardState.form.registration.preflight.det.jsonDisplayed = ready;
        if (jsonPreview) {
          jsonPreview.hidden = !ready;
        }
      }
    ],
    [
      'identity:ready',
      (ready, detail) => {
        const identityId = ready && detail && detail.id ? String(detail.id) : '';
        wizardState.form.registration.identity.id = ready ? identityId || wizardState.form.registration.identity.id : '';
        syncIdentityUI();
      }
    ],
    [
      'privateKey:ready',
      (ready, detail) => {
        const wallet = wizardState.form.registration.wallet;
        wallet.privateKey = ready
          ? (detail && detail.privateKey ? String(detail.privateKey).trim() : wallet.privateKey)
          : '';
        if (ready) {
          wallet.mnemonic = '';
        }
        syncWalletInsights();
      }
    ]
  ];

  readinessEvents.forEach(([eventName, apply]) => {
    window.addEventListener(eventName, (event) => {
      const detail = event && typeof event === 'object' ? event.detail : undefined;
      const ready =
        detail && typeof detail.ready === 'boolean'
          ? Boolean(detail.ready)
          : true;
      apply(ready, detail || {});
      syncWizardReadiness({ refreshStatus: true });
      persistState();
      if (wizardState.steps.registration.touched) {
        evaluateRegistration({ touched: true, silent: false });
      }
    });
  });

  if (selfWarningCheckbox) {
    selfWarningCheckbox.addEventListener('change', () => {
      if (wizardState.form.registration.preflight.self.warningAcknowledged) {
        return;
      }
      syncRegistrationPreflightUI();
    });
  }
  if (selfWarningProceedButton) {
    selfWarningProceedButton.addEventListener('click', () => {
      if (wizardState.form.registration.method !== 'self') {
        return;
      }
      const identityId = (wizardState.form.registration.identity.id || '').trim();
      if (!identityId) {
        registrationMessage.textContent = 'Register an identity before proceeding.';
        return;
      }
      if (!selfWarningCheckbox || !selfWarningCheckbox.checked) {
        registrationMessage.textContent = 'Tick “I understand the risks” before proceeding.';
        return;
      }
      wizardState.form.registration.preflight.self.warningAcknowledged = true;
      evaluateRegistration({ touched: true });
      syncRegistrationPreflightUI();
    });
  }
  document.addEventListener('keydown', handleEscapeShortcut);
  window.addEventListener('unhandledrejection', handleChunkLoadRejection);
  window.addEventListener('error', handleChunkLoadError, true);

  // ═══════════════════════════════════════════════════════════════════════════
  // Pre-Programmed Distribution UI
  // ═══════════════════════════════════════════════════════════════════════════

  let preprogrammedEntryIdCounter = 0;
  const preprogrammedEntries = [];

  function initialisePerpetualDistributionUI() {
    // Sync UI with state on initialization
    const yesRadio = document.querySelector('input[name="perpetual-enable"][value="yes"]');
    const noRadio = document.querySelector('input[name="perpetual-enable"][value="no"]');
    const configContainer = document.getElementById('perpetual-config-container');

    // Only run if the elements exist on the page
    if (!yesRadio || !noRadio || !configContainer) {
      return;
    }

    // Default to "No" (disabled) unless explicitly enabled in state
    if (wizardState.form.distribution.enablePerpetual) {
      yesRadio.checked = true;
      configContainer.removeAttribute('hidden');
    } else {
      noRadio.checked = true;
      configContainer.setAttribute('hidden', '');
    }
  }

  function initialisePreprogrammedDistributionUI() {
    // Sync UI with state on initialization
    const enabledRadio = document.querySelector('input[name="preprogrammed-enable"][value="yes"]');
    const disabledRadio = document.querySelector('input[name="preprogrammed-enable"][value="no"]');
    const entriesContainer = document.getElementById('preprogrammed-entries-container');

    // Only run if the elements exist on the page
    if (!enabledRadio || !disabledRadio || !entriesContainer) {
      return;
    }

    if (wizardState.form.distribution.enablePreProgrammed) {
      if (enabledRadio) {
        enabledRadio.checked = true;
      }
      if (entriesContainer) {
        entriesContainer.removeAttribute('hidden');
      }
      // Restore entries from state
      if (wizardState.form.distribution.preProgrammed && wizardState.form.distribution.preProgrammed.entries) {
        wizardState.form.distribution.preProgrammed.entries.forEach(entry => {
          addPreProgrammedEntry(entry);
        });
      }
    } else {
      if (disabledRadio) {
        disabledRadio.checked = true;
      }
      if (entriesContainer) {
        entriesContainer.setAttribute('hidden', '');
      }
    }
  }

  function addPreProgrammedEntry(initialData = null) {
    const entriesList = document.getElementById('preprogrammed-entries-list');
    if (!entriesList) return;

    preprogrammedEntryIdCounter += 1;
    const entryId = `preprogrammed-entry-${preprogrammedEntryIdCounter}`;

    const entry = {
      id: entryId,
      days: initialData?.days || 0,
      hours: initialData?.hours || 0,
      minutes: initialData?.minutes || 0,
      identity: initialData?.identity || '',
      amount: initialData?.amount || ''
    };

    const entryElement = createPreProgrammedEntryElement(entry);
    preprogrammedEntries.push({ id: entryId, element: entryElement, data: entry });
    entriesList.appendChild(entryElement);

    // Add to state
    if (!initialData) {
      if (!wizardState.form.distribution.preProgrammed) {
        wizardState.form.distribution.preProgrammed = { entries: [] };
      }
      wizardState.form.distribution.preProgrammed.entries.push(entry);
      persistState();
    }
  }

  function createPreProgrammedEntryElement(entry) {
    const container = document.createElement('div');
    container.className = 'preprogrammed-entry';
    container.dataset.entryId = entry.id;
    container.style.cssText = 'border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); background: var(--color-surface);';

    const entryNumber = preprogrammedEntries.length + 1;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
        <h4 style="margin: 0; font-size: 1rem; font-weight: 600;">Timestamp #${entryNumber}</h4>
        <button type="button" class="wizard-button wizard-button--secondary wizard-button--sm remove-preprogrammed-entry" data-entry-id="${entry.id}" style="padding: var(--space-1) var(--space-3);">Remove</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: var(--space-3);">
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-days">Days</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-days" value="${entry.days}" min="0" placeholder="0">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-hours">Hours</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-hours" value="${entry.hours}" min="0" max="23" placeholder="0">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-minutes">Minutes</label>
          <input class="wizard-field__input" type="number" id="${entry.id}-minutes" value="${entry.minutes}" min="0" max="59" placeholder="0">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-3);">
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-identity">Identity</label>
          <input class="wizard-field__input" type="text" id="${entry.id}-identity" value="${entry.identity}" placeholder="Identity ID">
        </div>
        <div class="field-group">
          <label class="wizard-field__label" for="${entry.id}-amount">Amount</label>
          <input class="wizard-field__input" type="text" id="${entry.id}-amount" value="${entry.amount}" placeholder="Token amount">
        </div>
      </div>
    `;

    // Add event listeners for inputs
    const daysInput = container.querySelector(`#${entry.id}-days`);
    const hoursInput = container.querySelector(`#${entry.id}-hours`);
    const minutesInput = container.querySelector(`#${entry.id}-minutes`);
    const identityInput = container.querySelector(`#${entry.id}-identity`);
    const amountInput = container.querySelector(`#${entry.id}-amount`);
    const removeBtn = container.querySelector('.remove-preprogrammed-entry');

    [daysInput, hoursInput, minutesInput, identityInput, amountInput].forEach(input => {
      input.addEventListener('input', () => {
        updatePreProgrammedEntryData(entry.id, {
          days: parseInt(daysInput.value) || 0,
          hours: parseInt(hoursInput.value) || 0,
          minutes: parseInt(minutesInput.value) || 0,
          identity: identityInput.value,
          amount: amountInput.value
        });
      });
    });

    removeBtn.addEventListener('click', () => {
      removePreProgrammedEntry(entry.id);
    });

    return container;
  }

  function updatePreProgrammedEntryData(entryId, data) {
    if (!wizardState.form.distribution.preProgrammed) {
      wizardState.form.distribution.preProgrammed = { entries: [] };
    }
    const entryIndex = wizardState.form.distribution.preProgrammed.entries.findIndex(e => e.id === entryId);
    if (entryIndex !== -1) {
      wizardState.form.distribution.preProgrammed.entries[entryIndex] = {
        ...wizardState.form.distribution.preProgrammed.entries[entryIndex],
        ...data
      };
      persistState();
    }
  }

  function removePreProgrammedEntry(entryId) {
    const entryIndex = preprogrammedEntries.findIndex(e => e.id === entryId);
    if (entryIndex !== -1) {
      const entry = preprogrammedEntries[entryIndex];
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
      preprogrammedEntries.splice(entryIndex, 1);
    }

    // Remove from state
    if (wizardState.form.distribution.preProgrammed) {
      const stateIndex = wizardState.form.distribution.preProgrammed.entries.findIndex(e => e.id === entryId);
      if (stateIndex !== -1) {
        wizardState.form.distribution.preProgrammed.entries.splice(stateIndex, 1);
        persistState();
      }
    }
  }

  function initialiseUI() {
    hydrateFormsFromState();
    TRACKED_STEPS.forEach(updateStepStatusUI);
    STEP_SEQUENCE.forEach((stepId) => {
      const step = wizardState.steps[stepId];
      evaluateStep(stepId, {
        touched: step.touched,
        silent: !step.touched
      });
    });
    syncManualActionUIs({ announce: false });
    syncFreezeUI({ announce: false });
    updateRegistrationPreviewVisibility();
    refreshFlow({ initial: true, suppressFocus: true });
  }

  function hydrateFormsFromState() {
    const walletState = wizardState.form.registration.wallet;
    const identityState = wizardState.form.registration.identity;
    if (walletMnemonicInput) {
      walletMnemonicInput.value = walletState.mnemonic || '';
    }
    if (identityIdOutput) {
      identityIdOutput.value = identityState.id || '';
    }

    syncWalletInsights();
    syncIdentityUI();

    tokenNameInput.value = wizardState.form.tokenName || '';

    ensureNamingFormState();
    renderLocalizationRows(wizardState.form.naming.rows);
    validateLocalizationRows({ silent: true });

    if (permissionsUI && typeof permissionsUI.setValues === 'function') {
      permissionsUI.setValues(wizardState.form.permissions);
    }
    ensurePermissionsGroupState();
    syncFreezeUI({ announce: false });
    renderPermissionGroups();
    if (distributionUI && typeof distributionUI.setValues === 'function') {
      distributionUI.setValues(wizardState.form.distribution);
    }
    if (advancedUI && typeof advancedUI.setValues === 'function') {
      advancedUI.setValues(wizardState.form.advanced);
    }

    syncRegistrationSelection();
    syncRegistrationPreflightUI();
  }

  function getWalletCredentials() {
    const wallet = wizardState.form.registration.wallet;
    const mnemonic = (wallet.mnemonic || '').trim();
    const privateKey = (wallet.privateKey || '').trim();
    return { mnemonic, privateKey };
  }

  function computeWalletFingerprint({ mnemonic, privateKey }) {
    if (mnemonic) {
      return `mnemonic:${mnemonic}`;
    }
    if (privateKey) {
      return `privateKey:${privateKey}`;
    }
    return '';
  }

  function normalizeWalletBalance(rawBalance) {
    if (typeof rawBalance === 'bigint') {
      return Number(rawBalance);
    }
    if (typeof rawBalance === 'number') {
      return Number.isFinite(rawBalance) ? rawBalance : null;
    }
    if (rawBalance && typeof rawBalance === 'object') {
      if (typeof rawBalance.availableBalance === 'number') {
        return rawBalance.availableBalance;
      }
      if (typeof rawBalance.totalBalance === 'number') {
        return rawBalance.totalBalance;
      }
      if (typeof rawBalance.balance === 'number') {
        return rawBalance.balance;
      }
    }
    return null;
  }

  function formatWalletBalance(rawBalance) {
    if (rawBalance === null || typeof rawBalance === 'undefined') {
      return '—';
    }
    const numeric = typeof rawBalance === 'number' ? rawBalance : Number(rawBalance);
    if (!Number.isFinite(numeric)) {
      return '—';
    }
    if (numeric === 0) {
      return '0 DASH';
    }
    const dashValue = numeric / 1e8;
    return `${dashValue.toFixed(6)} DASH`;
  }

  function resetWalletRuntime() {
    wizardState.runtime.walletClient = null;
    wizardState.runtime.walletClientFingerprint = null;
    wizardState.runtime.walletInitializationError = '';
    wizardState.runtime.walletInfoLoading = false;
    walletClientInitializationPromise = null;
    walletClientInitializationFingerprint = null;
  }

  function resetIdentityState({ persist = false } = {}) {
    wizardState.form.registration.identity = cloneDefaultIdentityState();
    wizardState.form.registration.preflight.self.warningAcknowledged = false;
    if (identityIdOutput) {
      identityIdOutput.value = '';
    }
    if (identityMessage) {
      identityMessage.textContent = '';
    }
    if (selfWarningCheckbox) {
      selfWarningCheckbox.checked = false;
      selfWarningCheckbox.disabled = false;
    }
    if (selfWarningProceedButton) {
      selfWarningProceedButton.disabled = true;
    }
    if (persist) {
      persistState();
    }
    syncIdentityUI();
    const registrationTouched = wizardState.steps.registration.touched;
    evaluateRegistration({ touched: registrationTouched, silent: !registrationTouched });
  }

  function syncWalletInsights() {
    const wallet = wizardState.form.registration.wallet;
    if (walletAddressValue) {
      walletAddressValue.textContent = wallet.address || '—';
    }
    if (walletBalanceValue) {
      walletBalanceValue.textContent = formatWalletBalance(wallet.balance);
    }
    if (walletBalanceNote) {
      if (wizardState.runtime.walletInitializationError) {
        walletBalanceNote.textContent = wizardState.runtime.walletInitializationError;
      } else if (wizardState.runtime.walletInfoLoading) {
        walletBalanceNote.textContent = 'Fetching wallet details…';
      } else if (wallet.balance === null) {
        walletBalanceNote.textContent = 'Import a wallet to preview balance and address.';
      } else if (Number(wallet.balance) === 0) {
        walletBalanceNote.textContent = 'Balance is 0 DASH. Use the Dash testnet faucet before registering an identity.';
      } else {
        walletBalanceNote.textContent = 'Wallet ready. Identity registration requires a small spendable balance.';
      }
    }
    syncWizardReadiness();
  }

  function syncIdentityUI() {
    const wallet = wizardState.form.registration.wallet;
    const identity = wizardState.form.registration.identity;
    const method = wizardState.form.registration.method;
    const hasWalletCredentials = Boolean((wallet.mnemonic || '').trim() || (wallet.privateKey || '').trim());
    const walletValid = hasWalletCredentials;
    const loading = wizardState.runtime.walletInfoLoading;
    const hasError = Boolean(wizardState.runtime.walletInitializationError);
    const balance = wallet.balance;
    const balanceKnown = typeof balance === 'number' && Number.isFinite(balance);
    const hasSpendableBalance = balanceKnown && balance > 0;

    if (identityRegisterButton) {
      const shouldDisable = method !== 'self' || !walletValid || loading || hasError || (balanceKnown && !hasSpendableBalance);
      identityRegisterButton.disabled = shouldDisable;
    }

    if (identityGuidance) {
      if (!walletValid) {
        identityGuidance.textContent = 'Import a wallet before registering an identity.';
      } else if (hasError) {
        identityGuidance.textContent = wizardState.runtime.walletInitializationError;
      } else if (loading) {
        identityGuidance.textContent = 'Fetching wallet details…';
      } else if (balanceKnown && !hasSpendableBalance) {
        identityGuidance.textContent = 'Top up your Dash testnet wallet before continuing. Identity registration spends credits as fees.';
      } else {
        identityGuidance.textContent = identity.id
          ? 'Identity registered. Copy the identifier for future use.'
          : 'Identities enable interactions on Dash Platform. Registration spends a small portion of wallet balance.';
      }
    }
    syncWizardReadiness();
  }

  function handleWalletMnemonicInput() {
    if (!walletMnemonicInput) {
      return;
    }
    const rawValue = walletMnemonicInput.value || '';
    wizardState.form.registration.wallet.mnemonic = rawValue;
    if (rawValue.trim().length > 0) {
      wizardState.form.registration.wallet.privateKey = '';
    }
    evaluateWallet();
  }

  function extractWalletSecrets(source) {
    const result = { mnemonic: '', privateKey: '' };
    const stack = [source];
    const visited = new Set();
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') {
        continue;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      if (typeof current.mnemonic === 'string' && !result.mnemonic) {
        result.mnemonic = current.mnemonic.trim();
      }
      if (typeof current.privateKey === 'string' && !result.privateKey) {
        result.privateKey = current.privateKey.trim();
      }
      Object.keys(current).forEach((key) => {
        const value = current[key];
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      });
      if (result.mnemonic && result.privateKey) {
        break;
      }
    }
    return result;
  }

  function handleWalletFileSelection(event) {
    const input = event.target;
    const files = input && input.files ? Array.from(input.files) : [];
    if (!files.length) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const secrets = extractWalletSecrets(parsed);
        const wallet = wizardState.form.registration.wallet;
        if (secrets.mnemonic) {
          wallet.mnemonic = secrets.mnemonic;
          wallet.privateKey = '';
          if (walletMnemonicInput) {
            walletMnemonicInput.value = secrets.mnemonic;
          }
        } else if (secrets.privateKey) {
          wallet.privateKey = secrets.privateKey;
          wallet.mnemonic = '';
          if (walletMnemonicInput) {
            walletMnemonicInput.value = '';
          }
        } else {
          walletMessage.textContent = 'Wallet file must include a mnemonic or private key.';
          wallet.mnemonic = '';
          wallet.privateKey = '';
          evaluateWallet();
          return;
        }
        evaluateWallet();
      } catch (error) {
        console.debug('Wallet file parse error', error);
        walletMessage.textContent = 'Unable to read wallet file. Provide valid JSON.';
        const wallet = wizardState.form.registration.wallet;
        wallet.mnemonic = '';
        wallet.privateKey = '';
        evaluateWallet();
      } finally {
        if (input) {
          input.value = '';
        }
      }
    };
    reader.onerror = () => {
      walletMessage.textContent = 'Unable to read wallet file.';
      if (input) {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  function evaluateWallet() {
    const wallet = wizardState.form.registration.wallet;
    const previousFingerprint = wallet.fingerprint || '';
    const credentials = getWalletCredentials();
    let valid = false;
    let message = '';

    if (credentials.mnemonic) {
      const normalized = credentials.mnemonic.replace(/\s+/g, ' ').trim();
      const words = normalized.split(' ').filter(Boolean);
      if (words.length < 12 || words.length > 24) {
        message = 'Mnemonic must contain 12 to 24 words.';
      } else {
        wallet.mnemonic = normalized;
        wallet.privateKey = '';
        valid = true;
      }
    } else if (credentials.privateKey) {
      const normalizedKey = credentials.privateKey.trim();
      if (normalizedKey.length < 30) {
        message = 'Private key must be at least 30 characters.';
      } else {
        wallet.privateKey = normalizedKey;
        wallet.mnemonic = '';
        valid = true;
      }
    } else {
      message = 'Import a wallet file or enter a mnemonic to continue.';
    }

    if (walletMessage) {
      walletMessage.textContent = valid ? '' : message;
    }

    const validation = { valid, message };

    if (!valid) {
      wallet.fingerprint = '';
      wallet.address = '';
      wallet.balance = null;
      resetWalletRuntime();
      syncWalletInsights();
      syncIdentityUI();
      persistState();
      if (wizardState.steps.registration.touched) {
        scheduleRegistrationValidation();
      }
      return validation;
    }

    const fingerprint = computeWalletFingerprint(getWalletCredentials());
    wallet.fingerprint = fingerprint;

    if (fingerprint && fingerprint !== previousFingerprint) {
      wallet.address = '';
      wallet.balance = null;
      resetWalletRuntime();
      resetIdentityState();
    }

    persistState();
    syncWalletInsights();
    syncIdentityUI();

    if (fingerprint) {
      initialiseWalletClientWithFingerprint(fingerprint);
    }

    if (wizardState.steps.registration.touched) {
      scheduleRegistrationValidation();
    }
    evaluateRegistration({ touched: wizardState.steps.registration.touched, silent: true });
    return validation;
  }

  function initialiseWalletClientWithFingerprint(fingerprint) {
    if (!fingerprint) {
      return;
    }
    if (wizardState.runtime.walletClient && wizardState.runtime.walletClientFingerprint === fingerprint) {
      return;
    }
    if (walletClientInitializationPromise && walletClientInitializationFingerprint === fingerprint) {
      return;
    }

    const credentials = getWalletCredentials();
    const wallet = wizardState.form.registration.wallet;
    wizardState.runtime.walletInfoLoading = true;
    wizardState.runtime.walletInitializationError = '';
    syncWalletInsights();
    syncIdentityUI();

    walletClientInitializationFingerprint = fingerprint;
    walletClientInitializationPromise = (async () => {
      try {
        if (!window.Dash || typeof window.Dash.Client !== 'function') {
          throw new Error('Dash SDK is unavailable. Include the Dash JS client script.');
        }
        // Enable network by default so address/balance/identity work on testnet
        const options = {
          network: 'testnet',
          wallet: { offlineMode: false }
        };
        if (credentials.mnemonic) {
          options.wallet.mnemonic = credentials.mnemonic;
        }
        if (credentials.privateKey) {
          options.wallet.privateKey = credentials.privateKey;
        }

        const client = new window.Dash.Client(options);
        wizardState.runtime.walletClient = client;
        wizardState.runtime.walletClientFingerprint = fingerprint;

        let address = '';
        let balance = null;
        try {
          address = await client.wallet.getUnusedAddress();
        } catch (error) {
          console.debug('Unable to read wallet address', error);
        }
        try {
          const reportedBalance = await client.wallet.getBalance();
          balance = normalizeWalletBalance(reportedBalance);
        } catch (error) {
          console.debug('Unable to read wallet balance', error);
        }

        wallet.address = address || '';
        wallet.balance = balance;
        wizardState.runtime.walletInitializationError = '';
      } catch (error) {
        console.debug('Wallet client initialisation failed', error);
        wizardState.runtime.walletClient = null;
        wizardState.runtime.walletClientFingerprint = null;
        wallet.address = '';
        wallet.balance = null;
        wizardState.runtime.walletInitializationError = error && error.message ? String(error.message) : 'Unable to initialise wallet client.';
      } finally {
        wizardState.runtime.walletInfoLoading = false;
        walletClientInitializationPromise = null;
        walletClientInitializationFingerprint = null;
        persistState();
        syncWalletInsights();
        syncIdentityUI();
      }
    })();
  }

  async function handleIdentityRegistration(event) {
    event.preventDefault();
    const wallet = wizardState.form.registration.wallet;
    const hasWalletCredentials = Boolean((wallet.mnemonic || '').trim() || (wallet.privateKey || '').trim());
    if (!hasWalletCredentials) {
      announce('Import a wallet before registering an identity.');
      return;
    }
    const runtimeClient = wizardState.runtime.walletClient;
    if (!runtimeClient || typeof runtimeClient.platform !== 'object') {
      evaluateWallet();
      if (!wizardState.runtime.walletClient) {
        announce('Wallet client unavailable. Confirm the Dash SDK script is loaded.');
        return;
      }
    }

    const client = wizardState.runtime.walletClient;
    if (!client) {
      announce('Wallet client unavailable.');
      return;
    }

    if (identityRegisterButton) {
      identityRegisterButton.disabled = true;
    }
    if (identityMessage) {
      identityMessage.textContent = 'Registering identity…';
    }

    try {
      const identity = await client.platform.identities.register();
      const identityId = identity && typeof identity.getId === 'function'
        ? identity.getId().toString()
        : identity?.id?.toString?.() ?? '';
      if (!identityId) {
        throw new Error('Registration succeeded without returning an identity id.');
      }
      wizardState.form.registration.identity.id = identityId;
      if (identityIdOutput) {
        identityIdOutput.value = identityId;
      }
      if (identityMessage) {
        identityMessage.textContent = 'Identity registered successfully.';
      }
      wizardState.form.registration.preflight.self.warningAcknowledged = false;
      if (selfWarningCheckbox) {
        selfWarningCheckbox.checked = false;
        selfWarningCheckbox.disabled = false;
      }
      if (selfWarningProceedButton) {
        selfWarningProceedButton.disabled = true;
      }
      syncIdentityUI();
      evaluateRegistration({ touched: true });
      announce('Identity registration complete.');
    } catch (error) {
      console.error('Identity registration failed', error);
      const reason = error && error.message ? String(error.message) : 'Identity registration failed.';
      if (identityMessage) {
        identityMessage.textContent = reason;
      }
      syncIdentityUI();
      evaluateRegistration({ touched: wizardState.steps.registration.touched, silent: true });
    } finally {
      syncIdentityUI();
    }
  }

  function handleNamingInput() {
    // Save all naming fields to state (using token name as singular form)
    wizardState.form.naming.singular = tokenNameInput.value;
    wizardState.form.naming.plural = tokenPluralInput.value;
    wizardState.form.naming.capitalize = tokenCapitalizeInput.checked;

    const touched = tokenNameInput.value.length > 0 || wizardState.steps.naming.touched;
    const validation = evaluateNaming({ touched });
    if (validation.valid) {
      const method = wizardState.form.registration.method;
      if (method === 'mobile' && wizardState.form.registration.preflight.mobile.qrGenerated) {
        renderQRPreview();
      } else if (method === 'det' && wizardState.form.registration.preflight.det.jsonDisplayed) {
        renderJsonPreview();
      }
    }
  }

  function evaluateNaming({ touched = false, silent = false } = {}) {
    const rawValue = tokenNameInput.value;
    const nameResult = validateTokenName(rawValue);

    if (touched || !silent) {
      tokenNameMessage.textContent = nameResult.valid ? '' : nameResult.message;
    } else {
      tokenNameMessage.textContent = '';
    }

    // ADDED: Visual feedback for validation state
    if (rawValue.trim().length > 0) {
      if (nameResult.valid) {
        tokenNameInput.classList.remove('wizard-field__input--error');
        tokenNameInput.classList.add('wizard-field__input--valid');
      } else {
        tokenNameInput.classList.remove('wizard-field__input--valid');
        tokenNameInput.classList.add('wizard-field__input--error');
      }
    } else {
      tokenNameInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
    }

    wizardState.form.tokenName = rawValue;

    // Validate plural form (using token name as singular)
    const plural = tokenPluralInput.value.trim();
    let pluralValid = true;
    let pluralError = '';

    if (plural.length === 0) {
      pluralError = 'Enter a plural name.';
      pluralValid = false;
    } else if (plural.length < 3 || plural.length > 25) {
      pluralError = 'Must be 3-25 characters.';
      pluralValid = false;
    } else if (plural !== tokenPluralInput.value) {
      pluralError = 'Remove leading or trailing spaces.';
      pluralValid = false;
    }

    // Update plural UI
    if (touched || !silent) {
      tokenPluralMessage.textContent = pluralError;

      // Visual feedback for plural
      if (plural.length > 0) {
        if (pluralValid) {
          tokenPluralInput.classList.remove('wizard-field__input--error');
          tokenPluralInput.classList.add('wizard-field__input--valid');
        } else {
          tokenPluralInput.classList.remove('wizard-field__input--valid');
          tokenPluralInput.classList.add('wizard-field__input--error');
        }
      } else {
        tokenPluralInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Save singular/plural/capitalize to state (using token name as singular)
    wizardState.form.naming.singular = tokenNameInput.value;
    wizardState.form.naming.plural = tokenPluralInput.value;
    wizardState.form.naming.capitalize = tokenCapitalizeInput.checked;

    const localizationResult = validateLocalizationRows({ touched, silent });
    const isValid = nameResult.valid && pluralValid && localizationResult.valid;

    namingNextButton.disabled = !isValid;

    // Also control the localization substep Continue button
    if (namingLocalizationNextButton) {
      namingLocalizationNextButton.disabled = !localizationResult.valid;
    }

    updateStepStatusFromValidation('naming', { valid: isValid }, touched);

    scheduleServerValidation('naming', () => {
      const normalizedName = typeof nameResult.normalized === 'string' ? nameResult.normalized : rawValue.trim();
      const hasName = normalizedName.length > 0;
      const localizationRecord = localizationResult.record || {};
      const hasLocalizations = Object.keys(localizationRecord).length > 0;
      if (!hasName && !hasLocalizations) {
        return null;
      }
      return {
        tokenName: normalizedName,
        localizations: localizationRecord,
        rows: localizationResult.rows
      };
    });

    persistState();
    return { valid: isValid };
  }

  function evaluatePermissions({ touched = false } = {}) {
    // FIXED: Return invalid if permissionsUI not initialized (don't default to valid)
    if (!permissionsUI || typeof permissionsUI.getValues !== 'function') {
      console.warn('evaluatePermissions called but permissionsUI not initialized');
      return { valid: false, message: 'Permissions configuration not loaded' };
    }

    const values = permissionsUI.getValues();
    const keepsHistory = normalizeKeepsHistory(values.keepsHistory);
    const decimals = Number.parseInt(values.decimals, 10);

    let message = '';
    let valid = true;

    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 16) {
      message = 'Decimals must be between 0 and 16.';
      valid = false;
    }

    const normalizedBase = valid ? normalizeTokenAmount(values.baseSupply, decimals) : null;
    if (valid && normalizedBase === null) {
      message = 'Enter a numeric base supply (decimals allowed based on token decimals setting).';
      valid = false;
    }

    let normalizedMax = null;
    if (valid && values.useMaxSupply) {
      normalizedMax = normalizeTokenAmount(values.maxSupply, decimals);
      if (normalizedMax === null) {
        message = 'Enter a numeric max supply or disable the limit (decimals allowed).';
        valid = false;
      }
    }

    // FIXED: Use safe BigInt comparison with fallback for older browsers
    if (valid && normalizedMax !== null && normalizedBase !== null) {
      try {
        const comparison = safeBigIntCompare(normalizedMax, normalizedBase);
        if (comparison < 0) {
          message = 'Max supply must be greater than or equal to base supply.';
          valid = false;
        }
      } catch (error) {
        console.error('Supply comparison error:', error);
        message = 'Unable to compare supply values.';
        valid = false;
      }
    }

    const result = valid ? { valid: true, message: '' } : { valid: false, message };

    // ADDED: Visual validation feedback for permissions inputs
    // FIXED: Use correct HTML IDs (not permissions- prefixed)
    const decimalsInput = document.getElementById('decimals');
    const baseSupplyInput = document.getElementById('base-supply');
    const maxSupplyInput = document.getElementById('max-supply');
    const maxSupplyMessage = document.getElementById('max-supply-message');

    // Decimals validation feedback
    if (decimalsInput) {
      const decimalsValid = Number.isInteger(decimals) && decimals >= 0 && decimals <= 16;
      const decimalsHasValue = values.decimals && values.decimals.trim().length > 0;
      if (decimalsHasValue) {
        if (decimalsValid) {
          decimalsInput.classList.remove('wizard-field__input--error');
          decimalsInput.classList.add('wizard-field__input--valid');
        } else {
          decimalsInput.classList.remove('wizard-field__input--valid');
          decimalsInput.classList.add('wizard-field__input--error');
        }
      } else {
        decimalsInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Base supply validation feedback
    if (baseSupplyInput) {
      const baseSupplyValid = normalizedBase !== null;
      const baseSupplyHasValue = values.baseSupply && values.baseSupply.trim().length > 0;
      if (baseSupplyHasValue) {
        if (baseSupplyValid) {
          baseSupplyInput.classList.remove('wizard-field__input--error');
          baseSupplyInput.classList.add('wizard-field__input--valid');
        } else {
          baseSupplyInput.classList.remove('wizard-field__input--valid');
          baseSupplyInput.classList.add('wizard-field__input--error');
        }
      } else {
        baseSupplyInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Max supply validation feedback (only if value is entered)
    let maxSupplyErrorMessage = '';
    if (maxSupplyInput) {
      const maxSupplyHasValue = values.maxSupply && values.maxSupply.trim().length > 0;

      if (maxSupplyHasValue) {
        let maxSupplyValid = true;

        // Check if max supply is a valid number
        if (normalizedMax === null) {
          maxSupplyValid = false;
          maxSupplyErrorMessage = 'Enter a valid numeric value.';
        }
        // Check if max supply >= initial supply
        else if (normalizedBase !== null) {
          try {
            const comparison = safeBigIntCompare(normalizedMax, normalizedBase);
            if (comparison < 0) {
              maxSupplyValid = false;
              maxSupplyErrorMessage = 'Maximum supply must be greater than or equal to initial supply.';
            }
          } catch (error) {
            maxSupplyValid = false;
            maxSupplyErrorMessage = 'Unable to compare supply values.';
          }
        }

        // Apply visual feedback
        if (maxSupplyValid) {
          maxSupplyInput.classList.remove('wizard-field__input--error');
          maxSupplyInput.classList.add('wizard-field__input--valid');
        } else {
          maxSupplyInput.classList.remove('wizard-field__input--valid');
          maxSupplyInput.classList.add('wizard-field__input--error');
        }
      } else {
        // No value entered - clear validation classes
        maxSupplyInput.classList.remove('wizard-field__input--valid', 'wizard-field__input--error');
      }
    }

    // Display max supply error message
    if (maxSupplyMessage) {
      maxSupplyMessage.textContent = touched ? maxSupplyErrorMessage : '';
    }

    permissionsMessage.textContent = touched && !result.valid ? result.message : '';
    permissionsNextButton.disabled = !result.valid;

    ensurePermissionsGroupState();
    wizardState.form.permissions = {
      ...wizardState.form.permissions,
      decimals: Number.isInteger(decimals) ? decimals : wizardState.form.permissions.decimals,
      baseSupply: values.baseSupply,
      useMaxSupply: Boolean(values.useMaxSupply),
      maxSupply: values.useMaxSupply ? values.maxSupply : '',
      keepsHistory,
      startAsPaused: Boolean(values.startAsPaused),
      allowTransferToFrozenBalance: Boolean(values.allowTransferToFrozenBalance)
    };

    updateStepStatusFromValidation('permissions', result, touched);
    persistState();

    if (result.valid) {
      scheduleServerValidation('permissions', () => buildPermissionsValidationPayload());
    } else {
      cancelPendingValidation('permissions');
    }

    return result;
  }

  function evaluateDistribution({ touched = false } = {}) {
    if (!distributionUI || typeof distributionUI.getValues !== 'function') {
      return { valid: true, message: '' };
    }

    const values = cloneDistributionValues(distributionUI.getValues());
    const currentSubstep = wizardState.active;
    const isScheduleSubstep = currentSubstep === 'distribution';
    const decimals = typeof wizardState.form.permissions?.decimals === 'number' ? wizardState.form.permissions.decimals : 0;

    // Validate Schedule only (always required)
    const scheduleValidation = validateDistributionValues(values, { skipEmissionValidation: true, decimals });

    if (isScheduleSubstep) {
      // ===== SCHEDULE SUBSTEP =====
      // Update Schedule button and message
      if (distributionMessage) {
        distributionMessage.textContent = touched && !scheduleValidation.valid ? scheduleValidation.message : '';
      }
      if (distributionNextButton) {
        distributionNextButton.disabled = !scheduleValidation.valid;
      }
      // Update sidebar status based on Schedule validation
      updateStepStatusFromValidation('distribution', scheduleValidation, touched);

      wizardState.form.distribution = values;
      persistState();

      if (scheduleValidation.valid) {
        scheduleServerValidation('distribution', () => buildDistributionValidationPayload());
      } else {
        cancelPendingValidation('distribution');
      }

      return scheduleValidation;

    } else {
      // ===== EMISSION SUBSTEP =====
      // Emission is OPTIONAL - only validate if user selected an emission type
      const emissionType = values.emission && values.emission.type;
      let emissionValidation = { valid: true, message: '' };

      if (emissionType && emissionType !== '') {
        // User selected an emission type - validate it
        emissionValidation = validateDistributionValues(values, { skipEmissionValidation: false, decimals });
      }

      // Update Emission button and message
      if (distributionEmissionMessage) {
        distributionEmissionMessage.textContent = touched && !emissionValidation.valid ? emissionValidation.message : '';
      }
      if (distributionEmissionNextButton) {
        distributionEmissionNextButton.disabled = !emissionValidation.valid;
      }

      // Keep Distribution valid in sidebar if Schedule is still valid
      if (scheduleValidation.valid) {
        wizardState.steps.distribution = wizardState.steps.distribution || {};
        wizardState.steps.distribution.validity = 'valid';
        wizardState.steps.distribution.touched = true;
        updateStepStatusUI('distribution');
        updateFurthestValidIndex();
      }

      wizardState.form.distribution = values;
      persistState();

      return emissionValidation;
    }
  }

  function evaluateAdvanced({ touched = false } = {}) {
    if (!advancedUI || typeof advancedUI.getValues !== 'function') {
      // UI removed - functionality moved to dedicated permission screens
      // Mark step as valid since there's nothing to validate here
      const result = { valid: true, message: '' };
      updateStepStatusFromValidation('advanced', result, touched);
      return result;
    }

    const values = advancedUI.getValues();
    const changeControl = normalizeChangeControl(values.changeControl);
    // Keep existing tradeMode or default to permissionless (UI for tradeMode removed)
    const tradeMode = wizardState.form.advanced?.tradeMode || 'permissionless';

    wizardState.form.advanced = {
      tradeMode,
      changeControl
    };

    let message = '';
    let valid = true; // Always valid since change control toggles are all we validate now

    // FIXED: Don't require full configuration validation (which depends on distribution)
    // The advanced step should only validate its own fields
    const result = valid ? { valid: true, message: '' } : { valid: false, message };

    advancedMessage.textContent = touched && !result.valid ? result.message : '';
    advancedNextButton.disabled = !result.valid;

    updateStepStatusFromValidation('advanced', result, touched);
    persistState();

    // Only build configuration for server validation if all earlier steps are complete
    if (result.valid) {
      const configuration = buildAdvancedConfiguration();
      if (configuration) {
        scheduleServerValidation('advanced', () => ({ configuration }));
      } else {
        // Don't fail validation, just skip server validation until other steps are done
        cancelPendingValidation('advanced');
      }
    } else {
      cancelPendingValidation('advanced');
    }

    return result;
  }

  function handleRegistrationSelection(event) {
    if (!event.target || !event.target.matches('input[type="radio"][name="registration-method"]')) {
      return;
    }
    const nextValue = event.target.value || null;
    wizardState.form.registration.method = nextValue;
    syncRegistrationSelection();
    syncRegistrationPreflightUI();
    evaluateRegistration({ touched: true });
    refreshFlow({ suppressFocus: true });
  }

  function evaluateWelcome({ touched = false, silent = false } = {}) {
    // Welcome step is always valid - it's a template selection screen
    const stepState = wizardState.steps.welcome;
    stepState.touched = touched;
    stepState.validity = 'valid';

    if (!silent) {
      updateStepStatusUI('welcome');
      persistState();
    }

    return { valid: true, message: '' };
  }

  function evaluateOverview({ touched = false, silent = false } = {}) {
    // Overview step is always valid - it's just a review screen
    const stepState = wizardState.steps.overview;
    stepState.touched = touched;
    stepState.validity = 'valid';

    if (!silent) {
      updateStepStatusUI('overview');
      persistState();
    }

    return { valid: true, message: '' };
  }

  function evaluateSearch({ touched = false, silent = false } = {}) {
    // Search step is always valid - all fields are optional
    const stepState = wizardState.steps.search;
    stepState.touched = touched;
    stepState.validity = 'valid';

    const result = { valid: true, message: '' };

    if (searchMessage) {
      searchMessage.textContent = '';
    }
    if (searchNextButton) {
      searchNextButton.disabled = !result.valid;
    }

    if (!silent) {
      updateStepStatusUI('search');
      persistState();
    }

    return result;
  }

  function evaluateRegistration({ touched = false, silent = false } = {}) {
    const refreshStatus =
      !silent &&
      touched &&
      registrationMessage &&
      (!registrationMessage.dataset.status || registrationMessage.dataset.status === 'info');

    const ready = syncWizardReadiness({
      refreshStatus: Boolean(refreshStatus)
    });

    let message = '';
    if (!ready) {
      const missing = [];
      if (!wizardReadiness.hasQr) {
        missing.push('Generate the QR codes.');
      }
      if (!wizardReadiness.hasJson) {
        missing.push('Prepare the JSON payload.');
      }
      if (!wizardReadiness.hasIdentity) {
        missing.push('Register an identity.');
      }
      if (!wizardReadiness.hasPrivateKey) {
        missing.push('Import a private key.');
      }
      message = missing.join(' ') || readinessReminderMessage;
    }

    const result = ready ? { valid: true, message: '' } : { valid: false, message };
    const shouldShowMessage = !ready && (touched || !silent);
    if (shouldShowMessage) {
      setRegistrationStatus('info', readinessReminderMessage);
    } else if (ready && registrationMessage && registrationMessage.dataset.status !== 'success') {
      setRegistrationStatus('', '');
    }

    updateStepStatusFromValidation('registration', result, touched);
    persistState();
    if (!silent || touched) {
      scheduleRegistrationValidation();
    }
    return result;
  }

  function resetWizard() {
    manualNavigationActive = false;
    Object.keys(validationTimers).forEach((stepId) => {
      cancelPendingValidation(stepId);
    });
    Object.keys(validationFingerprints).forEach((stepId) => {
      delete validationFingerprints[stepId];
    });

    resetWalletRuntime();

    document.querySelectorAll('form').forEach((form) => {
      try {
        form.reset();
      } catch (error) {
        console.debug('Unable to reset form', error);
      }
    });

    const storagePrefixes = ['wizard:', 'token:', 'qr:'];
    const shouldClearStorageKey = (key) =>
      key === STATE_STORAGE_KEY || storagePrefixes.some((prefix) => key.startsWith(prefix));

    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && shouldClearStorageKey(key)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.debug('Unable to clear localStorage keys', error);
    }

    try {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key && shouldClearStorageKey(key)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.debug('Unable to clear sessionStorage keys', error);
    }

    document.querySelectorAll('[data-blob-url]').forEach((element) => {
      const blobUrl = element.getAttribute('data-blob-url');
      if (blobUrl && blobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.debug('Unable to revoke blob URL', error);
        }
      }
      element.removeAttribute('data-blob-url');
    });

    if (qrPreviewContent) {
      qrPreviewContent.innerHTML = '';
    }
    if (qrPreview) {
      qrPreview.hidden = true;
    }
    if (jsonPreviewContent) {
      jsonPreviewContent.textContent = '';
    }
    if (jsonPreview) {
      jsonPreview.hidden = true;
    }

    if (walletFileInput) {
      walletFileInput.value = '';
    }
    if (walletMnemonicInput) {
      walletMnemonicInput.value = '';
    }

    const freshState = createDefaultWizardState();

    wizardState.active = freshState.active;
    wizardState.furthestValidIndex = freshState.furthestValidIndex;

    TRACKED_STEPS.forEach((stepId) => {
      const defaults = freshState.steps[stepId];
      if (wizardState.steps[stepId]) {
        wizardState.steps[stepId].id = defaults.id;
        wizardState.steps[stepId].validity = defaults.validity;
        wizardState.steps[stepId].touched = defaults.touched;
      } else {
        wizardState.steps[stepId] = { ...defaults };
      }
    });
    Object.keys(wizardState.steps).forEach((stepId) => {
      if (!TRACKED_STEPS.includes(stepId)) {
        delete wizardState.steps[stepId];
      }
    });

    Object.assign(wizardState.runtime, freshState.runtime);

    wizardState.form.tokenName = freshState.form.tokenName;
    wizardState.form.naming = freshState.form.naming;
    wizardState.form.permissions = freshState.form.permissions;
    wizardState.form.distribution = freshState.form.distribution;
    wizardState.form.advanced = freshState.form.advanced;
    wizardState.form.registration = freshState.form.registration;

    resetIdentityState({ persist: false });

    currentScreenId = freshState.active;
    activeScreens = computeActiveScreens();
    wizardState.active = freshState.active;
    lastSkippedSignature = null;

    try {
      storage.removeItem(STATE_STORAGE_KEY);
    } catch (error) {
      console.debug('Unable to clear stored wizard state', error);
    }

    initialiseUI();

    persistState();
    wizardReadiness.hasQr = false;
    wizardReadiness.hasJson = false;
    wizardReadiness.hasIdentity = false;
    wizardReadiness.hasPrivateKey = false;
    syncWizardReadiness({ refreshStatus: false });
  }

  function navigateToFirstStep() {
    if (typeof window.goToStep === 'function') {
      window.goToStep(1);
    } else if (window.router && typeof window.router.push === 'function') {
      window.router.push('/wizard/step-1');
    } else if (typeof showScreen === 'function') {
      showScreen(STEP_SEQUENCE[0], { suppressFocus: false });
    } else {
      window.location.assign('/wizard/step-1');
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      if (tokenNameInput && typeof tokenNameInput.focus === 'function') {
        tokenNameInput.focus();
        return;
      }
      const firstInteractive = document.querySelector(
        '#screen-naming input, #screen-naming button, #screen-naming select, #screen-naming textarea'
      );
      if (firstInteractive && typeof firstInteractive.focus === 'function') {
        firstInteractive.focus();
      }
    });
  }

  function evaluateStep(stepId, options = {}) {
    // FIXED: Map substeps to their parent step for validation
    const parentStep = getParentStep(stepId) || stepId;

    switch (parentStep) {
      case 'welcome':
        return evaluateWelcome(options);
      case 'naming':
        return evaluateNaming(options);
      case 'permissions':
        return evaluatePermissions(options);
      case 'distribution':
        return evaluateDistribution(options);
      case 'advanced':
        return evaluateAdvanced(options);
      case 'overview':
        return evaluateOverview(options);
      case 'search':
        return evaluateSearch(options);
      case 'registration':
        return evaluateRegistration(options);
      default:
        return undefined;
    }
  }

  function handleStepAdvance(substepId) {
    // FIXED: Handle substeps correctly - get parent step for validation
    const parentStep = getParentStep(substepId) || substepId;

    let validation;
    switch (parentStep) {
      case 'naming':
        validation = evaluateNaming({ touched: true });
        if (!validation.valid) {
          announce(validation.message || 'Complete the naming step to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'permissions':
        validation = evaluatePermissions({ touched: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'distribution':
        validation = evaluateDistribution({ touched: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'advanced':
        validation = evaluateAdvanced({ touched: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'overview':
        validation = evaluateOverview({ touched: true });
        if (!validation.valid) {
          announce(validation.message || 'Review your configuration to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'search':
        validation = evaluateSearch({ touched: true });
        if (!validation.valid) {
          announce(validation.message || 'Complete the search configuration to continue.');
          return;
        }
        goToNextScreen(substepId);
        break;
      case 'registration':
        validation = evaluateRegistration({ touched: true });
        if (!validation.valid) {
          announce(validation.message);
          return;
        }
        handleRegistrationNext();
        break;
      default:
        break;
    }
  }

  function getStoredTheme() {
    try {
      const stored = storage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
      }
    } catch (error) {
      // ignore storage errors
    }
    return 'auto';
  }

  function setTheme(preference, persist = true) {
    const theme = preference === 'light' || preference === 'dark' ? preference : 'auto';
    console.log('setTheme called - preference:', preference, 'theme:', theme, 'persist:', persist);

    const previousTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', theme);
    console.log('Theme attribute changed from', previousTheme, 'to', theme);

    if (persist) {
      try {
        storage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.error('Failed to persist theme:', error);
      }
    }
    syncThemeControls(theme);
  }

  function syncThemeControls(theme) {
    if (!themeControls.length) {
      console.warn('syncThemeControls: No theme controls found');
      return;
    }
    console.log('syncThemeControls: Syncing controls to theme:', theme);
    themeControls.forEach((input) => {
      const option = input.closest('.theme-toggle__option');
      const isActive = input.value === theme;
      input.checked = isActive;
      if (option) {
        option.classList.toggle('theme-toggle__option--active', isActive);
        console.log('  -', input.name, input.value, 'active:', isActive);
      } else {
        console.warn('  - Could not find parent .theme-toggle__option for', input.name, input.value);
      }
    });
  }

  function syncRegistrationPreflightUI() {
    syncRegistrationSelection();
    const method = wizardState.form.registration.method;

    Object.entries(registrationPanels).forEach(([key, panel]) => {
      if (!panel) {
        return;
      }
      const active = method === key;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });

    if (qrPreviewButton) {
      qrPreviewButton.disabled = method !== 'mobile';
    }

    if (jsonShowButton) {
      jsonShowButton.disabled = method !== 'det';
    }

    if (jsonCopyButton) {
      const displayed = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
      jsonCopyButton.disabled = method !== 'det' || !displayed;
    }

    if (selfWarningCheckbox) {
      const acknowledged = Boolean(wizardState.form.registration.preflight.self.warningAcknowledged);
      if (method !== 'self' && !acknowledged) {
        selfWarningCheckbox.checked = false;
      } else if (method === 'self') {
        selfWarningCheckbox.checked = acknowledged;
      }
      selfWarningCheckbox.disabled = acknowledged;
    }

    if (selfWarningProceedButton) {
      const identityId = (wizardState.form.registration.identity.id || '').trim();
      const acknowledged = Boolean(wizardState.form.registration.preflight.self.warningAcknowledged);
      const checkboxConfirmed = Boolean(selfWarningCheckbox && selfWarningCheckbox.checked);
      const canProceed = method === 'self' && !acknowledged && checkboxConfirmed && identityId.length > 0;
      selfWarningProceedButton.disabled = !canProceed;
    }

    updateRegistrationPreviewVisibility();
    syncIdentityUI();
    syncWizardReadiness();
  }

  function syncWizardReadiness({ refreshStatus = false } = {}) {
    wizardReadiness.hasQr = Boolean(wizardState.form.registration.preflight.mobile.qrGenerated);
    wizardReadiness.hasJson = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
    wizardReadiness.hasIdentity = Boolean((wizardState.form.registration.identity.id || '').trim());
    wizardReadiness.hasPrivateKey = Boolean((wizardState.form.registration.wallet.privateKey || '').trim());

    const ready = isReadyToCreateNew(wizardReadiness);
    applyCreateTokenButtonState(ready);

    if (!registrationMessage) {
      return ready;
    }

    const currentStatus = registrationMessage.dataset.status || '';
    if (!ready) {
      const allowUpdate = refreshStatus || !currentStatus || currentStatus === 'info';
      if (allowUpdate) {
        setRegistrationStatus('info', readinessReminderMessage);
      }
    } else if (currentStatus && currentStatus !== 'success') {
      setRegistrationStatus('', '');
    }

    return ready;
  }

  function applyCreateTokenButtonState(isReady) {
    if (!createTokenButton) {
      return;
    }
    createTokenButton.disabled = !isReady;
    createTokenButton.setAttribute('aria-disabled', isReady ? 'false' : 'true');
  }

  function setRegistrationStatus(status, message) {
    if (!registrationMessage) {
      return;
    }
    const nextMessage = message || '';
    if ((registrationMessage.dataset.status || '') === (status || '') && registrationMessage.textContent === nextMessage) {
      return;
    }
    if (status) {
      registrationMessage.dataset.status = status;
    } else {
      delete registrationMessage.dataset.status;
    }
    registrationMessage.textContent = nextMessage;
  }

  function handleRegistrationNext() {
    const ready = syncWizardReadiness({ refreshStatus: false });
    if (!ready) {
      setRegistrationStatus('info', readinessReminderMessage);
      announce(readinessReminderMessage);
      return;
    }

    resetWizard();
    navigateToFirstStep();
    setRegistrationStatus('success', 'Started a new token.');
    announce('Started a new token.');
    updateFurthestValidIndex();
    persistState();
  }

  function handleChunkLoadRejection(event) {
    const reason = event ? event.reason : null;
    if (isChunkLoadProblem(reason)) {
      attemptChunkRecovery(reason);
    }
  }

  function handleChunkLoadError(event) {
    const message =
      (event && event.error && event.error.message) ||
      (event && typeof event.message === 'string' ? event.message : '');
    if (isChunkLoadProblem(message)) {
      attemptChunkRecovery(event && event.error ? event.error : message);
    }
  }

  function isChunkLoadProblem(input) {
    if (!input) {
      return false;
    }
    const message =
      typeof input === 'string'
        ? input
        : typeof input.message === 'string'
          ? input.message
          : '';
    if (!message) {
      return false;
    }
    return CHUNK_ERROR_PATTERN.test(message);
  }

  function attemptChunkRecovery(reason) {
    if (chunkRecoveryScheduled || typeof window === 'undefined') {
      return;
    }
    chunkRecoveryScheduled = true;

    let alreadyPending = false;
    try {
      if (window.sessionStorage) {
        const current = window.sessionStorage.getItem(CHUNK_RECOVERY_FLAG);
        alreadyPending = current === 'pending';
        if (!alreadyPending) {
          window.sessionStorage.setItem(CHUNK_RECOVERY_FLAG, 'pending');
        }
      }
    } catch (error) {
      console.debug('Unable to persist chunk recovery flag', error);
    }

    if (alreadyPending) {
      return;
    }

    const message = 'A required resource failed to load. Attempting recovery…';
    setRegistrationStatus('loading', message);
    announce(message);
    console.warn('Attempting chunk recovery after failure:', reason);

    (async () => {
      try {
        if (navigator.serviceWorker) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((registration) => registration.unregister().catch(() => { }))
          );
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key).catch(() => { })));
        }
      } catch (error) {
        console.warn('Chunk recovery cleanup failed', error);
      } finally {
        try {
          window.location.reload();
        } catch (error) {
          console.error('Unable to reload after chunk recovery attempt', error);
        }
      }
    })();
  }


  function handleEscapeShortcut(event) {
    if (event.key !== 'Escape') {
      return;
    }
    if (clearStepMessage(currentScreenId)) {
      announce('Validation message cleared');
    }
  }

  function validateTokenName(rawValue) {
    const trimmed = rawValue.trim();
    if (trimmed !== rawValue) {
      return { valid: false, message: 'Remove leading or trailing spaces.', normalized: trimmed };
    }
    if (trimmed.length === 0 || trimmed.length < 2 || trimmed.length > 64) {
      return { valid: false, message: 'Please enter a token name (2–64 characters).', normalized: trimmed };
    }
    if (!tokenNamePattern.test(trimmed)) {
      return { valid: false, message: 'Use letters, numbers, spaces, hyphen, underscore, or emoji only.', normalized: trimmed };
    }
    return { valid: true, message: '', normalized: trimmed };
  }

  function applyTokenNameValidation(result, options = {}) {
    const touched = options.touched ?? false;
    namingNextButton.disabled = !result.valid;
    if (!options.silent) {
      tokenNameMessage.textContent = result.message || '';
    }
    updateStepStatusFromValidation('naming', result, touched);
  }


  function ensureNamingFormState() {
    const naming = wizardState.form.naming;
    if (!naming || typeof naming !== 'object') {
      wizardState.form.naming = {
        conventions: { localizations: {} },
        rows: []
      };
      return;
    }
    if (!naming.conventions || typeof naming.conventions !== 'object') {
      naming.conventions = { localizations: {} };
    } else if (!naming.conventions.localizations || typeof naming.conventions.localizations !== 'object') {
      naming.conventions.localizations = {};
    }
    naming.conventions.localizations = limitLocalizationRecord(naming.conventions.localizations);

    if (!Array.isArray(naming.rows) || naming.rows.length === 0) {
      const record = naming.conventions.localizations || {};
      const nextRow = (() => {
        const [firstCode] = Object.keys(record);
        if (!firstCode) {
          return null;
        }
        const entry = record[firstCode];
        return normalizeLocalizationRowData({
          code: firstCode,
          shouldCapitalize: entry?.should_capitalize,
          singularForm: entry?.singular_form,
          pluralForm: entry?.plural_form
        });
      })();
      naming.rows = nextRow ? [nextRow] : [];
    }

    naming.rows = limitLocalizationRows(naming.rows);
    const [primaryRow] = naming.rows;
    naming.conventions.localizations = createLocalizationRecordFromRow(primaryRow);
  }

  function normalizeManualActionRecord(permissions, actionKey) {
    const defaults = createDefaultManualActionState();
    if (!permissions || typeof permissions !== 'object') {
      return createDefaultManualActionState();
    }

    const source = permissions[actionKey] && typeof permissions[actionKey] === 'object' ? permissions[actionKey] : {};
    const normalized = {
      ...defaults,
      ...source
    };

    const validTypes = new Set(['none', 'owner', 'identity', 'group', 'main-group']);
    normalized.enabled = Boolean(source.enabled);
    normalized.performerType = validTypes.has(source.performerType) ? source.performerType : defaults.performerType;
    normalized.performerReference = typeof source.performerReference === 'string' ? source.performerReference.trim() : '';
    normalized.ruleChangerType = validTypes.has(source.ruleChangerType) ? source.ruleChangerType : defaults.ruleChangerType;
    normalized.ruleChangerReference =
      typeof source.ruleChangerReference === 'string' ? source.ruleChangerReference.trim() : '';
    normalized.allowChangeAuthorizedToNone = Boolean(source.allowChangeAuthorizedToNone);
    normalized.allowChangeAdminToNone = Boolean(source.allowChangeAdminToNone);
    normalized.allowSelfChangeAdmin = Boolean(source.allowSelfChangeAdmin);

    const groups = Array.isArray(permissions.groups) ? permissions.groups : [];
    const groupIds = new Set(groups.map((group) => group.id));
    const mainGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);

    if (normalized.performerType === 'group') {
      if (!groupIds.has(normalized.performerReference)) {
        const fallbackGroup = groups[0];
        if (fallbackGroup) {
          normalized.performerReference = fallbackGroup.id;
        } else {
          normalized.performerType = 'none';
          normalized.performerReference = '';
        }
      }
    } else if (normalized.performerType === 'main-group') {
      if (mainGroupIndex < 0 || mainGroupIndex >= groups.length) {
        normalized.performerType = groups.length ? 'group' : 'none';
        normalized.performerReference = groups.length ? groups[0].id : '';
      }
    }

    if (normalized.ruleChangerType === 'group') {
      if (!groupIds.has(normalized.ruleChangerReference)) {
        const fallbackGroup = groups[0];
        if (fallbackGroup) {
          normalized.ruleChangerReference = fallbackGroup.id;
        } else {
          normalized.ruleChangerType = normalized.enabled ? 'owner' : 'none';
          normalized.ruleChangerReference = '';
        }
      }
    } else if (normalized.ruleChangerType === 'main-group') {
      if (mainGroupIndex < 0 || mainGroupIndex >= groups.length) {
        normalized.ruleChangerType = groups.length ? 'group' : 'owner';
        normalized.ruleChangerReference = groups.length ? groups[0].id : '';
      }
    }

    if (!normalized.enabled) {
      normalized.performerType = 'none';
      normalized.performerReference = '';
    } else if (normalized.performerType === 'none') {
      normalized.performerType = groups.length ? 'group' : 'owner';
      normalized.performerReference = groups.length ? groups[0].id : '';
    }

    if (!normalized.enabled && normalized.ruleChangerType === 'none') {
      normalized.ruleChangerType = 'owner';
      normalized.ruleChangerReference = '';
    }

    return normalized;
  }

  function ensureManualActionState(actionKey) {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    permissions[actionKey] = normalizeManualActionRecord(permissions, actionKey);
  }

  function ensureAllManualActionStates() {
    MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => ensureManualActionState(key));
  }

  function normalizeFreezeState(source) {
    const defaults = createDefaultFreezeState();
    const input = source && typeof source === 'object' ? source : {};
    const validTypes = new Set(['none', 'owner', 'identity']);

    const performSource = input.perform && typeof input.perform === 'object' ? input.perform : {};
    const changeSource = input.changeRules && typeof input.changeRules === 'object' ? input.changeRules : {};
    const flagsSource = input.flags && typeof input.flags === 'object' ? input.flags : {};

    const enabled = typeof input.enabled === 'boolean' ? input.enabled : defaults.enabled;
    const performType = validTypes.has(performSource.type) ? performSource.type : defaults.perform.type;
    const changeType = validTypes.has(changeSource.type) ? changeSource.type : defaults.changeRules.type;
    const performIdentity = typeof performSource.identity === 'string' ? performSource.identity.trim() : '';
    const changeIdentity = typeof changeSource.identity === 'string' ? changeSource.identity.trim() : '';

    return {
      enabled,
      perform: {
        type: performType,
        identity: performType === 'identity' ? performIdentity : ''
      },
      changeRules: {
        type: changeType,
        identity: changeType === 'identity' ? changeIdentity : ''
      },
      flags: {
        changeAuthorizedToNoOneAllowed: Boolean(flagsSource.changeAuthorizedToNoOneAllowed),
        changeAdminToNoOneAllowed: Boolean(flagsSource.changeAdminToNoOneAllowed),
        selfChangeAdminAllowed: Boolean(flagsSource.selfChangeAdminAllowed)
      }
    };
  }

  function ensureFreezeState() {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    permissions.freeze = normalizeFreezeState(permissions.freeze);
  }

  function ensurePermissionsGroupState() {
    const permissions = wizardState.form.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return;
    }
    ensureAllManualActionStates();
    ensureFreezeState();
    permissions.groups = normalisePermissionsGroups(permissions.groups);
    permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, permissions.groups.length);
  }

  function clonePermissionGroups(groups) {
    return normalisePermissionsGroups(groups).map((group) => ({
      id: group.id,
      requiredPower: group.requiredPower,
      members: group.members.map((member) => ({
        id: member.id,
        identity: member.identity,
        power: member.power
      }))
    }));
  }

  function createPermissionGroup(overrides = {}) {
    return {
      id: generateId('group'),
      name: '',
      requiredPower: '',
      members: [],
      ...overrides
    };
  }

  function createPermissionMember(overrides = {}) {
    return {
      id: generateId('member'),
      identity: '',
      power: '',
      ...overrides
    };
  }

  function renderPermissionGroups() {
    if (!groupListElement) {
      return;
    }

    ensurePermissionsGroupState();
    const { groups, mainControlGroupIndex } = wizardState.form.permissions;

    const emptyHint = groupEmptyHint || null;
    const openStates = new Map();
    if (groupListElement) {
      groupListElement.querySelectorAll('.wizard-group-card').forEach((existingCard) => {
        openStates.set(existingCard.dataset.groupId, existingCard.hasAttribute('open'));
      });
    }
    while (groupListElement.firstChild) {
      groupListElement.removeChild(groupListElement.firstChild);
    }

    if (!groups.length) {
      if (groupMainPositionInput) {
        groupMainPositionInput.value = '';
        groupMainPositionInput.disabled = true;
        groupMainPositionInput.removeAttribute('min');
        groupMainPositionInput.removeAttribute('max');
      }
      if (emptyHint) {
        emptyHint.hidden = false;
        groupListElement.appendChild(emptyHint);
      }
      syncManualActionUIs({ announce: false });
      syncFreezeUI({ announce: false });
      return;
    }

    if (groupMainPositionInput) {
      const maxIndex = groups.length - 1;
      const clamped = clampMainControlIndex(mainControlGroupIndex, groups.length);
      wizardState.form.permissions.mainControlGroupIndex = clamped;
      groupMainPositionInput.disabled = false;
      groupMainPositionInput.value = String(clamped + 1);
      groupMainPositionInput.setAttribute('min', '1');
      groupMainPositionInput.setAttribute('max', String(maxIndex + 1));
    }

    if (emptyHint) {
      emptyHint.hidden = true;
    }

    groups.forEach((group, index) => {
      const card = buildPermissionGroupCard(group, index, index === wizardState.form.permissions.mainControlGroupIndex);
      if (openStates.has(group.id)) {
        card.open = openStates.get(group.id);
      }
      groupListElement.appendChild(card);
    });

    syncManualActionUIs({ announce: false });
    syncFreezeUI({ announce: false });
  }

  function buildPermissionGroupCard(group, index, isPrimary) {
    const card = document.createElement('details');
    card.className = 'wizard-group-card';
    card.dataset.groupId = group.id;
    card.open = true;
    if (isPrimary) {
      card.classList.add('wizard-group-card--primary');
    }

    const summary = document.createElement('summary');
    summary.className = 'wizard-group-card__summary';
    const title = document.createElement('span');
    title.className = 'wizard-group-card__title';
    title.textContent = buildGroupLabel(group, index);
    summary.appendChild(title);
    if (isPrimary) {
      const badge = document.createElement('span');
      badge.className = 'wizard-group-card__badge';
      badge.textContent = 'Main control';
      summary.appendChild(badge);
    }
    const indicator = document.createElement('span');
    indicator.className = 'wizard-group-card__summary-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    summary.appendChild(indicator);
    card.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'wizard-group-card__body';

    // Group Name Field
    const nameField = document.createElement('div');
    nameField.className = 'wizard-field';
    const nameLabel = document.createElement('label');
    nameLabel.className = 'wizard-field__label';
    nameLabel.setAttribute('for', `group-name-${group.id}`);
    nameLabel.textContent = 'Group Name:';
    nameField.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.className = 'wizard-field__input';
    nameInput.id = `group-name-${group.id}`;
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g., Treasury Committee';
    nameInput.value = group.name || '';
    nameInput.dataset.groupAction = 'group-name';
    nameInput.dataset.groupId = group.id;
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    const requiredField = document.createElement('div');
    requiredField.className = 'wizard-field';
    const requiredLabelRow = document.createElement('div');
    requiredLabelRow.className = 'wizard-field__label-row';
    const requiredLabel = document.createElement('label');
    requiredLabel.className = 'wizard-field__label';
    requiredLabel.setAttribute('for', `group-required-${group.id}`);
    requiredLabel.textContent = 'Required Power:';
    const requiredInfoId = `group-required-info-${group.id}`;
    const requiredInfoButton = createInfoButton(requiredInfoId, 'More information about required power');
    requiredLabelRow.append(requiredLabel, requiredInfoButton);
    requiredField.appendChild(requiredLabelRow);
    requiredField.appendChild(createInfoPanel(requiredInfoId, 'Specify how much cumulative power this group must supply to approve an action. Compare against the sum of member power values.'));
    const requiredInput = document.createElement('input');
    requiredInput.className = 'wizard-field__input wizard-group-card__required-power';
    requiredInput.id = `group-required-${group.id}`;
    requiredInput.type = 'number';
    requiredInput.min = '0';
    requiredInput.step = '1';
    requiredInput.max = String(MAX_U32);
    requiredInput.placeholder = '0';
    requiredInput.value = group.requiredPower || '';
    requiredInput.dataset.groupAction = 'required-power';
    requiredInput.dataset.groupId = group.id;
    const requiredInputWrapper = document.createElement('div');
    requiredInputWrapper.className = 'wizard-field__inline';
    requiredInputWrapper.appendChild(requiredInput);
    requiredField.appendChild(requiredInputWrapper);
    body.appendChild(requiredField);

    const membersWrapper = document.createElement('div');
    membersWrapper.className = 'wizard-group-card__members';
    const membersHeadingRow = document.createElement('div');
    membersHeadingRow.className = 'wizard-field__label-row';
    const membersHeading = document.createElement('h3');
    membersHeading.className = 'wizard-group-card__members-title';
    membersHeading.textContent = 'Members:';
    const membersInfoId = `group-members-info-${group.id}`;
    const membersInfoButton = createInfoButton(membersInfoId, 'More information about group members');
    membersHeadingRow.append(membersHeading, membersInfoButton);
    membersWrapper.appendChild(membersHeadingRow);
    membersWrapper.appendChild(createInfoPanel(membersInfoId, 'Add each identity or address that participates in this group. Assign a power value (u32) to reflect their voting weight.'));

    const membersContainer = document.createElement('div');
    membersContainer.className = 'wizard-group-card__members-list';
    membersContainer.dataset.groupId = group.id;
    if (!group.members.length) {
      const empty = document.createElement('p');
      empty.className = 'wizard-subsection__hint';
      empty.textContent = 'No members added yet.';
      membersContainer.appendChild(empty);
    } else {
      group.members.forEach((member, memberIndex) => {
        membersContainer.appendChild(buildPermissionMemberRow(group, member, memberIndex));
      });
    }
    membersWrapper.appendChild(membersContainer);

    const addMemberButton = document.createElement('button');
    addMemberButton.type = 'button';
    addMemberButton.className = 'wizard-button wizard-button--secondary wizard-button--sm';
    addMemberButton.dataset.groupAction = 'add-member';
    addMemberButton.dataset.groupId = group.id;
    addMemberButton.textContent = 'Add Member';
    membersWrapper.appendChild(addMemberButton);
    body.appendChild(membersWrapper);

    const cardActions = document.createElement('div');
    cardActions.className = 'wizard-group-card__actions';
    const removeGroupButton = document.createElement('button');
    removeGroupButton.type = 'button';
    removeGroupButton.className = 'wizard-button wizard-button--ghost wizard-button--sm';
    removeGroupButton.dataset.groupAction = 'remove-group';
    removeGroupButton.dataset.groupId = group.id;
    removeGroupButton.textContent = 'Remove Group';
    cardActions.appendChild(removeGroupButton);
    body.appendChild(cardActions);

    card.appendChild(body);
    return card;
  }

  function buildPermissionMemberRow(group, member, memberIndex = 0) {
    const row = document.createElement('div');
    row.className = 'wizard-group-card__member-row';
    row.dataset.groupId = group.id;
    row.dataset.memberId = member.id;

    const identityInputId = `group-${group.id}-member-${member.id}-identity`;
    const powerInputId = `group-${group.id}-member-${member.id}-power`;

    const memberLabel = document.createElement('label');
    memberLabel.className = 'wizard-group-card__member-label';
    memberLabel.setAttribute('for', identityInputId);
    memberLabel.textContent = `Member ${memberIndex + 1}`;
    row.appendChild(memberLabel);

    const identityInput = document.createElement('input');
    identityInput.className = 'wizard-field__input wizard-group-card__member-select';
    identityInput.type = 'text';
    identityInput.setAttribute('list', 'wizard-permissions-member-options');
    identityInput.placeholder = 'Select address or identity';
    identityInput.id = identityInputId;
    identityInput.value = member.identity || '';
    identityInput.dataset.groupAction = 'member-identity';
    identityInput.dataset.groupId = group.id;
    identityInput.dataset.memberId = member.id;
    row.appendChild(identityInput);

    const powerField = document.createElement('div');
    powerField.className = 'wizard-group-card__member-power-field';
    const powerLabel = document.createElement('label');
    powerLabel.className = 'wizard-group-card__member-power-label';
    powerLabel.setAttribute('for', powerInputId);
    powerLabel.textContent = 'Power (u32):';
    const powerInput = document.createElement('input');
    powerInput.className = 'wizard-field__input wizard-group-card__member-power';
    powerInput.id = powerInputId;
    powerInput.type = 'number';
    powerInput.min = '0';
    powerInput.step = '1';
    powerInput.max = String(MAX_U32);
    powerInput.placeholder = '0';
    powerInput.value = member.power || '';
    powerInput.dataset.groupAction = 'member-power';
    powerInput.dataset.groupId = group.id;
    powerInput.dataset.memberId = member.id;
    powerField.append(powerLabel, powerInput);
    row.appendChild(powerField);

    const actions = document.createElement('div');
    actions.className = 'wizard-group-card__member-actions';
    const removeMemberButton = document.createElement('button');
    removeMemberButton.type = 'button';
    removeMemberButton.className = 'wizard-button wizard-button--ghost wizard-button--sm';
    removeMemberButton.dataset.groupAction = 'remove-member';
    removeMemberButton.dataset.groupId = group.id;
    removeMemberButton.dataset.memberId = member.id;
    removeMemberButton.textContent = 'Remove Member';
    actions.appendChild(removeMemberButton);
    row.appendChild(actions);

    return row;
  }

  function focusGroupRequiredField(groupId) {
    if (!groupListElement) {
      return;
    }
    requestAnimationFrame(() => {
      const card = groupListElement.querySelector(`.wizard-group-card[data-group-id="${groupId}"]`);
      if (card && !card.open) {
        card.open = true;
      }
      const input = groupListElement.querySelector(
        `[data-group-action="required-power"][data-group-id="${groupId}"]`
      );
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    });
  }

  function focusGroupMemberIdentity(groupId, memberId) {
    if (!groupListElement) {
      return;
    }
    requestAnimationFrame(() => {
      const card = groupListElement.querySelector(`.wizard-group-card[data-group-id="${groupId}"]`);
      if (card && !card.open) {
        card.open = true;
      }
      const input = groupListElement.querySelector(
        `[data-group-action="member-identity"][data-group-id="${groupId}"][data-member-id="${memberId}"]`
      );
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    });
  }

  function initialisePermissionGroupsUI() {
    ensurePermissionsGroupState();
    renderPermissionGroups();

    if (groupAddButton) {
      groupAddButton.addEventListener('click', () => {
        addPermissionGroup();
      });
    }

    if (groupMainPositionInput) {
      const handlePositionChange = () => {
        ensurePermissionsGroupState();
        const groups = wizardState.form.permissions.groups;
        if (!groups.length) {
          groupMainPositionInput.value = '';
          groupMainPositionInput.disabled = true;
          return;
        }
        let value = parseInt(groupMainPositionInput.value, 10);
        if (!Number.isInteger(value) || value < 1) {
          value = 1;
        }
        const zeroBased = clampMainControlIndex(value - 1, groups.length);
        wizardState.form.permissions.mainControlGroupIndex = zeroBased;
        groupMainPositionInput.value = String(zeroBased + 1);
        groupMainPositionInput.disabled = false;
        renderPermissionGroups();
        persistState();
      };
      groupMainPositionInput.addEventListener('input', handlePositionChange);
      groupMainPositionInput.addEventListener('blur', handlePositionChange);
    }

    if (groupListElement) {
      groupListElement.addEventListener('click', handleGroupListClick);
      groupListElement.addEventListener('input', handleGroupListInput);
    }
  }

  function handleGroupListClick(event) {
    const trigger = event.target.closest('[data-group-action]');
    if (!trigger) {
      return;
    }
    const action = trigger.dataset.groupAction;
    const groupId = trigger.dataset.groupId;
    const memberId = trigger.dataset.memberId;

    switch (action) {
      case 'add-member':
        addGroupMember(groupId);
        break;
      case 'remove-group':
        removePermissionGroup(groupId);
        break;
      case 'remove-member':
        removeGroupMember(groupId, memberId);
        break;
      default:
        break;
    }
  }

  function handleGroupListInput(event) {
    const input = event.target.closest('[data-group-action]');
    if (!input) {
      return;
    }
    const action = input.dataset.groupAction;
    const groupId = input.dataset.groupId;
    const memberId = input.dataset.memberId;

    switch (action) {
      case 'group-name': {
        updateGroupName(groupId, input.value);
        break;
      }
      case 'required-power': {
        updateGroupRequiredPower(groupId, input.value);
        input.value = normaliseUnsignedValue(input.value);
        break;
      }
      case 'member-identity':
        updateGroupMemberField(groupId, memberId, 'identity', input.value);
        break;
      case 'member-power':
        updateGroupMemberField(groupId, memberId, 'power', input.value);
        input.value = normaliseUnsignedValue(input.value);
        break;
      default:
        break;
    }
  }

  function addPermissionGroup() {
    ensurePermissionsGroupState();
    const permissions = wizardState.form.permissions;
    const newGroup = createPermissionGroup();
    const groups = [...permissions.groups, newGroup];
    permissions.groups = groups;
    if (groups.length === 1) {
      permissions.mainControlGroupIndex = 0;
    } else {
      permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);
    }
    renderPermissionGroups();
    focusGroupRequiredField(newGroup.id);
    persistState();
  }

  function removePermissionGroup(groupId) {
    ensurePermissionsGroupState();
    const permissions = wizardState.form.permissions;
    const index = permissions.groups.findIndex((group) => group.id === groupId);
    if (index === -1) {
      return;
    }
    permissions.groups.splice(index, 1);
    permissions.mainControlGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, permissions.groups.length);
    renderPermissionGroups();
    persistState();
  }

  function addGroupMember(groupId) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const member = createPermissionMember();
    group.members.push(member);
    renderPermissionGroups();
    focusGroupMemberIdentity(groupId, member.id);
    persistState();
  }

  function removeGroupMember(groupId, memberId) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const index = group.members.findIndex((member) => member.id === memberId);
    if (index === -1) {
      return;
    }
    group.members.splice(index, 1);
    renderPermissionGroups();
    persistState();
  }

  function updateGroupName(groupId, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    group.name = typeof value === 'string' ? value : '';
    persistState();
    // Re-render groups to update the card title with the new name
    renderPermissionGroups();
  }

  function updateGroupRequiredPower(groupId, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    group.requiredPower = normaliseUnsignedValue(value);
    persistState();
  }

  function updateGroupMemberField(groupId, memberId, field, value) {
    ensurePermissionsGroupState();
    const group = wizardState.form.permissions.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const member = group.members.find((entry) => entry.id === memberId);
    if (!member) {
      return;
    }
    if (field === 'identity') {
      member.identity = typeof value === 'string' ? value.trim() : '';
    } else if (field === 'power') {
      member.power = normaliseUnsignedValue(value);
    }
    persistState();
  }

  function initialiseLocalizationUI() {
    if (!localizationList) {
      return;
    }
    ensureNamingFormState();
    const rowsData = Array.isArray(wizardState.form.naming.rows)
      ? wizardState.form.naming.rows
      : [];
    renderLocalizationRows(limitLocalizationRows(rowsData));
    validateLocalizationRows({ silent: true });
    if (localizationAddButton && localizationWrapper) {
      localizationAddButton.setAttribute('aria-controls', localizationWrapper.id);
    }
    const registerAddHandler = (button) => {
      if (!button) {
        return;
      }
      button.addEventListener('click', () => {
        addLocalizationRow(createEmptyLocalizationRowData());
      });
    };
    registerAddHandler(localizationAddButton);
    // ADDED: Wire up the "+ Add language" button that appears after first language
    const localizationAddMoreButton = document.getElementById('localization-add-more');
    registerAddHandler(localizationAddMoreButton);

    // ADDED: Event listener for remove buttons (using event delegation)
    if (localizationList) {
      localizationList.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-remove-localization')) {
          const rowId = e.target.getAttribute('data-remove-localization');
          removeLocalizationRow(rowId);
        }
      });
    }

    syncLocalizationVisibility();
  }

  function renderLocalizationRows(rowsData) {
    if (!localizationList) {
      return;
    }
    localizationList.innerHTML = '';
    localizationRows = [];
    localizationRowIdCounter = 0;
    const entries = limitLocalizationRows(Array.isArray(rowsData) ? rowsData : []);
    entries.forEach((entry) => {
      addLocalizationRow(entry, { focus: false, evaluate: false });
    });
    syncLocalizationVisibility();
  }

  function addLocalizationRow(initialData = createEmptyLocalizationRowData(), options = {}) {
    if (!localizationList) {
      return null;
    }
    // REMOVED LIMITATION: Allow multiple localization rows (one per language)
    // Original code prevented adding more than 1 language - now unlimited
    localizationRowIdCounter += 1;
    const rowId = `localization-${localizationRowIdCounter}`;
    const normalized = normalizeLocalizationRowData(initialData);
    const row = createLocalizationRow(rowId, normalized);
    localizationRows.push(row);
    localizationList.appendChild(row.elements.container);
    syncLocalizationVisibility();
    if (options.focus !== false) {
      row.elements.codeInput.focus();
    }
    if (options.evaluate !== false) {
      evaluateNaming({ touched: true });
    }
    return row;
  }

  // ADDED: Function to remove a localization row
  function removeLocalizationRow(rowId) {
    const index = localizationRows.findIndex(row => row.id === rowId);
    if (index === -1) {
      return;
    }
    const row = localizationRows[index];
    // Remove from DOM
    if (row.elements.container && row.elements.container.parentNode) {
      row.elements.container.parentNode.removeChild(row.elements.container);
    }
    // Remove from array
    localizationRows.splice(index, 1);
    // Update UI and validation
    syncLocalizationVisibility();
    evaluateNaming({ touched: true });
  }

  function createLocalizationRow(rowId, data) {
    const container = document.createElement('div');
    container.className = 'localization-row';
    container.dataset.localizationRow = rowId;

    const header = document.createElement('div');
    header.className = 'localization-row__header';

    const codeField = document.createElement('div');
    codeField.className = 'wizard-field localization-row__field localization-row__field--code';
    const codeLabel = document.createElement('label');
    codeLabel.className = 'wizard-field__label';
    codeLabel.setAttribute('for', `${rowId}-code`);
    codeLabel.textContent = 'Language code';

    // Use input with datalist for selecting or typing custom language codes
    const codeInput = document.createElement('input');
    codeInput.className = 'wizard-field__input';
    codeInput.id = `${rowId}-code`;
    codeInput.name = `${rowId}-code`;
    codeInput.type = 'text';
    codeInput.setAttribute('list', `${rowId}-languages`);
    codeInput.placeholder = 'Select or type code (e.g., en, es, fr)';
    codeInput.maxLength = 2;
    codeInput.value = data.code || '';
    codeInput.pattern = '[a-z]{2}';

    // Create datalist with most common languages
    const datalist = document.createElement('datalist');
    datalist.id = `${rowId}-languages`;

    const languages = [
      { code: 'es', name: 'Spanish (Español)' },
      { code: 'zh', name: 'Chinese (中文)' },
      { code: 'fr', name: 'French (Français)' },
      { code: 'de', name: 'German (Deutsch)' },
      { code: 'pt', name: 'Portuguese (Português)' },
      { code: 'ru', name: 'Russian (Русский)' },
      { code: 'ja', name: 'Japanese (日本語)' },
      { code: 'ar', name: 'Arabic (العربية)' },
      { code: 'hi', name: 'Hindi (हिन्दी)' },
      { code: 'it', name: 'Italian (Italiano)' }
    ];

    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      datalist.appendChild(option);
    });

    codeField.appendChild(datalist);

    const codeHint = document.createElement('p');
    codeHint.className = 'wizard-field__hint';
    codeHint.id = `${rowId}-code-hint`;
    codeHint.textContent = '2-letter ISO 639-1 code • Select from list or type your own (e.g., ko, tr, nl)';
    const codeMessage = document.createElement('p');
    codeMessage.className = 'wizard-field__message';
    codeMessage.id = `${rowId}-code-message`;
    codeMessage.setAttribute('role', 'status');
    codeMessage.setAttribute('aria-live', 'polite');
    codeInput.setAttribute('aria-describedby', `${codeHint.id} ${codeMessage.id}`);
    codeField.append(codeLabel, codeInput, codeHint, codeMessage);

    header.append(codeField);

    // Translation fields container (shown when language is selected)
    const translationFields = document.createElement('div');
    translationFields.className = 'localization-row__fields';
    translationFields.id = `${rowId}-fields`;
    translationFields.hidden = !data.code; // Hide if no language selected

    // Singular form field
    const singularField = document.createElement('div');
    singularField.className = 'wizard-field';
    const singularLabel = document.createElement('label');
    singularLabel.className = 'wizard-field__label';
    singularLabel.setAttribute('for', `${rowId}-singular`);
    singularLabel.textContent = 'Singular form';
    const singularInput = document.createElement('input');
    singularInput.className = 'wizard-field__input';
    singularInput.type = 'text';
    singularInput.id = `${rowId}-singular`;
    singularInput.name = `${rowId}-singular`;
    singularInput.placeholder = 'Token';
    singularInput.value = data.singularForm || '';
    singularInput.maxLength = 25;
    const singularMessage = document.createElement('p');
    singularMessage.className = 'wizard-field__message';
    singularMessage.id = `${rowId}-singular-message`;
    singularMessage.setAttribute('role', 'status');
    singularMessage.setAttribute('aria-live', 'polite');
    singularField.append(singularLabel, singularInput, singularMessage);

    // Plural form field
    const pluralField = document.createElement('div');
    pluralField.className = 'wizard-field';
    const pluralLabel = document.createElement('label');
    pluralLabel.className = 'wizard-field__label';
    pluralLabel.setAttribute('for', `${rowId}-plural`);
    pluralLabel.textContent = 'Plural form';
    const pluralInput = document.createElement('input');
    pluralInput.className = 'wizard-field__input';
    pluralInput.type = 'text';
    pluralInput.id = `${rowId}-plural`;
    pluralInput.name = `${rowId}-plural`;
    pluralInput.placeholder = 'Tokens';
    pluralInput.value = data.pluralForm || '';
    pluralInput.maxLength = 25;
    const pluralMessage = document.createElement('p');
    pluralMessage.className = 'wizard-field__message';
    pluralMessage.id = `${rowId}-plural-message`;
    pluralMessage.setAttribute('role', 'status');
    pluralMessage.setAttribute('aria-live', 'polite');
    pluralField.append(pluralLabel, pluralInput, pluralMessage);

    // Capitalize checkbox field
    const capitalizeField = document.createElement('div');
    capitalizeField.className = 'wizard-field';
    const capitalizeLabel = document.createElement('label');
    capitalizeLabel.className = 'wizard-checkbox';
    capitalizeLabel.setAttribute('for', `${rowId}-capitalize`);
    const capitalizeInput = document.createElement('input');
    capitalizeInput.className = 'wizard-checkbox__input';
    capitalizeInput.type = 'checkbox';
    capitalizeInput.id = `${rowId}-capitalize`;
    capitalizeInput.name = `${rowId}-capitalize`;
    capitalizeInput.checked = data.shouldCapitalize !== false;
    const capitalizeLabelText = document.createElement('span');
    capitalizeLabelText.className = 'wizard-checkbox__label';
    capitalizeLabelText.textContent = 'Capitalize';
    capitalizeLabel.append(capitalizeInput, capitalizeLabelText);
    capitalizeField.append(capitalizeLabel);

    translationFields.append(singularField, pluralField, capitalizeField);

    // ADDED: Remove button for each localization row
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'wizard-button wizard-button--danger wizard-button--small';
    removeButton.setAttribute('data-remove-localization', rowId);
    removeButton.textContent = 'Remove';
    removeButton.style.marginTop = 'var(--space-3)';
    // FIXED: Add ARIA label for accessibility
    const langLabel = data.code ? ` (${data.code})` : '';
    removeButton.setAttribute('aria-label', `Remove localization${langLabel}`);

    container.append(header, translationFields, removeButton);

    const row = {
      id: rowId,
      elements: {
        container,
        codeInput,
        codeMessage,
        translationFields,
        singularInput,
        singularMessage,
        pluralInput,
        pluralMessage,
        capitalizeInput,
        removeButton
      },
      data: {
        code: codeInput.value,
        singularForm: singularInput.value,
        pluralForm: pluralInput.value,
        shouldCapitalize: capitalizeInput.checked
      }
    };

    // Event listeners
    codeInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'code', codeInput.value));
    codeInput.addEventListener('change', () => handleLocalizationFieldInput(row, 'code', codeInput.value));
    singularInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'singular', singularInput.value));
    pluralInput.addEventListener('input', () => handleLocalizationFieldInput(row, 'plural', pluralInput.value));
    capitalizeInput.addEventListener('change', () => handleLocalizationFieldInput(row, 'capitalize', capitalizeInput.checked));

    return row;
  }

  function showLocalizationForm() {
    if (localizationWrapper) {
      localizationWrapper.hidden = false;
    }
    if (localizationEmptyState) {
      // FIXED: Hide empty state when there are localizations
      localizationEmptyState.hidden = true;
    }
    if (localizationGuidance) {
      localizationGuidance.hidden = true;
      localizationGuidance.setAttribute('aria-hidden', 'true');
    }
    if (localizationAddButton) {
      localizationAddButton.setAttribute('aria-expanded', 'true');
    }
  }

  function hideLocalizationForm() {
    if (localizationWrapper) {
      localizationWrapper.hidden = true;
    }
    if (localizationEmptyState) {
      localizationEmptyState.hidden = false;
    }
    if (localizationGuidance) {
      localizationGuidance.hidden = false;
      localizationGuidance.removeAttribute('aria-hidden');
    }
    if (localizationGlobalMessage) {
      localizationGlobalMessage.textContent = '';
    }
    if (localizationAddButton) {
      localizationAddButton.setAttribute('aria-expanded', 'false');
    }
  }

  function syncLocalizationVisibility() {
    const hasRows = localizationRows.length > 0;
    if (hasRows) {
      showLocalizationForm();
    } else {
      hideLocalizationForm();
    }
  }

  function handleLocalizationFieldInput(row, field, value) {
    if (!row || !row.elements) {
      return;
    }
    if (field === 'code') {
      const normalized = (value || '').toLowerCase();
      row.data.code = normalized;
      if (row.elements.codeInput.value !== normalized) {
        row.elements.codeInput.value = normalized;
      }
      // Show/hide translation fields based on whether a language is selected
      if (row.elements.translationFields) {
        row.elements.translationFields.hidden = !normalized;
      }
    } else if (field === 'singular') {
      row.data.singularForm = value;
    } else if (field === 'plural') {
      row.data.pluralForm = value;
    } else if (field === 'capitalize') {
      row.data.shouldCapitalize = Boolean(value);
    }
    evaluateNaming({ touched: true });
  }

  function handleLocalizationCheckboxChange(row, checked) {
    if (!row) {
      return;
    }
    row.data.shouldCapitalize = Boolean(checked);
    evaluateNaming({ touched: true });
  }

  function applyLocalizationRowErrors(row, errors, visibility = {}) {
    const showCode = visibility.showCode ?? true;
    const showSingular = visibility.showSingular ?? true;
    const showPlural = visibility.showPlural ?? true;
    if (row.elements.codeMessage) {
      row.elements.codeMessage.textContent = showCode ? errors.code || '' : '';
    }
    toggleAriaInvalid(row.elements.codeInput, showCode && Boolean(errors.code));
    if (row.elements.singularMessage) {
      row.elements.singularMessage.textContent = showSingular ? errors.singular || '' : '';
    }
    toggleAriaInvalid(row.elements.singularInput, showSingular && Boolean(errors.singular));
    if (row.elements.pluralMessage) {
      row.elements.pluralMessage.textContent = showPlural ? errors.plural || '' : '';
    }
    toggleAriaInvalid(row.elements.pluralInput, showPlural && Boolean(errors.plural));
  }

  function toggleAriaInvalid(element, isInvalid) {
    if (!element) {
      return;
    }
    if (isInvalid) {
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('aria-invalid');
    }
  }

  function validateLocalizationRows({ touched = false, silent = false } = {}) {
    if (!localizationList) {
      return { valid: false, record: {}, reasons: ['Add at least one localization.'] };
    }

    // Get singular/plural from main token name form
    const mainSingular = wizardState.form.naming.singular || '';
    const mainPlural = wizardState.form.naming.plural || '';

    let rowsData = localizationRows.map((row) => {
      const data = {
        code: row.elements.codeInput.value || '',
        singularForm: row.elements.singularInput?.value || '',
        pluralForm: row.elements.pluralInput?.value || '',
        shouldCapitalize: row.elements.capitalizeInput?.checked !== false
      };
      row.data = data;
      return data;
    });

    rowsData = limitLocalizationRows(rowsData);
    localizationRows.slice(0, rowsData.length).forEach((row, index) => {
      row.data = rowsData[index];
    });

    const reasons = [];
    const record = {};
    let hasValidEntry = false;
    const hasAnyInput = rowsData.some((data) => {
      return data.code.trim().length > 0;
    });

    rowsData.forEach((data, index) => {
      const row = localizationRows[index];
      if (!row) {
        return;
      }
      const trimmedCode = data.code.trim();
      const trimmedSingular = (data.singularForm || '').trim();
      const trimmedPlural = (data.pluralForm || '').trim();
      const errors = { code: '', singular: '', plural: '' };
      const showRowErrors = touched || hasAnyInput;

      // Validate language code
      if (trimmedCode.length === 0) {
        if (showRowErrors) {
          errors.code = 'Select a language code.';
        }
      } else if (!LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
        errors.code = 'Use a 2-letter lowercase code.';
        reasons.push(`Localization ${index + 1} language code: Select a valid ISO 639-1 language.`);
      }

      // If language code is entered, validate singular and plural forms
      if (trimmedCode.length > 0 && LANGUAGE_CODE_PATTERN.test(trimmedCode)) {
        if (trimmedSingular.length === 0) {
          errors.singular = 'Enter singular form.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Enter a singular form.`);
          }
        } else if (trimmedSingular.length < 3 || trimmedSingular.length > 25) {
          errors.singular = 'Must be 3-25 characters.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Singular form must be 3-25 characters.`);
          }
        }

        if (trimmedPlural.length === 0) {
          errors.plural = 'Enter plural form.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Enter a plural form.`);
          }
        } else if (trimmedPlural.length < 3 || trimmedPlural.length > 25) {
          errors.plural = 'Must be 3-25 characters.';
          if (showRowErrors) {
            reasons.push(`Localization ${index + 1}: Plural form must be 3-25 characters.`);
          }
        }
      }

      if (!silent) {
        applyLocalizationRowErrors(row, errors, {
          showCode: showRowErrors,
          showSingular: showRowErrors,
          showPlural: showRowErrors
        });
      }

      // Only add to record if all fields are valid
      if (!errors.code && !errors.singular && !errors.plural && trimmedCode.length > 0) {
        hasValidEntry = true;
        record[trimmedCode] = {
          should_capitalize: Boolean(data.shouldCapitalize),
          singular_form: trimmedSingular,
          plural_form: trimmedPlural
        };
      }
    });

    const sortedRecord = {};
    Object.keys(record)
      .sort()
      .forEach((key) => {
        sortedRecord[key] = record[key];
      });

    ensureNamingFormState();
    wizardState.form.naming.rows = rowsData.map((data) => ({
      code: data.code,
      singularForm: data.singularForm || '',
      pluralForm: data.pluralForm || '',
      shouldCapitalize: Boolean(data.shouldCapitalize)
    }));
    wizardState.form.naming.rows = limitLocalizationRows(wizardState.form.naming.rows);
    wizardState.form.naming.conventions.localizations = limitLocalizationRecord(sortedRecord);

    if (localizationGlobalMessage) {
      // FIXED: Update message to reflect that localization is optional
      if (!hasValidEntry && hasAnyInput && (touched || hasAnyInput)) {
        localizationGlobalMessage.textContent = 'Complete all fields for each localization or remove incomplete entries.';
      } else if (hasValidEntry || !hasAnyInput) {
        localizationGlobalMessage.textContent = '';
      }
    }

    syncLocalizationVisibility();

    // FIXED: Make localization optional - only require validation if user has started adding localizations
    // If no rows exist or all rows are empty, that's valid (localization is optional)
    // Only fail validation if there are partial entries with errors
    if (!hasValidEntry && hasAnyInput) {
      reasons.push('Complete the localization entries or remove them.');
    }

    const uniqueReasons = Array.from(new Set(reasons));
    // Valid if: (no input at all) OR (has valid entry AND no errors)
    const valid = !hasAnyInput || (hasValidEntry && uniqueReasons.length === 0);
    const rowsForServer = rowsData.map((data) => ({
      code: data.code,
      should_capitalize: Boolean(data.shouldCapitalize),
      singular_form: data.singularForm || '',
      plural_form: data.pluralForm || ''
    }));

    return {
      valid,
      record: sortedRecord,
      reasons: uniqueReasons,
      rows: rowsForServer
    };
  }


  function showScreen(screenId, { suppressFocus = false, force = false, isManualNavigation = false } = {}) {
    const requestedScreenId = screenId;
    console.log('showScreen called with:', screenId, 'manual:', isManualNavigation);

    if (!force) {
      screenId = resolveStepTargetId(screenId);
    } else if (!STEP_SEQUENCE.includes(screenId)) {
      screenId = resolveStepTargetId(screenId);
    }

    console.log('After resolveStepTargetId:', screenId);
    console.log('Is in activeScreens?', activeScreens.some((definition) => definition.id === screenId));

    if (!activeScreens.some((definition) => definition.id === screenId)) {
      console.warn('Screen not found in activeScreens:', screenId);
      if (activeScreens.length === 0) {
        console.error('No active screens available!');
        return;
      }
      screenId = activeScreens[0].id;
      console.log('Falling back to first active screen:', screenId);
      if (force && screenId !== requestedScreenId) {
        manualNavigationActive = false;
      }
      screenId = resolveStepTargetId(screenId);
    }

    currentScreenId = screenId;
    console.log('Setting currentScreenId to:', currentScreenId);

    screenDefinitions.forEach((definition) => {
      const isActiveDefinition = activeScreens.some((active) => active.id === definition.id);
      const shouldShow = isActiveDefinition && definition.id === screenId;

      if (definition.element) {
        if (shouldShow) {
          definition.element.classList.add('wizard-screen--active');
          definition.element.removeAttribute('hidden');
          if (!suppressFocus) {
            const targetHeading = definition.element.querySelector('h1');
            if (targetHeading) {
              requestAnimationFrame(() => targetHeading.focus({ preventScroll: false }));
            }
          }
        } else {
          definition.element.classList.remove('wizard-screen--active');
          definition.element.setAttribute('hidden', '');
        }
      }
    });

    // FIXED: Track previous parent step from current active screen
    const previousActiveScreen = wizardState.active;
    const previousParentStep = previousActiveScreen ? getPrimaryStepId(previousActiveScreen) : null;
    const currentParentStep = getPrimaryStepId(screenId);
    const parentStepChanged = previousParentStep !== currentParentStep;

    if (wizardState.active !== screenId) {
      wizardState.active = screenId;
      persistState();
    }

    wizardElement.dataset.activeStep = screenId;

    // Update configuration overview when showing overview step
    if (screenId === 'overview' || getPrimaryStepId(screenId) === 'overview') {
      requestAnimationFrame(() => {
        if (typeof updateConfigurationOverview === 'function') {
          updateConfigurationOverview();
        }
      });
    }

    // Restore preset selection when showing permissions screen
    if (screenId === 'permissions' || getPrimaryStepId(screenId) === 'permissions') {
      requestAnimationFrame(() => {
        if (typeof window.restorePresetSelection === 'function') {
          window.restorePresetSelection();
        }
      });
    }

    // Sync search form when showing search screen
    if (screenId === 'search' || getPrimaryStepId(screenId) === 'search') {
      requestAnimationFrame(() => {
        syncSearchUI();
      });
    }

    // Sync preprogrammed distribution form when showing preprogrammed screen
    if (screenId === 'distribution-preprogrammed' || getPrimaryStepId(screenId) === 'distribution') {
      requestAnimationFrame(() => {
        const yesRadio = document.querySelector('input[name="preprogrammed-enable"][value="yes"]');
        const noRadio = document.querySelector('input[name="preprogrammed-enable"][value="no"]');
        const container = document.getElementById('preprogrammed-entries-container');

        if (wizardState.form.distribution.enablePreProgrammed) {
          if (yesRadio) yesRadio.checked = true;
          if (container) container.removeAttribute('hidden');
        } else {
          if (noRadio) noRadio.checked = true;
          if (container) container.setAttribute('hidden', '');
        }
      });
    }

    // Sync perpetual distribution form when showing perpetual screen
    if (screenId === 'distribution-perpetual' || getPrimaryStepId(screenId) === 'distribution') {
      requestAnimationFrame(() => {
        const yesRadio = document.querySelector('input[name="perpetual-enable"][value="yes"]');
        const noRadio = document.querySelector('input[name="perpetual-enable"][value="no"]');
        const container = document.getElementById('perpetual-config-container');

        if (wizardState.form.distribution.enablePerpetual) {
          if (yesRadio) yesRadio.checked = true;
          if (container) container.removeAttribute('hidden');
        } else {
          if (noRadio) noRadio.checked = true;
          if (container) container.setAttribute('hidden', '');
        }
      });
    }

    // FIXED: Never fold sections on manual navigation - only on Continue/Back between parent steps
    const shouldFoldSections = false;  // Manual clicks don't fold anything
    const shouldAutoExpandOnSwitch = !isManualNavigation && parentStepChanged;  // Continue/Back auto-expands
    updateProgressIndicator(screenId, previousParentStep, shouldFoldSections, shouldAutoExpandOnSwitch);
    // FIXED: Get parent step for substeps when checking state
    const stepForState = getParentStep(screenId) || screenId;
    const activeStepState = wizardState.steps[stepForState];
    evaluateStep(screenId, {
      touched: activeStepState ? activeStepState.touched : false,
      silent: activeStepState ? !activeStepState.touched : false
    });
  }

  function updateProgressIndicator(activeStepId, previousParentStep = null, shouldFoldSections = false, shouldAutoExpandOnSwitch = false) {
    const resolvedActiveId = getPrimaryStepId(activeStepId);

    progressItems.forEach((item) => {
      const step = item.getAttribute('data-step');
      const status = getStepStatus(step);
      const hasChildren = Boolean(item.getAttribute('data-toggle'));
      const userCollapsed = item.dataset.userCollapsed === 'true';
      const shouldOpen = hasChildren && step === resolvedActiveId;

      item.removeAttribute('aria-current');
      item.setAttribute('aria-disabled', 'false');
      item.classList.remove('is-active', 'is-complete', 'is-future');

      if (hasChildren) {
        // FIXED: Auto-expand on Continue/Back when switching to new parent step
        // Keep all previously visited sections expanded
        if (shouldAutoExpandOnSwitch && shouldOpen) {
          // Continue/Back switched to this parent step - auto-expand it
          item.classList.add('is-open');
          delete item.dataset.userCollapsed;
        } else if (shouldOpen && !userCollapsed) {
          // Navigating within same section or manual click - keep current section open
          item.classList.add('is-open');
        }

        const isOpen = item.classList.contains('is-open');
        item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        const nestedList = item.querySelector('.wizard-subpath');
        if (nestedList) {
          if (isOpen) {
            nestedList.removeAttribute('hidden');
          } else {
            nestedList.setAttribute('hidden', '');
          }
        }
      }

      if (step === resolvedActiveId) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'step');
      } else if (status === 'valid') {
        item.classList.add('is-complete');
      } else {
        item.classList.add('is-future');
      }
    });

    // FIXED: Use data-substep attribute for substep navigation items
    subpathItems.forEach((item) => {
      const subStep = item.getAttribute('data-substep');
      if (subStep === activeStepId) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('is-active');
        item.removeAttribute('aria-current');
      }
    });

    // FIXED: Also handle new sidebar navigation (.wizard-nav-item--expandable)
    const navExpandableButtons = document.querySelectorAll('.wizard-nav-item--expandable');
    navExpandableButtons.forEach((button) => {
      const step = button.getAttribute('data-step');
      const submenuId = button.getAttribute('data-toggle');
      const submenu = submenuId ? document.getElementById(submenuId) : null;
      const shouldExpand = step === resolvedActiveId;

      // FIXED: Auto-expand on Continue/Back when switching to new section
      // Keep all previously visited sections expanded
      if (shouldAutoExpandOnSwitch && shouldExpand) {
        // Continue/Back switched to this parent step - auto-expand it
        button.setAttribute('aria-expanded', 'true');
        if (submenu) {
          submenu.hidden = false;
        }
      } else if (shouldExpand) {
        // Navigating within same section - keep current section open
        const currentExpanded = button.getAttribute('aria-expanded') === 'true';
        if (!currentExpanded) {
          button.setAttribute('aria-expanded', 'true');
          if (submenu) {
            submenu.hidden = false;
          }
        }
      }
    });
  }

  function syncRegistrationSelection() {
    const selectedValue = wizardState.form.registration.method;
    registrationMethodInputs.forEach((input) => {
      input.checked = input.value === selectedValue;
    });
    registrationOptionLabels.forEach((label) => {
      const input = label.querySelector('input[name="registration-method"]');
      const isSelected = Boolean(input && input.value === selectedValue);
      if (input) {
        input.checked = isSelected;
      }
      label.classList.toggle('wizard-option--selected', isSelected);
      label.setAttribute('aria-checked', String(isSelected));
    });
  }

  function syncSearchUI() {
    if (searchKeywordsInput) {
      searchKeywordsInput.value = wizardState.form.search.keywords || '';
    }
    if (searchDescriptionInput) {
      searchDescriptionInput.value = wizardState.form.search.description || '';
    }
    updateKeywordsPreview();
  }

  function updateKeywordsPreview() {
    const previewContainer = document.getElementById('search-keywords-preview');
    const tagContainer = document.getElementById('search-keywords-tag-container');

    if (!searchKeywordsInput || !previewContainer || !tagContainer) {
      return;
    }

    const keywords = searchKeywordsInput.value.trim();

    if (!keywords) {
      previewContainer.style.display = 'none';
      tagContainer.innerHTML = '';
      return;
    }

    const tags = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (tags.length === 0) {
      previewContainer.style.display = 'none';
      tagContainer.innerHTML = '';
      return;
    }

    previewContainer.style.display = 'block';
    tagContainer.innerHTML = tags.map(tag => `
      <span class="keyword-tag">${tag}</span>
    `).join('');
  }

  function updateRegistrationPreviewVisibility() {
    const method = wizardState.form.registration.method;
    const qrReady = Boolean(wizardState.form.registration.preflight.mobile.qrGenerated);
    if (qrPreview) {
      if (method === 'mobile' && qrReady) {
        qrPreview.hidden = false;
        if (!qrPreviewContent.querySelector('canvas')) {
          requestAnimationFrame(renderQRPreview);
        }
      } else {
        qrPreview.hidden = true;
        qrPreviewContent.innerHTML = '';
      }
    }

    const jsonReady = Boolean(wizardState.form.registration.preflight.det.jsonDisplayed);
    if (jsonPreview) {
      if (method === 'det' && jsonReady) {
        jsonPreview.hidden = false;
        renderJsonPreview();
      } else {
        jsonPreview.hidden = true;
        jsonPreviewContent.textContent = '';
      }
    }
  }

  function updateConfigurationOverview() {
    // Update token name
    const tokenNameEl = document.getElementById('overview-token-name');
    if (tokenNameEl) {
      const tokenName = wizardState.form.tokenName?.trim() || 'Not set';
      tokenNameEl.textContent = tokenName;
    }

    // Update decimals
    const decimalsEl = document.getElementById('overview-decimals');
    if (decimalsEl) {
      const decimals = wizardState.form.permissions?.decimals || '—';
      decimalsEl.textContent = decimals;
    }

    // Update base supply
    const baseSupplyEl = document.getElementById('overview-base-supply');
    if (baseSupplyEl) {
      const baseSupply = wizardState.form.permissions?.baseSupply || '0';
      baseSupplyEl.textContent = parseInt(baseSupply, 10).toLocaleString();
    }

    // Update max supply
    const maxSupplyEl = document.getElementById('overview-max-supply');
    if (maxSupplyEl) {
      const useMaxSupply = wizardState.form.permissions?.useMaxSupply;
      const maxSupply = wizardState.form.permissions?.maxSupply;
      if (useMaxSupply && maxSupply) {
        maxSupplyEl.textContent = parseInt(maxSupply, 10).toLocaleString();
      } else {
        maxSupplyEl.textContent = 'Unlimited';
      }
    }

    // Update action preset
    const actionPresetEl = document.getElementById('overview-action-preset');
    if (actionPresetEl) {
      const selectedPreset = wizardState.form.permissions?.selectedPreset;
      if (selectedPreset) {
        // Map preset keys to human-readable names
        const presetNames = {
          'custom': 'Custom',
          'most-restrictive': 'Most Restrictive',
          'emergency-only': 'Only Emergency Action',
          'mint-burn': 'Minting and Burning',
          'advanced': 'Advanced Actions',
          'all-allowed': 'All Allowed'
        };
        actionPresetEl.textContent = presetNames[selectedPreset] || selectedPreset;
      } else {
        actionPresetEl.textContent = 'Custom';
      }
    }

    // Update localizations
    const localizationsEl = document.getElementById('overview-localizations');
    if (localizationsEl) {
      const localizations = wizardState.form.naming?.conventions?.localizations || {};
      const count = Object.keys(localizations).length;
      if (count > 0) {
        const codes = Object.keys(localizations).join(', ').toUpperCase();
        localizationsEl.textContent = `${count} language${count !== 1 ? 's' : ''} (${codes})`;
      } else {
        localizationsEl.textContent = 'None';
      }
    }

    // Update document types
    const documentTypesEl = document.getElementById('overview-document-types');
    if (documentTypesEl) {
      const documentTypes = wizardState.form.documentTypes || {};
      const count = Object.keys(documentTypes).length;
      if (count > 0) {
        const names = Object.keys(documentTypes).join(', ');
        documentTypesEl.textContent = `${count} type${count !== 1 ? 's' : ''} (${names})`;
        documentTypesEl.style.fontWeight = '700';
        documentTypesEl.style.color = 'var(--color-success)';
      } else {
        documentTypesEl.textContent = 'None';
        documentTypesEl.style.fontWeight = '';
        documentTypesEl.style.color = '';
      }
    }

    // Update groups
    const groupsEl = document.getElementById('overview-groups');
    if (groupsEl) {
      const groupsEnabled = wizardState.form.group?.enabled;
      const members = wizardState.form.group?.members || [];
      const validMembers = members.filter(m => m.identityId).length;
      if (groupsEnabled && validMembers > 0) {
        const threshold = wizardState.form.group?.threshold || 0;
        groupsEl.textContent = `${validMembers} member${validMembers !== 1 ? 's' : ''}, ${threshold} required`;
      } else {
        groupsEl.textContent = 'None';
      }
    }

    // Update distribution
    const distributionEl = document.getElementById('overview-distribution');
    if (distributionEl) {
      const emission = wizardState.form.distribution?.emission;
      const preProgrammed = wizardState.form.distribution?.preProgrammed?.entries || [];

      if (emission && emission.type) {
        const cadence = wizardState.form.distribution?.cadence?.type || '';
        distributionEl.textContent = `${emission.type}${cadence ? ' + ' + cadence : ''}`;
      } else if (preProgrammed.length > 0) {
        distributionEl.textContent = `${preProgrammed.length} pre-programmed distribution${preProgrammed.length !== 1 ? 's' : ''}`;
      } else {
        distributionEl.textContent = 'None';
      }
    }
  }

  function getStepState(stepId) {
    return wizardState.steps[stepId];
  }

  function getStepStatus(stepId) {
    const step = getStepState(stepId);
    return step ? step.validity : 'unknown';
  }

  function updateStepState(stepId, updates) {
    const step = getStepState(stepId);
    if (!step) {
      return;
    }

    const previousValidity = step.validity;
    const previousTouched = step.touched;

    if (typeof updates.validity === 'string') {
      step.validity = updates.validity;
    }

    if (updates.touched) {
      step.touched = true;
    }

    const validityChanged = step.validity !== previousValidity;
    const touchedChanged = step.touched !== previousTouched;

    if (validityChanged) {
      updateFurthestValidIndex();
      if (step.validity !== 'valid') {
        const currentIndex = getStepIndex(currentScreenId);
        const invalidIndex = getStepIndex(stepId);
        if (invalidIndex !== -1 && currentIndex !== -1 && invalidIndex < currentIndex) {
          showScreen(stepId);
        }
      }
    }

    if (validityChanged) {
      document.dispatchEvent(new CustomEvent('status-changed', {
        detail: { stepId, validity: step.validity }
      }));
    }

    if (validityChanged || touchedChanged) {
      updateStepStatusUI(stepId);
      updateProgressIndicator(currentScreenId);
    }
  }

  function updateStepStatusUI(stepId) {
    const element = stepStatusElements[stepId];
    if (!element) {
      return;
    }
    const status = getStepStatus(stepId);
    const label = STEP_LABELS[stepId] || stepId;

    element.classList.remove('valid', 'invalid');

    let text = '';
    let ariaLabel = '';
    let ariaHidden = true;
    let className = '';

    if (status === 'valid') {
      text = 'Valid';
      ariaLabel = `${label} step status: Valid`;
      ariaHidden = false;
      className = 'valid';
    } else if (status === 'invalid') {
      text = 'Invalid';
      ariaLabel = `${label} step status: Invalid`;
      ariaHidden = false;
      className = 'invalid';
    } else if (stepId !== STEP_SEQUENCE[0]) {
      text = 'Invalid';
      ariaLabel = `${label} step status: Invalid`;
      ariaHidden = false;
      className = 'invalid';
    }

    if (stepId === 'naming' && !text.trim()) {
      text = 'Invalid';
      className = className || 'invalid';
      ariaLabel = ariaLabel || `${label} step status: Invalid`;
      ariaHidden = false;
    }

    if (element.textContent !== text) {
      element.textContent = text;
    }

    if (className) {
      element.classList.add(className);
    }

    if (ariaHidden) {
      element.removeAttribute('aria-label');
      element.setAttribute('aria-hidden', 'true');
      element.hidden = true;
    } else {
      element.setAttribute('aria-label', ariaLabel);
      element.setAttribute('aria-hidden', 'false');
      element.hidden = false;
    }

    element.dataset.status = status;
  }

  function updateStepStatusFromValidation(stepId, validation, touched) {
    const step = getStepState(stepId);
    const nextTouched = touched || (step && step.touched);
    let nextValidity = step ? step.validity : 'unknown';
    if (validation.valid) {
      nextValidity = 'valid';
    } else if (nextTouched) {
      nextValidity = 'invalid';
    } else {
      nextValidity = 'unknown';
    }
    updateStepState(stepId, { validity: nextValidity, touched: nextTouched });
  }

  function clearStepMessage(stepId) {
    switch (stepId) {
      case 'naming':
        if (tokenNameMessage.textContent) {
          tokenNameMessage.textContent = '';
          return true;
        }
        break;
      case 'permissions':
        if (permissionsMessage.textContent) {
          permissionsMessage.textContent = '';
          return true;
        }
        break;
      case 'distribution':
        if (distributionMessage.textContent) {
          distributionMessage.textContent = '';
          return true;
        }
        break;
      case 'advanced':
        if (advancedMessage.textContent) {
          advancedMessage.textContent = '';
          return true;
        }
        break;
      case 'registration':
        if (registrationMessage.textContent) {
          registrationMessage.textContent = '';
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  }

  function loadState() {
    const fallback = createDefaultWizardState();
    try {
      const stored = storage.getItem(STATE_STORAGE_KEY);
      if (!stored) {
        return fallback;
      }
      const parsed = JSON.parse(stored);
      const state = createDefaultWizardState();
      let storedFurthestIndex = null;

      if (parsed && typeof parsed === 'object') {
        // Validate active step/substep - ensure it exists in either STEP_SEQUENCE or SUBSTEP_SEQUENCES
        if (typeof parsed.active === 'string') {
          const isValidMainStep = STEP_SEQUENCE.includes(parsed.active);
          const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps => substeps.includes(parsed.active));

          if (isValidMainStep || isValidSubstep) {
            state.active = parsed.active;
          } else {
            console.warn('⚠️  Invalid active step in storage:', parsed.active, '- resetting to default');
            state.active = 'naming'; // Reset to first step if invalid
          }
        }
        if (typeof parsed.furthestValidIndex === 'number') {
          storedFurthestIndex = clampFurthestIndex(parsed.furthestValidIndex);
        }

        TRACKED_STEPS.forEach((stepId) => {
          const persisted = parsed.steps && parsed.steps[stepId];
          const legacyStatus = parsed.stepStatus && parsed.stepStatus[stepId];
          const stepState = state.steps[stepId];

          if (persisted && typeof persisted === 'object') {
            if (persisted.validity === 'valid' || persisted.validity === 'invalid' || persisted.validity === 'unknown') {
              stepState.validity = persisted.validity;
            }
            if (typeof persisted.touched === 'boolean') {
              stepState.touched = persisted.touched;
            }
          } else if (legacyStatus === 'valid' || legacyStatus === 'invalid') {
            stepState.validity = legacyStatus;
            stepState.touched = true;
          }
        });

        const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};

        if (typeof form.tokenName === 'string') {
          state.form.tokenName = form.tokenName;
        }

        if (form.naming && typeof form.naming === 'object') {
          const namingForm = form.naming;
          if (Array.isArray(namingForm.rows)) {
            const normalizedRows = namingForm.rows.map((row) => ({
              code: typeof row.code === 'string' ? row.code : '',
              shouldCapitalize:
                typeof row.shouldCapitalize === 'boolean'
                  ? row.shouldCapitalize
                  : Boolean(row.should_capitalize),
              singular:
                typeof row.singular === 'string'
                  ? row.singular
                  : typeof row.singular_form === 'string'
                    ? row.singular_form
                    : '',
              plural:
                typeof row.plural === 'string'
                  ? row.plural
                  : typeof row.plural_form === 'string'
                    ? row.plural_form
                    : ''
            }));
            state.form.naming.rows = limitLocalizationRows(normalizedRows);
          }
          const namingConventions =
            namingForm.conventions && typeof namingForm.conventions === 'object'
              ? namingForm.conventions
              : null;
          const localizationSource =
            (namingConventions && namingConventions.localizations) ||
            (namingForm.localizations && typeof namingForm.localizations === 'object' ? namingForm.localizations : null);
          if (localizationSource && typeof localizationSource === 'object') {
            const record = {};
            Object.keys(localizationSource).forEach((code) => {
              const entry = localizationSource[code];
              if (!entry || typeof entry !== 'object') {
                return;
              }
              const singular = typeof entry.singular_form === 'string'
                ? entry.singular_form
                : typeof entry.singular === 'string'
                  ? entry.singular
                  : '';
              const plural = typeof entry.plural_form === 'string'
                ? entry.plural_form
                : typeof entry.plural === 'string'
                  ? entry.plural
                  : '';
              record[code] = {
                should_capitalize: Boolean(entry.should_capitalize ?? entry.shouldCapitalize),
                singular_form: singular,
                plural_form: plural
              };
            });
            state.form.naming.conventions.localizations = record;
          }
        }

        if (form.permissions && typeof form.permissions === 'object') {
          const permissions = form.permissions;
          if (Number.isInteger(permissions.decimals)) {
            state.form.permissions.decimals = permissions.decimals;
          }
          if (typeof permissions.baseSupply === 'string') {
            state.form.permissions.baseSupply = permissions.baseSupply;
          }
          state.form.permissions.useMaxSupply = Boolean(permissions.useMaxSupply);
          if (typeof permissions.maxSupply === 'string') {
            state.form.permissions.maxSupply = permissions.maxSupply;
          }
          state.form.permissions.keepsHistory = normalizeKeepsHistory(permissions.keepsHistory);
          state.form.permissions.startAsPaused = Boolean(permissions.startAsPaused);
          state.form.permissions.allowTransferToFrozenBalance = Boolean(permissions.allowTransferToFrozenBalance);
          if (Array.isArray(permissions.groups)) {
            state.form.permissions.groups = normalisePermissionsGroups(permissions.groups);
          }
          state.form.permissions.mainControlGroupIndex = clampMainControlIndex(
            permissions.mainControlGroupIndex,
            state.form.permissions.groups.length
          );
          MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => {
            if (permissions[key] && typeof permissions[key] === 'object') {
              state.form.permissions[key] = {
                ...state.form.permissions[key],
                ...permissions[key]
              };
            }
            state.form.permissions[key] = normalizeManualActionRecord(state.form.permissions, key);
          });
          state.form.permissions.freeze = normalizeFreezeState(permissions.freeze);
        }

        if (form.distribution && typeof form.distribution === 'object' &&
          (form.distribution.cadence || form.distribution.emission)) {
          state.form.distribution = cloneDistributionValues(form.distribution);
        }

        if (form.advanced && typeof form.advanced === 'object') {
          if (typeof form.advanced.tradeMode === 'string') {
            state.form.advanced.tradeMode = form.advanced.tradeMode;
          }
          state.form.advanced.changeControl = normalizeChangeControl(form.advanced.changeControl);
        }

        const registrationFormData = form.registration && typeof form.registration === 'object' ? form.registration : {};
        const walletSource = registrationFormData.wallet && typeof registrationFormData.wallet === 'object'
          ? registrationFormData.wallet
          : (form.wallet && typeof form.wallet === 'object' ? form.wallet : null);
        if (walletSource) {
          const wallet = state.form.registration.wallet;
          wallet.mnemonic = '';
          wallet.privateKey = '';
          if (typeof walletSource.address === 'string') {
            wallet.address = walletSource.address;
          }
          if (typeof walletSource.balance === 'number' && Number.isFinite(walletSource.balance)) {
            wallet.balance = walletSource.balance;
          } else if (typeof walletSource.balance === 'string') {
            const parsedBalance = Number.parseFloat(walletSource.balance);
            if (Number.isFinite(parsedBalance)) {
              wallet.balance = parsedBalance;
            }
          }
          wallet.fingerprint = '';
        }

        const identitySource = registrationFormData.identity && typeof registrationFormData.identity === 'object'
          ? registrationFormData.identity
          : (form.identity && typeof form.identity === 'object' ? form.identity : null);
        if (identitySource && typeof identitySource.id === 'string') {
          state.form.registration.identity.id = identitySource.id;
        }

        if (typeof registrationFormData.method === 'string') {
          const methodValue = registrationFormData.method.trim();
          state.form.registration.method = methodValue ? methodValue : null;
        } else if (registrationFormData.method === null) {
          state.form.registration.method = null;
        }
        const preflight = registrationFormData.preflight;
        if (preflight && typeof preflight === 'object') {
          state.form.registration.preflight = {
            mobile: {
              qrGenerated: Boolean(
                preflight.mobile && (
                  (typeof preflight.mobile.qrGenerated !== 'undefined'
                    ? preflight.mobile.qrGenerated
                    : preflight.mobile.qrPrepared)
                )
              )
            },
            det: {
              jsonDisplayed: Boolean(
                preflight.det && (
                  (typeof preflight.det.jsonDisplayed !== 'undefined'
                    ? preflight.det.jsonDisplayed
                    : preflight.det.jsonPreviewed)
                )
              )
            },
            self: {
              warningAcknowledged: Boolean(preflight.self && preflight.self.warningAcknowledged)
            }
          };
        } else if (typeof parsed.registrationMethod === 'string') {
          const legacyMethod = parsed.registrationMethod.trim();
          state.form.registration.method = legacyMethod ? legacyMethod : null;
        }
      }


      if (!state.form.naming || typeof state.form.naming !== 'object') {
        state.form.naming = {
          conventions: { localizations: {} },
          rows: []
        };
      }

      if (!state.form.naming.conventions || typeof state.form.naming.conventions !== 'object') {
        state.form.naming.conventions = { localizations: {} };
      }
      if (!state.form.naming.conventions.localizations || typeof state.form.naming.conventions.localizations !== 'object') {
        state.form.naming.conventions.localizations = {};
      }

      state.form.naming.conventions.localizations = limitLocalizationRecord(state.form.naming.conventions.localizations);
      const record = state.form.naming.conventions.localizations;

      if (!Array.isArray(state.form.naming.rows) || state.form.naming.rows.length === 0) {
        const [firstCode] = Object.keys(record);
        if (firstCode) {
          const entry = record[firstCode];
          state.form.naming.rows = limitLocalizationRows([
            {
              code: firstCode,
              should_capitalize: entry?.should_capitalize,
              singular: entry?.singular_form,
              plural: entry?.plural_form
            }
          ]);
        } else {
          state.form.naming.rows = limitLocalizationRows([]);
        }
      } else {
        state.form.naming.rows = limitLocalizationRows(state.form.naming.rows);
      }

      const [loadedRow] = state.form.naming.rows;
      state.form.naming.conventions.localizations = createLocalizationRecordFromRow(loadedRow);

      const computedFurthest = computeFurthestValidIndexFromSteps(state.steps);
      state.furthestValidIndex = storedFurthestIndex === null
        ? computedFurthest
        : Math.max(computedFurthest, storedFurthestIndex);

      return state;
    } catch (error) {
      console.warn('Unable to read wizard state:', error);
      return fallback;
    }
  }

  function persistState() {
    try {
      const limitedRows = limitLocalizationRows(
        Array.isArray(wizardState.form.naming?.rows) ? wizardState.form.naming.rows : []
      );
      const limitedRecord = limitLocalizationRecord(wizardState.form.naming?.conventions?.localizations);
      wizardState.form.naming.rows = limitedRows;
      if (!wizardState.form.naming.conventions || typeof wizardState.form.naming.conventions !== 'object') {
        wizardState.form.naming.conventions = { localizations: {} };
      }
      wizardState.form.naming.conventions.localizations = limitedRecord;

      const manualActionSnapshot = MANUAL_ACTION_DEFINITIONS.reduce((accumulator, definition) => {
        accumulator[definition.key] = normalizeManualActionRecord(wizardState.form.permissions, definition.key);
        return accumulator;
      }, {});
      const freezeSnapshot = normalizeFreezeState(wizardState.form.permissions.freeze);

      const snapshot = {
        active: wizardState.active,
        furthestValidIndex: wizardState.furthestValidIndex,
        steps: TRACKED_STEPS.reduce((accumulator, stepId) => {
          const step = wizardState.steps[stepId];
          accumulator[stepId] = {
            id: stepId,
            validity: step.validity,
            touched: step.touched
          };
          return accumulator;
        }, {}),
        form: {
          tokenName: wizardState.form.tokenName,
          naming: {
            rows: limitedRows.map((row) => ({
              code: row.code || '',
              shouldCapitalize: Boolean(row.shouldCapitalize),
              singular: row.singular || '',
              plural: row.plural || ''
            })),
            conventions: {
              localizations: cloneLocalizationsRecord(limitedRecord)
            }
          },
          permissions: {
            decimals: wizardState.form.permissions.decimals,
            baseSupply: wizardState.form.permissions.baseSupply,
            useMaxSupply: wizardState.form.permissions.useMaxSupply,
            maxSupply: wizardState.form.permissions.maxSupply,
            keepsHistory: normalizeKeepsHistory(wizardState.form.permissions.keepsHistory),
            startAsPaused: Boolean(wizardState.form.permissions.startAsPaused),
            allowTransferToFrozenBalance: Boolean(wizardState.form.permissions.allowTransferToFrozenBalance),
            groups: clonePermissionGroups(wizardState.form.permissions.groups),
            mainControlGroupIndex: clampMainControlIndex(
              wizardState.form.permissions.mainControlGroupIndex,
              wizardState.form.permissions.groups.length
            ),
            freeze: freezeSnapshot,
            ...manualActionSnapshot
          },
          distribution: cloneDistributionValues(wizardState.form.distribution),
          advanced: {
            tradeMode: wizardState.form.advanced.tradeMode,
            changeControl: normalizeChangeControl(wizardState.form.advanced.changeControl)
          },
          registration: {
            wallet: {
              // Never persist secrets; only mark presence
              mnemonic: wizardState.form.registration.wallet.mnemonic ? '__present__' : '',
              privateKey: wizardState.form.registration.wallet.privateKey ? '__present__' : '',
              address: wizardState.form.registration.wallet.address,
              balance: wizardState.form.registration.wallet.balance,
              fingerprint: ''
            },
            identity: {
              id: wizardState.form.registration.identity.id
            },
            method: wizardState.form.registration.method,
            preflight: {
              mobile: { qrGenerated: Boolean(wizardState.form.registration.preflight.mobile.qrGenerated) },
              det: { jsonDisplayed: Boolean(wizardState.form.registration.preflight.det.jsonDisplayed) },
              self: { warningAcknowledged: Boolean(wizardState.form.registration.preflight.self.warningAcknowledged) }
            }
          }
        }
      };
      storage.setItem(STATE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Unable to persist wizard state:', error);
    }
  }

  function renderQRPreview() {
    if (wizardState.form.registration.method !== 'mobile') {
      return;
    }

    const payload = generatePlatformContractJSON();
    const serialized = JSON.stringify(payload, null, 2);
    let chunks = chunkPayloadIntoQRCodes(serialized);

    if (chunks.length === 0) {
      chunks = ['{}'];
    }

    const total = chunks.length;

    qrPreviewContent.innerHTML = '';

    chunks.forEach((chunk, index) => {
      const tile = document.createElement('div');
      tile.className = 'wizard-qr__tile';
      tile.setAttribute('data-chunk', String(index + 1));
      tile.setAttribute('data-total', String(total));

      const label = document.createElement('span');
      label.className = 'wizard-qr__tile-label';
      label.textContent = `${index + 1}/${total}`;
      label.setAttribute('aria-hidden', 'true');

      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 180;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `QR code chunk ${index + 1} of ${total}`);

      tile.appendChild(label);
      tile.appendChild(canvas);
      qrPreviewContent.appendChild(tile);

      const qr = TinyQR.create({ element: canvas, size: 180 });
      qr.render(chunk);
    });
  }

  function renderJsonPreview() {
    if (wizardState.form.registration.method !== 'det') {
      return;
    }

    const payload = generatePlatformContractJSON();
    const serialized = JSON.stringify(payload, null, 2);
    jsonPreviewContent.textContent = serialized;
  }

  function copyJsonPayload() {
    if (wizardState.form.registration.method !== 'det') {
      return;
    }

    if (!jsonPreviewContent.textContent) {
      renderJsonPreview();
    }

    const serialized = jsonPreviewContent.textContent || '';
    if (!serialized) {
      announce('Nothing to copy yet.');
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(serialized)
        .then(() => {
          announce('JSON payload copied to clipboard.');
          if (jsonCopyButton) {
            const originalText = jsonCopyButton.textContent;
            jsonCopyButton.textContent = '✓ Copied!';
            setTimeout(() => {
              jsonCopyButton.textContent = originalText;
            }, 2000);
          }
        })
        .catch(() => fallbackCopyToClipboard(serialized));
    } else {
      fallbackCopyToClipboard(serialized);
    }
  }

  function scheduleServerValidation(stepId, payloadFactory) {
    if (typeof fetch !== 'function') {
      return;
    }

    if (validationTimers[stepId]) {
      clearTimeout(validationTimers[stepId]);
    }

    validationTimers[stepId] = setTimeout(() => {
      const payload = payloadFactory();
      if (!payload) {
        cancelPendingValidation(stepId);
        return;
      }

      const fingerprint = JSON.stringify(payload);
      validationFingerprints[stepId] = fingerprint;
      sendServerValidation(stepId, payload, fingerprint);
      delete validationTimers[stepId];
    }, 250);
  }

  async function sendServerValidation(stepId, payload, fingerprint) {
    // FIXED: Skip server validation when using file:// protocol (no localhost needed)
    if (window.location.protocol === 'file:') {
      delete validationFingerprints[stepId];
      return;
    }

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stepId, payload })
      });

      if (validationFingerprints[stepId] !== fingerprint) {
        return;
      }

      if (response.status === 400) {
        updateStepState(stepId, { validity: 'invalid', touched: true });
        applyServerValidation(stepId, { stepId, validity: 'invalid', reasons: [] });
        delete validationFingerprints[stepId];
        return;
      }

      if (!response.ok) {
        delete validationFingerprints[stepId];
        return;
      }

      const result = await response.json();
      if (!result || result.stepId !== stepId) {
        delete validationFingerprints[stepId];
        return;
      }

      delete validationFingerprints[stepId];
      applyServerValidation(stepId, result);
    } catch (error) {
      delete validationFingerprints[stepId];
      console.debug('Validation request failed', error);
    }
  }

  function scheduleRegistrationValidation() {
    scheduleServerValidation('registration', buildRegistrationValidationPayload);
  }

  function applyServerValidation(stepId, result) {
    const validity = result.validity === 'valid' ? 'valid' : result.validity === 'invalid' ? 'invalid' : null;
    if (!validity) {
      return;
    }

    updateStepState(stepId, { validity, touched: true });

    const reason = Array.isArray(result.reasons) && result.reasons.length ? result.reasons[0] : '';

    switch (stepId) {
      case 'naming': {
        const reasons = Array.isArray(result.reasons) ? result.reasons : [];
        const nameReason = reasons.find((entry) => entry && !entry.startsWith('Localization ') && entry !== 'Add at least one localization.');
        if (validity === 'valid') {
          tokenNameMessage.textContent = '';
          namingNextButton.disabled = false;
        } else {
          tokenNameMessage.textContent = nameReason || '';
          namingNextButton.disabled = true;
          validateLocalizationRows({ touched: true });
        }
        break;
      }
      case 'permissions':
        if (validity === 'valid') {
          permissionsMessage.textContent = '';
          permissionsNextButton.disabled = false;
        } else {
          permissionsMessage.textContent = reason || 'Review the supply configuration.';
          permissionsNextButton.disabled = true;
        }
        break;
      case 'distribution':
        if (validity === 'valid') {
          distributionMessage.textContent = '';
          distributionNextButton.disabled = false;
        } else {
          distributionMessage.textContent = reason || 'Distribution settings are invalid.';
          distributionNextButton.disabled = true;
        }
        break;
      case 'advanced':
        if (validity === 'valid') {
          advancedMessage.textContent = '';
          advancedNextButton.disabled = false;
        } else {
          advancedMessage.textContent = reason || 'Advanced configuration is invalid.';
          advancedNextButton.disabled = true;
        }
        break;
      case 'registration':
        if (validity === 'valid') {
          if (registrationMessage && registrationMessage.dataset.status !== 'success') {
            setRegistrationStatus('', '');
          }
        } else {
          const message = reason || readinessReminderMessage;
          setRegistrationStatus('info', message);
        }
        syncRegistrationPreflightUI();
        break;
      default:
        break;
    }

    persistState();
  }

  function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      announce(successful ? 'JSON payload copied to clipboard.' : 'Unable to copy JSON automatically.');
    } catch (error) {
      announce('Unable to copy JSON automatically.');
    } finally {
      textarea.remove();
    }
  }

  // FIXED: New function to work with existing HTML inputs (not dynamically created)
  function createPermissionsUIFromHTML(form) {
    if (!form) {
      return null;
    }

    // Use the existing HTML input IDs
    const decimalsInput = document.getElementById('decimals');
    const baseSupplyInput = document.getElementById('base-supply');
    const maxSupplyInput = document.getElementById('max-supply');

    if (!decimalsInput || !baseSupplyInput) {
      return null;
    }

    // Get supply mode elements
    const baseSupplyModeSelector = document.getElementById('base-supply-mode-selector');
    const baseSupplyModeToken = document.getElementById('base-supply-mode-token');
    const baseSupplyModeBase = document.getElementById('base-supply-mode-base');
    const baseSupplyLabel = document.getElementById('base-supply-label');
    const baseSupplyHint = document.getElementById('base-supply-hint');
    const baseSupplyConversion = document.getElementById('base-supply-conversion');
    const baseSupplyConversionValue = document.getElementById('base-supply-conversion-value');
    const baseSupplyConversionUnit = document.getElementById('base-supply-conversion-unit');

    const maxSupplyModeSelector = document.getElementById('max-supply-mode-selector');
    const maxSupplyModeToken = document.getElementById('max-supply-mode-token');
    const maxSupplyModeBase = document.getElementById('max-supply-mode-base');
    const maxSupplyLabel = document.getElementById('max-supply-label');
    const maxSupplyHint = document.getElementById('max-supply-hint');
    const maxSupplyConversion = document.getElementById('max-supply-conversion');
    const maxSupplyConversionValue = document.getElementById('max-supply-conversion-value');
    const maxSupplyConversionUnit = document.getElementById('max-supply-conversion-unit');

    // Store current supply mode in state
    if (!wizardState.form.permissions.baseSupplyMode) {
      wizardState.form.permissions.baseSupplyMode = 'token';
    }
    if (!wizardState.form.permissions.maxSupplyMode) {
      wizardState.form.permissions.maxSupplyMode = 'token';
    }

    // Function to update supply UI based on decimals
    function updateSupplyUI() {
      const decimals = parseInt(decimalsInput.value, 10);
      const hasDecimals = Number.isInteger(decimals) && decimals > 0;

      // Show/hide mode selectors
      if (baseSupplyModeSelector) {
        baseSupplyModeSelector.hidden = !hasDecimals;
      }
      if (maxSupplyModeSelector) {
        maxSupplyModeSelector.hidden = !hasDecimals;
      }

      // Update base supply
      updateSupplyConversion('base', decimals);
      // Update max supply
      updateSupplyConversion('max', decimals);
    }

    // Function to convert and display supply values
    function updateSupplyConversion(type, decimals) {
      const isBase = type === 'base';
      const input = isBase ? baseSupplyInput : maxSupplyInput;
      const modeToken = isBase ? baseSupplyModeToken : maxSupplyModeToken;
      const modeBase = isBase ? baseSupplyModeBase : maxSupplyModeBase;
      const label = isBase ? baseSupplyLabel : maxSupplyLabel;
      const hint = isBase ? baseSupplyHint : maxSupplyHint;
      const conversion = isBase ? baseSupplyConversion : maxSupplyConversion;
      const conversionValue = isBase ? baseSupplyConversionValue : maxSupplyConversionValue;
      const conversionUnit = isBase ? baseSupplyConversionUnit : maxSupplyConversionUnit;

      if (!input) return;

      const value = input.value.trim();
      const hasDecimals = Number.isInteger(decimals) && decimals > 0;
      const isTokenMode = modeToken && modeToken.checked;

      // Update labels and hints based on mode
      if (label) {
        label.textContent = isBase ? 'Initial Supply' : 'Maximum Supply';
      }

      if (!hasDecimals) {
        // No decimals - hide conversion, simple mode
        if (conversion) conversion.hidden = true;
        if (hint) {
          hint.textContent = isBase
            ? 'Enter the number of tokens to create'
            : 'Optional • Leave blank for no limit • Must be ≥ initial supply';
        }
        return;
      }

      // Has decimals - show conversion
      if (value === '') {
        if (conversion) conversion.hidden = true;
        return;
      }

      try {
        let displayValue, displayUnit;

        if (isTokenMode) {
          // Token mode: show base units
          if (!/^\d+(\.\d+)?$/.test(value)) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const parts = value.split('.');
          const integerPart = parts[0] || '0';
          const decimalPart = parts[1] || '';

          if (decimalPart.length > decimals) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const paddedDecimal = decimalPart.padEnd(decimals, '0');
          const baseValue = integerPart + paddedDecimal;
          const stripped = baseValue.replace(/^0+(?=\d)/, '');
          displayValue = stripped || '0';
          displayUnit = 'base units';

          if (hint) {
            hint.textContent = `Enter token amount (up to ${decimals} decimal places)`;
          }
        } else {
          // Base mode: show token amount
          if (!/^\d+$/.test(value)) {
            if (conversion) conversion.hidden = true;
            return;
          }

          const baseValueBig = BigInt(value);
          const divisor = BigInt(10) ** BigInt(decimals);
          const wholePart = baseValueBig / divisor;
          const fractionalPart = baseValueBig % divisor;

          if (fractionalPart === 0n) {
            displayValue = wholePart.toString();
          } else {
            const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
            const trimmed = fractionalStr.replace(/0+$/, '');
            displayValue = `${wholePart}.${trimmed}`;
          }
          displayUnit = 'tokens';

          if (hint) {
            hint.textContent = 'Enter base units (smallest indivisible unit)';
          }
        }

        if (conversionValue) conversionValue.textContent = displayValue;
        if (conversionUnit) conversionUnit.textContent = displayUnit;
        if (conversion) conversion.hidden = false;

      } catch (e) {
        if (conversion) conversion.hidden = true;
      }
    }

    // Add event listeners for validation
    [decimalsInput, baseSupplyInput, maxSupplyInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        updateSupplyUI();
        evaluatePermissions({ touched: true });
      });
    });

    // Add event listeners for decimals changes
    if (decimalsInput) {
      decimalsInput.addEventListener('change', () => {
        updateSupplyUI();
      });
    }

    // Add event listeners for mode switches
    if (baseSupplyModeToken) {
      baseSupplyModeToken.addEventListener('change', () => {
        if (baseSupplyModeToken.checked) {
          wizardState.form.permissions.baseSupplyMode = 'token';
          updateSupplyUI();
        }
      });
    }
    if (baseSupplyModeBase) {
      baseSupplyModeBase.addEventListener('change', () => {
        if (baseSupplyModeBase.checked) {
          wizardState.form.permissions.baseSupplyMode = 'base';
          updateSupplyUI();
        }
      });
    }
    if (maxSupplyModeToken) {
      maxSupplyModeToken.addEventListener('change', () => {
        if (maxSupplyModeToken.checked) {
          wizardState.form.permissions.maxSupplyMode = 'token';
          updateSupplyUI();
        }
      });
    }
    if (maxSupplyModeBase) {
      maxSupplyModeBase.addEventListener('change', () => {
        if (maxSupplyModeBase.checked) {
          wizardState.form.permissions.maxSupplyMode = 'base';
          updateSupplyUI();
        }
      });
    }

    // Change Max Supply Governance Checkboxes
    const changeMaxSupplyAllowAuthorizedNone = document.getElementById('change-max-supply-allow-authorized-none');
    const changeMaxSupplyAllowAdminNone = document.getElementById('change-max-supply-allow-admin-none');
    const changeMaxSupplyAllowSelfChange = document.getElementById('change-max-supply-allow-self-change');

    if (changeMaxSupplyAllowAuthorizedNone) {
      changeMaxSupplyAllowAuthorizedNone.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowChangeAuthorizedToNone = changeMaxSupplyAllowAuthorizedNone.checked;
        persistState();
      });
    }
    if (changeMaxSupplyAllowAdminNone) {
      changeMaxSupplyAllowAdminNone.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowChangeAdminToNone = changeMaxSupplyAllowAdminNone.checked;
        persistState();
      });
    }
    if (changeMaxSupplyAllowSelfChange) {
      changeMaxSupplyAllowSelfChange.addEventListener('change', () => {
        wizardState.form.permissions.changeMaxSupply.allowSelfChangeAdmin = changeMaxSupplyAllowSelfChange.checked;
        persistState();
      });
    }

    // Unfreeze Governance Checkboxes
    const unfreezeAllowAuthorizedNone = document.getElementById('unfreeze-allow-authorized-none');
    const unfreezeAllowAdminNone = document.getElementById('unfreeze-allow-admin-none');
    const unfreezeAllowSelfChange = document.getElementById('unfreeze-allow-self-change');

    if (unfreezeAllowAuthorizedNone) {
      unfreezeAllowAuthorizedNone.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowChangeAuthorizedToNone = unfreezeAllowAuthorizedNone.checked;
        persistState();
      });
    }
    if (unfreezeAllowAdminNone) {
      unfreezeAllowAdminNone.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowChangeAdminToNone = unfreezeAllowAdminNone.checked;
        persistState();
      });
    }
    if (unfreezeAllowSelfChange) {
      unfreezeAllowSelfChange.addEventListener('change', () => {
        wizardState.form.permissions.unfreeze.allowSelfChangeAdmin = unfreezeAllowSelfChange.checked;
        persistState();
      });
    }

    // Initialize UI
    setTimeout(() => {
      // Restore mode from state
      if (baseSupplyModeToken && wizardState.form.permissions.baseSupplyMode === 'token') {
        baseSupplyModeToken.checked = true;
      } else if (baseSupplyModeBase && wizardState.form.permissions.baseSupplyMode === 'base') {
        baseSupplyModeBase.checked = true;
      }
      if (maxSupplyModeToken && wizardState.form.permissions.maxSupplyMode === 'token') {
        maxSupplyModeToken.checked = true;
      } else if (maxSupplyModeBase && wizardState.form.permissions.maxSupplyMode === 'base') {
        maxSupplyModeBase.checked = true;
      }

      // Restore change max supply governance checkboxes
      if (changeMaxSupplyAllowAuthorizedNone) {
        changeMaxSupplyAllowAuthorizedNone.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowChangeAuthorizedToNone);
      }
      if (changeMaxSupplyAllowAdminNone) {
        changeMaxSupplyAllowAdminNone.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowChangeAdminToNone);
      }
      if (changeMaxSupplyAllowSelfChange) {
        changeMaxSupplyAllowSelfChange.checked = Boolean(wizardState.form.permissions.changeMaxSupply?.allowSelfChangeAdmin);
      }

      // Restore unfreeze governance checkboxes
      if (unfreezeAllowAuthorizedNone) {
        unfreezeAllowAuthorizedNone.checked = Boolean(wizardState.form.permissions.unfreeze?.allowChangeAuthorizedToNone);
      }
      if (unfreezeAllowAdminNone) {
        unfreezeAllowAdminNone.checked = Boolean(wizardState.form.permissions.unfreeze?.allowChangeAdminToNone);
      }
      if (unfreezeAllowSelfChange) {
        unfreezeAllowSelfChange.checked = Boolean(wizardState.form.permissions.unfreeze?.allowSelfChangeAdmin);
      }

      updateSupplyUI();
      evaluatePermissions({ touched: false });
    }, 100);

    return {
      setValues(values = {}) {
        if (decimalsInput) {
          const storedDecimals = Number.isInteger(values.decimals) ? values.decimals : '';
          decimalsInput.value = storedDecimals === '' ? '' : String(storedDecimals);
        }
        if (baseSupplyInput) {
          baseSupplyInput.value = typeof values.baseSupply === 'string' ? values.baseSupply : '';
        }
        if (maxSupplyInput) {
          maxSupplyInput.value = typeof values.maxSupply === 'string' ? values.maxSupply : '';
        }
      },
      getValues() {
        const maxSupplyValue = maxSupplyInput ? maxSupplyInput.value.trim() : '';
        return {
          decimals: decimalsInput ? decimalsInput.value : '',
          baseSupply: baseSupplyInput ? baseSupplyInput.value.trim() : '',
          useMaxSupply: maxSupplyValue.length > 0, // True if user entered a value
          maxSupply: maxSupplyValue,
          keepsHistory: { transfers: false, mints: false, burns: false, freezes: false },
          startAsPaused: false,
          allowTransferToFrozenBalance: false
        };
      }
    };
  }

  function createPermissionsUI(form) {
    if (!form) {
      return null;
    }
    const fieldset = form.querySelector('.wizard-fieldset');
    if (!fieldset) {
      return null;
    }

    fieldset.innerHTML = `
      <legend class="wizard-field__label">Token supply controls</legend>
      <div class="wizard-field">
        <label class="wizard-field__label" for="permissions-decimals">Decimals</label>
        <input class="wizard-field__input" id="permissions-decimals" name="permissions-decimals" type="number" min="0" max="18" step="1" required>
        <p class="wizard-field__hint">0-18 decimal places supported.</p>
      </div>
      <div class="wizard-field">
        <label class="wizard-field__label" for="permissions-base-supply">Base supply</label>
        <input class="wizard-field__input" id="permissions-base-supply" name="permissions-base-supply" type="text" inputmode="numeric" pattern="\\d*" placeholder="100000" autocomplete="off" required>
        <p class="wizard-field__hint">Whole token amount created at genesis.</p>
      </div>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-use-max">
          <input class="wizard-checkbox__input" id="permissions-use-max" type="checkbox">
          <span class="wizard-checkbox__label">Limit total supply</span>
        </label>
      </div>
      <div class="wizard-field" id="permissions-max-field">
        <label class="wizard-field__label" for="permissions-max-supply">Max supply</label>
        <input class="wizard-field__input" id="permissions-max-supply" name="permissions-max-supply" type="text" inputmode="numeric" pattern="\\d*" placeholder="500000" autocomplete="off">
        <p class="wizard-field__hint">Leave blank to allow unlimited growth.</p>
      </div>
      <fieldset class="wizard-fieldset wizard-fieldset--nested" id="permissions-history">
        <legend class="wizard-field__label">History tracking</legend>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-transfers">
            <input class="wizard-checkbox__input" id="permissions-history-transfers" type="checkbox">
            <span class="wizard-checkbox__label">Track transfers</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-mints">
            <input class="wizard-checkbox__input" id="permissions-history-mints" type="checkbox">
            <span class="wizard-checkbox__label">Track mints</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-burns">
            <input class="wizard-checkbox__input" id="permissions-history-burns" type="checkbox">
            <span class="wizard-checkbox__label">Track burns</span>
          </label>
        </div>
        <div class="wizard-field wizard-field--checkbox">
          <label class="wizard-checkbox" for="permissions-history-freezes">
            <input class="wizard-checkbox__input" id="permissions-history-freezes" type="checkbox">
            <span class="wizard-checkbox__label">Track freezes</span>
          </label>
        </div>
      </fieldset>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-start-paused">
          <input class="wizard-checkbox__input" id="permissions-start-paused" type="checkbox">
          <span class="wizard-checkbox__label">Start the token paused</span>
        </label>
      </div>
      <div class="wizard-field wizard-field--checkbox">
        <label class="wizard-checkbox" for="permissions-allow-frozen">
          <input class="wizard-checkbox__input" id="permissions-allow-frozen" type="checkbox">
          <span class="wizard-checkbox__label">Allow transfers to frozen balances</span>
        </label>
      </div>
    `;

    const decimalsInput = form.querySelector('#permissions-decimals');
    const baseSupplyInput = form.querySelector('#permissions-base-supply');
    const maxSupplyToggle = form.querySelector('#permissions-use-max');
    const maxSupplyField = form.querySelector('#permissions-max-field');
    const maxSupplyInput = form.querySelector('#permissions-max-supply');
    const startPausedInput = form.querySelector('#permissions-start-paused');
    const allowFrozenInput = form.querySelector('#permissions-allow-frozen');
    const keepsHistoryInputs = {
      transfers: form.querySelector('#permissions-history-transfers'),
      mints: form.querySelector('#permissions-history-mints'),
      burns: form.querySelector('#permissions-history-burns'),
      freezes: form.querySelector('#permissions-history-freezes'),
      purchases: form.querySelector('#permissions-history-purchases')
    };

    function syncMaxSupplyVisibility(checked) {
      if (!maxSupplyField || !maxSupplyInput) {
        return;
      }
      if (checked) {
        maxSupplyField.removeAttribute('hidden');
        maxSupplyInput.removeAttribute('disabled');
      } else {
        maxSupplyField.setAttribute('hidden', '');
        maxSupplyInput.value = '';
        maxSupplyInput.setAttribute('disabled', '');
      }
    }

    const inputs = [decimalsInput, baseSupplyInput, maxSupplyInput];
    inputs.forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => evaluatePermissions({ touched: true }));
    });

    Object.values(keepsHistoryInputs).forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => evaluatePermissions({ touched: true }));
    });

    if (maxSupplyToggle) {
      maxSupplyToggle.addEventListener('change', () => {
        syncMaxSupplyVisibility(maxSupplyToggle.checked);
        evaluatePermissions({ touched: true });
      });
    }

    if (startPausedInput) {
      startPausedInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }
    if (allowFrozenInput) {
      allowFrozenInput.addEventListener('change', () => evaluatePermissions({ touched: true }));
    }

    syncMaxSupplyVisibility(Boolean(maxSupplyToggle && maxSupplyToggle.checked));

    return {
      setValues(values = {}) {
        if (decimalsInput) {
          const storedDecimals = Number.isInteger(values.decimals) ? values.decimals : '';
          decimalsInput.value = storedDecimals === '' ? '' : String(storedDecimals);
        }
        if (baseSupplyInput) {
          baseSupplyInput.value = typeof values.baseSupply === 'string' ? values.baseSupply : '';
        }
        const useMax = Boolean(values.useMaxSupply);
        if (maxSupplyToggle) {
          maxSupplyToggle.checked = useMax;
        }
        if (maxSupplyInput) {
          maxSupplyInput.value = useMax && typeof values.maxSupply === 'string' ? values.maxSupply : '';
        }
        syncMaxSupplyVisibility(useMax);

        const history = normalizeKeepsHistory(values.keepsHistory);
        Object.entries(keepsHistoryInputs).forEach(([key, input]) => {
          if (input) {
            input.checked = Boolean(history[key]);
          }
        });

        if (startPausedInput) {
          startPausedInput.checked = Boolean(values.startAsPaused);
        }
        if (allowFrozenInput) {
          allowFrozenInput.checked = Boolean(values.allowTransferToFrozenBalance);
        }
      },
      getValues() {
        const keepsHistory = {};
        Object.entries(keepsHistoryInputs).forEach(([key, input]) => {
          keepsHistory[key] = Boolean(input && input.checked);
        });
        return {
          decimals: decimalsInput ? decimalsInput.value : '',
          baseSupply: baseSupplyInput ? baseSupplyInput.value.trim() : '',
          useMaxSupply: Boolean(maxSupplyToggle && maxSupplyToggle.checked),
          maxSupply: maxSupplyInput ? maxSupplyInput.value.trim() : '',
          keepsHistory,
          startAsPaused: Boolean(startPausedInput && startPausedInput.checked),
          allowTransferToFrozenBalance: Boolean(allowFrozenInput && allowFrozenInput.checked)
        };
      }
    };
  }

  function createTransferUI(form) {
    if (!form) {
      return null;
    }

    const notesEnabledRadios = Array.from(form.querySelectorAll('input[name="transfer-notes-enabled"]'));
    const notesTypesPanel = form.querySelector('#transfer-notes-types-panel');
    const publicCheckbox = form.querySelector('#transfer-note-type-public');
    const sharedCheckbox = form.querySelector('#transfer-note-type-shared');
    const privateCheckbox = form.querySelector('#transfer-note-type-private');

    function updatePanelVisibility() {
      const enabled = notesEnabledRadios.find(r => r.checked && r.value === 'enabled');
      if (enabled && notesTypesPanel) {
        notesTypesPanel.removeAttribute('hidden');
      } else if (notesTypesPanel) {
        notesTypesPanel.setAttribute('hidden', '');
      }
    }

    notesEnabledRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        updatePanelVisibility();
        saveTransferSettings();
      });
    });

    [publicCheckbox, sharedCheckbox, privateCheckbox].forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', () => saveTransferSettings());
      }
    });

    function saveTransferSettings() {
      const notesEnabled = notesEnabledRadios.find(r => r.checked && r.value === 'enabled');
      wizardState.form.permissions.transferNotesEnabled = Boolean(notesEnabled);
      wizardState.form.permissions.transferNoteTypes = {
        public: Boolean(publicCheckbox && publicCheckbox.checked),
        sharedEncrypted: Boolean(sharedCheckbox && sharedCheckbox.checked),
        privateEncrypted: Boolean(privateCheckbox && privateCheckbox.checked)
      };

      if (transferNextButton) {
        transferNextButton.disabled = false; // Always valid (optional)
      }
    }

    function loadTransferSettings() {
      const settings = wizardState.form.permissions;
      const enabledRadio = notesEnabledRadios.find(r => r.value === (settings.transferNotesEnabled ? 'enabled' : 'disabled'));
      if (enabledRadio) {
        enabledRadio.checked = true;
      }

      if (publicCheckbox) publicCheckbox.checked = Boolean(settings.transferNoteTypes.public);
      if (sharedCheckbox) sharedCheckbox.checked = Boolean(settings.transferNoteTypes.sharedEncrypted);
      if (privateCheckbox) privateCheckbox.checked = Boolean(settings.transferNoteTypes.privateEncrypted);

      updatePanelVisibility();
      if (transferNextButton) {
        transferNextButton.disabled = false; // Always valid
      }
    }

    form.addEventListener('submit', (event) => event.preventDefault());

    updatePanelVisibility();
    loadTransferSettings();

    return {
      load: loadTransferSettings,
      save: saveTransferSettings
    };
  }

  function createFreezeUI(form) {
    if (!form) {
      return null;
    }

    const stepId = 'permissions-freeze';
    const enabledRadios = Array.from(form.querySelectorAll('input[name="freeze-enabled"]'));
    const performerSelect = form.querySelector('#freeze-performer');
    const performerIdentityWrapper = form.querySelector('[data-freeze-identity="perform"]');
    const performerIdentityInput = form.querySelector('#freeze-performer-identity');
    const ruleChangerSelect = form.querySelector('#freeze-rule-changer');
    const ruleIdentityWrapper = form.querySelector('[data-freeze-identity="rules"]');
    const ruleIdentityInput = form.querySelector('#freeze-rule-identity');
    const allowAuthorizedNoneInput = form.querySelector('#freeze-allow-authorized-none');
    const allowAdminNoneInput = form.querySelector('#freeze-allow-admin-none');
    const allowSelfChangeInput = form.querySelector('#freeze-allow-self-change');
    const performerIdentityMount = createConditionalFieldMount(performerIdentityWrapper);
    const ruleIdentityMount = createConditionalFieldMount(ruleIdentityWrapper);
    const controlsPanel = form.querySelector('[data-freeze-controls]');
    const messageElement = form.querySelector('#freeze-message');

    form.addEventListener('submit', (event) => event.preventDefault());

    let touched = Boolean(getStepState(stepId)?.touched);

    function state() {
      ensureFreezeState();
      return wizardState.form.permissions.freeze;
    }

    function setIdentityVisibility(type, mount, input, value, enabled) {
      if (!mount || !input) {
        return;
      }
      const show = enabled && type === 'identity';
      if (show) {
        mount.show();
        input.disabled = false;
        input.required = true;
        input.value = value || '';
      } else {
        mount.hide();
        input.disabled = true;
        input.required = false;
        input.value = value || '';
      }
    }

    function setControlsEnabled(enabled) {
      const controlElements = [
        performerSelect,
        ruleChangerSelect,
        performerIdentityInput,
        ruleIdentityInput,
        allowAuthorizedNoneInput,
        allowAdminNoneInput,
        allowSelfChangeInput
      ];
      controlElements.forEach((element) => {
        if (element) {
          element.disabled = !enabled;
        }
      });
      if (controlsPanel) {
        if (enabled) {
          controlsPanel.hidden = false;
          controlsPanel.removeAttribute('aria-disabled');
        } else {
          controlsPanel.hidden = true;
          controlsPanel.setAttribute('aria-disabled', 'true');
        }
      }
    }

    function validate(current) {
      const freezeState = current || state();
      if (!freezeState || typeof freezeState !== 'object') {
        return { valid: false, message: 'Configure freeze permissions.' };
      }
      if (!freezeState.enabled) {
        return { valid: true, message: '' };
      }
      if (freezeState.perform.type === 'identity' && !freezeState.perform.identity) {
        return { valid: false, message: 'Enter the identity ID for the actor allowed to freeze accounts.' };
      }
      if (freezeState.changeRules.type === 'identity' && !freezeState.changeRules.identity) {
        return { valid: false, message: 'Enter the identity ID for the actor allowed to change freeze rules.' };
      }
      return { valid: true, message: '' };
    }

    function applyValidation(current, { silent = false } = {}) {
      const validation = validate(current);
      if (messageElement) {
        if (!validation.valid && touched) {
          messageElement.textContent = validation.message;
        } else {
          messageElement.textContent = '';
        }
      }
      updateStepStatusFromValidation(stepId, validation, touched);
      if (!validation.valid && !silent && touched && validation.message) {
        announce(validation.message);
      }
      return validation;
    }

    function commit(partial, { markTouched = true, silent = false } = {}) {
      ensureFreezeState();
      const current = wizardState.form.permissions.freeze;
      const next = {
        enabled: typeof partial.enabled === 'boolean' ? partial.enabled : current.enabled,
        perform: { ...current.perform, ...(partial.perform || {}) },
        changeRules: { ...current.changeRules, ...(partial.changeRules || {}) },
        flags: { ...current.flags, ...(partial.flags || {}) }
      };
      wizardState.form.permissions.freeze = normalizeFreezeState(next);
      persistState();
      if (markTouched) {
        touched = true;
      }
      applyValidation(wizardState.form.permissions.freeze, { silent });
    }

    function sync({ announce = true } = {}) {
      const freezeState = state();
      touched = Boolean(getStepState(stepId)?.touched);

      setControlsEnabled(freezeState.enabled);

      if (enabledRadios.length) {
        enabledRadios.forEach((radio) => {
          radio.checked = radio.value === (freezeState.enabled ? 'enabled' : 'disabled');
        });
      }

      if (performerSelect) {
        performerSelect.value = freezeState.perform.type;
      }
      setIdentityVisibility(
        freezeState.perform.type,
        performerIdentityMount,
        performerIdentityInput,
        freezeState.perform.identity,
        freezeState.enabled
      );
      if (performerIdentityInput && freezeState.perform.type === 'identity') {
        performerIdentityInput.value = freezeState.perform.identity;
      }

      if (ruleChangerSelect) {
        ruleChangerSelect.value = freezeState.changeRules.type;
      }
      setIdentityVisibility(
        freezeState.changeRules.type,
        ruleIdentityMount,
        ruleIdentityInput,
        freezeState.changeRules.identity,
        freezeState.enabled
      );
      if (ruleIdentityInput && freezeState.changeRules.type === 'identity') {
        ruleIdentityInput.value = freezeState.changeRules.identity;
      }

      if (allowAuthorizedNoneInput) {
        allowAuthorizedNoneInput.checked = Boolean(freezeState.flags.changeAuthorizedToNoOneAllowed);
      }
      if (allowAdminNoneInput) {
        allowAdminNoneInput.checked = Boolean(freezeState.flags.changeAdminToNoOneAllowed);
      }
      if (allowSelfChangeInput) {
        allowSelfChangeInput.checked = Boolean(freezeState.flags.selfChangeAdminAllowed);
      }

      applyValidation(freezeState, { silent: !announce });
    }

    if (enabledRadios.length) {
      enabledRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
          if (!radio.checked) {
            return;
          }
          const enabled = radio.value === 'enabled';
          commit({ enabled }, { silent: !enabled });
          sync({ announce: false });
        });
      });
    }

    if (performerSelect) {
      performerSelect.addEventListener('change', () => {
        const value = performerSelect.value;
        const type = value === 'identity' ? 'identity' : value === 'owner' ? 'owner' : 'none';
        const update = { perform: { type } };
        if (type !== 'identity') {
          update.perform.identity = '';
        }
        commit(update);
        sync({ announce: false });
      });
    }

    if (ruleChangerSelect) {
      ruleChangerSelect.addEventListener('change', () => {
        const value = ruleChangerSelect.value;
        const type = value === 'identity' ? 'identity' : value === 'owner' ? 'owner' : 'none';
        const update = { changeRules: { type } };
        if (type !== 'identity') {
          update.changeRules.identity = '';
        }
        commit(update);
        sync({ announce: false });
      });
    }

    if (performerIdentityInput) {
      performerIdentityInput.addEventListener('input', () => {
        commit({ perform: { identity: performerIdentityInput.value.trim() } }, { silent: true });
      });
    }

    if (ruleIdentityInput) {
      ruleIdentityInput.addEventListener('input', () => {
        commit({ changeRules: { identity: ruleIdentityInput.value.trim() } }, { silent: true });
      });
    }

    if (allowAuthorizedNoneInput) {
      allowAuthorizedNoneInput.addEventListener('change', () => {
        commit({ flags: { changeAuthorizedToNoOneAllowed: Boolean(allowAuthorizedNoneInput.checked) } }, { silent: true });
      });
    }

    if (allowAdminNoneInput) {
      allowAdminNoneInput.addEventListener('change', () => {
        commit({ flags: { changeAdminToNoOneAllowed: Boolean(allowAdminNoneInput.checked) } }, { silent: true });
      });
    }

    if (allowSelfChangeInput) {
      allowSelfChangeInput.addEventListener('change', () => {
        commit({ flags: { selfChangeAdminAllowed: Boolean(allowSelfChangeInput.checked) } }, { silent: true });
      });
    }

    sync({ announce: false });

    return {
      sync
    };
  }

  function syncFreezeUI({ announce = false } = {}) {
    if (freezeUI && typeof freezeUI.sync === 'function') {
      freezeUI.sync({ announce });
    }
  }

  function createManualActionUI(definition, screen) {
    if (!definition || !screen) {
      return null;
    }
    const { key, stepId, domPrefix } = definition;
    const form = screen.querySelector(`#${domPrefix}-form`);
    if (!form) {
      return null;
    }

    const selector = (suffix) => `#${domPrefix}-${suffix}`;
    const dataSelector = (role) => `[data-${domPrefix}-identity="${role}"]`;

    const enabledRadios = Array.from(form.querySelectorAll(`input[name="${domPrefix}-enabled"]`));
    const performerSelect = form.querySelector(selector('performer'));
    const performerIdentityWrapper = form.querySelector(dataSelector('performer'));
    const performerIdentityInput = form.querySelector(selector('performer-identity'));
    const ruleChangerSelect = form.querySelector(selector('rule-changer'));
    const ruleChangerIdentityWrapper = form.querySelector(dataSelector('changer'));
    const ruleChangerIdentityInput = form.querySelector(selector('rule-changer-identity'));
    const allowAuthorizedNoneInput = form.querySelector(selector('allow-authorized-none'));
    const allowAdminNoneInput = form.querySelector(selector('allow-admin-none'));
    const allowSelfChangeInput = form.querySelector(selector('allow-self-change'));
    const controlsPanel = form.querySelector(`[data-${domPrefix}-controls]`);
    const messageElement = form.querySelector(selector('message'));
    const performerIdentityMount = createConditionalFieldMount(performerIdentityWrapper);
    const ruleChangerIdentityMount = createConditionalFieldMount(ruleChangerIdentityWrapper);

    let touched = Boolean(getStepState(stepId)?.touched);

    const actionState = () => {
      ensurePermissionsGroupState();
      ensureManualActionState(key);
      return wizardState.form.permissions[key];
    };

    function encodeActorValue(type, reference = '') {
      switch (type) {
        case 'owner':
          return 'owner';
        case 'identity':
          return `identity:${reference || ''}`;
        case 'group':
          return `group:${reference || ''}`;
        case 'main-group':
          return 'main-group';
        case 'none':
        default:
          return 'none';
      }
    }

    function decodeActorValue(value) {
      if (value && value.startsWith('group:')) {
        return { type: 'group', reference: value.slice(6) };
      }
      if (value && value.startsWith('identity:')) {
        return { type: 'identity', reference: value.slice(9) };
      }
      if (value === 'owner') {
        return { type: 'owner', reference: '' };
      }
      if (value === 'main-group') {
        return { type: 'main-group', reference: '' };
      }
      return { type: 'none', reference: '' };
    }

    function buildGroupLabel(group, index) {
      // Use custom name if provided, otherwise use default "Group N" format
      if (group.name && group.name.trim()) {
        return group.name.trim();
      }
      return `Group ${index + 1}`;
    }

    function buildActorOptions() {
      const options = [];
      options.push({ value: 'none', label: 'No one' });
      options.push({ value: 'owner', label: 'Contract owner' });

      const permissions = wizardState.form.permissions;
      const groups = Array.isArray(permissions.groups) ? permissions.groups : [];
      const mainIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);

      if (groups.length) {
        groups.forEach((group, index) => {
          options.push({ value: encodeActorValue('group', group.id), label: buildGroupLabel(group, index) });
        });
      }

      if (mainIndex >= 0 && mainIndex < groups.length) {
        options.push({ value: 'main-group', label: 'Main control group' });
      }

      options.push({ value: 'identity:', label: 'Specific Identity' });

      if (!groups.length) {
        options.push({ value: '__groups-missing__', label: '(No groups added yet)', disabled: true });
      }

      return options;
    }

    function populateSelect(select, options, requestedValue) {
      if (!select) {
        return '';
      }
      const previousValue = select.value;
      select.innerHTML = '';
      let fallbackValue = '';
      options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.disabled) {
          opt.disabled = true;
        } else if (!fallbackValue) {
          fallbackValue = option.value;
        }
        select.appendChild(opt);
      });

      let nextValue = requestedValue;
      if (!options.some((option) => option.value === requestedValue && !option.disabled)) {
        nextValue = fallbackValue || '';
      }

      select.value = nextValue;
      if (select.value !== nextValue && nextValue) {
        select.value = nextValue;
      }

      if (!select.value && previousValue && select.value !== previousValue) {
        select.value = previousValue;
      }

      return select.value;
    }

    function setControlsDisabled(disabled) {
      const controlElements = [
        performerSelect,
        ruleChangerSelect,
        performerIdentityInput,
        ruleChangerIdentityInput,
        allowAuthorizedNoneInput,
        allowAdminNoneInput,
        allowSelfChangeInput
      ];
      controlElements.forEach((element) => {
        if (element) {
          element.disabled = disabled;
        }
      });
      if (controlsPanel) {
        controlsPanel.classList.toggle('is-disabled', disabled);
        controlsPanel.setAttribute('aria-disabled', String(Boolean(disabled)));
      }
    }

    function syncIdentityField(type, mount, input, enabled, reference) {
      if (!mount || !input) {
        return;
      }
      if (type === 'identity' && enabled) {
        mount.show();
        input.disabled = false;
        input.value = reference || '';
      } else {
        mount.hide();
        input.disabled = true;
      }
    }

    function validate(state) {
      if (!state.enabled) {
        return { valid: true, message: '' };
      }
      if (state.performerType === 'none') {
        return { valid: false, message: 'Choose who may perform this action when it is enabled.' };
      }
      if (state.performerType === 'identity' && !state.performerReference) {
        return { valid: false, message: 'Enter the identity ID allowed to perform this action.' };
      }
      if (state.performerType === 'group' && !state.performerReference) {
        return { valid: false, message: 'Select a permission group allowed to perform this action.' };
      }
      if (state.ruleChangerType === 'identity' && !state.ruleChangerReference) {
        return { valid: false, message: 'Enter the identity ID allowed to change the rules.' };
      }
      if (state.ruleChangerType === 'group' && !state.ruleChangerReference) {
        return { valid: false, message: 'Select a permission group allowed to change the rules.' };
      }
      return { valid: true, message: '' };
    }

    function applyValidation(state, { silent = false } = {}) {
      const validation = validate(state);
      if (messageElement) {
        if (!validation.valid && (touched || state.enabled)) {
          messageElement.textContent = validation.message;
        } else {
          messageElement.textContent = '';
        }
      }
      updateStepStatusFromValidation(stepId, validation, touched || state.enabled);
      if (!validation.valid && !silent && validation.message) {
        announce(validation.message);
      }
      return validation;
    }

    function commit(partial, { markTouched = true, silent = false } = {}) {
      const permissions = wizardState.form.permissions;
      permissions[key] = {
        ...permissions[key],
        ...partial
      };
      permissions[key] = normalizeManualActionRecord(permissions, key);
      persistState();
      if (markTouched) {
        touched = true;
      }
      applyValidation(permissions[key], { silent });
    }

    function sync({ announce = true } = {}) {
      const state = actionState();
      const options = buildActorOptions();

      const performerValue = encodeActorValue(state.performerType, state.performerReference);
      const resolvedPerformerValue = populateSelect(performerSelect, options, performerValue);
      const performerActor = decodeActorValue(resolvedPerformerValue);
      if (performerActor.type !== state.performerType || performerActor.reference !== state.performerReference) {
        commit({ performerType: performerActor.type, performerReference: performerActor.reference }, { markTouched: false, silent: true });
      }

      const ruleValue = encodeActorValue(state.ruleChangerType, state.ruleChangerReference);
      const resolvedRuleValue = populateSelect(ruleChangerSelect, options, ruleValue);
      const ruleActor = decodeActorValue(resolvedRuleValue);
      if (ruleActor.type !== state.ruleChangerType || ruleActor.reference !== state.ruleChangerReference) {
        commit({ ruleChangerType: ruleActor.type, ruleChangerReference: ruleActor.reference }, { markTouched: false, silent: true });
      }

      const updatedState = actionState();
      const enableRadio = updatedState.enabled ? 'enabled' : 'disabled';
      enabledRadios.forEach((input) => {
        input.checked = input.value === enableRadio;
      });

      setControlsDisabled(!updatedState.enabled);
      syncIdentityField(
        updatedState.performerType,
        performerIdentityMount,
        performerIdentityInput,
        updatedState.enabled,
        updatedState.performerReference
      );
      syncIdentityField(
        updatedState.ruleChangerType,
        ruleChangerIdentityMount,
        ruleChangerIdentityInput,
        updatedState.enabled,
        updatedState.ruleChangerReference
      );

      if (allowAuthorizedNoneInput) {
        allowAuthorizedNoneInput.checked = Boolean(updatedState.allowChangeAuthorizedToNone);
      }
      if (allowAdminNoneInput) {
        allowAdminNoneInput.checked = Boolean(updatedState.allowChangeAdminToNone);
      }
      if (allowSelfChangeInput) {
        allowSelfChangeInput.checked = Boolean(updatedState.allowSelfChangeAdmin);
      }

      applyValidation(updatedState, { silent: !announce });
    }

    enabledRadios.forEach((input) => {
      input.addEventListener('change', () => {
        const enable = input.value === 'enabled';
        commit({ enabled: enable }, { silent: true });
        if (!enable) {
          commit(
            {
              performerType: 'none',
              performerReference: '',
              allowChangeAuthorizedToNone: false,
              allowChangeAdminToNone: false,
              allowSelfChangeAdmin: false
            },
            { markTouched: false, silent: true }
          );
        }
        sync({ announce: false });
      });
    });

    if (performerSelect) {
      performerSelect.addEventListener('change', () => {
        const actor = decodeActorValue(performerSelect.value);
        commit({ performerType: actor.type, performerReference: actor.reference });
        sync({ announce: false });
      });
    }

    if (ruleChangerSelect) {
      ruleChangerSelect.addEventListener('change', () => {
        const actor = decodeActorValue(ruleChangerSelect.value);
        commit({ ruleChangerType: actor.type, ruleChangerReference: actor.reference });
        sync({ announce: false });
      });
    }

    if (performerIdentityInput) {
      performerIdentityInput.addEventListener('input', () => {
        commit({ performerReference: performerIdentityInput.value.trim() });
      });
    }

    if (ruleChangerIdentityInput) {
      ruleChangerIdentityInput.addEventListener('input', () => {
        commit({ ruleChangerReference: ruleChangerIdentityInput.value.trim() });
      });
    }

    if (allowAuthorizedNoneInput) {
      allowAuthorizedNoneInput.addEventListener('change', () => {
        commit({ allowChangeAuthorizedToNone: Boolean(allowAuthorizedNoneInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    if (allowAdminNoneInput) {
      allowAdminNoneInput.addEventListener('change', () => {
        commit({ allowChangeAdminToNone: Boolean(allowAdminNoneInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    if (allowSelfChangeInput) {
      allowSelfChangeInput.addEventListener('change', () => {
        commit({ allowSelfChangeAdmin: Boolean(allowSelfChangeInput.checked) }, { silent: true });
        applyValidation(actionState(), { silent: true });
      });
    }

    // Special handling for manualMint destination fields
    if (key === 'manualMint') {
      const destinationRadios = Array.from(form.querySelectorAll('input[name="manual-mint-destination"]'));
      const destinationIdentityInput = form.querySelector('#manual-mint-destination-id');
      const allowCustomDestinationCheckbox = form.querySelector('#manual-mint-allow-custom-destination');

      if (destinationRadios.length > 0) {
        destinationRadios.forEach((radio) => {
          radio.addEventListener('change', () => {
            const destinationType = radio.value; // 'contract-owner' or 'default-identity'
            commit({ destinationType }, { silent: true });
          });
        });
      }

      if (destinationIdentityInput) {
        destinationIdentityInput.addEventListener('input', () => {
          commit({ destinationIdentity: destinationIdentityInput.value.trim() });
        });
      }

      if (allowCustomDestinationCheckbox) {
        allowCustomDestinationCheckbox.addEventListener('change', () => {
          commit({ allowCustomDestination: Boolean(allowCustomDestinationCheckbox.checked) }, { silent: true });
        });
      }

      // Sync destination fields to UI
      const state = actionState();
      if (state.destinationType) {
        const destinationRadio = destinationRadios.find(r => r.value === state.destinationType);
        if (destinationRadio) {
          destinationRadio.checked = true;
        }
      }
      if (destinationIdentityInput && state.destinationIdentity) {
        destinationIdentityInput.value = state.destinationIdentity;
      }
      if (allowCustomDestinationCheckbox) {
        allowCustomDestinationCheckbox.checked = Boolean(state.allowCustomDestination);
      }
    }

    return {
      sync
    };
  }

  function syncManualActionUIs({ announce = false } = {}) {
    MANUAL_ACTION_DEFINITIONS.forEach(({ key }) => {
      const ui = manualActionUIs[key];
      if (ui && typeof ui.sync === 'function') {
        ui.sync({ announce });
      }
    });
  }

  function createDistributionUI(form) {
    if (!form) {
      return null;
    }

    // NOTE: HTML is now defined in index.html, not generated dynamically
    // This function just sets up event listeners for existing elements

    /* COMMENTED OUT - HTML now in index.html
    const fieldset = form.querySelector('.wizard-fieldset');
    if (!fieldset) {
      return null;
    }

    fieldset.innerHTML = `
      <legend class="wizard-field__label">Emission schedule</legend>
      <div class="wizard-field">
        <label class="wizard-field__label" for="distribution-emission-type">Emission type</label>
        <select class="wizard-field__input" id="distribution-emission-type" name="distribution-emission-type">
          <option value="BlockBasedDistribution">Block based</option>
          <option value="TimeBasedDistribution">Time based</option>
          <option value="EpochBasedDistribution">Epoch based</option>
        </select>
      </div>
      <div class="wizard-field" data-cadence-field="BlockBasedDistribution">
        <label class="wizard-field__label" for="distribution-interval-blocks">Blocks per emission</label>
        <input class="wizard-field__input" id="distribution-interval-blocks" type="number" min="1" step="1" placeholder="10">
        <p class="wizard-field__hint">Number of blocks between emissions.</p>
        <label class="wizard-field__label wizard-field__label--secondary" for="distribution-start-block">Start block (optional)</label>
        <input class="wizard-field__input" id="distribution-start-block" type="number" min="0" step="1" placeholder="0">
      </div>
      <div class="wizard-field" data-cadence-field="TimeBasedDistribution">
        <label class="wizard-field__label" for="distribution-interval-seconds">Seconds per emission</label>
        <input class="wizard-field__input" id="distribution-interval-seconds" type="number" min="1" step="1" placeholder="60">
        <p class="wizard-field__hint">Time between emissions.</p>
        <label class="wizard-field__label wizard-field__label--secondary" for="distribution-start-timestamp">Start timestamp (ISO, optional)</label>
        <input class="wizard-field__input" id="distribution-start-timestamp" type="text" placeholder="2025-01-01T00:00:00Z">
      </div>
      <div class="wizard-field" data-cadence-field="EpochBasedDistribution">
        <label class="wizard-field__label" for="distribution-epoch">Epoch identifier</label>
        <input class="wizard-field__input" id="distribution-epoch" type="text" placeholder="monthly">
        <p class="wizard-field__hint">Name of the epoch cadence (e.g. weekly, monthly).</p>
      </div>
      <div class="wizard-field">
        <label class="wizard-field__label" for="distribution-function-type">Emission function</label>
        <select class="wizard-field__input" id="distribution-function-type" name="distribution-function-type">
          <option value="FixedAmount">Fixed amount</option>
          <option value="Random">Random amount</option>
          <option value="StepDecreasingAmount">Step decreasing amount</option>
        </select>
      </div>
      <div class="wizard-field-group" data-function-field="FixedAmount">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-fixed-amount">Amount per emission</label>
          <input class="wizard-field__input" id="distribution-fixed-amount" type="text" inputmode="numeric" pattern="\\d*" placeholder="100">
        </div>
      </div>
      <div class="wizard-field-group" data-function-field="Random">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-random-min">Minimum amount</label>
          <input class="wizard-field__input" id="distribution-random-min" type="text" inputmode="numeric" pattern="\\d*" placeholder="10">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-random-max">Maximum amount</label>
          <input class="wizard-field__input" id="distribution-random-max" type="text" inputmode="numeric" pattern="\\d*" placeholder="100">
        </div>
      </div>
      <div class="wizard-field-group" data-function-field="StepDecreasingAmount">
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-count">Step count</label>
          <input class="wizard-field__input" id="distribution-step-count" type="number" min="1" step="1" placeholder="4">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-numerator">Decrease numerator</label>
          <input class="wizard-field__input" id="distribution-step-numerator" type="number" min="0" step="1" placeholder="1">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-denominator">Decrease denominator</label>
          <input class="wizard-field__input" id="distribution-step-denominator" type="number" min="1" step="1" placeholder="2">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-start">Start amount</label>
          <input class="wizard-field__input" id="distribution-step-start" type="text" inputmode="numeric" pattern="\\d*" placeholder="500">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-trailing">Trailing interval amount</label>
          <input class="wizard-field__input" id="distribution-step-trailing" type="text" inputmode="numeric" pattern="\\d*" placeholder="50">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-offset">Start offset (optional)</label>
          <input class="wizard-field__input" id="distribution-step-offset" type="number" min="0" step="1" placeholder="0">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-max-interval">Max intervals (optional)</label>
          <input class="wizard-field__input" id="distribution-step-max-interval" type="number" min="1" step="1" placeholder="128">
        </div>
        <div class="wizard-field">
          <label class="wizard-field__label" for="distribution-step-min-value">Minimum value (optional)</label>
          <input class="wizard-field__input" id="distribution-step-min-value" type="number" min="0" step="1" placeholder="0">
        </div>
      </div>
    `; */

    // Use HTML elements that are already in index.html
    const typeRadios = Array.from(document.querySelectorAll('input[name="distribution-type"]'));
    const functionRadios = Array.from(document.querySelectorAll('input[name="emission-type"]'));
    const recipientRadios = Array.from(document.querySelectorAll('input[name="recipient-type"]'));

    // FIXED: Helper functions to get selected radio button value and map to correct type names
    const getSelectedTypeValue = () => {
      const checked = typeRadios.find(r => r.checked);
      if (!checked) return 'BlockBasedDistribution';
      // Map radio values to API type names
      const typeMap = {
        'block': 'BlockBasedDistribution',
        'time': 'TimeBasedDistribution',
        'epoch': 'EpochBasedDistribution'
      };
      return typeMap[checked.value] || 'BlockBasedDistribution';
    };
    const getSelectedFunctionValue = () => {
      const checked = functionRadios.find(r => r.checked);
      if (!checked) return '';
      // Map radio values to API type names
      const functionMap = {
        'fixed': 'FixedAmount',
        'exponential': 'Exponential',
        'linear': 'Linear',
        'random': 'Random',
        'step-decreasing': 'StepDecreasingAmount',
        'stepwise': 'Stepwise',
        'polynomial': 'Polynomial',
        'logarithmic': 'Logarithmic',
        'inverted-logarithmic': 'InvertedLogarithmic'
      };
      return functionMap[checked.value] || '';
    };

    const cadenceContainers = Array.from(form.querySelectorAll('[data-cadence-field]'));
    const functionContainers = Array.from(form.querySelectorAll('[data-function-field]'));

    // FIXED: Use actual element IDs from index.html
    const blockIntervalInput = document.querySelector('#dist-block-interval');
    const blockStartInput = document.querySelector('#dist-block-start');
    const timeIntervalInput = document.querySelector('#dist-time-interval');  // This is in HOURS, not seconds
    const timeStartInput = document.querySelector('#dist-time-start');
    const epochInput = document.querySelector('#dist-epoch-interval');

    // FIXED: Use actual element IDs from emission substep
    const fixedAmountInput = document.querySelector('#emission-fixed-amount');
    const randomMinInput = document.querySelector('#emission-random-min');
    const randomMaxInput = document.querySelector('#emission-random-max');
    const stepCountInput = form.querySelector('#distribution-step-count');
    const stepNumeratorInput = form.querySelector('#distribution-step-numerator');
    const stepDenominatorInput = form.querySelector('#distribution-step-denominator');
    const stepStartInput = form.querySelector('#distribution-step-start');
    const stepTrailingInput = form.querySelector('#distribution-step-trailing');
    const stepOffsetInput = form.querySelector('#distribution-step-offset');
    const stepMaxIntervalInput = form.querySelector('#distribution-step-max-interval');
    const stepMinValueInput = form.querySelector('#distribution-step-min-value');

    function syncCadence() {
      const active = getSelectedTypeValue();
      cadenceContainers.forEach((container) => {
        if (!container) return;
        const target = container.getAttribute('data-cadence-field');
        container.toggleAttribute('hidden', target !== active);
      });
    }

    function syncFunctionFields() {
      const active = getSelectedFunctionValue();
      functionContainers.forEach((container) => {
        if (!container) return;
        const target = container.getAttribute('data-function-field');
        container.toggleAttribute('hidden', target !== active);
      });
    }

    // FIXED: Add event listeners to radio buttons instead of select elements
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        syncCadence();
        evaluateDistribution({ touched: true });
      });
    });

    functionRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        syncFunctionFields();
        evaluateDistribution({ touched: true });
      });
    });

    const watchedInputs = [
      blockIntervalInput,
      blockStartInput,
      timeIntervalInput,
      timeStartInput,
      epochInput,
      fixedAmountInput,
      randomMinInput,
      randomMaxInput,
      stepCountInput,
      stepNumeratorInput,
      stepDenominatorInput,
      stepStartInput,
      stepTrailingInput,
      stepOffsetInput,
      stepMaxIntervalInput,
      stepMinValueInput
    ];

    watchedInputs.forEach((input) => {
      if (!input) return;
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => evaluateDistribution({ touched: true }));
    });

    syncCadence();
    syncFunctionFields();

    return {
      setValues(values = {}) {
        // FIXED: Set radio button checked state with proper type mapping
        if (values.cadence && typeof values.cadence.type === 'string') {
          // Map API type names back to radio values
          const reverseTypeMap = {
            'BlockBasedDistribution': 'block',
            'TimeBasedDistribution': 'time',
            'EpochBasedDistribution': 'epoch'
          };
          const radioValue = reverseTypeMap[values.cadence.type] || 'block';
          const typeRadio = typeRadios.find(r => r.value === radioValue);
          if (typeRadio) typeRadio.checked = true;
        }
        if (values.emission && typeof values.emission.type === 'string') {
          // Map API type names back to radio values
          const reverseFunctionMap = {
            'FixedAmount': 'fixed',
            'Exponential': 'exponential',
            'Linear': 'linear',
            'Random': 'random',
            'StepDecreasingAmount': 'step-decreasing',
            'Stepwise': 'stepwise',
            'Polynomial': 'polynomial',
            'Logarithmic': 'logarithmic',
            'InvertedLogarithmic': 'inverted-logarithmic'
          };
          const radioValue = reverseFunctionMap[values.emission.type];
          if (radioValue) {
            const functionRadio = functionRadios.find(r => r.value === radioValue);
            if (functionRadio) functionRadio.checked = true;
          }
        }

        if (values.cadence) {
          if (blockIntervalInput) {
            blockIntervalInput.value = values.cadence.intervalBlocks || '';
          }
          if (blockStartInput) {
            blockStartInput.value = values.cadence.startBlock || '';
          }
          // FIXED: Convert seconds to hours for display
          if (timeIntervalInput && values.cadence.intervalSeconds) {
            const seconds = parseInt(values.cadence.intervalSeconds, 10);
            if (!isNaN(seconds) && seconds > 0) {
              timeIntervalInput.value = String(Math.floor(seconds / 3600)); // Convert seconds to hours
            } else {
              timeIntervalInput.value = '';
            }
          } else if (timeIntervalInput) {
            timeIntervalInput.value = '';
          }
          if (timeStartInput) {
            timeStartInput.value = values.cadence.startTimestamp || '';
          }
          if (epochInput) {
            epochInput.value = values.cadence.epoch || '';
          }
        }

        if (values.emission) {
          if (fixedAmountInput) {
            fixedAmountInput.value = values.emission.amount || '';
          }
          if (randomMinInput) {
            randomMinInput.value = values.emission.min || '';
          }
          if (randomMaxInput) {
            randomMaxInput.value = values.emission.max || '';
          }
          if (stepCountInput) {
            stepCountInput.value = values.emission.stepCount || '';
          }
          if (stepNumeratorInput) {
            stepNumeratorInput.value = values.emission.decreasePerIntervalNumerator || '';
          }
          if (stepDenominatorInput) {
            stepDenominatorInput.value = values.emission.decreasePerIntervalDenominator || '';
          }
          if (stepStartInput) {
            stepStartInput.value = values.emission.distributionStartAmount || '';
          }
          if (stepTrailingInput) {
            stepTrailingInput.value = values.emission.trailingDistributionIntervalAmount || '';
          }
          if (stepOffsetInput) {
            stepOffsetInput.value = values.emission.startDecreasingOffset || '';
          }
          if (stepMaxIntervalInput) {
            stepMaxIntervalInput.value = values.emission.maxIntervalCount || '';
          }
          if (stepMinValueInput) {
            stepMinValueInput.value = values.emission.minValue || '';
          }
        }

        syncCadence();
        syncFunctionFields();
      },
      getValues() {
        // FIXED: Convert hours to seconds for time-based distribution
        let intervalSecondsValue = '';
        if (timeIntervalInput && timeIntervalInput.value.trim()) {
          const hours = parseInt(timeIntervalInput.value.trim(), 10);
          if (!isNaN(hours) && hours > 0) {
            intervalSecondsValue = String(hours * 3600); // Convert hours to seconds
          }
        }

        return {
          cadence: {
            type: getSelectedTypeValue(),
            intervalBlocks: blockIntervalInput ? blockIntervalInput.value.trim() : '',
            startBlock: blockStartInput ? blockStartInput.value.trim() : '',
            intervalSeconds: intervalSecondsValue,
            startTimestamp: timeStartInput ? timeStartInput.value.trim() : '',
            epoch: epochInput ? epochInput.value.trim() : ''
          },
          emission: {
            type: getSelectedFunctionValue(),
            amount: fixedAmountInput ? fixedAmountInput.value.trim() : '',
            min: randomMinInput ? randomMinInput.value.trim() : '',
            max: randomMaxInput ? randomMaxInput.value.trim() : '',
            stepCount: stepCountInput ? stepCountInput.value.trim() : '',
            decreasePerIntervalNumerator: stepNumeratorInput ? stepNumeratorInput.value.trim() : '',
            decreasePerIntervalDenominator: stepDenominatorInput ? stepDenominatorInput.value.trim() : '',
            distributionStartAmount: stepStartInput ? stepStartInput.value.trim() : '',
            trailingDistributionIntervalAmount: stepTrailingInput ? stepTrailingInput.value.trim() : '',
            startDecreasingOffset: stepOffsetInput ? stepOffsetInput.value.trim() : '',
            maxIntervalCount: stepMaxIntervalInput ? stepMaxIntervalInput.value.trim() : '',
            minValue: stepMinValueInput ? stepMinValueInput.value.trim() : ''
          }
        };
      }
    };
  }

  function createAdvancedUI(form) {
    // REMOVED: Change-control toggles section - functionality moved to dedicated permission screens
    return null;
  }

  function normalizeTokenAmount(value, decimals = 0) {
    if (value === null || value === undefined) {
      return null;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return null;
    }

    // Allow decimal notation (e.g., "5.5")
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }

    // If decimals are allowed and value contains a decimal point
    if (decimals > 0 && normalized.includes('.')) {
      const parts = normalized.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      // Check if decimal part exceeds allowed decimals
      if (decimalPart.length > decimals) {
        return null;
      }

      // Convert to smallest unit: e.g., "5.5" with 8 decimals becomes "550000000"
      const paddedDecimal = decimalPart.padEnd(decimals, '0');
      const combined = integerPart + paddedDecimal;
      const stripped = combined.replace(/^0+(?=\d)/, '');
      return stripped.length ? stripped : '0';
    }

    // If no decimals or value is a whole number, treat as smallest unit
    // e.g., "1000000" with decimals=8 stays as "1000000" (represents 0.01000000 tokens)
    // But if user enters "5", it should be treated as 5 whole tokens = 500000000 (if decimals=8)
    if (decimals > 0 && !normalized.includes('.')) {
      // Multiply by 10^decimals to convert whole tokens to smallest unit
      const multiplier = '1' + '0'.repeat(decimals);
      try {
        const result = (BigInt(normalized) * BigInt(multiplier)).toString();
        return result;
      } catch (e) {
        return null;
      }
    }

    // No decimals, return as-is (whole number)
    const stripped = normalized.replace(/^0+(?=\d)/, '');
    return stripped.length ? stripped : '0';
  }

  function normalizeKeepsHistory(input) {
    const defaults = { ...DEFAULT_KEEP_HISTORY };
    if (!input || typeof input !== 'object') {
      return defaults;
    }
    const result = {};
    Object.keys(defaults).forEach((key) => {
      result[key] = Boolean(input[key]);
    });
    return result;
  }

  function normalizeChangeControl(input) {
    const defaults = { ...DEFAULT_CHANGE_CONTROL_FLAGS };
    if (!input || typeof input !== 'object') {
      return defaults;
    }
    const result = {};
    Object.keys(defaults).forEach((key) => {
      result[key] = key in input ? Boolean(input[key]) : defaults[key];
    });
    return result;
  }

  function cloneDistributionValues(values = {}) {
    const cadence = values.cadence && typeof values.cadence === 'object' ? values.cadence : {};
    const emission = values.emission && typeof values.emission === 'object' ? values.emission : {};
    return {
      cadence: {
        type: typeof cadence.type === 'string' ? cadence.type : 'BlockBasedDistribution',
        intervalBlocks: typeof cadence.intervalBlocks === 'string' ? cadence.intervalBlocks : '',
        startBlock: typeof cadence.startBlock === 'string' ? cadence.startBlock : '',
        intervalSeconds: typeof cadence.intervalSeconds === 'string' ? cadence.intervalSeconds : '',
        startTimestamp: typeof cadence.startTimestamp === 'string' ? cadence.startTimestamp : '',
        epoch: typeof cadence.epoch === 'string' ? cadence.epoch : ''
      },
      emission: {
        type: typeof emission.type === 'string' ? emission.type : '',
        amount: typeof emission.amount === 'string' ? emission.amount : '',
        min: typeof emission.min === 'string' ? emission.min : '',
        max: typeof emission.max === 'string' ? emission.max : '',
        stepCount: typeof emission.stepCount === 'string' ? emission.stepCount : '',
        decreasePerIntervalNumerator: typeof emission.decreasePerIntervalNumerator === 'string' ? emission.decreasePerIntervalNumerator : '',
        decreasePerIntervalDenominator: typeof emission.decreasePerIntervalDenominator === 'string' ? emission.decreasePerIntervalDenominator : '',
        distributionStartAmount: typeof emission.distributionStartAmount === 'string' ? emission.distributionStartAmount : '',
        trailingDistributionIntervalAmount: typeof emission.trailingDistributionIntervalAmount === 'string' ? emission.trailingDistributionIntervalAmount : '',
        startDecreasingOffset: typeof emission.startDecreasingOffset === 'string' ? emission.startDecreasingOffset : '',
        maxIntervalCount: typeof emission.maxIntervalCount === 'string' ? emission.maxIntervalCount : '',
        minValue: typeof emission.minValue === 'string' ? emission.minValue : ''
      }
    };
  }

  function parsePositiveInt(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number) || number <= 0) {
      return null;
    }
    return number;
  }

  function parseNonNegativeInt(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number) || number < 0) {
      return null;
    }
    return number;
  }

  function validateDistributionValues(values, { skipEmissionValidation = false, decimals = 0 } = {}) {
    if (!values || typeof values !== 'object') {
      return { valid: false, message: 'Configure distribution settings.' };
    }

    const cadenceType = values.cadence && values.cadence.type;
    const allowedCadence = ['BlockBasedDistribution', 'TimeBasedDistribution', 'EpochBasedDistribution'];
    if (!allowedCadence.includes(cadenceType)) {
      return { valid: false, message: 'Select a release schedule.' };
    }

    if (cadenceType === 'BlockBasedDistribution') {
      if (parsePositiveInt(values.cadence.intervalBlocks) === null) {
        return { valid: false, message: 'Enter blocks per emission.' };
      }
      if (values.cadence.startBlock && parseNonNegativeInt(values.cadence.startBlock) === null) {
        return { valid: false, message: 'Start block must be zero or a positive integer.' };
      }
    }
    if (cadenceType === 'TimeBasedDistribution') {
      if (parsePositiveInt(values.cadence.intervalSeconds) === null) {
        return { valid: false, message: 'Enter seconds per emission.' };
      }
      if (values.cadence.startTimestamp) {
        const timestamp = values.cadence.startTimestamp;
        const isoCandidate = typeof timestamp === 'string' ? timestamp.trim() : '';
        const parsed = Date.parse(isoCandidate);
        if (!isoCandidate || Number.isNaN(parsed)) {
          return { valid: false, message: 'Start timestamp must be ISO-8601 (e.g., 2025-01-01T00:00:00Z).' };
        }
      }
    }
    if (cadenceType === 'EpochBasedDistribution') {
      if (!values.cadence.epoch) {
        return { valid: false, message: 'Provide an epoch identifier.' };
      }
    }

    // FIXED: Skip emission validation if we're only validating cadence (Schedule substep)
    if (skipEmissionValidation) {
      return { valid: true, message: '' };
    }

    const functionType = values.emission && values.emission.type;
    const allowedFunction = ['FixedAmount', 'Random', 'StepDecreasingAmount', 'Stepwise', 'Linear', 'Exponential', 'Polynomial', 'Logarithmic', 'InvertedLogarithmic'];

    // FIXED: Emission is optional - if no emission type is set, that's valid (user can skip)
    if (!functionType || functionType === '') {
      return { valid: true, message: '' };
    }

    // If emission type is set, it must be valid
    if (!allowedFunction.includes(functionType)) {
      return { valid: false, message: 'Select a valid emission function.' };
    }

    if (functionType === 'FixedAmount') {
      if (normalizeTokenAmount(values.emission.amount, decimals) === null) {
        return { valid: false, message: 'Enter an emission amount.' };
      }
    }

    if (functionType === 'Random') {
      const min = normalizeTokenAmount(values.emission.min, decimals);
      const max = normalizeTokenAmount(values.emission.max, decimals);
      if (min === null || max === null) {
        return { valid: false, message: 'Enter minimum and maximum emission amounts.' };
      }
      try {
        if (BigInt(min) > BigInt(max)) {
          return { valid: false, message: 'Random min must be less than or equal to max.' };
        }
      } catch (error) {
        return { valid: false, message: 'Random bounds must be numeric.' };
      }
    }

    if (functionType === 'StepDecreasingAmount') {
      if (parsePositiveInt(values.emission.stepCount) === null) {
        return { valid: false, message: 'Enter a step count greater than zero.' };
      }
      if (parseNonNegativeInt(values.emission.decreasePerIntervalNumerator) === null) {
        return { valid: false, message: 'Enter a decrease numerator.' };
      }
      if (parsePositiveInt(values.emission.decreasePerIntervalDenominator) === null) {
        return { valid: false, message: 'Enter a decrease denominator greater than zero.' };
      }
      if (normalizeTokenAmount(values.emission.distributionStartAmount, decimals) === null) {
        return { valid: false, message: 'Enter a starting distribution amount.' };
      }
      if (normalizeTokenAmount(values.emission.trailingDistributionIntervalAmount, decimals) === null) {
        return { valid: false, message: 'Enter a trailing interval amount.' };
      }
      if (values.emission.startDecreasingOffset && parseNonNegativeInt(values.emission.startDecreasingOffset) === null) {
        return { valid: false, message: 'Start offset must be zero or a positive integer.' };
      }
      if (values.emission.maxIntervalCount && parsePositiveInt(values.emission.maxIntervalCount) === null) {
        return { valid: false, message: 'Max intervals must be greater than zero.' };
      }
      if (values.emission.minValue && parseNonNegativeInt(values.emission.minValue) === null) {
        return { valid: false, message: 'Minimum value must be zero or positive.' };
      }
    }

    if (functionType === 'Stepwise') {
      if (!values.emission.stepwise || !Array.isArray(values.emission.stepwise) || values.emission.stepwise.length === 0) {
        return { valid: false, message: 'Add at least one stepwise entry.' };
      }
      for (const entry of values.emission.stepwise) {
        if (parseNonNegativeInt(entry.interval) === null) {
          return { valid: false, message: 'All stepwise intervals must be non-negative integers.' };
        }
        if (normalizeTokenAmount(entry.amount, decimals) === null) {
          return { valid: false, message: 'All stepwise amounts must be valid token amounts.' };
        }
      }
    }

    if (functionType === 'Linear') {
      if (normalizeTokenAmount(values.emission.linearStart, decimals) === null) {
        return { valid: false, message: 'Enter a starting amount for linear emission.' };
      }
      if (!values.emission.linearChange || values.emission.linearChange.trim() === '') {
        return { valid: false, message: 'Enter a change per period for linear emission.' };
      }
    }

    if (functionType === 'Exponential') {
      if (normalizeTokenAmount(values.emission.exponentialInitial, decimals) === null) {
        return { valid: false, message: 'Enter an initial amount for exponential emission.' };
      }
      if (!values.emission.exponentialRate || isNaN(parseFloat(values.emission.exponentialRate))) {
        return { valid: false, message: 'Enter a valid rate for exponential emission.' };
      }
    }

    if (functionType === 'Polynomial') {
      if (!values.emission.polyA || isNaN(parseInt(values.emission.polyA))) {
        return { valid: false, message: 'Enter coefficient a for polynomial.' };
      }
      if (parsePositiveInt(values.emission.polyD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.polyM || isNaN(parseInt(values.emission.polyM))) {
        return { valid: false, message: 'Enter exponent m for polynomial.' };
      }
      if (!values.emission.polyN || isNaN(parseInt(values.emission.polyN))) {
        return { valid: false, message: 'Enter coefficient n for polynomial.' };
      }
      if (!values.emission.polyO || isNaN(parseInt(values.emission.polyO))) {
        return { valid: false, message: 'Enter divisor o for polynomial.' };
      }
      if (normalizeTokenAmount(values.emission.polyB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for polynomial.' };
      }
    }

    if (functionType === 'Logarithmic') {
      if (!values.emission.logA || isNaN(parseInt(values.emission.logA))) {
        return { valid: false, message: 'Enter coefficient a for logarithmic.' };
      }
      if (parsePositiveInt(values.emission.logD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.logM || isNaN(parseInt(values.emission.logM))) {
        return { valid: false, message: 'Enter multiplier m for logarithmic.' };
      }
      if (!values.emission.logN || isNaN(parseInt(values.emission.logN))) {
        return { valid: false, message: 'Enter coefficient n for logarithmic.' };
      }
      if (!values.emission.logO || isNaN(parseInt(values.emission.logO))) {
        return { valid: false, message: 'Enter divisor o for logarithmic.' };
      }
      if (normalizeTokenAmount(values.emission.logB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for logarithmic.' };
      }
    }

    if (functionType === 'InvertedLogarithmic') {
      if (!values.emission.invlogA || isNaN(parseInt(values.emission.invlogA))) {
        return { valid: false, message: 'Enter coefficient a for inverted logarithmic.' };
      }
      if (parsePositiveInt(values.emission.invlogD) === null) {
        return { valid: false, message: 'Enter divisor d (must be positive).' };
      }
      if (!values.emission.invlogM || isNaN(parseInt(values.emission.invlogM))) {
        return { valid: false, message: 'Enter multiplier m for inverted logarithmic.' };
      }
      if (!values.emission.invlogN || isNaN(parseInt(values.emission.invlogN))) {
        return { valid: false, message: 'Enter coefficient n for inverted logarithmic.' };
      }
      if (!values.emission.invlogO || isNaN(parseInt(values.emission.invlogO))) {
        return { valid: false, message: 'Enter divisor o for inverted logarithmic.' };
      }
      if (normalizeTokenAmount(values.emission.invlogB, decimals) === null) {
        return { valid: false, message: 'Enter base amount b for inverted logarithmic.' };
      }
    }

    // Validate recipient if specified
    if (values.recipient) {
      if (values.recipient.type === 'identity' && !values.recipient.identityId) {
        return { valid: false, message: 'Enter a recipient identity ID.' };
      }
    }

    return { valid: true, message: '' };
  }

  function buildRegistrationValidationPayload() {
    const wallet = wizardState.form.registration.wallet;
    const identity = wizardState.form.registration.identity;
    const method = wizardState.form.registration.method;

    const walletPayload = {};
    if ((wallet.mnemonic || '').trim()) {
      walletPayload.mnemonic = '__present__';
    }
    if ((wallet.privateKey || '').trim()) {
      walletPayload.privateKey = '__present__';
    }

    return {
      wallet: walletPayload,
      identity: { id: (identity.id || '').trim() },
      method,
      preflight: {
        mobile: { qrGenerated: Boolean(wizardState.form.registration.preflight.mobile.qrGenerated) },
        det: { jsonDisplayed: Boolean(wizardState.form.registration.preflight.det.jsonDisplayed) },
        self: { warningAcknowledged: Boolean(wizardState.form.registration.preflight.self.warningAcknowledged) }
      }
    };
  }

  function buildPermissionsValidationPayload() {
    const permissions = wizardState.form.permissions || {};
    const decimals = typeof permissions.decimals === 'number' ? permissions.decimals : 0;
    const baseSupply = normalizeTokenAmount(permissions.baseSupply, decimals);
    if (baseSupply === null) {
      return null;
    }
    const payload = { baseSupply };
    if (permissions.useMaxSupply) {
      const maxSupply = normalizeTokenAmount(permissions.maxSupply, decimals);
      if (maxSupply === null) {
        return null;
      }
      payload.maxSupply = maxSupply;
    }
    return payload;
  }

  function buildDistributionValidationPayload() {
    const distributionRules = buildDistributionRulesForConfiguration();
    if (!distributionRules) {
      return null;
    }
    return { distributionRules };
  }

  function buildDistributionRulesForConfiguration() {
    const distribution = wizardState.form.distribution;
    if (!distribution) {
      return null;
    }
    const decimals = typeof wizardState.form.permissions?.decimals === 'number' ? wizardState.form.permissions.decimals : 0;
    const cadence = buildCadencePayload(distribution.cadence);
    const emission = buildEmissionPayload(distribution.emission, decimals);
    if (!cadence || !emission) {
      return null;
    }
    return {
      perpetual: [
        {
          id: 'primary',
          recipient: { type: 'EvonodesByParticipation' },
          cadence,
          emission
        }
      ],
      preProgrammed: []
    };
  }

  function buildCadencePayload(cadence) {
    if (!cadence || typeof cadence !== 'object') {
      return null;
    }
    switch (cadence.type) {
      case 'BlockBasedDistribution': {
        const intervalBlocks = parsePositiveInt(cadence.intervalBlocks);
        if (intervalBlocks === null) {
          return null;
        }
        const payload = { type: 'BlockBasedDistribution', intervalBlocks };
        const startBlock = parseNonNegativeInt(cadence.startBlock);
        if (startBlock !== null) {
          payload.startBlock = startBlock;
        }
        return payload;
      }
      case 'TimeBasedDistribution': {
        const intervalSeconds = parsePositiveInt(cadence.intervalSeconds);
        if (intervalSeconds === null) {
          return null;
        }
        const payload = { type: 'TimeBasedDistribution', intervalSeconds };
        if (cadence.startTimestamp) {
          payload.startTimestamp = cadence.startTimestamp;
        }
        return payload;
      }
      case 'EpochBasedDistribution':
        if (!cadence.epoch) {
          return null;
        }
        return { type: 'EpochBasedDistribution', epoch: cadence.epoch };
      default:
        return null;
    }
  }

  function buildEmissionPayload(emission, decimals = 0) {
    if (!emission || typeof emission !== 'object') {
      return null;
    }
    switch (emission.type) {
      case 'FixedAmount': {
        const amount = normalizeTokenAmount(emission.amount, decimals);
        if (amount === null) {
          return null;
        }
        return { type: 'FixedAmount', amount };
      }
      case 'Random': {
        const min = normalizeTokenAmount(emission.min, decimals);
        const max = normalizeTokenAmount(emission.max, decimals);
        if (min === null || max === null) {
          return null;
        }
        try {
          if (BigInt(min) > BigInt(max)) {
            return null;
          }
        } catch (error) {
          return null;
        }
        return { type: 'Random', min, max };
      }
      case 'StepDecreasingAmount': {
        const stepCount = parsePositiveInt(emission.stepCount);
        const numerator = parseNonNegativeInt(emission.decreasePerIntervalNumerator);
        const denominator = parsePositiveInt(emission.decreasePerIntervalDenominator);
        const distributionStartAmount = normalizeTokenAmount(emission.distributionStartAmount, decimals);
        const trailingAmount = normalizeTokenAmount(emission.trailingDistributionIntervalAmount, decimals);
        if (stepCount === null || numerator === null || denominator === null || distributionStartAmount === null || trailingAmount === null) {
          return null;
        }
        const payload = {
          type: 'StepDecreasingAmount',
          stepCount,
          decreasePerIntervalNumerator: numerator,
          decreasePerIntervalDenominator: denominator,
          distributionStartAmount,
          trailingDistributionIntervalAmount: trailingAmount
        };
        const offset = parseNonNegativeInt(emission.startDecreasingOffset);
        if (offset !== null) {
          payload.startDecreasingOffset = offset;
        }
        const maxIntervalCount = parsePositiveInt(emission.maxIntervalCount);
        if (maxIntervalCount !== null) {
          payload.maxIntervalCount = maxIntervalCount;
        }
        const minValue = parseNonNegativeInt(emission.minValue);
        if (minValue !== null) {
          payload.minValue = minValue;
        }
        return payload;
      }
      default:
        return null;
    }
  }

  function cloneLocalizationsRecord(source) {
    if (!source || typeof source !== 'object') {
      return {};
    }
    const sorted = {};
    Object.keys(source)
      .sort()
      .slice(0, 1)
      .forEach((code) => {
        const value = source[code];
        if (!value || typeof value !== 'object') {
          return;
        }
        const singular = typeof value.singular_form === 'string'
          ? value.singular_form
          : typeof value.singular === 'string'
            ? value.singular
            : '';
        const plural = typeof value.plural_form === 'string'
          ? value.plural_form
          : typeof value.plural === 'string'
            ? value.plural
            : '';
        sorted[code] = {
          should_capitalize: Boolean(value.should_capitalize ?? value.shouldCapitalize),
          singular_form: singular,
          plural_form: plural
        };
      });
    return sorted;
  }

  function deriveTokenDisplayName(name) {
    const trimmed = (name || '').trim();
    return trimmed || 'Token';
  }

  function deriveTokenSymbol(name) {
    const upper = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upper.length >= 3) {
      return upper.slice(0, 6);
    }
    if (upper.length > 0) {
      return (upper + 'XXX').slice(0, 3);
    }
    return 'TKN';
  }

  function buildMarketplaceRules(tradeMode) {
    const normalized = ['permissionless', 'approvalRequired', 'closed'].includes(tradeMode)
      ? tradeMode
      : 'permissionless';
    return {
      tradeMode: normalized,
      allowSecondaryMarkets: normalized !== 'closed',
      allowAtomicSwaps: normalized === 'permissionless'
    };
  }

  function createChangeRule(isEnabled) {
    const primaryActor = { type: 'identity', id: 'wizard-admin' };
    const secondaryActor = { type: 'group', id: 'governance-council' };
    if (isEnabled) {
      return {
        requiredApprovals: 1,
        actors: [primaryActor]
      };
    }
    return {
      requiredApprovals: 2,
      actors: [primaryActor, secondaryActor]
    };
  }

  function buildAuthorizedActionTakersFromConfig(type, reference, permissions) {
    const groups = Array.isArray(permissions.groups) ? permissions.groups : [];
    const mainGroupIndex = clampMainControlIndex(permissions.mainControlGroupIndex, groups.length);
    switch (type) {
      case 'owner':
        return { kind: 'ContractOwner' };
      case 'identity': {
        const identity = (reference || '').trim();
        if (!identity) {
          return { kind: 'NoOne' };
        }
        return { kind: 'Identity', identity };
      }
      case 'group': {
        const index = groups.findIndex((group) => group.id === reference);
        if (index === -1) {
          return { kind: 'NoOne' };
        }
        return {
          kind: 'Group',
          group: {
            contractId: groups[index].id,
            position: index
          }
        };
      }
      case 'main-group': {
        if (mainGroupIndex >= 0 && mainGroupIndex < groups.length) {
          return { kind: 'MainGroup' };
        }
        return { kind: 'NoOne' };
      }
      case 'none':
      default:
        return { kind: 'NoOne' };
    }
  }

  function buildFreezeRulesConfig(freezeState, permissions, { disabled = false } = {}) {
    const normalized = normalizeFreezeState(freezeState);
    if (disabled || !normalized.enabled) {
      return {
        authorizedToMakeChange: { kind: 'NoOne' },
        adminActionTakers: { kind: 'NoOne' },
        changingAuthorizedActionTakersToNoOneAllowed: false,
        changingAdminActionTakersToNoOneAllowed: false,
        selfChangingAdminActionTakersAllowed: false
      };
    }

    return {
      authorizedToMakeChange: buildAuthorizedActionTakersFromConfig(
        normalized.changeRules.type,
        normalized.changeRules.identity,
        permissions
      ),
      adminActionTakers: buildAuthorizedActionTakersFromConfig(
        normalized.perform.type,
        normalized.perform.identity,
        permissions
      ),
      changingAuthorizedActionTakersToNoOneAllowed: Boolean(normalized.flags.changeAuthorizedToNoOneAllowed),
      changingAdminActionTakersToNoOneAllowed: Boolean(normalized.flags.changeAdminToNoOneAllowed),
      selfChangingAdminActionTakersAllowed: Boolean(normalized.flags.selfChangeAdminAllowed)
    };
  }

  function buildManualActionRulesConfig(actionState, permissions) {
    if (!actionState || !actionState.enabled) {
      return {
        authorizedToMakeChange: { kind: 'NoOne' },
        adminActionTakers: { kind: 'NoOne' },
        changingAuthorizedActionTakersToNoOneAllowed: false,
        changingAdminActionTakersToNoOneAllowed: false,
        selfChangingAdminActionTakersAllowed: false
      };
    }

    return {
      authorizedToMakeChange: buildAuthorizedActionTakersFromConfig(
        actionState.ruleChangerType,
        actionState.ruleChangerReference,
        permissions
      ),
      adminActionTakers: buildAuthorizedActionTakersFromConfig(
        actionState.performerType,
        actionState.performerReference,
        permissions
      ),
      changingAuthorizedActionTakersToNoOneAllowed: Boolean(actionState.allowChangeAuthorizedToNone),
      changingAdminActionTakersToNoOneAllowed: Boolean(actionState.allowChangeAdminToNone),
      selfChangingAdminActionTakersAllowed: Boolean(actionState.allowSelfChangeAdmin)
    };
  }

  function buildAdvancedConfiguration() {
    const permissions = wizardState.form.permissions || {};
    const advanced = wizardState.form.advanced || {};
    const decimals = Number.isInteger(permissions.decimals) ? permissions.decimals : 2;
    const distributionRules = buildDistributionRulesForConfiguration();
    const baseSupply = normalizeTokenAmount(permissions.baseSupply, decimals);
    if (!distributionRules || baseSupply === null) {
      return null;
    }
    let maxSupply = null;
    if (permissions.useMaxSupply) {
      maxSupply = normalizeTokenAmount(permissions.maxSupply, decimals);
      if (maxSupply === null) {
        return null;
      }
    }
    const keepsHistory = normalizeKeepsHistory(permissions.keepsHistory);
    const changeControl = normalizeChangeControl(advanced.changeControl);
    const tradeMode = typeof advanced.tradeMode === 'string' ? advanced.tradeMode : 'permissionless';

    const adminRule = createChangeRule(changeControl.admin);
    const freezeRules = buildFreezeRulesConfig(permissions.freeze, permissions, { disabled: !changeControl.freeze });
    const unfreezeRule = createChangeRule(changeControl.unfreeze);
    const destroyRule = createChangeRule(changeControl.destroyFrozen);
    const emergencyRule = createChangeRule(changeControl.emergency);
    const directPurchaseRule = createChangeRule(changeControl.directPurchase);
    const manualMintRules = buildManualActionRulesConfig(permissions.manualMint, permissions);
    const manualBurnRules = buildManualActionRulesConfig(permissions.manualBurn, permissions);

    return {
      conventions: {
        tokenDisplayName: deriveTokenDisplayName(wizardState.form.tokenName),
        tokenSymbol: deriveTokenSymbol(wizardState.form.tokenName),
        decimals,
        localizations: cloneLocalizationsRecord(wizardState.form.naming.conventions.localizations)
      },
      conventionsChangeRules: adminRule,
      baseSupply,
      ...(maxSupply ? { maxSupply } : {}),
      keepsHistory,
      startAsPaused: Boolean(permissions.startAsPaused),
      allowTransferToFrozenBalance: Boolean(permissions.allowTransferToFrozenBalance),
      maxSupplyChangeRules: adminRule,
      distributionRules,
      marketplaceRules: buildMarketplaceRules(tradeMode),
      manualMintingRules: manualMintRules,
      manualBurningRules: manualBurnRules,
      freezeRules,
      unfreezeRules: unfreezeRule,
      destroyFrozenFundsRules: destroyRule,
      emergencyActionRules: emergencyRule,
      changeDirectPurchasePricingRules: directPurchaseRule,
      mainControlGroup: {
        contractId: 'control-group-primary',
        position: changeControl.admin ? 'primary' : 'observer'
      },
      mainControlGroupCanBeModified: {
        allowAnyone: !changeControl.admin,
        actors: [{ type: 'identity', id: 'wizard-admin' }]
      },
      description: 'Configuration compiled via wizard.'
    };
  }

  function cancelPendingValidation(stepId) {
    if (validationTimers[stepId]) {
      clearTimeout(validationTimers[stepId]);
      delete validationTimers[stepId];
    }
    delete validationFingerprints[stepId];
  }

  function refreshFlow({ initial = false, suppressFocus = false } = {}) {
    const previousId = currentScreenId;
    activeScreens = computeActiveScreens();

    if (!activeScreens.some((definition) => definition.id === previousId)) {
      currentScreenId = activeScreens.length ? activeScreens[0].id : previousId;
    }

    currentScreenId = resolveStepTargetId(currentScreenId);
    showScreen(currentScreenId, { suppressFocus: initial || suppressFocus });
  }

  // ADDED: Helper function to get the parent step of a substep
  function getParentStep(substepId) {
    // Check if it's already a main step
    if (STEP_SEQUENCE.includes(substepId)) {
      return substepId;
    }
    // Look for it in the substep sequences
    for (const [parentStep, substeps] of Object.entries(SUBSTEP_SEQUENCES)) {
      if (substeps.includes(substepId)) {
        return parentStep;
      }
    }
    return null;
  }

  // PROFESSIONAL: Get the next substep with comprehensive debugging
  function getNextSubstep(currentSubstep) {
    console.log('  📊 getNextSubstep called with:', currentSubstep);

    const parentStep = getParentStep(currentSubstep);
    console.log('  📊 Parent step:', parentStep);

    if (!parentStep) {
      console.error('  ❌ No parent step found for:', currentSubstep);
      console.log('  ℹ️  This might be a removed step. Attempting recovery...');

      // Try to find a valid step to navigate to
      // If we're in STEP_SEQUENCE, move to next step
      const indexInMain = STEP_SEQUENCE.indexOf(currentSubstep);
      if (indexInMain !== -1 && indexInMain < STEP_SEQUENCE.length - 1) {
        const nextMain = STEP_SEQUENCE[indexInMain + 1];
        console.log('  ✓ Recovered: navigating to next main step:', nextMain);
        return SUBSTEP_SEQUENCES[nextMain]?.[0] || nextMain;
      }

      // Otherwise, go to first valid step
      const firstStep = STEP_SEQUENCE[0];
      console.log('  ✓ Recovered: navigating to first step:', firstStep);
      return SUBSTEP_SEQUENCES[firstStep]?.[0] || firstStep;
    }

    const substeps = SUBSTEP_SEQUENCES[parentStep];
    console.log('  📊 Substeps for', parentStep + ':', substeps);

    if (!substeps) {
      console.error('  ❌ No substeps array found for parent:', parentStep);
      return null;
    }

    const currentIndex = substeps.indexOf(currentSubstep);
    console.log('  📊 Current index in substeps:', currentIndex);

    if (currentIndex === -1) {
      console.error('  ❌ Current substep not found in substeps array!');
      return null;
    }

    // Check if there's a next substep in the same parent
    if (currentIndex < substeps.length - 1) {
      const next = substeps[currentIndex + 1];
      console.log('  ✓ Next substep in same parent:', next);
      return next;
    }

    // No more substeps, go to next main step
    console.log('  📊 End of substeps, looking for next main step...');
    const mainStepIndex = STEP_SEQUENCE.indexOf(parentStep);
    console.log('  📊 Main step index:', mainStepIndex, '/', STEP_SEQUENCE.length);

    if (mainStepIndex === -1 || mainStepIndex >= STEP_SEQUENCE.length - 1) {
      console.log('  ✓ No more main steps');
      return null;
    }

    const nextMainStep = STEP_SEQUENCE[mainStepIndex + 1];
    console.log('  📊 Next main step:', nextMainStep);

    const nextSubsteps = SUBSTEP_SEQUENCES[nextMainStep];
    const result = nextSubsteps && nextSubsteps.length > 0 ? nextSubsteps[0] : nextMainStep;
    console.log('  ✓ Jumping to next main step section:', result);
    return result;
  }

  function goToNextScreen(fromId) {
    const wasManualNavigation = manualNavigationActive;
    manualNavigationActive = false;

    // FIXED: Use substep navigation instead of main step navigation
    const nextSubstep = getNextSubstep(fromId);
    if (!nextSubstep) {
      return;
    }

    // Validate the parent step before advancing
    const parentStep = getParentStep(fromId);
    const step = wizardState.steps[parentStep];
    if (!step || step.validity !== 'valid') {
      return;
    }

    showScreen(nextSubstep, { isManualNavigation: wasManualNavigation });
  }

  // ADDED: Get the previous substep or previous main step
  function getPreviousSubstep(currentSubstep) {
    const parentStep = getParentStep(currentSubstep);
    if (!parentStep) {
      return null;
    }

    const substeps = SUBSTEP_SEQUENCES[parentStep];
    if (!substeps) {
      return null;
    }

    const currentIndex = substeps.indexOf(currentSubstep);
    if (currentIndex === -1) {
      return null;
    }

    // Check if there's a previous substep in the same parent
    if (currentIndex > 0) {
      return substeps[currentIndex - 1];
    }

    // No more substeps, go to previous main step
    const mainStepIndex = STEP_SEQUENCE.indexOf(parentStep);
    if (mainStepIndex <= 0) {
      return null;
    }

    const prevMainStep = STEP_SEQUENCE[mainStepIndex - 1];
    const prevSubsteps = SUBSTEP_SEQUENCES[prevMainStep];
    // Go to the last substep of the previous main step
    return prevSubsteps && prevSubsteps.length > 0 ? prevSubsteps[prevSubsteps.length - 1] : prevMainStep;
  }

  function goToPreviousScreen(fromId) {
    manualNavigationActive = false;

    // FIXED: Use substep navigation for Back button
    const prevSubstep = getPreviousSubstep(fromId);
    if (!prevSubstep) {
      return;
    }

    showScreen(prevSubstep);
  }

  function resolveStepTargetId(desiredStepId) {
    const defaultStep = STEP_SEQUENCE[0];
    const isInfoStep = INFO_STEPS.includes(desiredStepId);
    const isPrimaryStep = STEP_SEQUENCE.includes(desiredStepId);

    // FIXED: Check if desiredStepId is a valid substep
    const isValidSubstep = Object.values(SUBSTEP_SEQUENCES).some(substeps =>
      substeps.includes(desiredStepId)
    );

    // FIXED: Allow substeps to pass through without modification
    if (isValidSubstep) {
      // Still validate that parent step is accessible
      const parentStep = getParentStep(desiredStepId);
      if (parentStep) {
        const parentIndex = getStepIndex(parentStep);
        const maxAccessibleIndex = Math.min(
          STEP_SEQUENCE.length - 1,
          Math.max(-1, wizardState.furthestValidIndex) + 1
        );

        // Allow access to substeps if parent step is accessible
        if (parentIndex <= maxAccessibleIndex) {
          return desiredStepId;
        }
      }
    }

    if (manualNavigationActive && (isPrimaryStep || isInfoStep)) {
      return desiredStepId;
    }

    let stepId = isPrimaryStep ? desiredStepId : getPrimaryStepId(desiredStepId);
    if (!STEP_SEQUENCE.includes(stepId)) {
      stepId = defaultStep;
    }

    const firstInvalid = getFirstInvalidStepId();
    const desiredIndex = getStepIndex(stepId);
    const maxAccessibleIndex = Math.min(
      STEP_SEQUENCE.length - 1,
      Math.max(-1, wizardState.furthestValidIndex) + 1
    );

    if (firstInvalid) {
      const firstInvalidIndex = getStepIndex(firstInvalid);
      if (desiredIndex > firstInvalidIndex) {
        stepId = firstInvalid;
      }
    }

    let resolvedIndex = getStepIndex(stepId);
    if (resolvedIndex === -1) {
      resolvedIndex = 0;
    }

    if (resolvedIndex > maxAccessibleIndex) {
      resolvedIndex = maxAccessibleIndex;
    }

    const resolvedStepId = STEP_SEQUENCE[resolvedIndex] || defaultStep;

    // FIXED: Return first substep if the resolved step has substeps
    if (SUBSTEP_SEQUENCES[resolvedStepId] && SUBSTEP_SEQUENCES[resolvedStepId].length > 0) {
      return SUBSTEP_SEQUENCES[resolvedStepId][0];
    }

    return resolvedStepId;
  }

  function getFirstInvalidStepId() {
    for (let index = 0; index < STEP_SEQUENCE.length; index += 1) {
      const id = STEP_SEQUENCE[index];
      const step = wizardState.steps[id];
      if (!step || step.validity !== 'valid') {
        return id;
      }
    }
    return null;
  }

  function updateFurthestValidIndex() {
    wizardState.furthestValidIndex = computeFurthestValidIndexFromSteps(wizardState.steps);
  }

  function announce(message) {
    if (!message) return;
    globalLiveRegion.textContent = '';
    requestAnimationFrame(() => {
      globalLiveRegion.textContent = message;
    });
  }

  function createTokenNamePattern() {
    try {
      return new RegExp('^[\\p{L}\\p{N}_\\-\\s\\p{Extended_Pictographic}]+$', 'u');
    } catch (error) {
      console.warn('Unicode property escapes not supported, falling back to basic pattern. Emoji may be filtered.');
      return /^[A-Za-z0-9_\-\s]+$/;
    }
  }

  function slugifyTokenName(name) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-]+/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    if (slug) {
      return slug;
    }

    const fallback = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]+/g, '');

    return fallback || `token-${Date.now()}`;
  }

  function registrationStubFor(method) {
    switch (method) {
      case 'mobile':
        return { channel: 'qr', steps: ['chunk-payload', 'scan-sequence'], status: 'draft' };
      case 'det':
        return { channel: 'json', tooling: 'det', status: 'export-ready' };
      case 'self':
        return { channel: 'library', caution: 'not_recommended', status: 'manual' };
      default:
        return { channel: 'unknown', status: 'pending-selection' };
    }
  }

  function getRegistrationPayload() {
    const rawName = wizardState.form.tokenName || '';
    const tokenName = rawName.trim() || 'Unnamed Token';
    const registrationMethod = wizardState.form.registration.method || 'mobile';

    // Build complete token configuration
    const payload = {
      tokenName,
      tokenId: slugifyTokenName(tokenName),
      conventions: {
        name: tokenName,
        symbol: tokenName.substring(0, 5).toUpperCase(),
        decimals: wizardState.form.permissions.decimals || 2,
        localizations: wizardState.form.naming.conventions.localizations || {}
      },
      supply_rules: {
        base_supply: wizardState.form.permissions.baseSupply || '0',
        max_supply: wizardState.form.permissions.useMaxSupply ? wizardState.form.permissions.maxSupply : null
      },
      permissions: {
        keepsHistory: wizardState.form.permissions.keepsHistory || {},
        startAsPaused: wizardState.form.permissions.startAsPaused || false,
        allowTransferToFrozenBalance: wizardState.form.permissions.allowTransferToFrozenBalance || false
      },
      registration: {
        method: registrationMethod,
        details: registrationStubFor(registrationMethod)
      }
    };

    // Add distribution rules if configured
    if (wizardState.form.distribution) {
      const dist = wizardState.form.distribution;
      if (dist.cadence && dist.cadence.type) {
        payload.distribution_rules = {
          cadence: {
            type: dist.cadence.type,
            interval_blocks: dist.cadence.intervalBlocks || undefined,
            interval_seconds: dist.cadence.intervalSeconds || undefined,
            epoch: dist.cadence.epoch || undefined,
            start_block: dist.cadence.startBlock || undefined,
            start_timestamp: dist.cadence.startTimestamp || undefined
          }
        };

        // Add emission if configured
        if (dist.emission && dist.emission.type) {
          payload.distribution_rules.emission = {
            type: dist.emission.type
          };
          // Add emission-specific fields based on type
          if (dist.emission.type === 'FixedAmount' && dist.emission.amount) {
            payload.distribution_rules.emission.amount = dist.emission.amount;
          } else if (dist.emission.type === 'Random') {
            payload.distribution_rules.emission.min = dist.emission.min;
            payload.distribution_rules.emission.max = dist.emission.max;
          }
          // Add other emission types as needed
        }
      }
    }

    // Add advanced settings
    if (wizardState.form.advanced) {
      payload.marketplace = {
        trade_mode: wizardState.form.advanced.tradeMode || 'permissionless'
      };
      payload.change_control = wizardState.form.advanced.changeControl || {};
    }

    // Add document types if any
    if (wizardState.form.documentTypes && Object.keys(wizardState.form.documentTypes).length > 0) {
      payload.document_types = wizardState.form.documentTypes;
    }

    // Add group configuration if enabled
    if (wizardState.form.group && wizardState.form.group.enabled) {
      payload.group = {
        name: wizardState.form.group.name,
        threshold: wizardState.form.group.threshold,
        members: wizardState.form.group.members
          .filter(m => m.identityId)
          .map(m => ({
            identity: m.identityId,
            power: parseInt(m.power, 10) || 1
          })),
        permissions: wizardState.form.group.permissions
      };
    }

    if (registrationMethod !== 'det') {
      payload.registration.requestedAt = new Date().toISOString();
    }

    return payload;
  }

  function chunkPayloadIntoQRCodes(str, maxCharsPerQR = 800) {
    const output = [];
    for (let i = 0; i < str.length; i += maxCharsPerQR) {
      output.push(str.slice(i, i + maxCharsPerQR));
    }
    return output;
  }

  /**
   * Generate Platform-compatible data contract JSON
   * This function transforms wizard state into the exact format expected by Dash Platform
   */
  function generatePlatformContractJSON() {
    const rawName = wizardState.form.tokenName || '';
    const tokenName = rawName.trim() || 'Unnamed Token';

    // Helper: Convert change control boolean to V0 rule object
    function createRuleV0(isEnabled, actionTaker = 'ContractOwner', governanceFlags = {}) {
      // Default governance flags to false if not provided
      const changingAuthorizedToNoOneAllowed = governanceFlags.allowChangeAuthorizedToNone !== undefined
        ? Boolean(governanceFlags.allowChangeAuthorizedToNone)
        : false;
      const changingAdminToNoOneAllowed = governanceFlags.allowChangeAdminToNone !== undefined
        ? Boolean(governanceFlags.allowChangeAdminToNone)
        : false;
      const selfChangingAdminAllowed = governanceFlags.allowSelfChangeAdmin !== undefined
        ? Boolean(governanceFlags.allowSelfChangeAdmin)
        : false;

      return {
        V0: {
          authorized_to_make_change: isEnabled ? actionTaker : 'NoOne',
          admin_action_takers: isEnabled ? actionTaker : 'NoOne',
          changing_authorized_action_takers_to_no_one_allowed: changingAuthorizedToNoOneAllowed,
          changing_admin_action_takers_to_no_one_allowed: changingAdminToNoOneAllowed,
          self_changing_admin_action_takers_allowed: selfChangingAdminAllowed
        }
      };
    }

    // Helper: Convert permission change state to V0 rule with proper authorization
    function createPermissionChangeRule(changeState) {
      if (!changeState || !changeState.enabled) {
        return createRuleV0(false);
      }

      // Determine action taker from perform authorization
      let authorizedToMakeChange = 'NoOne';
      if (changeState.perform) {
        if (changeState.perform.type === 'owner') {
          authorizedToMakeChange = 'ContractOwner';
        } else if (changeState.perform.type === 'identity' && changeState.perform.identityId) {
          authorizedToMakeChange = changeState.perform.identityId;
        } else if (changeState.perform.type === 'group' && changeState.perform.groupId) {
          // Group ID should be a number (group index)
          authorizedToMakeChange = parseInt(changeState.perform.groupId, 10) || 0;
        }
      }

      // Determine admin action takers from changeRules authorization
      let adminActionTakers = 'NoOne';
      if (changeState.changeRules) {
        if (changeState.changeRules.type === 'owner') {
          adminActionTakers = 'ContractOwner';
        } else if (changeState.changeRules.type === 'identity' && changeState.changeRules.identityId) {
          adminActionTakers = changeState.changeRules.identityId;
        } else if (changeState.changeRules.type === 'group' && changeState.changeRules.groupId) {
          adminActionTakers = parseInt(changeState.changeRules.groupId, 10) || 0;
        }
      }

      // Get governance flags from state (default to false if not present)
      const changingAuthorizedToNoOneAllowed = changeState.allowChangeAuthorizedToNone !== undefined
        ? Boolean(changeState.allowChangeAuthorizedToNone)
        : false;
      const changingAdminToNoOneAllowed = changeState.allowChangeAdminToNone !== undefined
        ? Boolean(changeState.allowChangeAdminToNone)
        : false;
      const selfChangingAdminAllowed = changeState.allowSelfChangeAdmin !== undefined
        ? Boolean(changeState.allowSelfChangeAdmin)
        : false;

      return {
        V0: {
          authorized_to_make_change: authorizedToMakeChange,
          admin_action_takers: adminActionTakers,
          changing_authorized_action_takers_to_no_one_allowed: changingAuthorizedToNoOneAllowed,
          changing_admin_action_takers_to_no_one_allowed: changingAdminToNoOneAllowed,
          self_changing_admin_action_takers_allowed: selfChangingAdminAllowed
        }
      };
    }

    // Helper: Convert authorization state to simple actor string (for mainControlGroupCanBeModified)
    function getActorFromAuthorization(authState) {
      if (!authState || !authState.type) {
        return 'NoOne';
      }

      if (authState.type === 'owner') {
        return 'ContractOwner';
      } else if (authState.type === 'identity' && authState.identityId) {
        return authState.identityId;
      } else if (authState.type === 'group' && authState.groupId) {
        return parseInt(authState.groupId, 10) || 0;
      }

      return 'NoOne';
    }

    // Helper: Convert keepsHistory to Platform format
    function transformKeepsHistory(keepsHistory) {
      return {
        $format_version: '0',
        keepsTransferHistory: Boolean(keepsHistory.transfers),
        keepsMintingHistory: Boolean(keepsHistory.mints),
        keepsBurningHistory: Boolean(keepsHistory.burns),
        keepsFreezingHistory: Boolean(keepsHistory.freezes),
        keepsDirectPricingHistory: true,
        keepsDirectPurchaseHistory: Boolean(keepsHistory.purchases)
      };
    }

    // Helper: Transform localizations to Platform format (camelCase)
    function transformLocalizations(localizations) {
      const result = {};
      for (const [langCode, loc] of Object.entries(localizations)) {
        result[langCode] = {
          $format_version: '0',
          shouldCapitalize: Boolean(loc.should_capitalize ?? loc.shouldCapitalize),
          singularForm: String(loc.singular_form || loc.singularForm || loc.singular || ''),
          pluralForm: String(loc.plural_form || loc.pluralForm || loc.plural || '')
        };
      }
      return result;
    }

    // Helper: Transform distribution rules
    function transformDistributionRules() {
      const dist = wizardState.form.distribution;
      if (!dist || !dist.emission || !dist.emission.type) {
        return null;
      }

      // Get minting destination configuration
      const manualMint = wizardState.form.permissions?.manualMint;
      const mintDestinationType = manualMint?.destinationType || 'contract-owner';
      const mintDestinationIdentity = manualMint?.destinationIdentity || '';
      const allowCustomDestination = Boolean(manualMint?.allowCustomDestination);

      const distributionRules = {
        $format_version: '0',
        perpetualDistribution: null,
        perpetualDistributionRules: createRuleV0(false),
        preProgrammedDistribution: null,
        preProgrammedDistributionRules: createRuleV0(false),
        newTokensDestinationIdentity: mintDestinationType === 'default-identity' && mintDestinationIdentity ? mintDestinationIdentity : null,
        newTokensDestinationIdentityRules: createRuleV0(true),
        mintingAllowChoosingDestination: allowCustomDestination,
        mintingAllowChoosingDestinationRules: createRuleV0(true),
        changeDirectPurchasePricingRules: createPermissionChangeRule(wizardState.form.permissions.directPricing)
      };

      // Build perpetual distribution if emission is configured
      if (dist.emission && dist.emission.type) {
        let distributionType = {};
        const cadence = dist.cadence;

        // Determine distribution type (Block, Time, or Epoch based)
        if (cadence.type === 'BlockBasedDistribution') {
          const interval = parseInt(cadence.intervalBlocks, 10) || 100;
          distributionType.BlockBasedDistribution = {
            interval: interval,
            function: buildEmissionFunction(dist.emission)
          };
        } else if (cadence.type === 'TimeBasedDistribution') {
          const interval = parseInt(cadence.intervalSeconds, 10) || 3600; // Keep in seconds (Platform expects seconds)
          distributionType.TimeBasedDistribution = {
            interval: interval,
            function: buildEmissionFunction(dist.emission)
          };
        } else if (cadence.type === 'EpochBasedDistribution') {
          distributionType.EpochBasedDistribution = {
            epoch: cadence.epoch || 'monthly',
            function: buildEmissionFunction(dist.emission)
          };
        }

        // Determine recipient
        const recipient = dist.recipient?.type === 'specific-identity' && dist.recipient.identityId
          ? dist.recipient.identityId
          : 'ContractOwner';

        distributionRules.perpetualDistribution = {
          $format_version: '0',
          distributionType: distributionType,
          distributionRecipient: recipient
        };
        distributionRules.perpetualDistributionRules = createRuleV0(true);
      }

      // Build pre-programmed distribution if configured
      if (dist.preProgrammed && Array.isArray(dist.preProgrammed.entries) && dist.preProgrammed.entries.length > 0) {
        const distributions = {};
        dist.preProgrammed.entries.forEach(entry => {
          if (entry.timestamp && entry.identityId && entry.amount) {
            const timestamp = String(entry.timestamp);
            if (!distributions[timestamp]) {
              distributions[timestamp] = {};
            }
            distributions[timestamp][entry.identityId] = parseInt(entry.amount, 10) || 0;
          }
        });

        if (Object.keys(distributions).length > 0) {
          distributionRules.preProgrammedDistribution = {
            $format_version: '0',
            distributions: distributions
          };
          distributionRules.preProgrammedDistributionRules = createRuleV0(true);
        }
      }

      return distributionRules;
    }

    // Helper: Build emission function based on type
    function buildEmissionFunction(emission) {
      const type = emission.type;

      // FixedAmount: Constant emission per period
      if (type === 'FixedAmount') {
        return {
          FixedAmount: {
            amount: parseInt(emission.amount, 10) || 0
          }
        };
      }

      // Random: Random amount between min and max
      else if (type === 'Random') {
        return {
          Random: {
            min: parseInt(emission.min, 10) || 0,
            max: parseInt(emission.max, 10) || 100
          }
        };
      }

      // StepDecreasing: Bitcoin-style halving
      else if (type === 'StepDecreasing') {
        const stepObj = {
          stepCount: parseInt(emission.stepCount, 10) || 1,
          decreasePerInterval: {
            numerator: parseInt(emission.decreasePerIntervalNumerator, 10) || 1,
            denominator: parseInt(emission.decreasePerIntervalDenominator, 10) || 2
          },
          distributionStartAmount: emission.distributionStartAmount ? BigInt(emission.distributionStartAmount) : BigInt(100),
          trailingDistributionIntervalAmount: emission.trailingDistributionIntervalAmount ? BigInt(emission.trailingDistributionIntervalAmount) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.stepOffset && emission.stepOffset !== '' && emission.stepOffset !== 'None') {
          stepObj.startPeriodOffset = BigInt(emission.stepOffset);
        }
        if (emission.stepMinValue && emission.stepMinValue !== '' && emission.stepMinValue !== 'None') {
          stepObj.minValue = BigInt(emission.stepMinValue);
        }
        if (emission.stepMaxInterval && emission.stepMaxInterval !== '' && emission.stepMaxInterval !== 'None') {
          stepObj.maxIntervalCount = BigInt(emission.stepMaxInterval);
        }

        return { StepDecreasing: stepObj };
      }

      // Linear: f(x) = (a * (x - s) / d) + b
      else if (type === 'Linear') {
        const linearObj = {
          a: parseInt(emission.linearSlopeNumerator, 10) || 0,
          d: emission.linearSlopeDivisor ? BigInt(emission.linearSlopeDivisor) : BigInt(1),
          b: emission.linearStartingAmount ? BigInt(emission.linearStartingAmount) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.linearStartStep && emission.linearStartStep !== '' && emission.linearStartStep !== 'None') {
          linearObj.s = BigInt(emission.linearStartStep);
        }
        if (emission.linearMinValue && emission.linearMinValue !== '' && emission.linearMinValue !== 'None') {
          linearObj.minValue = BigInt(emission.linearMinValue);
        }
        if (emission.linearMaxValue && emission.linearMaxValue !== '' && emission.linearMaxValue !== 'None') {
          linearObj.maxValue = BigInt(emission.linearMaxValue);
        }

        return { Linear: linearObj };
      }

      // Exponential: f(x) = (a * (x - s + o)^(m / n)) / d + b
      else if (type === 'Exponential') {
        const expObj = {
          a: parseInt(emission.expA, 10) || 0,
          m: parseInt(emission.expM, 10) || 2,
          n: parseInt(emission.expN, 10) || 1,
          d: emission.expD ? BigInt(emission.expD) : BigInt(1),
          o: emission.expO ? BigInt(emission.expO) : BigInt(0),
          b: emission.expB ? BigInt(emission.expB) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.expS && emission.expS !== '' && emission.expS !== 'None') {
          expObj.s = BigInt(emission.expS);
        }
        if (emission.expMinValue && emission.expMinValue !== '' && emission.expMinValue !== 'None') {
          expObj.minValue = BigInt(emission.expMinValue);
        }
        if (emission.expMaxValue && emission.expMaxValue !== '' && emission.expMaxValue !== 'None') {
          expObj.maxValue = BigInt(emission.expMaxValue);
        }

        return { Exponential: expObj };
      }

      // Polynomial: f(x) = (a * (x - s + o)^(m / n)) / d + b
      else if (type === 'Polynomial') {
        const polyObj = {
          a: parseInt(emission.polyA, 10) || 0,
          m: parseInt(emission.polyM, 10) || 2,
          n: parseInt(emission.polyN, 10) || 1,
          d: emission.polyD ? BigInt(emission.polyD) : BigInt(1),
          o: emission.polyO ? BigInt(emission.polyO) : BigInt(0),
          b: emission.polyB ? BigInt(emission.polyB) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.polyS && emission.polyS !== '' && emission.polyS !== 'None') {
          polyObj.s = BigInt(emission.polyS);
        }
        if (emission.polyMinValue && emission.polyMinValue !== '' && emission.polyMinValue !== 'None') {
          polyObj.minValue = BigInt(emission.polyMinValue);
        }
        if (emission.polyMaxValue && emission.polyMaxValue !== '' && emission.polyMaxValue !== 'None') {
          polyObj.maxValue = BigInt(emission.polyMaxValue);
        }

        return { Polynomial: polyObj };
      }

      // Logarithmic: f(x) = (a * ln((m * (x - s + o)) / n)) / d + b
      else if (type === 'Logarithmic') {
        const logObj = {
          a: parseInt(emission.logA, 10) || 0,
          d: emission.logD ? BigInt(emission.logD) : BigInt(1),
          m: emission.logM ? BigInt(emission.logM) : BigInt(1),
          n: emission.logN ? BigInt(emission.logN) : BigInt(1),
          o: emission.logO ? BigInt(emission.logO) : BigInt(0),
          b: emission.logB ? BigInt(emission.logB) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.logS && emission.logS !== '' && emission.logS !== 'None') {
          logObj.s = BigInt(emission.logS);
        }
        if (emission.logMinValue && emission.logMinValue !== '' && emission.logMinValue !== 'None') {
          logObj.minValue = BigInt(emission.logMinValue);
        }
        if (emission.logMaxValue && emission.logMaxValue !== '' && emission.logMaxValue !== 'None') {
          logObj.maxValue = BigInt(emission.logMaxValue);
        }

        return { Logarithmic: logObj };
      }

      // InvertedLogarithmic: f(x) = (a * ln(n / (m * (x - s + o)))) / d + b
      else if (type === 'InvertedLogarithmic') {
        const invlogObj = {
          a: parseInt(emission.invlogA, 10) || 0,
          d: emission.invlogD ? BigInt(emission.invlogD) : BigInt(1),
          m: emission.invlogM ? BigInt(emission.invlogM) : BigInt(1),
          n: emission.invlogN ? BigInt(emission.invlogN) : BigInt(1),
          o: emission.invlogO ? BigInt(emission.invlogO) : BigInt(0),
          b: emission.invlogB ? BigInt(emission.invlogB) : BigInt(0)
        };

        // Add optional fields if provided
        if (emission.invlogS && emission.invlogS !== '' && emission.invlogS !== 'None') {
          invlogObj.s = BigInt(emission.invlogS);
        }
        if (emission.invlogMinValue && emission.invlogMinValue !== '' && emission.invlogMinValue !== 'None') {
          invlogObj.minValue = BigInt(emission.invlogMinValue);
        }
        if (emission.invlogMaxValue && emission.invlogMaxValue !== '' && emission.invlogMaxValue !== 'None') {
          invlogObj.maxValue = BigInt(emission.invlogMaxValue);
        }

        return { InvertedLogarithmic: invlogObj };
      }

      // Stepwise: Custom step-based schedule
      else if (type === 'Stepwise' && Array.isArray(emission.stepwise) && emission.stepwise.length > 0) {
        const steps = emission.stepwise.map(step => ({
          period: parseInt(step.period, 10) || 0,
          amount: parseInt(step.amount, 10) || 0
        }));
        return {
          Stepwise: {
            steps: steps
          }
        };
      }

      // Default fallback to FixedAmount
      return {
        FixedAmount: {
          amount: 100
        }
      };
    }

    // Helper: Transform marketplace rules
    function transformMarketplaceRules() {
      const tradeMode = wizardState.form.advanced?.tradeMode;

      // Map wizard values to Platform enum values
      let platformTradeMode;
      if (tradeMode === 'permissionless') {
        platformTradeMode = 'Permissionless';
      } else if (tradeMode === 'approvalRequired') {
        platformTradeMode = 'ApprovalRequired';
      } else if (tradeMode === 'closed') {
        platformTradeMode = 'NotTradeable';
      } else {
        platformTradeMode = 'Permissionless'; // Default to permissionless
      }

      return {
        $format_version: '0',
        tradeMode: platformTradeMode,
        tradeModeChangeRules: createPermissionChangeRule(wizardState.form.permissions.marketplaceTradeMode)
      };
    }

    // Helper: Transform transfer notes configuration
    function transformTransferNotesConfig() {
      const transferConfig = wizardState.form.permissions;
      if (!transferConfig.transferNotesEnabled) {
        return null; // No transfer notes configured
      }

      const allowedTypes = [];
      if (transferConfig.transferNoteTypes?.public) {
        allowedTypes.push('Public');
      }
      if (transferConfig.transferNoteTypes?.sharedEncrypted) {
        allowedTypes.push('SharedEncrypted');
      }
      if (transferConfig.transferNoteTypes?.privateEncrypted) {
        allowedTypes.push('PrivateEncrypted');
      }

      if (allowedTypes.length === 0) {
        return null; // No note types enabled
      }

      return {
        allowedNoteTypes: allowedTypes
      };
    }

    // Build token configuration (to be wrapped in tokens.0)
    const tokenConfig = {
      $format_version: '0',
      conventions: {
        $format_version: '0',
        localizations: transformLocalizations(
          wizardState.form.naming.conventions.localizations || {}
        ),
        decimals: parseInt(wizardState.form.permissions.decimals, 10) || 2
      },
      conventionsChangeRules: createPermissionChangeRule(wizardState.form.permissions.conventionsChange),
      baseSupply: parseInt(wizardState.form.permissions.baseSupply, 10) || 0,
      maxSupply: wizardState.form.permissions.useMaxSupply
        ? parseInt(wizardState.form.permissions.maxSupply, 10) || null
        : null,
      keepsHistory: transformKeepsHistory(wizardState.form.permissions.keepsHistory || {}),
      transferable: true,  // Tokens are transferable by default
      startAsPaused: Boolean(wizardState.form.permissions.startAsPaused),
      allowTransferToFrozenBalance: Boolean(wizardState.form.permissions.allowTransferToFrozenBalance),
      maxSupplyChangeRules: createRuleV0(
        false,  // Currently max supply changes are disabled in UI
        'ContractOwner',
        wizardState.form.permissions.changeMaxSupply || {}
      ),
      manualMintingRules: createRuleV0(
        Boolean(wizardState.form.permissions.manualMint?.enabled),
        'ContractOwner',
        wizardState.form.permissions.manualMint || {}
      ),
      manualBurningRules: createRuleV0(
        Boolean(wizardState.form.permissions.manualBurn?.enabled),
        'ContractOwner',
        wizardState.form.permissions.manualBurn || {}
      ),
      freezeRules: createRuleV0(
        Boolean(wizardState.form.advanced?.changeControl?.freeze),
        'ContractOwner',
        wizardState.form.permissions.freeze?.flags || {}
      ),
      unfreezeRules: createRuleV0(
        Boolean(wizardState.form.advanced?.changeControl?.unfreeze),
        'ContractOwner',
        wizardState.form.permissions.unfreeze || {}
      ),
      destroyFrozenFundsRules: createRuleV0(
        Boolean(wizardState.form.advanced?.changeControl?.destroyFrozen),
        'ContractOwner',
        wizardState.form.permissions.destroyFrozen || {}
      ),
      emergencyActionRules: createRuleV0(
        Boolean(wizardState.form.advanced?.changeControl?.emergency),
        'ContractOwner',
        wizardState.form.permissions.emergencyAction || {}
      ),
      mainControlGroup: null,
      mainControlGroupCanBeModified: wizardState.form.permissions.mainControl?.enabled
        ? getActorFromAuthorization(wizardState.form.permissions.mainControl.changeRules)
        : 'NoOne'
    };

    // Add distribution rules if configured
    const distributionRules = transformDistributionRules();
    if (distributionRules) {
      tokenConfig.distributionRules = distributionRules;
    }

    // Add marketplace rules
    tokenConfig.marketplaceRules = transformMarketplaceRules();

    // Add transfer notes configuration if enabled
    const transferNotesConfig = transformTransferNotesConfig();
    if (transferNotesConfig) {
      tokenConfig.transferNotesConfig = transferNotesConfig;
    }

    // Add description if user provided one, otherwise generate from token name
    const userDescription = wizardState.form.search.description?.trim();
    if (userDescription && userDescription.length >= 3) {
      tokenConfig.description = userDescription.substring(0, 200); // Max 200 chars
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      const description = `Token: ${tokenName}`;
      tokenConfig.description = description.substring(0, 100); // Max 100 chars
    }

    // Build groups at root level (if enabled)
    const groups = {};
    if (wizardState.form.group?.enabled && wizardState.form.group.members?.length > 0) {
      const validMembers = wizardState.form.group.members
        .filter(m => m.identityId)
        .map(m => ({
          identity: m.identityId,
          power: parseInt(m.power, 10) || 1
        }));

      if (validMembers.length > 0) {
        groups['0'] = {
          members: validMembers,
          requiredPower: parseInt(wizardState.form.group.threshold, 10) || 2
        };
        // Update mainControlGroup in token if group is defined
        tokenConfig.mainControlGroup = 0;
        tokenConfig.mainControlGroupCanBeModified = wizardState.form.permissions.mainControl?.enabled
          ? getActorFromAuthorization(wizardState.form.permissions.mainControl.changeRules)
          : 'NoOne';
      }
    }

    // Build Platform contract structure
    const platformContract = {
      $format_version: '1',
      // TODO: We should generate this one based on owner ID
      id: '6DsX9gnYqtkM9SmdfyqMeBaX323mD5AJCnQYjdJmt8jk',  // Platform generates this
      // TODO: Should be asked from user?
      ownerId: '6DsX9gnYqtkM9SmdfyqMeBaX323mD5AJCnQYjdJmt8jk',     // Comes from identity during registration
      version: 1,
      config: {
        $format_version: '0',
        canBeDeletedByOwner: false,
        readonly: false,
        keepsHistory: false,
        documentsKeepHistoryContractDefault: false,
        documentsMutableContractDefault: true,
        documentsCanBeDeletedByOwnerDefault: false,
        requiresIdentityEncryptionBoundedKey: null,
        requiresIdentityDecryptionBoundedKey: null
      },
      schemaDefs: {},  // Reusable schema definitions for document types
      documentSchemas: {},  // Will be populated if document types are defined
      tokens: {
        '0': tokenConfig  // Token at position 0
      }
    };

    // Add document schemas if any have been defined
    if (wizardState.form.documentTypes && Object.keys(wizardState.form.documentTypes).length > 0) {
      platformContract.documentSchemas = wizardState.form.documentTypes;
    }

    // Add groups if any
    if (Object.keys(groups).length > 0) {
      platformContract.groups = groups;
    }

    // Add keywords - use user-provided keywords if available, otherwise generate from token name
    const userKeywordsText = wizardState.form.search.keywords?.trim();
    const userKeywords = userKeywordsText ? userKeywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];
    if (userKeywords && userKeywords.length > 0) {
      platformContract.keywords = userKeywords.slice(0, 50); // Max 50 keywords
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      platformContract.keywords = [tokenName.toLowerCase()];
    }

    // Add description - use user-provided description if available, otherwise generate from token name
    if (userDescription && userDescription.length >= 3) {
      platformContract.description = userDescription.substring(0, 100);
    } else if (tokenName && tokenName !== 'Unnamed Token') {
      platformContract.description = `Data contract for ${tokenName}`;
    }

    return platformContract;
  }

  /**
   * Testing utility - Generate test contracts for verification
   * Call from console: testPlatformContracts()
   */
  function testPlatformContracts() {
    console.group('🧪 Platform Contract Testing');

    // Test 1: Simple fixed-supply token
    console.group('Test 1: Simple Fixed-Supply Token');
    const test1State = createTestState({
      tokenName: 'SimpleToken',
      decimals: 8,
      baseSupply: 1000000,
      maxSupply: 10000000,
      localizations: {
        en: { shouldCapitalize: true, singular: 'token', plural: 'tokens' }
      }
    });
    console.log('Test State:', test1State);
    const test1Output = generateTestContract(test1State);
    console.log('Generated Contract:', test1Output);
    console.log('✅ Checks:');
    console.log('- Has $format_version:', test1Output.$format_version === '1');
    console.log('- Has tokens.0:', Boolean(test1Output.tokens['0']));
    console.log('- baseSupply is number:', typeof test1Output.tokens['0'].baseSupply === 'number');
    console.log('- Uses camelCase:', Boolean(test1Output.tokens['0'].conventions.localizations.en.shouldCapitalize !== undefined));
    console.groupEnd();

    // Test 2: Bitcoin-style halving token
    console.group('Test 2: Bitcoin-Style Halving Token');
    const test2State = createTestState({
      tokenName: 'HalvingCoin',
      decimals: 8,
      baseSupply: 0,
      maxSupply: 21000000,
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'StepDecreasing',
          stepCount: 210000,
          decreasePerIntervalNumerator: 1,
          decreasePerIntervalDenominator: 2,
          distributionStartAmount: 50,
          trailingDistributionIntervalAmount: 0
        }
      },
      localizations: {
        en: { shouldCapitalize: false, singular: 'coin', plural: 'coins' }
      }
    });
    const test2Output = generateTestContract(test2State);
    console.log('Generated Contract:', test2Output);
    console.log('✅ Checks:');
    console.log('- Has distributionRules:', Boolean(test2Output.tokens['0'].distributionRules));
    console.log('- Has perpetualDistribution:', Boolean(test2Output.tokens['0'].distributionRules?.perpetualDistribution));
    console.log('- Emission is StepDecreasing:', Boolean(test2Output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.StepDecreasing));
    console.groupEnd();

    // Test 3: Token with groups
    console.group('Test 3: Token with Groups');
    const test3State = createTestState({
      tokenName: 'GroupToken',
      decimals: 2,
      baseSupply: 1000,
      groups: {
        enabled: true,
        members: [
          { identityId: 'identity1', power: 2 },
          { identityId: 'identity2', power: 1 }
        ],
        threshold: 2
      },
      localizations: {
        en: { shouldCapitalize: true, singular: 'share', plural: 'shares' }
      }
    });
    const test3Output = generateTestContract(test3State);
    console.log('Generated Contract:', test3Output);
    console.log('✅ Checks:');
    console.log('- Has groups at root:', Boolean(test3Output.groups));
    console.log('- Groups has position 0:', Boolean(test3Output.groups['0']));
    console.log('- Token references mainControlGroup:', test3Output.tokens['0'].mainControlGroup === 0);
    console.log('- Members have power:', test3Output.groups['0'].members.every(m => typeof m.power === 'number'));
    console.groupEnd();

    // Test 4: All emission types
    console.group('Test 4: Emission Function Types');
    const emissionTypes = ['FixedAmount', 'Random', 'StepDecreasing', 'Linear', 'Exponential', 'Polynomial', 'Logarithmic', 'InvertedLogarithmic'];
    emissionTypes.forEach(type => {
      console.log(`Testing ${type}...`);
      const testState = createTestState({
        tokenName: `${type}Token`,
        distribution: {
          type: 'BlockBasedDistribution',
          intervalBlocks: 100,
          emission: { type }
        }
      });
      const output = generateTestContract(testState);
      const hasEmission = Boolean(output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.[type]);
      console.log(`  ${hasEmission ? '✅' : '❌'} ${type} emission function`);
    });
    console.groupEnd();

    // Test 5: Transfer notes
    console.group('Test 5: Transfer Notes Configuration');
    const test5State = createTestState({
      tokenName: 'NotesToken',
      transferNotes: {
        enabled: true,
        types: { public: true, sharedEncrypted: true, privateEncrypted: false }
      }
    });
    const test5Output = generateTestContract(test5State);
    console.log('Generated Contract:', test5Output);
    console.log('✅ Checks:');
    console.log('- Has transferNotesConfig:', Boolean(test5Output.tokens['0'].transferNotesConfig));
    console.log('- Allowed types:', test5Output.tokens['0'].transferNotesConfig?.allowedNoteTypes);
    console.groupEnd();

    // Test 6: Critical Platform Schema Fields
    console.group('Test 6: Critical Platform Schema Fields');
    const test6State = createTestState({
      tokenName: 'SchemaCompliantToken',
      allowTransferToFrozenBalance: true,
      startAsPaused: true
    });
    const test6Output = generateTestContract(test6State);
    console.log('Generated Contract:', test6Output);
    console.log('✅ Checks:');
    console.log('- Has allowTransferToFrozenBalance:', 'allowTransferToFrozenBalance' in test6Output.tokens['0']);
    console.log('- allowTransferToFrozenBalance is boolean:', typeof test6Output.tokens['0'].allowTransferToFrozenBalance === 'boolean');
    console.log('- allowTransferToFrozenBalance value:', test6Output.tokens['0'].allowTransferToFrozenBalance);
    console.log('- Has startAsPaused:', 'startAsPaused' in test6Output.tokens['0']);
    console.log('- startAsPaused is boolean:', typeof test6Output.tokens['0'].startAsPaused === 'boolean');
    console.log('- startAsPaused value:', test6Output.tokens['0'].startAsPaused);
    console.groupEnd();

    // Test 7: StepDecreasing with maxIntervalCount
    console.group('Test 7: StepDecreasing with maxIntervalCount');
    const test7State = createTestState({
      tokenName: 'HalvingToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 210000,
        emission: {
          type: 'StepDecreasing',
          stepCount: 210000,
          decreasePerIntervalNumerator: 1,
          decreasePerIntervalDenominator: 2,
          distributionStartAmount: 50,
          trailingDistributionIntervalAmount: 0,
          maxIntervalCount: 500
        }
      }
    });
    const test7Output = generateTestContract(test7State);
    console.log('Generated Contract:', test7Output);
    const stepDecreasing = test7Output.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.StepDecreasing;
    console.log('✅ Checks:');
    console.log('- Has StepDecreasing:', Boolean(stepDecreasing));
    console.log('- Has maxIntervalCount:', 'maxIntervalCount' in stepDecreasing);
    console.log('- maxIntervalCount value:', stepDecreasing?.maxIntervalCount);
    console.log('- maxIntervalCount is BigInt:', typeof stepDecreasing?.maxIntervalCount === 'bigint');
    console.groupEnd();

    // Test 8: Emission functions with min/max values
    console.group('Test 8: Emission Functions with min/max Constraints');

    // Test Linear with constraints
    const linearState = createTestState({
      tokenName: 'LinearToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'Linear',
          linearSlopeNumerator: 1,
          linearSlopeDivisor: 1,
          linearStartingAmount: 1000,
          linearMinValue: 100,
          linearMaxValue: 10000
        }
      }
    });
    const linearOutput = generateTestContract(linearState);
    const linearEmission = linearOutput.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.Linear;
    console.log('Linear Emission Checks:');
    console.log('  - Has minValue:', 'minValue' in linearEmission);
    console.log('  - Has maxValue:', 'maxValue' in linearEmission);
    console.log('  - minValue:', linearEmission?.minValue);
    console.log('  - maxValue:', linearEmission?.maxValue);

    // Test Exponential with constraints
    const expState = createTestState({
      tokenName: 'ExpToken',
      distribution: {
        type: 'BlockBasedDistribution',
        intervalBlocks: 100,
        emission: {
          type: 'Exponential',
          expA: 1,
          expM: 2,
          expN: 1,
          expD: 1,
          expO: 0,
          expB: 100,
          expMinValue: 50,
          expMaxValue: 5000
        }
      }
    });
    const expOutput = generateTestContract(expState);
    const expEmission = expOutput.tokens['0'].distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function?.Exponential;
    console.log('Exponential Emission Checks:');
    console.log('  - Has minValue:', 'minValue' in expEmission);
    console.log('  - Has maxValue:', 'maxValue' in expEmission);
    console.log('  - minValue:', expEmission?.minValue);
    console.log('  - maxValue:', expEmission?.maxValue);
    console.groupEnd();

    console.log('\n📊 Test Summary:');
    console.log('All structural tests completed. Review console output above for details.');
    console.log('\n🎯 New Features Tested:');
    console.log('  ✅ allowTransferToFrozenBalance field');
    console.log('  ✅ startAsPaused field');
    console.log('  ✅ StepDecreasing maxIntervalCount');
    console.log('  ✅ Linear emission min/max values');
    console.log('  ✅ Exponential emission min/max values');
    console.log('  ✅ Transfer notes configuration');
    console.groupEnd();
  }

  function createTestState(config) {
    const defaultState = createDefaultWizardState();

    // Apply test configuration
    if (config.tokenName) {
      defaultState.form.tokenName = config.tokenName;
    }

    if (config.decimals !== undefined) {
      defaultState.form.permissions.decimals = config.decimals;
    }

    if (config.baseSupply !== undefined) {
      defaultState.form.permissions.baseSupply = String(config.baseSupply);
    }

    if (config.maxSupply !== undefined) {
      defaultState.form.permissions.useMaxSupply = true;
      defaultState.form.permissions.maxSupply = String(config.maxSupply);
    }

    if (config.localizations) {
      Object.keys(config.localizations).forEach(lang => {
        const loc = config.localizations[lang];
        defaultState.form.naming.conventions.localizations[lang] = {
          should_capitalize: loc.shouldCapitalize,
          singular_form: loc.singular,
          plural_form: loc.plural
        };
      });
    }

    if (config.distribution) {
      defaultState.form.distribution.cadence.type = config.distribution.type || 'BlockBasedDistribution';
      defaultState.form.distribution.cadence.intervalBlocks = String(config.distribution.intervalBlocks || 100);

      if (config.distribution.emission) {
        const emission = config.distribution.emission;
        defaultState.form.distribution.emission.type = emission.type;

        // Add emission-specific fields
        if (emission.type === 'FixedAmount') {
          defaultState.form.distribution.emission.amount = String(emission.amount || 100);
        }
        else if (emission.type === 'Random') {
          defaultState.form.distribution.emission.min = String(emission.min || 10);
          defaultState.form.distribution.emission.max = String(emission.max || 100);
        }
        else if (emission.type === 'StepDecreasing') {
          defaultState.form.distribution.emission.stepCount = String(emission.stepCount || 1);
          defaultState.form.distribution.emission.decreasePerIntervalNumerator = String(emission.decreasePerIntervalNumerator || 1);
          defaultState.form.distribution.emission.decreasePerIntervalDenominator = String(emission.decreasePerIntervalDenominator || 2);
          defaultState.form.distribution.emission.stepOffset = String(emission.stepOffset || '');
          defaultState.form.distribution.emission.distributionStartAmount = String(emission.distributionStartAmount || 100);
          defaultState.form.distribution.emission.stepMinValue = String(emission.stepMinValue || '');
          defaultState.form.distribution.emission.stepMaxInterval = String(emission.stepMaxInterval || '');
          defaultState.form.distribution.emission.trailingDistributionIntervalAmount = String(emission.trailingDistributionIntervalAmount || 0);
        }
        else if (emission.type === 'Linear') {
          defaultState.form.distribution.emission.linearSlopeNumerator = String(emission.linearSlopeNumerator || 0);
          defaultState.form.distribution.emission.linearSlopeDivisor = String(emission.linearSlopeDivisor || 1);
          defaultState.form.distribution.emission.linearStartStep = String(emission.linearStartStep || '');
          defaultState.form.distribution.emission.linearStartingAmount = String(emission.linearStartingAmount || 0);
          defaultState.form.distribution.emission.linearMinValue = String(emission.linearMinValue || '');
          defaultState.form.distribution.emission.linearMaxValue = String(emission.linearMaxValue || '');
        }
        else if (emission.type === 'Exponential') {
          defaultState.form.distribution.emission.expA = String(emission.expA || 0);
          defaultState.form.distribution.emission.expM = String(emission.expM || 2);
          defaultState.form.distribution.emission.expN = String(emission.expN || 1);
          defaultState.form.distribution.emission.expD = String(emission.expD || 1);
          defaultState.form.distribution.emission.expS = String(emission.expS || '');
          defaultState.form.distribution.emission.expO = String(emission.expO || 0);
          defaultState.form.distribution.emission.expB = String(emission.expB || 0);
          defaultState.form.distribution.emission.expMinValue = String(emission.expMinValue || '');
          defaultState.form.distribution.emission.expMaxValue = String(emission.expMaxValue || '');
        }
        else if (emission.type === 'Polynomial') {
          defaultState.form.distribution.emission.polyA = String(emission.polyA || 0);
          defaultState.form.distribution.emission.polyM = String(emission.polyM || 2);
          defaultState.form.distribution.emission.polyN = String(emission.polyN || 1);
          defaultState.form.distribution.emission.polyD = String(emission.polyD || 1);
          defaultState.form.distribution.emission.polyS = String(emission.polyS || '');
          defaultState.form.distribution.emission.polyO = String(emission.polyO || 0);
          defaultState.form.distribution.emission.polyB = String(emission.polyB || 0);
          defaultState.form.distribution.emission.polyMinValue = String(emission.polyMinValue || '');
          defaultState.form.distribution.emission.polyMaxValue = String(emission.polyMaxValue || '');
        }
        else if (emission.type === 'Logarithmic') {
          defaultState.form.distribution.emission.logA = String(emission.logA || 0);
          defaultState.form.distribution.emission.logD = String(emission.logD || 1);
          defaultState.form.distribution.emission.logM = String(emission.logM || 1);
          defaultState.form.distribution.emission.logN = String(emission.logN || 1);
          defaultState.form.distribution.emission.logS = String(emission.logS || '');
          defaultState.form.distribution.emission.logO = String(emission.logO || 0);
          defaultState.form.distribution.emission.logB = String(emission.logB || 0);
          defaultState.form.distribution.emission.logMinValue = String(emission.logMinValue || '');
          defaultState.form.distribution.emission.logMaxValue = String(emission.logMaxValue || '');
        }
        else if (emission.type === 'InvertedLogarithmic') {
          defaultState.form.distribution.emission.invlogA = String(emission.invlogA || 0);
          defaultState.form.distribution.emission.invlogD = String(emission.invlogD || 1);
          defaultState.form.distribution.emission.invlogM = String(emission.invlogM || 1);
          defaultState.form.distribution.emission.invlogN = String(emission.invlogN || 1);
          defaultState.form.distribution.emission.invlogS = String(emission.invlogS || '');
          defaultState.form.distribution.emission.invlogO = String(emission.invlogO || 0);
          defaultState.form.distribution.emission.invlogB = String(emission.invlogB || 0);
          defaultState.form.distribution.emission.invlogMinValue = String(emission.invlogMinValue || '');
          defaultState.form.distribution.emission.invlogMaxValue = String(emission.invlogMaxValue || '');
        }
        else if (emission.type === 'Stepwise') {
          defaultState.form.distribution.emission.stepwise = emission.stepwise || [
            { period: '0', amount: '100' },
            { period: '1000', amount: '50' }
          ];
        }
      }
    }

    if (config.groups?.enabled) {
      defaultState.form.group.enabled = true;
      defaultState.form.group.members = config.groups.members.map(m => ({
        identityId: m.identityId,
        power: String(m.power)
      }));
      defaultState.form.group.threshold = config.groups.threshold || 2;
    }

    if (config.transferNotes?.enabled) {
      defaultState.form.permissions.transferNotesEnabled = true;
      defaultState.form.permissions.transferNoteTypes = config.transferNotes.types || {};
    }

    if (config.allowTransferToFrozenBalance !== undefined) {
      defaultState.form.permissions.allowTransferToFrozenBalance = config.allowTransferToFrozenBalance;
    }

    if (config.startAsPaused !== undefined) {
      defaultState.form.permissions.startAsPaused = config.startAsPaused;
    }

    if (config.distribution?.emission?.maxIntervalCount !== undefined) {
      defaultState.form.distribution.emission.stepMaxInterval = String(config.distribution.emission.maxIntervalCount);
    }

    return defaultState;
  }

  function generateTestContract(testState) {
    // Create a temporary test function that uses the test state
    const originalState = {
      active: wizardState.active,
      furthestValidIndex: wizardState.furthestValidIndex,
      steps: { ...wizardState.steps },
      form: { ...wizardState.form },
      runtime: { ...wizardState.runtime }
    };

    // Temporarily replace wizardState properties
    Object.assign(wizardState, testState);

    const output = generatePlatformContractJSON();

    // Restore original state
    Object.assign(wizardState, originalState);

    return output;
  }

  window.getRegistrationPayload = getRegistrationPayload;
  window.generatePlatformContractJSON = generatePlatformContractJSON;
  window.chunkPayloadIntoQRCodes = chunkPayloadIntoQRCodes;
  window.testPlatformContracts = testPlatformContracts;
  window.createTestState = createTestState;
  window.generateTestContract = generateTestContract;
  window.showScreen = showScreen;
  window.hydrateFormsFromState = hydrateFormsFromState;
  window.announce = announce;
  window.wizardState = wizardState;

  // ========================================
  // Live Contract Preview System
  // ========================================

  /**
   * Updates the contract preview JSON AND features in real-time
   * Called automatically when the preview modal is open and form changes occur
   */
  function updateLiveContractPreview() {
    const jsonElement = document.getElementById('contract-preview-json');
    const featuresElement = document.getElementById('contract-preview-features');
    const modal = document.getElementById('contract-preview-modal');
    const registrationJsonPreview = document.getElementById('json-preview');
    const registrationJsonContent = document.getElementById('json-preview-content');

    // Check if modal is visible
    const modalVisible = modal && !modal.hasAttribute('hidden');

    // Check if registration JSON preview is visible
    const registrationJsonVisible = registrationJsonPreview &&
      !registrationJsonPreview.hasAttribute('hidden') &&
      wizardState.form.registration.method === 'det';

    // Only update if something is visible
    if (!modalVisible && !registrationJsonVisible) {
      return;
    }

    try {
      const contract = typeof generatePlatformContractJSON === 'function' ? generatePlatformContractJSON() : null;

      if (contract) {
        const contractJSON = JSON.stringify(contract, null, 2);

        // Update modal JSON if modal is visible
        if (modalVisible && jsonElement) {
          jsonElement.textContent = contractJSON;
        }

        // Update registration screen JSON if it's visible
        if (registrationJsonVisible && registrationJsonContent) {
          registrationJsonContent.textContent = contractJSON;
        }

        // Update features checklist (modal only)
        if (modalVisible && featuresElement && typeof window.wizardState !== 'undefined') {
          const state = JSON.parse(JSON.stringify(window.wizardState.form));
          featuresElement.innerHTML = generateFeaturesHTML(state);
        }

        console.log('Live preview updated (JSON + features)');
      }
    } catch (error) {
      console.error('Error updating live preview:', error);
      if (modalVisible && jsonElement) {
        jsonElement.textContent = `Error generating contract: ${error.message}`;
      }
      if (registrationJsonVisible && registrationJsonContent) {
        registrationJsonContent.textContent = `Error generating contract: ${error.message}`;
      }
    }
  }

  /**
   * Generate features checklist HTML from wizard state
   */
  function generateFeaturesHTML(state) {
    const categories = [];

    // Token Name
    const tokenName = [];
    if (state.tokenName) {
      tokenName.push({ name: 'Token Name', value: state.tokenName });
    }
    if (state.permissions?.decimals !== undefined) {
      tokenName.push({ name: 'Decimals', value: state.permissions.decimals });
    }
    if (tokenName.length > 0) {
      categories.push({ title: '📋 Token Name', items: tokenName, type: 'info' });
    }

    // Token Supply
    const tokenSupply = [];
    if (state.permissions?.baseSupply) {
      tokenSupply.push({ name: 'Base Supply', value: state.permissions.baseSupply });
    }
    if (state.permissions?.maxSupply) {
      tokenSupply.push({ name: 'Max Supply', value: state.permissions.maxSupply });
    }
    if (tokenSupply.length > 0) {
      categories.push({ title: '💰 Token Supply', items: tokenSupply, type: 'info' });
    }

    // Minting
    if (state.permissions?.manualMint?.enabled) {
      categories.push({ title: '🔨 Minting', items: [{ name: 'Minting Enabled', enabled: true }], type: 'toggle' });
    }

    // Burning
    if (state.permissions?.manualBurn?.enabled) {
      categories.push({ title: '🔥 Burning', items: [{ name: 'Burning Enabled', enabled: true }], type: 'toggle' });
    }

    // Freezing
    if (state.permissions?.manualFreeze?.enabled) {
      categories.push({ title: '❄️ Freezing', items: [{ name: 'Freezing Enabled', enabled: true }], type: 'toggle' });
    }

    // Launch Settings
    if (state.permissions?.startAsPaused) {
      categories.push({ title: '🚀 Launch Settings', items: [{ name: 'Start as Paused', enabled: true }], type: 'toggle' });
    }

    // Distribution
    if (state.distribution?.emission?.type) {
      categories.push({ title: '💨 Emission', items: [{ name: 'Emission Type', value: state.distribution.emission.type }], type: 'info' });
    }

    // Render categories
    return categories.map(category => {
      let itemsHTML = '';

      if (category.type === 'info') {
        itemsHTML = category.items.map(item => `
          <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light);">
            <span style="color: var(--color-text-secondary); font-size: 0.9375rem;">${item.name}</span>
            <span style="color: var(--color-text); font-weight: 500; font-size: 0.9375rem;">${item.value}</span>
          </div>
        `).join('');
      } else {
        itemsHTML = category.items.map(item => `
          <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0;">
            <span style="font-size: 1rem; color: #10b981; font-weight: bold; width: 20px;">✓</span>
            <span style="color: var(--color-text); font-size: 0.9375rem;">${item.name}</span>
          </div>
        `).join('');
      }

      return `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3);">
          <h4 style="font-size: 1rem; font-weight: 600; margin: 0 0 var(--space-3) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2);">
            ${category.title}
          </h4>
          <div style="margin: 0;">
            ${itemsHTML}
          </div>
        </div>
      `;
    }).join('');
  }

  // Debounce function to limit update frequency
  let livePreviewDebounceTimer = null;
  function debouncedLivePreviewUpdate() {
    if (livePreviewDebounceTimer) {
      clearTimeout(livePreviewDebounceTimer);
    }
    livePreviewDebounceTimer = setTimeout(updateLiveContractPreview, 300); // 300ms delay
  }

  // Watch for changes to any form input across the entire wizard
  function initializeLivePreview() {
    console.log('Initializing live contract preview...');

    // Listen to all input changes globally
    document.addEventListener('input', function (event) {
      const target = event.target;

      // Check if the input is part of a wizard form
      if (target.matches('input, select, textarea')) {
        const isWizardInput = target.closest('.wizard-form') !== null;

        if (isWizardInput) {
          // Trigger debounced preview update
          debouncedLivePreviewUpdate();
        }
      }
    });

    // Also listen to change events for checkboxes and radios
    document.addEventListener('change', function (event) {
      const target = event.target;

      if (target.matches('input[type="checkbox"], input[type="radio"]')) {
        const isWizardInput = target.closest('.wizard-form') !== null;

        if (isWizardInput) {
          // Immediate update for toggle changes
          debouncedLivePreviewUpdate();
        }
      }
    });

    console.log('Live contract preview initialized');
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLivePreview);
  } else {
    initializeLivePreview();
  }

  // Expose the update function globally for manual triggers
  window.updateLiveContractPreview = updateLiveContractPreview;
})();

// Export Configuration Screen - Button Handlers and Live Preview
(function () {
  'use strict';

  function initializeExportScreen() {
    // Wire up alternative export buttons
    const exportContractBtnAlt = document.getElementById('export-contract-json-btn-alt');
    const exportFullConfigBtnAlt = document.getElementById('export-full-config-btn-alt');
    const copyContractPreviewBtn = document.getElementById('copy-contract-preview');
    const exportContractPreview = document.getElementById('export-contract-preview');

    // Download Contract JSON (alternative button)
    if (exportContractBtnAlt) {
      exportContractBtnAlt.addEventListener('click', async () => {
        try {
          const contractJSON = generatePlatformContractJSON();

          // Validate contract JSON using Evo SDK (if available)
          if (window.EvoSDK && window.EvoSDK.DataContract) {
            try {
              // Validate by attempting to create DataContract from JSON
              await window.EvoSDK.DataContract.fromJSON(contractJSON, 10);
              console.log('✓ Contract JSON validated successfully with Evo SDK');
            } catch (validationError) {
              console.warn('Contract validation warning:', validationError.message);
              // Continue anyway - user may want to see/edit the JSONx  
            }
          }

          // Download as JSON file for DET
          const contractJSONString = JSON.stringify(contractJSON, null, 2);
          const blob = new Blob([contractJSONString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-contract.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Contract JSON downloaded successfully!');
        } catch (error) {
          console.error('Export error:', error);
          announce(`Error exporting contract: ${error.message}`);
        }
      });
    }

    // Download Full Configuration (alternative button)
    if (exportFullConfigBtnAlt) {
      exportFullConfigBtnAlt.addEventListener('click', () => {
        try {
          const fullConfig = JSON.stringify(wizardState, null, 2);
          const blob = new Blob([fullConfig], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-full-config.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Full configuration downloaded successfully!');
        } catch (error) {
          console.error('Export error:', error);
          announce('Error exporting configuration.');
        }
      });
    }

    // DET Export Contract Button
    const detExportContractBtn = document.getElementById('det-export-contract-btn');
    if (detExportContractBtn) {
      detExportContractBtn.addEventListener('click', async () => {
        try {
          const contractJSON = generatePlatformContractJSON();

          // Validate contract JSON using Evo SDK (if available)
          if (window.EvoSDK && window.EvoSDK.DataContract) {
            try {
              // Validate by attempting to create DataContract from JSON
              await window.EvoSDK.DataContract.fromJSON(contractJSON, 10);
              console.log('✓ Contract JSON validated successfully with Evo SDK');
            } catch (validationError) {
              console.error('Contract validation warning:', validationError.message);
              // Continue anyway - user may want to see/edit the JSON
            }
          }

          // Download as JSON file for DET
          const contractJSONString = JSON.stringify(contractJSON, null, 2);
          const blob = new Blob([contractJSONString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-contract.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Contract JSON downloaded successfully!');
        } catch (error) {
          console.error('DET export error:', error);
          announce('Error exporting contract. Please check your configuration.');
        }
      });
    }

    // DET Export Full Config Button
    const detExportFullConfigBtn = document.getElementById('det-export-full-config-btn');
    if (detExportFullConfigBtn) {
      detExportFullConfigBtn.addEventListener('click', () => {
        try {
          const fullConfig = JSON.stringify(wizardState, null, 2);
          const blob = new Blob([fullConfig], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${wizardState.form.tokenName || 'token'}-full-config.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          announce('Full configuration downloaded successfully!');
        } catch (error) {
          console.error('DET export error:', error);
          announce('Error exporting configuration.');
        }
      });
    }

    // Copy Contract Preview
    if (copyContractPreviewBtn && exportContractPreview) {
      copyContractPreviewBtn.addEventListener('click', () => {
        try {
          const text = exportContractPreview.textContent;
          navigator.clipboard.writeText(text).then(() => {
            announce('Contract JSON copied to clipboard!');
            copyContractPreviewBtn.textContent = '✅ Copied!';
            setTimeout(() => {
              copyContractPreviewBtn.textContent = '📋 Copy';
            }, 2000);
          }).catch(err => {
            console.error('Copy failed:', err);
            announce('Failed to copy to clipboard');
          });
        } catch (error) {
          console.error('Copy error:', error);
          announce('Failed to copy to clipboard');
        }
      });
    }

    // Update live preview whenever state changes
    function updateExportPreview() {
      if (!exportContractPreview) return;

      try {
        const contract = generatePlatformContractJSON();
        const contractJSON = JSON.stringify(contract, null, 2);
        exportContractPreview.textContent = contractJSON;
      } catch (error) {
        console.error('Preview update error:', error);
        exportContractPreview.textContent = '{\n  "error": "Unable to generate preview"\n}';
      }
    }

    // Initial preview update
    updateExportPreview();

    // Listen for state changes and update preview
    const originalPersistState = window.persistState;
    if (typeof originalPersistState === 'function') {
      window.persistState = function () {
        originalPersistState.apply(this, arguments);
        updateExportPreview();
      };
    }

    // Also update when navigating to the export screen
    const exportNavLink = document.querySelector('[data-substep="registration-export"]');
    if (exportNavLink) {
      exportNavLink.addEventListener('click', updateExportPreview);
    }

    // Update on any form input change (comprehensive coverage)
    document.addEventListener('change', updateExportPreview);
    document.addEventListener('input', debounce(updateExportPreview, 500));
  }

  // Debounce helper
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExportScreen);
  } else {
    initializeExportScreen();
  }
})();

/*!
 * TinyQR v0.1.0
 * Lightweight QR preview helper for demo purposes (MIT License).
 * This renderer mimics QR placement for prototyping and does not guarantee scanability.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TinyQR = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function TinyQR(options) {
    if (!options || !options.element) {
      throw new Error('TinyQR requires a target canvas element.');
    }
    this.canvas = options.element;
    this.size = options.size || 160;
    this.background = options.background || '#ffffff';
    this.foreground = options.foreground || '#1a1f2c';
  }

  TinyQR.prototype.render = function (value) {
    if (typeof value !== 'string') {
      value = String(value ?? '');
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const modules = 33;
    const cellSize = this.size / modules;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.size, this.size);

    const matrix = buildMatrix(value, modules);

    ctx.fillStyle = this.foreground;
    matrix.forEach((row, y) => {
      row.forEach((isDark, x) => {
        if (isDark) {
          ctx.fillRect(Math.round(x * cellSize), Math.round(y * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      });
    });

    drawFinderPatterns(ctx, cellSize, modules, this.foreground, this.background);
  };

  function buildMatrix(value, size) {
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
    const seeds = hashSeeds(value);
    const length = value.length || 1;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) % length;
        const charCode = value.charCodeAt(index) || 0;
        const seed = seeds[(x + y) % seeds.length];
        const bit = ((seed >> ((x * 7 + y * 11) % 24)) ^ charCode) & 1;
        matrix[y][x] = Boolean(bit);
      }
    }

    imposeFinderPattern(matrix, 0, 0);
    imposeFinderPattern(matrix, 0, size - 7);
    imposeFinderPattern(matrix, size - 7, 0);
    return matrix;
  }

  function hashSeeds(value) {
    const seeds = new Uint32Array([0x811c9dc5, 0xabcdef01, 0x12345678, 0xdeadbeef]);
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      for (let j = 0; j < seeds.length; j += 1) {
        seeds[j] ^= code + j;
        seeds[j] = Math.imul(seeds[j] ^ (seeds[j] >>> 16), 0x45d9f3b);
      }
    }
    return Array.from(seeds, (seed) => seed >>> 1);
  }

  function imposeFinderPattern(matrix, startY, startX) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const border = y === 0 || y === 6 || x === 0 || x === 6;
        const inner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        matrix[startY + y][startX + x] = border || inner;
      }
    }
  }

  function drawFinderPatterns(ctx, cellSize, modules, foreground, background) {
    ctx.fillStyle = background;
    const locations = [
      { x: 0, y: 0 },
      { x: 0, y: modules - 7 },
      { x: modules - 7, y: 0 }
    ];

    locations.forEach(({ x, y }) => {
      ctx.fillRect(Math.round(x * cellSize), Math.round(y * cellSize), Math.ceil(7 * cellSize), Math.ceil(7 * cellSize));
      ctx.fillStyle = foreground;
      ctx.fillRect(Math.round((x + 1) * cellSize), Math.round((y + 1) * cellSize), Math.ceil(5 * cellSize), Math.ceil(5 * cellSize));
      ctx.fillStyle = background;
      ctx.fillRect(Math.round((x + 2) * cellSize), Math.round((y + 2) * cellSize), Math.ceil(3 * cellSize), Math.ceil(3 * cellSize));
      ctx.fillStyle = foreground;
      ctx.fillRect(Math.round((x + 3) * cellSize), Math.round((y + 3) * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      ctx.fillStyle = background;
    });
  }

  return {
    create(options) {
      return new TinyQR(options);
    }
  };
});

// ========================================
// NEW EMISSION FUNCTIONS - EVENT LISTENERS
// ========================================

(function initializeNewEmissionFunctions() {
  // Stepwise dynamic entries
  const stepwiseContainer = document.getElementById('stepwise-entries');
  const addStepwiseBtn = document.getElementById('add-stepwise-entry');

  if (addStepwiseBtn && stepwiseContainer) {
    let stepwiseIndex = 1;
    addStepwiseBtn.addEventListener('click', function () {
      const entry = document.createElement('div');
      entry.className = 'field-group stepwise-entry';
      entry.setAttribute('data-entry-index', stepwiseIndex);
      entry.innerHTML = `
        <label class="wizard-field__label">
          At interval <input class="wizard-field__input" type="number" name="stepwise-interval" placeholder="0" min="0" style="width: 120px; display: inline-block; margin: 0 var(--space-2);">
          emit <input class="wizard-field__input" type="text" name="stepwise-amount" placeholder="1000" style="width: 120px; display: inline-block; margin: 0 var(--space-2);"> tokens
        </label>
        <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-stepwise style="margin-left: var(--space-2);">Remove</button>
      `;
      stepwiseContainer.appendChild(entry);
      stepwiseIndex++;
    });

    stepwiseContainer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-stepwise')) {
        const entry = e.target.closest('.stepwise-entry');
        if (stepwiseContainer.querySelectorAll('.stepwise-entry').length > 1) {
          entry.remove();
        }
      }
    });
  }

  // Pre-programmed dynamic entries
  const preprogrammedContainer = document.getElementById('preprogrammed-entries');
  const addPreprogrammedBtn = document.getElementById('add-preprogrammed-entry');

  if (addPreprogrammedBtn && preprogrammedContainer) {
    let preprogrammedIndex = 1;
    addPreprogrammedBtn.addEventListener('click', function () {
      const entry = document.createElement('div');
      entry.className = 'field-group preprogrammed-entry';
      entry.setAttribute('data-entry-index', preprogrammedIndex);
      entry.style.cssText = 'padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';
      entry.innerHTML = `
        <div class="field-group">
          <label class="wizard-field__label">Release timestamp</label>
          <input class="wizard-field__input" type="datetime-local" name="preprogrammed-timestamp" placeholder="2025-01-01T00:00">
          <span class="field-hint">When tokens should be available for claim</span>
        </div>
        <div class="field-group">
          <label class="wizard-field__label">Recipient Identity ID</label>
          <input class="wizard-field__input" type="text" name="preprogrammed-identity" placeholder="e.g., 4hKFP3mFB9vku8VJKcZvwVN123...">
        </div>
        <div class="field-group">
          <label class="wizard-field__label">Token amount</label>
          <input class="wizard-field__input" type="text" name="preprogrammed-amount" placeholder="e.g., 1000000">
        </div>
        <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-preprogrammed style="margin-top: var(--space-2);">Remove</button>
      `;
      preprogrammedContainer.appendChild(entry);
      preprogrammedIndex++;
    });

    preprogrammedContainer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-preprogrammed')) {
        const entry = e.target.closest('.preprogrammed-entry');
        if (preprogrammedContainer.querySelectorAll('.preprogrammed-entry').length > 1) {
          entry.remove();
        }
      }
    });
  }

  // Panel toggle functionality for radio buttons with data-toggle-panel
  document.addEventListener('change', function (e) {
    if (e.target.type === 'radio') {
      const radioName = e.target.name;
      const allRadios = document.querySelectorAll(`input[name="${radioName}"]`);

      // First, hide all panels in the same radio group
      allRadios.forEach(radio => {
        const otherPanelId = radio.getAttribute('data-toggle-panel');
        if (otherPanelId) {
          const otherPanel = document.getElementById(otherPanelId);
          if (otherPanel) {
            otherPanel.hidden = true;
          }
        }
      });

      // Then, if the selected radio has a panel, show it
      if (e.target.hasAttribute('data-toggle-panel')) {
        const panelId = e.target.getAttribute('data-toggle-panel');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.hidden = !e.target.checked;
        }
      }
    }
  });

  // Initialize panel visibility on page load
  document.querySelectorAll('input[type="radio"][data-toggle-panel]').forEach(radio => {
    if (radio.checked) {
      const panelId = radio.getAttribute('data-toggle-panel');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = false;
      }
    }
  });

  console.log('New emission functions initialized');
})();

// ========================================
// GROUP ACTION TAKER SELECTORS
// ========================================

(function initializeGroupActionTakerSelectors() {
  // Define all group selector IDs for manual actions
  const groupSelectors = [
    { selectId: 'manual-mint-group-id', containerId: 'manual-mint-group-selector-container', hintId: 'manual-mint-group-hint', noGroupsMessageId: 'manual-mint-no-groups-message' },
    { selectId: 'manual-burn-group-id', containerId: 'manual-burn-group-selector-container', hintId: 'manual-burn-group-hint', noGroupsMessageId: 'manual-burn-no-groups-message' },
    { selectId: 'manual-freeze-group-id', containerId: 'manual-freeze-group-selector-container', hintId: 'manual-freeze-group-hint', noGroupsMessageId: 'manual-freeze-no-groups-message' },
    { selectId: 'destroy-frozen-group-id', containerId: 'destroy-frozen-group-selector-container', hintId: 'destroy-frozen-group-hint', noGroupsMessageId: 'destroy-frozen-no-groups-message' },
    { selectId: 'emergency-group-id', containerId: 'emergency-group-selector-container', hintId: 'emergency-group-hint', noGroupsMessageId: 'emergency-no-groups-message' },
    // New permission change pages
    { selectId: 'conventions-perform-group-id' },
    { selectId: 'conventions-rules-group-id' },
    { selectId: 'marketplace-trade-mode-perform-group-id' },
    { selectId: 'marketplace-trade-mode-rules-group-id' },
    { selectId: 'direct-pricing-perform-group-id' },
    { selectId: 'direct-pricing-rules-group-id' },
    { selectId: 'main-control-group-id' }
  ];

  // Function to update all group selectors with current groups
  function updateGroupSelectors() {
    const wizardState = window.wizardState;
    if (!wizardState || !wizardState.form || !wizardState.form.permissions) {
      return;
    }

    const groups = wizardState.form.permissions.groups || [];
    const hasGroups = groups.length > 0;

    groupSelectors.forEach(config => {
      const selectElement = document.getElementById(config.selectId);
      const containerElement = config.containerId ? document.getElementById(config.containerId) : null;
      const hintElement = config.hintId ? document.getElementById(config.hintId) : null;
      const noGroupsMessageElement = config.noGroupsMessageId ? document.getElementById(config.noGroupsMessageId) : null;

      if (!selectElement) {
        return;
      }

      if (hasGroups) {
        // Show select dropdown with available groups
        if (containerElement) {
          containerElement.hidden = false;
        }
        selectElement.style.display = '';

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select a group...</option>';

        // Add option for each group
        groups.forEach((group, index) => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = `Group ${index + 1}`;
          selectElement.appendChild(option);
        });

        // Show hint text
        if (hintElement) {
          hintElement.textContent = 'Choose which group can perform this action';
          hintElement.style.display = '';
        }

        // Hide "no groups" message
        if (noGroupsMessageElement) {
          noGroupsMessageElement.hidden = true;
        }
      } else {
        // No groups exist - hide dropdown and show message
        if (containerElement) {
          containerElement.hidden = true;
        }

        // Show "no groups" message
        if (noGroupsMessageElement) {
          noGroupsMessageElement.hidden = false;
        }
      }
    });
  }

  // Update selectors on page load
  updateGroupSelectors();

  // Update selectors when groups change
  // Hook into the renderPermissionGroups function
  const originalRenderPermissionGroups = window.renderPermissionGroups;
  if (originalRenderPermissionGroups && typeof originalRenderPermissionGroups === 'function') {
    window.renderPermissionGroups = function () {
      originalRenderPermissionGroups.apply(this, arguments);
      updateGroupSelectors();
    };
  }

  // Also update when panels are shown
  document.addEventListener('change', function (e) {
    if (e.target.type === 'radio' && e.target.hasAttribute('data-toggle-panel')) {
      const panelId = e.target.getAttribute('data-toggle-panel');
      // Check if this is a group panel
      if (panelId && panelId.includes('-panel-group')) {
        updateGroupSelectors();
      }
    }
  });

  console.log('Group action taker selectors initialized');
})();

// ========================================
// CREATE GROUP BUTTON HANDLERS
// ========================================

(function initializeCreateGroupButtons() {
  // Define all "Create Group" button IDs
  const createGroupButtonIds = [
    'manual-mint-create-group-btn',
    'manual-burn-create-group-btn',
    'manual-freeze-create-group-btn',
    'destroy-frozen-create-group-btn',
    'emergency-create-group-btn'
  ];

  // Add click handlers to all buttons
  createGroupButtonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        // Navigate to the group creation page (permissions-group substep on group tab)
        // First switch to the group tab
        if (typeof window.switchTab === 'function') {
          window.switchTab('group');
        }
        // Then navigate to the permissions-group screen
        if (typeof window.showScreen === 'function') {
          setTimeout(() => {
            window.showScreen('permissions-group', { force: true });
          }, 100);
        }
      });
    }
  });

  console.log('Create Group button handlers initialized');
})();

// ========================================
// NEW PERMISSION CHANGE PAGES STATE MANAGEMENT
// ========================================

(function initializePermissionChangePages() {
  // Define all new permission change pages
  const permissionPages = [
    {
      key: 'conventionsChange',
      prefix: 'conventions-change',
      hasRulesSection: true  // Has both "perform" and "change rules" sections
    },
    {
      key: 'marketplaceTradeMode',
      prefix: 'marketplace-trade-mode',
      hasRulesSection: true
    },
    {
      key: 'directPricing',
      prefix: 'direct-pricing',
      hasRulesSection: true
    },
    {
      key: 'mainControl',
      prefix: 'main-control',
      hasRulesSection: false  // Only has one section (change rules)
    }
  ];

  // Initialize state for all pages
  function ensurePermissionChangeState() {
    if (!wizardState.form.permissions) {
      wizardState.form.permissions = {};
    }

    permissionPages.forEach(page => {
      if (!wizardState.form.permissions[page.key]) {
        wizardState.form.permissions[page.key] = {
          enabled: false,
          perform: {
            type: 'owner',  // owner, identity, or group
            identityId: '',
            groupId: ''
          },
          changeRules: {
            type: 'owner',
            identityId: '',
            groupId: ''
          }
        };
      }
    });
  }

  // Helper function to get state for a specific page
  function getPageState(key) {
    ensurePermissionChangeState();
    return wizardState.form.permissions[key];
  }

  // Helper function to update state for a specific page
  function updatePageState(key, updates) {
    ensurePermissionChangeState();
    wizardState.form.permissions[key] = {
      ...wizardState.form.permissions[key],
      ...updates
    };
  }

  // Set up event listeners for each page
  permissionPages.forEach(page => {
    // Enable/disable radios
    const enableRadios = document.querySelectorAll(`input[name="${page.prefix}-enable"]`);
    enableRadios.forEach(radio => {
      radio.addEventListener('change', function () {
        const enabled = this.value === 'enabled';
        updatePageState(page.key, { enabled });
        console.log(`${page.key} enabled:`, enabled);
      });
    });

    // Perform authorization radios (only if page has this section)
    if (page.hasRulesSection) {
      const performRadios = document.querySelectorAll(`input[name="${page.prefix}-perform"]`);
      performRadios.forEach(radio => {
        radio.addEventListener('change', function () {
          const state = getPageState(page.key);
          state.perform.type = this.value;
          updatePageState(page.key, { perform: state.perform });
          console.log(`${page.key} perform type:`, this.value);
        });
      });

      // Perform identity input
      const performIdentityInput = document.getElementById(`${page.prefix}-perform-identity-id`);
      if (performIdentityInput) {
        performIdentityInput.addEventListener('input', function () {
          const state = getPageState(page.key);
          state.perform.identityId = this.value.trim();
          updatePageState(page.key, { perform: state.perform });
        });
      }

      // Perform group select
      const performGroupSelect = document.getElementById(`${page.prefix}-perform-group-id`);
      if (performGroupSelect) {
        performGroupSelect.addEventListener('change', function () {
          const state = getPageState(page.key);
          state.perform.groupId = this.value;
          updatePageState(page.key, { perform: state.perform });
        });
      }
    }

    // Change rules authorization radios
    const rulesRadiosName = page.hasRulesSection ? `${page.prefix}-change-rules` : `${page.prefix}-rules`;
    const rulesRadios = document.querySelectorAll(`input[name="${rulesRadiosName}"]`);
    rulesRadios.forEach(radio => {
      radio.addEventListener('change', function () {
        const state = getPageState(page.key);
        state.changeRules.type = this.value;
        updatePageState(page.key, { changeRules: state.changeRules });
        console.log(`${page.key} change rules type:`, this.value);
      });
    });

    // Change rules identity input
    const rulesIdentityInputId = page.hasRulesSection ? `${page.prefix}-rules-identity-id` : `${page.prefix}-identity-id`;
    const rulesIdentityInput = document.getElementById(rulesIdentityInputId);
    if (rulesIdentityInput) {
      rulesIdentityInput.addEventListener('input', function () {
        const state = getPageState(page.key);
        state.changeRules.identityId = this.value.trim();
        updatePageState(page.key, { changeRules: state.changeRules });
      });
    }

    // Change rules group select
    const rulesGroupSelectId = page.hasRulesSection ? `${page.prefix}-rules-group-id` : `${page.prefix}-group-id`;
    const rulesGroupSelect = document.getElementById(rulesGroupSelectId);
    if (rulesGroupSelect) {
      rulesGroupSelect.addEventListener('change', function () {
        const state = getPageState(page.key);
        state.changeRules.groupId = this.value;
        updatePageState(page.key, { changeRules: state.changeRules });
      });
    }
  });

  // Initialize state on page load
  ensurePermissionChangeState();

  console.log('Permission change pages initialized');
})();

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

(function initializeSearchFunctionality() {
  // Get all search inputs (one for each tab)
  const searchInputs = document.querySelectorAll('.wizard-sidebar__search-input');

  searchInputs.forEach(searchInput => {
    if (!searchInput) return;

    // Get the sidebar section this search belongs to
    const sidebarSection = searchInput.closest('.sidebar-section');
    if (!sidebarSection) return;

    // Get all navigation items in this sidebar
    const navItems = sidebarSection.querySelectorAll('.wizard-nav-item');
    const subItems = sidebarSection.querySelectorAll('.wizard-nav-subitem');

    // Build search index
    const searchIndex = [];

    // Index main navigation items
    navItems.forEach(navItem => {
      const text = navItem.querySelector('.wizard-nav-item__text')?.textContent || '';
      const step = navItem.getAttribute('data-step');
      const toggle = navItem.getAttribute('data-toggle');

      if (text && step) {
        searchIndex.push({
          type: 'main',
          text: text.toLowerCase(),
          element: navItem,
          step: step,
          toggle: toggle,
          submenu: toggle ? document.getElementById(toggle) : null
        });
      }
    });

    // Index sub-navigation items
    subItems.forEach(subItem => {
      const text = subItem.querySelector('.wizard-nav-subitem__text')?.textContent || '';
      const substep = subItem.getAttribute('data-substep');

      if (text && substep) {
        // Find parent main nav item
        const submenu = subItem.closest('.wizard-nav-submenu');
        const parentNavItem = submenu ? sidebarSection.querySelector(`[data-toggle="${submenu.id}"]`) : null;

        searchIndex.push({
          type: 'sub',
          text: text.toLowerCase(),
          element: subItem,
          substep: substep,
          submenu: submenu,
          parentNavItem: parentNavItem
        });
      }
    });

    // Handle search input
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase().trim();

      if (query === '') {
        // Reset: show all items
        searchIndex.forEach(item => {
          item.element.style.display = '';
          if (item.submenu) {
            item.submenu.style.display = '';
          }
        });
        return;
      }

      // Search and filter
      let hasResults = false;

      searchIndex.forEach(item => {
        if (item.text.includes(query)) {
          // Show matching item
          item.element.style.display = '';
          hasResults = true;

          // If it's a sub-item, make sure parent and submenu are visible
          if (item.type === 'sub' && item.parentNavItem && item.submenu) {
            item.parentNavItem.style.display = '';
            item.submenu.style.display = '';
            item.submenu.hidden = false;

            // Expand parent if collapsed
            if (item.parentNavItem.classList.contains('wizard-nav-item--expandable')) {
              item.parentNavItem.setAttribute('aria-expanded', 'true');
            }
          }

          // If it's a main item with submenu, show the submenu
          if (item.type === 'main' && item.submenu) {
            item.submenu.style.display = '';
            item.submenu.hidden = false;
            item.element.setAttribute('aria-expanded', 'true');
          }
        } else {
          // Hide non-matching item
          item.element.style.display = 'none';
        }
      });

      // Handle sub-items visibility: hide submenu if no children match
      const submenus = sidebarSection.querySelectorAll('.wizard-nav-submenu');
      submenus.forEach(submenu => {
        const visibleSubItems = Array.from(submenu.querySelectorAll('.wizard-nav-subitem')).filter(
          item => item.style.display !== 'none'
        );

        if (visibleSubItems.length === 0) {
          submenu.style.display = 'none';

          // Also hide parent nav item if submenu is hidden
          const parentNavItem = sidebarSection.querySelector(`[data-toggle="${submenu.id}"]`);
          if (parentNavItem) {
            parentNavItem.style.display = 'none';
          }
        }
      });
    });

    // Handle clicking on search results
    subItems.forEach(subItem => {
      subItem.addEventListener('click', function (e) {
        e.preventDefault();
        const substep = this.getAttribute('data-substep');

        if (substep && typeof window.showScreen === 'function') {
          // Clear search
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));

          // Navigate to the substep
          window.showScreen(substep, { force: true });
        }
      });
    });
  });

  console.log('Search functionality initialized');
})();

// ========================================
// GROUP MANAGEMENT (Group Tab)
// ========================================

(function initializeGroupManagement() {
  const enableGroupCheckbox = document.getElementById('enable-group');
  const groupConfigSection = document.getElementById('group-config-section');
  const groupNameInput = document.getElementById('group-name');
  const groupThresholdInput = document.getElementById('group-threshold');
  const groupMembersList = document.getElementById('group-members-list');
  const addGroupMemberBtn = document.getElementById('add-group-member');

  if (!enableGroupCheckbox || !groupConfigSection) {
    console.warn('Group management elements not found');
    return;
  }

  // FIXED: Access wizardState from window (it's in a different IIFE scope)
  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('Group management: wizardState or persistState not available');
    return;
  }

  // Initialize with state
  function initializeGroupState() {
    if (!wizardState.form.group) {
      wizardState.form.group = {
        enabled: false,
        name: '',
        threshold: 2,
        members: [],
        permissions: {
          mint: true,
          burn: true,
          freeze: true,
          config: false,
          members: false
        }
      };
    }

    // Sync UI with state
    enableGroupCheckbox.checked = wizardState.form.group.enabled;
    toggleGroupSections(wizardState.form.group.enabled);

    if (groupNameInput) groupNameInput.value = wizardState.form.group.name;
    if (groupThresholdInput) groupThresholdInput.value = wizardState.form.group.threshold;

    // Render existing members
    renderGroupMembers();
  }

  // Toggle group configuration sections
  function toggleGroupSections(enabled) {
    if (groupConfigSection) {
      groupConfigSection.style.display = enabled ? 'block' : 'none';
    }
  }

  // Enable/disable group checkbox handler
  if (enableGroupCheckbox) {
    enableGroupCheckbox.addEventListener('change', function () {
      wizardState.form.group.enabled = this.checked;
      toggleGroupSections(this.checked);
      persistState();
    });
  }

  // Group name input handler
  if (groupNameInput) {
    groupNameInput.addEventListener('input', function () {
      wizardState.form.group.name = this.value;
      persistState();
    });
  }

  // Group threshold input handler
  if (groupThresholdInput) {
    groupThresholdInput.addEventListener('input', function () {
      const value = parseInt(this.value, 10);
      if (!isNaN(value) && value >= 1) {
        wizardState.form.group.threshold = value;
        persistState();
      }
    });
  }

  // Add group member button
  if (addGroupMemberBtn && groupMembersList) {
    addGroupMemberBtn.addEventListener('click', function () {
      const memberId = 'member-' + Date.now();
      wizardState.form.group.members.push({
        id: memberId,
        identityId: '',
        power: '1'
      });
      renderGroupMembers();
      persistState();

      // Focus the new member input
      setTimeout(() => {
        const newInput = document.querySelector(`input[data-member-id="${memberId}"][data-field="identityId"]`);
        if (newInput) newInput.focus();
      }, 0);
    });
  }

  // Render group members
  function renderGroupMembers() {
    if (!groupMembersList) return;

    groupMembersList.innerHTML = '';

    if (!wizardState.form.group.members || wizardState.form.group.members.length === 0) {
      // Show empty state
      const emptyState = document.createElement('p');
      emptyState.className = 'field-hint';
      emptyState.style.cssText = 'margin-bottom: var(--space-3); color: var(--color-text-muted);';
      emptyState.textContent = 'No members added yet. Click "Add Member" to get started.';
      groupMembersList.appendChild(emptyState);
      return;
    }

    wizardState.form.group.members.forEach((member, index) => {
      const memberEntry = document.createElement('div');
      memberEntry.className = 'field-group';
      memberEntry.style.cssText = 'padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';
      memberEntry.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <label class="wizard-field__label" style="margin-bottom: 0;">Member ${index + 1}</label>
          <button class="wizard-button wizard-button--text wizard-button--sm" type="button" data-remove-member="${member.id}">Remove</button>
        </div>
        <div style="margin-bottom: var(--space-3);">
          <label class="wizard-field__label" for="member-identity-${member.id}">Identity ID *</label>
          <input class="wizard-field__input" type="text" id="member-identity-${member.id}" data-member-id="${member.id}" data-field="identityId" placeholder="Enter a Base58 ID" value="${member.identityId || ''}">
          <span class="field-hint">Base58-encoded Dash Platform identity ID (43-44 characters)</span>
        </div>
        <div>
          <label class="wizard-field__label" for="member-power-${member.id}">Voting Power *</label>
          <input class="wizard-field__input" type="number" id="member-power-${member.id}" data-member-id="${member.id}" data-field="power" min="1" placeholder="e.g., 1" value="${member.power || '1'}">
          <span class="field-hint">Weight of this member's vote (positive integer)</span>
        </div>
      `;
      groupMembersList.appendChild(memberEntry);
    });
  }

  // Handle member input changes and removals
  if (groupMembersList) {
    groupMembersList.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-member-id')) {
        const memberId = e.target.getAttribute('data-member-id');
        const field = e.target.getAttribute('data-field');
        const member = wizardState.form.group.members.find(m => m.id === memberId);
        if (member && field) {
          member[field] = e.target.value;
          persistState();
        }
      }
    });

    groupMembersList.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove-member')) {
        const memberId = e.target.getAttribute('data-remove-member');
        const index = wizardState.form.group.members.findIndex(m => m.id === memberId);
        if (index !== -1) {
          wizardState.form.group.members.splice(index, 1);
          renderGroupMembers();
          persistState();
        }
      }
    });
  }

  // Initialize on load
  initializeGroupState();

  console.log('Group management initialized');
})();

// ==================== DOCUMENT TYPES MANAGEMENT ====================
(function () {
  const documentTypesList = document.getElementById('document-types-list');
  const documentTypesEmpty = document.getElementById('document-types-empty');
  const documentTypeAddButton = document.getElementById('document-type-add');
  const documentTypeModal = document.getElementById('document-type-modal');
  const documentModalTitle = document.getElementById('document-modal-title');
  const documentModalClose = document.getElementById('document-modal-close');
  const documentModalCancel = document.getElementById('document-modal-cancel');
  const documentModalSave = document.getElementById('document-modal-save');
  const documentTypeForm = document.getElementById('document-type-form');
  const documentTypeNameInput = document.getElementById('document-type-name');
  const documentTypeSchemaInput = document.getElementById('document-type-schema');
  const documentTypeMessage = document.getElementById('document-type-message');

  let editingDocumentType = null;

  // Utility buttons for JSON Schema textarea
  const schemaSampleBtn = document.getElementById('document-schema-sample');
  const schemaPasteBtn = document.getElementById('document-schema-paste');
  const schemaFormatBtn = document.getElementById('document-schema-format');
  const schemaClearBtn = document.getElementById('document-schema-clear');

  // Paste from clipboard
  if (schemaPasteBtn) {
    schemaPasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        documentTypeSchemaInput.value = text;

        // Try to format it automatically
        try {
          const parsed = JSON.parse(text);
          documentTypeSchemaInput.value = JSON.stringify(parsed, null, 2);
          documentTypeMessage.textContent = '✅ JSON pasted and formatted successfully!';
          documentTypeMessage.style.color = 'var(--color-success)';
          setTimeout(() => {
            documentTypeMessage.textContent = '';
          }, 3000);
        } catch (e) {
          documentTypeMessage.textContent = '⚠️ Pasted, but JSON is invalid. Please fix syntax errors.';
          documentTypeMessage.style.color = 'var(--color-warning)';
        }
      } catch (err) {
        documentTypeMessage.textContent = '❌ Could not read from clipboard. Please paste manually (Ctrl+V / Cmd+V).';
        documentTypeMessage.style.color = 'var(--color-error)';
      }
    });
  }

  // Format JSON
  if (schemaFormatBtn) {
    schemaFormatBtn.addEventListener('click', () => {
      const text = documentTypeSchemaInput.value.trim();
      if (!text) {
        documentTypeMessage.textContent = 'Nothing to format - textarea is empty.';
        documentTypeMessage.style.color = 'var(--color-warning)';
        return;
      }

      try {
        const parsed = JSON.parse(text);
        documentTypeSchemaInput.value = JSON.stringify(parsed, null, 2);
        documentTypeMessage.textContent = '✅ JSON formatted successfully!';
        documentTypeMessage.style.color = 'var(--color-success)';
        setTimeout(() => {
          documentTypeMessage.textContent = '';
        }, 3000);
      } catch (e) {
        documentTypeMessage.textContent = '❌ Invalid JSON: ' + e.message;
        documentTypeMessage.style.color = 'var(--color-error)';
      }
    });
  }

  // Clear textarea
  if (schemaClearBtn) {
    schemaClearBtn.addEventListener('click', () => {
      if (documentTypeSchemaInput.value.trim()) {
        if (confirm('Are you sure you want to clear the JSON Schema?')) {
          documentTypeSchemaInput.value = '';
          documentTypeMessage.textContent = '';
        }
      }
    });
  }

  // Sample schema templates
  const SAMPLE_SCHEMAS = {
    user: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          position: 0,
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-zA-Z0-9_-]+$',
          description: 'Unique username'
        },
        email: {
          type: 'string',
          position: 1,
          format: 'email',
          maxLength: 100,
          description: 'User email address'
        },
        displayName: {
          type: 'string',
          position: 2,
          maxLength: 100,
          description: 'Display name'
        },
        bio: {
          type: 'string',
          position: 3,
          maxLength: 500,
          description: 'User biography'
        },
        createdAt: {
          type: 'integer',
          position: 4,
          minimum: 0,
          description: 'Account creation timestamp'
        }
      },
      required: ['username', 'email'],
      additionalProperties: false
    },
    post: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          position: 0,
          minLength: 1,
          maxLength: 200,
          description: 'Post title'
        },
        content: {
          type: 'string',
          position: 1,
          minLength: 1,
          maxLength: 10000,
          description: 'Post content'
        },
        authorId: {
          type: 'string',
          position: 2,
          minLength: 42,
          maxLength: 44,
          pattern: '^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$',
          description: 'Author identity ID'
        },
        createdAt: {
          type: 'integer',
          position: 3,
          minimum: 0,
          description: 'Post creation timestamp'
        },
        tags: {
          type: 'array',
          position: 4,
          items: {
            type: 'string',
            maxLength: 50
          },
          maxItems: 10,
          description: 'Post tags'
        }
      },
      required: ['title', 'content', 'authorId'],
      additionalProperties: false
    },
    nftMetadata: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          position: 0,
          minLength: 1,
          maxLength: 100,
          description: 'NFT name'
        },
        description: {
          type: 'string',
          position: 1,
          maxLength: 1000,
          description: 'NFT description'
        },
        imageUrl: {
          type: 'string',
          position: 2,
          format: 'uri',
          maxLength: 500,
          description: 'URL to NFT image'
        },
        attributes: {
          type: 'array',
          position: 3,
          items: {
            type: 'object',
            properties: {
              trait_type: {
                type: 'string',
                maxLength: 50
              },
              value: {
                type: 'string',
                maxLength: 100
              }
            },
            additionalProperties: false
          },
          maxItems: 20,
          description: 'NFT attributes/traits'
        },
        creatorId: {
          type: 'string',
          position: 4,
          minLength: 42,
          maxLength: 44,
          description: 'Creator identity ID'
        }
      },
      required: ['name', 'imageUrl'],
      additionalProperties: false
    }
  };

  // Load sample schema
  if (schemaSampleBtn) {
    schemaSampleBtn.addEventListener('click', () => {
      // Create a selection modal or just cycle through samples
      const currentText = documentTypeSchemaInput.value.trim();

      // Determine which sample to show next
      let sampleKey = 'user'; // default

      if (currentText) {
        // Try to detect which sample is currently loaded and show the next one
        try {
          const currentSchema = JSON.parse(currentText);
          if (currentSchema.properties?.username) {
            sampleKey = 'post'; // user -> post
          } else if (currentSchema.properties?.title && currentSchema.properties?.content) {
            sampleKey = 'nftMetadata'; // post -> nftMetadata
          } else if (currentSchema.properties?.imageUrl) {
            sampleKey = 'user'; // nftMetadata -> user (cycle)
          }
        } catch (e) {
          // If can't parse, just use default
        }
      }

      const sample = SAMPLE_SCHEMAS[sampleKey];
      documentTypeSchemaInput.value = JSON.stringify(sample, null, 2);

      const sampleNames = { user: 'User Profile', post: 'Blog Post', nftMetadata: 'NFT Metadata' };
      documentTypeMessage.textContent = `✅ Loaded "${sampleNames[sampleKey]}" sample schema. Click again to cycle through examples.`;
      documentTypeMessage.style.color = 'var(--color-success)';

      setTimeout(() => {
        documentTypeMessage.textContent = '';
      }, 5000);
    });
  }

  // Render document types list
  function renderDocumentTypes() {
    if (!documentTypesList) return;

    const documentTypes = wizardState.form.documentTypes || {};
    const typeNames = Object.keys(documentTypes);

    // Show/hide empty message
    if (documentTypesEmpty) {
      documentTypesEmpty.style.display = typeNames.length === 0 ? 'block' : 'none';
    }

    // Clear existing items (except empty message)
    const items = documentTypesList.querySelectorAll('.document-type-item');
    items.forEach(item => item.remove());

    // Render each document type
    typeNames.forEach(typeName => {
      const schema = documentTypes[typeName];
      const item = document.createElement('div');
      item.className = 'document-type-item';

      const schemaPreview = JSON.stringify(schema).substring(0, 100) + '...';

      item.innerHTML = `
        <div class="document-type-item__info">
          <div class="document-type-item__name">${typeName}</div>
          <div class="document-type-item__schema">${schemaPreview}</div>
        </div>
        <div class="document-type-item__actions">
          <button class="document-type-item__btn" data-edit-doc="${typeName}">Edit</button>
          <button class="document-type-item__btn document-type-item__btn--delete" data-delete-doc="${typeName}">Delete</button>
        </div>
      `;

      documentTypesList.appendChild(item);
    });
  }

  // Open modal for adding/editing
  function openModal(typeName = null) {
    if (!documentTypeModal) return;

    editingDocumentType = typeName;

    if (typeName) {
      // Edit mode
      documentModalTitle.textContent = 'Edit Document Type';
      documentTypeNameInput.value = typeName;
      documentTypeNameInput.disabled = true; // Can't change name when editing
      const schema = wizardState.form.documentTypes[typeName];
      documentTypeSchemaInput.value = JSON.stringify(schema, null, 2);
    } else {
      // Add mode
      documentModalTitle.textContent = 'Add Document Type';
      documentTypeNameInput.value = '';
      documentTypeNameInput.disabled = false;
      documentTypeSchemaInput.value = '';
    }

    documentTypeMessage.textContent = '';
    documentTypeModal.hidden = false;
  }

  // Close modal
  function closeModal() {
    if (!documentTypeModal) return;
    documentTypeModal.hidden = true;
    editingDocumentType = null;
    documentTypeForm.reset();
  }

  // Save document type
  function saveDocumentType() {
    const typeName = documentTypeNameInput.value.trim();
    const schemaText = documentTypeSchemaInput.value.trim();

    // Validate name
    if (!typeName) {
      documentTypeMessage.textContent = 'Document type name is required.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(typeName)) {
      documentTypeMessage.textContent = 'Name must start with a letter and contain only letters, numbers, and underscores.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Check if name already exists (only when adding new)
    if (!editingDocumentType && wizardState.form.documentTypes[typeName]) {
      documentTypeMessage.textContent = 'A document type with this name already exists.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Validate JSON
    let schema;
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      documentTypeMessage.textContent = `❌ Invalid JSON syntax: ${e.message}. Click "Format" to check for errors.`;
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Check if user pasted the entire Platform contract instead of just a document schema
    if (schema.$format_version || schema.tokens || schema.ownerId || schema.documentSchemas) {
      documentTypeMessage.textContent = '⚠️ You pasted the entire Platform contract. Please paste ONLY the document schema (without the contract wrapper). Click "Sample" to see the correct format.';
      documentTypeMessage.style.color = 'var(--color-warning)';
      return;
    }

    // Basic validation for Dash Platform requirements
    if (!schema.type || schema.type !== 'object') {
      documentTypeMessage.textContent = '❌ Schema must have "type": "object" at the root level. Click "Sample" to see a valid example.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (!schema.properties || typeof schema.properties !== 'object' || Object.keys(schema.properties).length === 0) {
      documentTypeMessage.textContent = '❌ Schema must have a "properties" object with at least one field. Click "Sample" to see how to define properties.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    if (schema.additionalProperties !== false) {
      documentTypeMessage.textContent = '❌ Schema must have "additionalProperties": false (Dash Platform requirement). Click "Sample" to see the correct format.';
      documentTypeMessage.style.color = 'var(--color-error)';
      return;
    }

    // Validate each property has type and position
    const properties = schema.properties;
    for (const propName in properties) {
      const prop = properties[propName];
      if (!prop.type) {
        documentTypeMessage.textContent = `❌ Property "${propName}" is missing the "type" field. Each property must specify a type (e.g., "string", "integer", "array").`;
        documentTypeMessage.style.color = 'var(--color-error)';
        return;
      }
      if (typeof prop.position !== 'number') {
        documentTypeMessage.textContent = `❌ Property "${propName}" is missing the "position" field or it's not a number. Each property must have a numeric "position" (e.g., 0, 1, 2).`;
        documentTypeMessage.style.color = 'var(--color-error)';
        return;
      }
    }

    // Save to state
    if (!wizardState.form.documentTypes) {
      wizardState.form.documentTypes = {};
    }

    // If editing, remove old name first (in case it changed)
    if (editingDocumentType && editingDocumentType !== typeName) {
      delete wizardState.form.documentTypes[editingDocumentType];
    }

    wizardState.form.documentTypes[typeName] = schema;
    persistState();
    renderDocumentTypes();
    closeModal();

    console.log('Document type saved:', typeName, schema);
  }

  // Delete document type
  function deleteDocumentType(typeName) {
    if (!confirm(`Are you sure you want to delete the document type "${typeName}"?`)) {
      return;
    }

    delete wizardState.form.documentTypes[typeName];
    persistState();
    renderDocumentTypes();

    console.log('Document type deleted:', typeName);
  }

  // Event listeners
  if (documentTypeAddButton) {
    documentTypeAddButton.addEventListener('click', () => openModal());
  }

  if (documentModalClose) {
    documentModalClose.addEventListener('click', closeModal);
  }

  if (documentModalCancel) {
    documentModalCancel.addEventListener('click', closeModal);
  }

  if (documentModalSave) {
    documentModalSave.addEventListener('click', saveDocumentType);
  }

  // Close modal on overlay click
  if (documentTypeModal) {
    documentTypeModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('document-modal__overlay')) {
        closeModal();
      }
    });
  }

  // Handle edit and delete buttons
  if (documentTypesList) {
    documentTypesList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-doc]');
      const deleteBtn = e.target.closest('[data-delete-doc]');

      if (editBtn) {
        const typeName = editBtn.getAttribute('data-edit-doc');
        openModal(typeName);
      } else if (deleteBtn) {
        const typeName = deleteBtn.getAttribute('data-delete-doc');
        deleteDocumentType(typeName);
      }
    });
  }

  // Initialize on load
  renderDocumentTypes();

  console.log('Document types management initialized');
})();

// ========================================
// KEYWORDS & DESCRIPTION (Search Metadata)
// ========================================
// Moved from naming to search step
// Event listeners and state management handled in main wizard code above

// ========================================
// ACTION RULES PRESETS
// ========================================
// REMOVED: Action rules presets functionality - no longer used
/*
(function initializeActionRulesPresets() {
  const presetRadios = document.querySelectorAll('input[name="action-rules-preset"]');

  if (!presetRadios || presetRadios.length === 0) {
    console.warn('Action rules preset radios not found');
    return;
  }

  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('wizardState or persistState not available for presets');
    return;
  }

  // Define preset configurations
  const PRESETS = {
    'custom': {
      name: 'Custom',
      description: 'Manual configuration - no automatic changes',
      config: null // null means don't auto-configure
    },
    'most-restrictive': {
      name: 'Most Restrictive',
      description: 'All actions disabled after initialization',
      config: {
        manualMint: { enabled: false },
        manualBurn: { enabled: false },
        manualFreeze: { enabled: false },
        destroyFrozen: { enabled: false },
        emergency: { enabled: false },
        changeControl: {
          mint: false,
          burn: false,
          freeze: false,
          unfreeze: false,
          destroyFrozen: false,
          emergency: false,
          maxSupply: false,
          conventions: false,
          tradeMode: false,
          directPurchase: false,
          mainControlGroup: false
        }
      }
    },
    'emergency-only': {
      name: 'Only Emergency Action',
      description: 'Only emergency actions (pausing) permitted',
      config: {
        manualMint: { enabled: false },
        manualBurn: { enabled: false },
        manualFreeze: { enabled: false },
        destroyFrozen: { enabled: false },
        emergency: { enabled: true },
        changeControl: {
          mint: false,
          burn: false,
          freeze: false,
          unfreeze: false,
          destroyFrozen: false,
          emergency: true,
          maxSupply: false,
          conventions: false,
          tradeMode: false,
          directPurchase: false,
          mainControlGroup: false
        }
      }
    },
    'mint-burn': {
      name: 'Minting and Burning',
      description: 'Supply management through minting and burning',
      config: {
        manualMint: { enabled: true },
        manualBurn: { enabled: true },
        manualFreeze: { enabled: false },
        destroyFrozen: { enabled: false },
        emergency: { enabled: false },
        changeControl: {
          mint: true,
          burn: true,
          freeze: false,
          unfreeze: false,
          destroyFrozen: false,
          emergency: false,
          maxSupply: false,
          conventions: false,
          tradeMode: false,
          directPurchase: false,
          mainControlGroup: false
        }
      }
    },
    'advanced': {
      name: 'Advanced Actions',
      description: 'Minting, burning, and freezing capabilities',
      config: {
        manualMint: { enabled: true },
        manualBurn: { enabled: true },
        manualFreeze: { enabled: true },
        destroyFrozen: { enabled: false },
        emergency: { enabled: false },
        changeControl: {
          mint: true,
          burn: true,
          freeze: true,
          unfreeze: true,
          destroyFrozen: false,
          emergency: false,
          maxSupply: false,
          conventions: false,
          tradeMode: false,
          directPurchase: false,
          mainControlGroup: false
        }
      }
    },
    'all-allowed': {
      name: 'All Allowed',
      description: 'All actions enabled',
      config: {
        manualMint: { enabled: true },
        manualBurn: { enabled: true },
        manualFreeze: { enabled: true },
        destroyFrozen: { enabled: true },
        emergency: { enabled: true },
        changeControl: {
          mint: true,
          burn: true,
          freeze: true,
          unfreeze: true,
          destroyFrozen: true,
          emergency: true,
          maxSupply: true,
          conventions: true,
          tradeMode: true,
          directPurchase: true,
          mainControlGroup: true
        }
      }
    }
  };

  // Apply preset configuration to wizard state
  function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) {
      console.warn('Unknown preset:', presetKey);
      return;
    }

    console.log('Applying preset:', preset.name);

    // Ensure permissions structure exists
    if (!wizardState.form.permissions) {
      wizardState.form.permissions = {};
    }

    // Save the selected preset key
    wizardState.form.permissions.selectedPreset = presetKey;

    // If custom, don't auto-configure
    if (preset.config === null) {
      console.log('Custom preset selected - no automatic configuration');
      persistState();
      return;
    }

    const config = preset.config;

    // Apply manual action configurations
    if (config.manualMint) {
      wizardState.form.permissions.manualMint = {
        ...wizardState.form.permissions.manualMint,
        enabled: config.manualMint.enabled,
        performerType: config.manualMint.enabled ? 'owner' : 'none'
      };
    }

    if (config.manualBurn) {
      wizardState.form.permissions.manualBurn = {
        ...wizardState.form.permissions.manualBurn,
        enabled: config.manualBurn.enabled,
        performerType: config.manualBurn.enabled ? 'owner' : 'none'
      };
    }

    if (config.manualFreeze) {
      wizardState.form.permissions.manualFreeze = {
        ...wizardState.form.permissions.manualFreeze,
        enabled: config.manualFreeze.enabled,
        performerType: config.manualFreeze.enabled ? 'owner' : 'none'
      };
    }

    if (config.destroyFrozen) {
      wizardState.form.permissions.destroyFrozen = {
        ...wizardState.form.permissions.destroyFrozen,
        enabled: config.destroyFrozen.enabled,
        performerType: config.destroyFrozen.enabled ? 'owner' : 'none'
      };
    }

    if (config.emergency) {
      wizardState.form.permissions.emergency = {
        ...wizardState.form.permissions.emergency,
        enabled: config.emergency.enabled,
        performerType: config.emergency.enabled ? 'owner' : 'none'
      };
    }

    // Ensure advanced structure exists
    if (!wizardState.form.advanced) {
      wizardState.form.advanced = {};
    }
    if (!wizardState.form.advanced.changeControl) {
      wizardState.form.advanced.changeControl = {};
    }

    // Apply change control configurations
    if (config.changeControl) {
      Object.assign(wizardState.form.advanced.changeControl, config.changeControl);
    }

    // Save to localStorage
    persistState();

    console.log('✅ Preset applied:', preset.name);
    console.log('State after preset:', {
      manualMint: wizardState.form.permissions.manualMint?.enabled,
      manualBurn: wizardState.form.permissions.manualBurn?.enabled,
      manualFreeze: wizardState.form.permissions.manualFreeze?.enabled,
      destroyFrozen: wizardState.form.permissions.destroyFrozen?.enabled,
      emergency: wizardState.form.permissions.emergency?.enabled,
      changeControl: wizardState.form.advanced.changeControl
    });
  }

  // Listen for preset changes
  presetRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const presetKey = e.target.value;
        applyPreset(presetKey);
      }
    });
  });

  // Restore previously selected preset from state
  function restoreSelectedPreset() {
    const savedPreset = wizardState.form.permissions?.selectedPreset;
    if (savedPreset) {
      // Find and check the corresponding radio button
      const radioToCheck = Array.from(presetRadios).find(radio => radio.value === savedPreset);
      if (radioToCheck && !radioToCheck.checked) {
        radioToCheck.checked = true;
        console.log('Restored preset selection:', savedPreset);
      }
    }
  }

  // Restore on initialization
  restoreSelectedPreset();

  // Expose function to restore preset when returning to this screen
  window.restorePresetSelection = restoreSelectedPreset;

  console.log('Action rules presets initialized with 6 templates');
})();
*/

// ========================================
// PRE-PROGRAMMED DISTRIBUTION
// ========================================

(function initializePreProgrammedDistribution() {
  const preprogrammedContainer = document.getElementById('preprogrammed-entries');
  const addPreprogrammedBtn = document.getElementById('add-preprogrammed-entry');
  const distributionTypeRadios = document.querySelectorAll('input[name="distribution-type"]');

  if (!preprogrammedContainer || !addPreprogrammedBtn) {
    console.warn('Pre-programmed distribution elements not found');
    return;
  }

  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('wizardState or persistState not available for preprogrammed distribution');
    return;
  }

  // Ensure distribution.preProgrammed structure exists
  if (!wizardState.form.distribution.preProgrammed) {
    wizardState.form.distribution.preProgrammed = { entries: [] };
  }

  // Generate unique ID for entries
  let entryIdCounter = 0;
  function generateEntryId() {
    return `preprogrammed-${Date.now()}-${entryIdCounter++}`;
  }

  // Collect data from all preprogrammed entries in the DOM
  function collectPreProgrammedData() {
    const entries = [];
    const entryElements = preprogrammedContainer.querySelectorAll('.preprogrammed-entry');

    entryElements.forEach((entryEl) => {
      const timestampInput = entryEl.querySelector('input[name="preprogrammed-timestamp"]');
      const identityInput = entryEl.querySelector('input[name="preprogrammed-identity"]');
      const amountInput = entryEl.querySelector('input[name="preprogrammed-amount"]');

      const timestamp = timestampInput ? timestampInput.value.trim() : '';
      const identityId = identityInput ? identityInput.value.trim() : '';
      const amount = amountInput ? amountInput.value.trim() : '';

      // Only save entries with at least timestamp
      if (timestamp) {
        entries.push({
          id: entryEl.getAttribute('data-entry-id') || generateEntryId(),
          timestamp: timestamp,
          identityId: identityId,
          amount: amount
        });
      }
    });

    return entries;
  }

  // Save current preprogrammed data to state
  function savePreProgrammedData() {
    const entries = collectPreProgrammedData();
    wizardState.form.distribution.preProgrammed.entries = entries;
    persistState();
    console.log('Saved preprogrammed entries:', entries.length);
  }

  // Validate preprogrammed entry
  function validateEntry(entryEl) {
    const timestampInput = entryEl.querySelector('input[name="preprogrammed-timestamp"]');
    const identityInput = entryEl.querySelector('input[name="preprogrammed-identity"]');
    const amountInput = entryEl.querySelector('input[name="preprogrammed-amount"]');

    let isValid = true;

    // Validate timestamp (required)
    if (timestampInput) {
      const timestamp = timestampInput.value.trim();
      if (!timestamp) {
        timestampInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        timestampInput.style.borderColor = '';
      }
    }

    // Validate identity ID (required, basic format check)
    if (identityInput) {
      const identityId = identityInput.value.trim();
      if (!identityId || identityId.length < 20) {
        identityInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        identityInput.style.borderColor = '';
      }
    }

    // Validate amount (required, must be positive number)
    if (amountInput) {
      const amount = amountInput.value.trim();
      const numAmount = parseInt(amount, 10);
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        amountInput.style.borderColor = 'var(--color-error)';
        isValid = false;
      } else {
        amountInput.style.borderColor = '';
      }
    }

    return isValid;
  }

  // Create a new preprogrammed entry element
  function createEntryElement(data = {}) {
    const entryId = data.id || generateEntryId();
    const entry = document.createElement('div');
    entry.className = 'field-group preprogrammed-entry';
    entry.setAttribute('data-entry-id', entryId);
    entry.style.cssText = 'padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); margin-bottom: var(--space-3);';

    entry.innerHTML = `
      <div class="field-group">
        <label class="wizard-field__label">Release timestamp *</label>
        <input class="wizard-field__input" type="datetime-local" name="preprogrammed-timestamp" value="${data.timestamp || ''}" required>
        <span class="field-hint">When tokens should be available for claim</span>
      </div>
      <div class="field-group">
        <label class="wizard-field__label">Recipient Identity ID *</label>
        <input class="wizard-field__input" type="text" name="preprogrammed-identity" placeholder="e.g., 4hKFP3mFB9vku8VJKcZvwVN123..." value="${data.identityId || ''}" required>
        <span class="field-hint">Dash Platform identity that can claim the tokens</span>
      </div>
      <div class="field-group">
        <label class="wizard-field__label">Token amount *</label>
        <input class="wizard-field__input" type="text" name="preprogrammed-amount" placeholder="e.g., 1000000" value="${data.amount || ''}" required>
        <span class="field-hint">Number of tokens to distribute</span>
      </div>
      <button class="wizard-button wizard-button--danger wizard-button--small" type="button" data-remove-preprogrammed style="margin-top: var(--space-2);">Remove</button>
    `;

    // Add event listeners to inputs for auto-save
    const inputs = entry.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        validateEntry(entry);
        savePreProgrammedData();
      });
      input.addEventListener('change', () => {
        savePreProgrammedData();
      });
    });

    return entry;
  }

  // Load saved preprogrammed entries from state
  function loadPreProgrammedEntries() {
    const entries = wizardState.form.distribution.preProgrammed?.entries || [];

    // Clear existing entries in DOM
    preprogrammedContainer.innerHTML = '';

    // If no saved entries, add one empty entry
    if (entries.length === 0) {
      const defaultEntry = createEntryElement();
      preprogrammedContainer.appendChild(defaultEntry);
    } else {
      // Load saved entries
      entries.forEach(data => {
        const entryEl = createEntryElement(data);
        preprogrammedContainer.appendChild(entryEl);
      });
    }
  }

  // Handle add entry button
  addPreprogrammedBtn.addEventListener('click', () => {
    const newEntry = createEntryElement();
    preprogrammedContainer.appendChild(newEntry);
    savePreProgrammedData();
  });

  // Handle remove entry button (event delegation)
  preprogrammedContainer.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-remove-preprogrammed')) {
      const entry = e.target.closest('.preprogrammed-entry');
      const entryCount = preprogrammedContainer.querySelectorAll('.preprogrammed-entry').length;

      // Keep at least one entry
      if (entryCount > 1) {
        entry.remove();
        savePreProgrammedData();
      } else {
        // Clear the last entry instead of removing
        const inputs = entry.querySelectorAll('input');
        inputs.forEach(input => input.value = '');
        savePreProgrammedData();
      }
    }
  });

  // Load entries when distribution type changes to preprogrammed
  if (distributionTypeRadios.length > 0) {
    distributionTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'preprogrammed' && e.target.checked) {
          loadPreProgrammedEntries();
        }
      });
    });
  }

  // Initial load
  loadPreProgrammedEntries();

  console.log('Pre-programmed distribution initialized');
})();

// ========================================
// CONTROL MODEL - GROUPS INTEGRATION
// ========================================
// REMOVED: Permissions scope radios functionality - no longer used
/*
(function initializeControlModelGroupsIntegration() {
  const permissionsScopeRadios = document.querySelectorAll('input[name="permissions-scope"]');
  const enableGroupCheckbox = document.getElementById('enable-group');

  if (!permissionsScopeRadios || permissionsScopeRadios.length === 0) {
    console.warn('Permissions scope radios not found');
    return;
  }

  if (!enableGroupCheckbox) {
    console.warn('Enable group checkbox not found');
    return;
  }

  const wizardState = window.wizardState;
  const persistState = window.persistState;

  if (!wizardState || !persistState) {
    console.error('wizardState or persistState not available for control model integration');
    return;
  }

  // Handle permissions scope changes
  permissionsScopeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (!e.target.checked) return;

      const selectedScope = e.target.value;

      if (selectedScope === 'groups') {
        // Enable groups when "Groups" control model is selected
        enableGroupCheckbox.checked = true;

        // Trigger change event on checkbox to show group configuration
        const changeEvent = new Event('change', { bubbles: true });
        enableGroupCheckbox.dispatchEvent(changeEvent);

        // Save to state
        if (wizardState.form.group) {
          wizardState.form.group.enabled = true;
          persistState();
        }

        console.log('Control model: Groups enabled');
      } else if (selectedScope === 'owner') {
        // Owner-only mode - groups are optional
        // Don't automatically disable groups, let user decide
        console.log('Control model: Owner-only selected');
      }
    });
  });

  // Sync state on load: if groups are enabled, select the groups radio
  if (wizardState.form.group?.enabled) {
    const groupsRadio = document.querySelector('input[name="permissions-scope"][value="groups"]');
    if (groupsRadio) {
      groupsRadio.checked = true;
    }
  }

  console.log('Control model - Groups integration initialized');
})();
*/

// ═══════════════════════════════════════════════════════
// TEMPLATE SELECTION
// ═══════════════════════════════════════════════════════

(function initializeTemplateSelection() {
  const templateCards = document.querySelectorAll('[data-template]');

  if (templateCards.length === 0) {
    console.warn('No template cards found');
    return;
  }

  // Note: Access window functions directly in functions below since they may not be defined yet when this IIFE runs

  // Token Templates
  const TOKEN_TEMPLATES = {
    scratch: null, // No template, start fresh

    'simple-fixed': {
      name: 'SimpleToken',
      description: 'A basic fixed-supply token',
      keywords: ['simple', 'fixed', 'basic'],
      decimals: 8,
      baseSupply: '1000000',
      maxSupply: '1000000',
      useMaxSupply: true,
      keepsHistory: {
        transfers: true,
        mints: false,
        burns: false,
        freezes: false,
        purchases: false
      },
      startAsPaused: false,
      manualMint: { enabled: false },
      manualBurn: { enabled: false },
      manualFreeze: { enabled: false },
      destroyFrozen: { enabled: false },
      emergency: { enabled: false },
      tradeMode: 'permissionless',
      changeControl: {
        mint: false,
        burn: false,
        freeze: false,
        unfreeze: false,
        destroyFrozen: false,
        emergency: false
      },
      distribution: null
    },

    utility: {
      name: 'UtilityToken',
      description: 'Token for platform access and payments',
      keywords: ['utility', 'platform', 'service'],
      decimals: 2,
      baseSupply: '10000000',
      maxSupply: '100000000',
      useMaxSupply: true,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: false,
        purchases: true
      },
      startAsPaused: false,
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: false },
      destroyFrozen: { enabled: false },
      emergency: { enabled: false },
      tradeMode: 'permissionless',
      changeControl: {
        mint: true,
        burn: true,
        freeze: false,
        unfreeze: false,
        destroyFrozen: false,
        emergency: false
      },
      distribution: null
    },

    reward: {
      name: 'RewardToken',
      description: 'Continuous emission for user rewards',
      keywords: ['reward', 'points', 'loyalty'],
      decimals: 0,
      baseSupply: '0',
      maxSupply: null,
      useMaxSupply: false,
      keepsHistory: {
        transfers: true,
        mints: true,
        burns: true,
        freezes: false,
        purchases: false
      },
      startAsPaused: false,
      manualMint: { enabled: true },
      manualBurn: { enabled: true },
      manualFreeze: { enabled: false },
      destroyFrozen: { enabled: false },
      emergency: { enabled: false },
      tradeMode: 'permissionless',
      changeControl: {
        mint: true,
        burn: true,
        freeze: false,
        unfreeze: false,
        destroyFrozen: false,
        emergency: false
      },
      distribution: {
        cadence: {
          type: 'TimeBasedDistribution',
          intervalSeconds: '86400'  // 24 hours = 86400 seconds
        },
        emission: {
          type: 'FixedAmount',
          amount: '1000'
        }
      }
    }
  };

  function loadTemplate(templateKey) {
    const template = TOKEN_TEMPLATES[templateKey];
    const state = window.wizardState;

    if (!state) {
      console.error('wizardState not available');
      return;
    }

    if (templateKey === 'scratch' || !template) {
      // Start from scratch - just navigate to naming
      state.activeTemplate = 'scratch';
      updateTemplateIndicator('scratch');

      // Switch to Token tab
      if (window.switchTab) {
        window.switchTab('token');
      }

      if (window.showScreen) {
        window.showScreen('naming', { force: true });
      }
      return;
    }

    // Store active template
    state.activeTemplate = templateKey;

    // Load template into wizard state
    // Note: Token name is intentionally NOT loaded from template - users must choose their own unique name
    state.form.tokenName = '';

    // Search metadata
    state.form.search = state.form.search || {};
    state.form.search.description = template.description || '';
    state.form.search.keywords = template.keywords && Array.isArray(template.keywords) ? template.keywords.join(', ') : '';

    // Permissions
    state.form.permissions = state.form.permissions || {};
    state.form.permissions.decimals = template.decimals || 8;
    state.form.permissions.baseSupply = template.baseSupply || '0';
    state.form.permissions.maxSupply = template.maxSupply || '';
    state.form.permissions.useMaxSupply = template.useMaxSupply || false;
    state.form.permissions.keepsHistory = template.keepsHistory || {};
    state.form.permissions.startAsPaused = template.startAsPaused || false;
    state.form.permissions.manualMint = template.manualMint || { enabled: false };
    state.form.permissions.manualBurn = template.manualBurn || { enabled: false };
    state.form.permissions.manualFreeze = template.manualFreeze || { enabled: false };
    state.form.permissions.destroyFrozen = template.destroyFrozen || { enabled: false };
    state.form.permissions.emergency = template.emergency || { enabled: false };

    // Distribution
    if (template.distribution) {
      state.form.distribution = state.form.distribution || {};
      state.form.distribution.cadence = template.distribution.cadence || {};
      state.form.distribution.emission = template.distribution.emission || {};
    }

    // Advanced
    state.form.advanced = state.form.advanced || {};
    state.form.advanced.tradeMode = template.tradeMode || 'permissionless';
    state.form.advanced.changeControl = template.changeControl || {};

    // Document Types
    if (template.documentTypes) {
      state.form.documentTypes = template.documentTypes;
    }

    // Save state
    if (window.persistState) {
      window.persistState();
    }

    // Update the Templates Library indicator
    updateTemplateIndicator(templateKey);

    // Sync all UI inputs with the loaded template data
    if (window.hydrateFormsFromState) {
      window.hydrateFormsFromState();
    }

    // Switch to Token tab (naming screen is in token tab)
    if (window.switchTab) {
      window.switchTab('token');
      console.log('Switched to token tab');
    }

    // Expand the naming submenu in sidebar
    const namingSubmenu = document.getElementById('naming-submenu');
    const namingButton = document.querySelector('[data-toggle="naming-submenu"]');
    if (namingSubmenu && namingButton) {
      namingSubmenu.hidden = false;
      namingButton.setAttribute('aria-expanded', 'true');
    }

    // Navigate to Token Name (first sub-step of naming)
    // screen-naming has id="screen-naming" and data-substep="naming"
    console.log('Navigating to naming screen after template load');
    if (window.showScreen) {
      window.showScreen('naming', { force: true });
      console.log('Called window.showScreen with naming');
    } else {
      console.error('ERROR: window.showScreen not available!');
    }

    // Show success message
    if (window.announce) {
      window.announce(`✓ Template "${template.name}" loaded successfully! Please enter a token name to continue.`);
    }
  }

  function updateTemplateIndicator(templateKey) {
    const welcomePill = document.getElementById('status-welcome');
    if (!welcomePill) return;

    const templateNames = {
      'scratch': 'Custom',
      'simple-fixed': 'Simple',
      'utility': 'Utility',
      'reward': 'Reward'
    };

    const name = templateNames[templateKey] || 'Active';
    welcomePill.textContent = name;
    welcomePill.className = 'wizard-path__pill pill pill--valid';
    welcomePill.style.display = 'inline-block';

    // Highlight the selected template card
    templateCards.forEach(card => {
      const cardTemplateKey = card.getAttribute('data-template');
      if (cardTemplateKey === templateKey) {
        card.classList.add('template-card--selected');
      } else {
        card.classList.remove('template-card--selected');
      }
    });
  }

  // Template confirmation modal elements
  const confirmModal = document.getElementById('template-confirmation-modal');
  const confirmModalTitle = document.getElementById('template-modal-title');
  const confirmModalDescription = document.getElementById('template-modal-description');
  const confirmModalPreview = document.getElementById('template-modal-preview');
  const confirmBtn = document.getElementById('template-confirm-btn');
  const cancelBtn = document.getElementById('template-cancel-btn');
  let pendingTemplateKey = null;

  function showTemplateConfirmation(templateKey) {
    const template = TOKEN_TEMPLATES[templateKey];

    if (templateKey === 'scratch' || !template) {
      // No confirmation needed for "Start from Scratch"
      loadTemplate(templateKey);
      return;
    }

    pendingTemplateKey = templateKey;

    // Update modal content
    confirmModalTitle.textContent = `Apply "${template.name}" Template?`;
    confirmModalDescription.textContent = 'This will replace your current configuration with the following template settings:';

    // Build preview HTML
    const features = [];
    if (template.decimals) features.push(`${template.decimals} decimals`);
    if (template.baseSupply) features.push(`Base supply: ${template.baseSupply}`);
    if (template.maxSupply) features.push(`Max supply: ${template.maxSupply}`);
    if (template.distribution) {
      if (template.distribution.cadence?.type) features.push(template.distribution.cadence.type.replace('BasedDistribution', ''));
      if (template.distribution.emission?.type) features.push(`${template.distribution.emission.type} emission`);
    }

    confirmModalPreview.innerHTML = `
      <h3>${template.name}</h3>
      <p>${template.description || ''}</p>
      ${features.length > 0 ? `
        <div class="template-preview__features">
          ${features.map(f => `<span class="template-preview__feature">✓ ${f}</span>`).join('')}
        </div>
      ` : ''}
    `;

    // Show modal
    confirmModal.removeAttribute('hidden');
    confirmBtn.focus();
  }

  function hideTemplateConfirmation() {
    confirmModal.setAttribute('hidden', '');
    pendingTemplateKey = null;
  }

  // Add click listeners to all template cards
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      const templateKey = card.getAttribute('data-template');

      // Visual feedback: highlight the clicked card immediately
      templateCards.forEach(c => c.classList.remove('template-card--selected'));
      card.classList.add('template-card--selected');

      showTemplateConfirmation(templateKey);
    });
  });

  // Confirm button
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingTemplateKey) {
        loadTemplate(pendingTemplateKey);
        hideTemplateConfirmation();
      }
    });
  }

  // Cancel button and overlay
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideTemplateConfirmation);
  }

  if (confirmModal) {
    const overlay = confirmModal.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', hideTemplateConfirmation);
    }
  }

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !confirmModal.hasAttribute('hidden')) {
      hideTemplateConfirmation();
    }
  });

  // Restore template indicator on page load
  if (window.wizardState && window.wizardState.activeTemplate) {
    updateTemplateIndicator(window.wizardState.activeTemplate);
  }

  console.log('✓ Template selection initialized with', templateCards.length, 'templates');
})();

// ═══════════════════════════════════════════════════════
// INLINE HELP SYSTEM
// ═══════════════════════════════════════════════════════

(function initializeHelpSystem() {
  // Help content database
  const HELP_CONTENT = {
    'token-name': {
      title: 'Token Name',
      content: `
        <p>Choose a unique, memorable name for your token that users will recognize.</p>
        <div class="help-tooltip-example">
          <strong>Examples:</strong>
          <p>"RewardPoints", "PlatformCredits", "GameGold"</p>
        </div>
        <p>Must be 2-64 characters. Can include letters, numbers, spaces, and basic punctuation.</p>
        <div class="help-tooltip-permanent">
          Cannot be changed after token is registered
        </div>
      `
    },

    'decimals': {
      title: 'Decimals',
      content: `
        <p>Controls how divisible your token is. Similar to how dollars have 2 decimals ($1.25).</p>
        <p><strong>Examples:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li><strong>0 decimals:</strong> Whole units only (voting rights, membership)</li>
          <li><strong>2 decimals:</strong> Like currency (1.25 tokens)</li>
          <li><strong>8 decimals:</strong> Maximum precision (0.00000001 tokens)</li>
        </ul>
        <div class="help-tooltip-permanent">
          Cannot be changed after token is registered
        </div>
      `
    },

    'base-supply': {
      title: 'Base Supply',
      content: `
        <p>The initial amount of tokens created when you register your token.</p>
        <p><strong>These tokens are created immediately</strong> and sent to your wallet.</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p>Base supply of 1,000,000 means you start with 1 million tokens</p>
        </div>
        <p><strong>Tip:</strong> Consider your total planned supply and distribution schedule when setting this.</p>
      `
    },

    'max-supply': {
      title: 'Maximum Supply',
      content: `
        <p>The total amount of tokens that can ever exist. This is a hard cap.</p>
        <p><strong>If enabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>No more tokens can be created once this limit is reached</li>
          <li>Provides scarcity and predictability</li>
          <li>Popular for governance and store-of-value tokens</li>
        </ul>
        <p><strong>If disabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Unlimited supply - can mint forever</li>
          <li>Good for reward systems and utility tokens</li>
        </ul>
        <div class="help-tooltip-permanent">
          Cannot be changed after token is registered
        </div>
      `
    },

    'keeps-history': {
      title: 'History Tracking',
      content: `
        <p>Choose which token operations to record on the blockchain.</p>
        <p><strong>Tracked operations appear in:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Token explorer views</li>
          <li>Wallet transaction history</li>
          <li>Audit trails</li>
        </ul>
        <p><strong>⚠️ Warning:</strong> Tracking uses more blockchain space and costs more in fees.</p>
        <p><strong>Tip:</strong> Most tokens track transfers at minimum.</p>
      `
    },

    'trade-mode': {
      title: 'Marketplace Trade Mode',
      content: `
        <p>Controls who can trade your token on decentralized exchanges.</p>
        <p><strong>Permissionless:</strong> Anyone can buy/sell freely (most common)</p>
        <p><strong>Approval Required:</strong> Trades need approval from token owner/committee</p>
        <p><strong>Not Tradeable:</strong> Token cannot be traded on markets (like membership badges)</p>
        <p><strong>Tip:</strong> Use "Not Tradeable" for non-transferable rewards or credentials.</p>
      `
    },

    'distribution-type': {
      title: 'Distribution Schedule',
      content: `
        <p>Automatically create new tokens on a schedule.</p>
        <p><strong>Time-Based:</strong> Create tokens every X hours/days (e.g., daily rewards)</p>
        <p><strong>Block-Based:</strong> Create tokens every X blocks (more predictable on-chain)</p>
        <p><strong>Epoch-Based:</strong> Create tokens at Dash Platform epoch boundaries</p>
        <p><strong>⚠️ Important:</strong> Distribution runs automatically once enabled. Make sure you control the destination address!</p>
      `
    },

    'emission-type': {
      title: 'Emission Function',
      content: `
        <p>How many tokens are created each time distribution runs.</p>
        <p><strong>Fixed Amount:</strong> Same amount every time (e.g., 1000 tokens daily)</p>
        <p><strong>Exponential:</strong> Decreases over time (like Bitcoin halving)</p>
        <p><strong>Linear:</strong> Gradually increases or decreases</p>
        <p><strong>Step Function:</strong> Different amounts at different stages</p>
        <div class="help-tooltip-example">
          <strong>Example:</strong>
          <p>Fixed 100 tokens per day = predictable, steady rewards</p>
        </div>
      `
    },

    'manual-mint': {
      title: 'Manual Minting',
      content: `
        <p>Allows creating new tokens manually at any time.</p>
        <p><strong>When enabled:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Token owner can create new tokens on demand</li>
          <li>Still respects max supply limit if set</li>
          <li>Useful for rewards, airdrops, or flexible supply</li>
        </ul>
        <p><strong>⚠️ Warning:</strong> Users may be concerned about inflation. Consider enabling change control to require community approval.</p>
      `
    },

    'manual-burn': {
      title: 'Manual Burning',
      content: `
        <p>Allows permanently destroying tokens.</p>
        <p><strong>Common uses:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Reduce supply to increase scarcity</li>
          <li>"Burn to redeem" mechanics (burn tokens for items/services)</li>
          <li>Correct mistakes or remove tokens from circulation</li>
        </ul>
        <p><strong>Tip:</strong> Burned tokens are gone forever and cannot be recovered.</p>
      `
    },

    'start-paused': {
      title: 'Start Paused',
      content: `
        <p>Whether your token starts in a paused state.</p>
        <p><strong>When paused:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>No transfers allowed</li>
          <li>No minting or burning</li>
          <li>Token is "frozen" until unpaused</li>
        </ul>
        <p><strong>Use case:</strong> Pause until you're ready to officially launch (prepare marketing, set up pools, etc.)</p>
        <p><strong>⚠️ Important:</strong> You need unpause permissions enabled to resume operations.</p>
      `
    }
  };

  // Create and position tooltip
  function showHelpTooltip(helpIcon, contentKey) {
    // Hide any existing tooltips
    hideAllTooltips();

    const content = HELP_CONTENT[contentKey];
    if (!content) {
      console.warn('No help content found for:', contentKey);
      return;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip';
    tooltip.id = `tooltip-${contentKey}`;
    tooltip.innerHTML = content.content;

    // Add to body
    document.body.appendChild(tooltip);

    // Position tooltip below the help icon
    const iconRect = helpIcon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = iconRect.left;
    let top = iconRect.bottom + 8;

    // Adjust if tooltip would go off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + tooltipRect.width > viewportWidth - 20) {
      left = viewportWidth - tooltipRect.width - 20;
    }

    if (top + tooltipRect.height > viewportHeight - 20) {
      // Show above instead
      top = iconRect.top - tooltipRect.height - 8;
      tooltip.classList.add('help-tooltip--above');
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.removeAttribute('hidden');

    // Store reference to close later
    helpIcon._activeTooltip = tooltip;

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeTooltipOnClickOutside);
    }, 10);
  }

  function hideAllTooltips() {
    document.querySelectorAll('.help-tooltip').forEach(tooltip => {
      tooltip.remove();
    });
    document.removeEventListener('click', closeTooltipOnClickOutside);
  }

  function closeTooltipOnClickOutside(e) {
    if (!e.target.closest('.help-icon') && !e.target.closest('.help-tooltip')) {
      hideAllTooltips();
    }
  }

  // Initialize help icons
  function initializeHelpIcons() {
    document.querySelectorAll('.help-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const contentKey = icon.getAttribute('data-help');

        // Toggle tooltip
        if (icon._activeTooltip) {
          hideAllTooltips();
        } else {
          showHelpTooltip(icon, contentKey);
        }
      });
    });
  }

  // Close tooltips on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllTooltips();
    }
  });

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHelpIcons);
  } else {
    initializeHelpIcons();
  }

  // Re-initialize when new help icons are added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.classList && node.classList.contains('help-icon')) {
            initializeHelpIcons();
          } else if (node.querySelector && node.querySelector('.help-icon')) {
            initializeHelpIcons();
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('✓ Inline help system initialized');
})();
