import { expect, test } from '@playwright/test';

const wizardFileUrl = new URL('../index.html', import.meta.url).href;
const STEP_IDS = ['welcome', 'naming', 'permissions', 'distribution', 'advanced', 'search', 'registration'];

/**
 * @typedef {Object} TokenConfiguration
 * @property {string} id
 * @property {string} title
 * @property {{
 *  tokenName: string;
 *  plural: string;
 *  capitalize: boolean;
 *  localizations: Record<string, { singular_form: string; plural_form: string; should_capitalize: boolean; }>;
 * }} naming
 * @property {{
 *  decimals: number;
 *  baseSupply: string;
 *  maxSupply?: string;
 *  startAsPaused: boolean;
 *  allowFrozenTransfers: boolean;
 *  keepsHistory: { transfers: boolean; mints: boolean; burns: boolean; freezes: boolean; purchases: boolean; };
 * }} permissions
 * @property {{
 *  enablePerpetual: boolean;
 *  enablePreProgrammed: boolean;
 *  cadence: Record<string, string>;
 *  emission: Record<string, string>;
 *  recipient: { type: 'contract-owner' } | { type: 'specific-identity'; identityId: string; };
 *  preProgrammedEntries?: Array<{ id: string; timestamp: string; identityId: string; amount: string; }>;
 * }} distribution
 * @property {{
 *  changeControl: { freeze: boolean; unfreeze: boolean; destroyFrozen: boolean; emergency: boolean; directPurchase: boolean; admin: boolean; };
 * }} advanced
 * @property {{ keywords: string; description: string; }} search
 * @property {{ identityId: string; privateKey: string; }} registration
 */

/** @type {TokenConfiguration[]} */
const TOKEN_FUZZ_CONFIGS = [
  {
    id: 'block-fixed',
    title: 'block cadence with fixed emission to contract owner',
    naming: {
      tokenName: 'Aurora Dash',
      plural: 'Aurora Dash Tokens',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Aurora Dash', plural_form: 'Aurora Dash Tokens', should_capitalize: true },
        es: { singular_form: 'Aurora Luz', plural_form: 'Aurora Luces', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 0,
      baseSupply: '1000000',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: false, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '25', startBlock: '0' },
      emission: { type: 'FixedAmount', amount: '1500' },
      recipient: { type: 'contract-owner' }
    },
    advanced: {
      changeControl: { freeze: true, unfreeze: true, destroyFrozen: false, emergency: false, directPurchase: false, admin: true }
    },
    search: {
      keywords: 'aurora, dash, block distribution',
      description: 'Fixed emission token that releases every 25 blocks.'
    },
    registration: {
      identityId: 'reg-block-fixed',
      privateKey: 'KxBlockFixed1111111111111111111111111111111111111'
    }
  },
  {
    id: 'time-random',
    title: 'time-based cadence with random emission',
    naming: {
      tokenName: 'Pulse Credit',
      plural: 'Pulse Credits',
      capitalize: false,
      localizations: {
        en: { singular_form: 'Pulse Credit', plural_form: 'Pulse Credits', should_capitalize: false },
        fr: { singular_form: 'Crédit Pulse', plural_form: 'Crédits Pulse', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 2,
      baseSupply: '987654',
      maxSupply: '1500000',
      startAsPaused: true,
      allowFrozenTransfers: true,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: true, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'TimeBasedDistribution', intervalSeconds: '7200', startTimestamp: '2025-01-01T00:00:00Z' },
      emission: { type: 'Random', min: '5000', max: '9000' },
      recipient: { type: 'contract-owner' }
    },
    advanced: {
      changeControl: { freeze: true, unfreeze: true, destroyFrozen: false, emergency: true, directPurchase: false, admin: true }
    },
    search: {
      keywords: 'pulse, credit, hourly, random',
      description: 'Randomized emissions every two hours once launched.'
    },
    registration: {
      identityId: 'reg-time-random',
      privateKey: 'KyTimeRandom2222222222222222222222222222222222222'
    }
  },
  {
    id: 'epoch-fixed',
    title: 'epoch cadence with larger fixed drops',
    naming: {
      tokenName: 'Epoch Yield',
      plural: 'Epoch Yields',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Epoch Yield', plural_form: 'Epoch Yields', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 8,
      baseSupply: '450000000000',
      maxSupply: '900000000000',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: false, burns: true, freezes: false, purchases: true }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'EpochBasedDistribution', epoch: 'quarterly' },
      emission: { type: 'FixedAmount', amount: '750000000' },
      recipient: { type: 'contract-owner' }
    },
    advanced: {
      changeControl: { freeze: false, unfreeze: true, destroyFrozen: false, emergency: false, directPurchase: true, admin: true }
    },
    search: {
      keywords: 'epoch, quarterly, yield, governance',
      description: 'Quarterly emission suited for treasury like drops.'
    },
    registration: {
      identityId: 'reg-epoch-fixed',
      privateKey: 'KzEpochFixed3333333333333333333333333333333333333'
    }
  },
  {
    id: 'block-none',
    title: 'no automated distribution (manual mint only)',
    naming: {
      tokenName: 'Manual Reserve',
      plural: 'Manual Reserves',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Manual Reserve', plural_form: 'Manual Reserves', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 4,
      baseSupply: '100000',
      startAsPaused: true,
      allowFrozenTransfers: true,
      keepsHistory: { transfers: false, mints: true, burns: true, freezes: true, purchases: false }
    },
    distribution: {
      enablePerpetual: false,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '12' },
      emission: { type: '' },
      recipient: { type: 'contract-owner' }
    },
    advanced: {
      changeControl: { freeze: false, unfreeze: false, destroyFrozen: false, emergency: false, directPurchase: false, admin: true }
    },
    search: {
      keywords: 'manual, reserve, no emission',
      description: 'No automatic distribution; operators mint manually as needed.'
    },
    registration: {
      identityId: 'reg-block-none',
      privateKey: 'KxBlockNone4444444444444444444444444444444444444'
    }
  },
  {
    id: 'time-fixed-identity',
    title: 'time cadence paying a specific identity',
    naming: {
      tokenName: 'Creator Share',
      plural: 'Creator Shares',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Creator Share', plural_form: 'Creator Shares', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 6,
      baseSupply: '64000000',
      maxSupply: '128000000',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: true }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'TimeBasedDistribution', intervalSeconds: '86400' },
      emission: { type: 'FixedAmount', amount: '250000' },
      recipient: {
        type: 'specific-identity',
        identityId: 'Ho1FvSJcG9wDZkX9jH4aMGfK3QeVjF7k1arJK42xP3uH'
      }
    },
    advanced: {
      changeControl: { freeze: true, unfreeze: true, destroyFrozen: true, emergency: true, directPurchase: true, admin: true }
    },
    search: {
      keywords: 'creator, share, artist payouts',
      description: 'Daily payouts to a designated identity for creator royalties.'
    },
    registration: {
      identityId: 'reg-time-fixed-identity',
      privateKey: 'KyTimeFixed5555555555555555555555555555555555555'
    }
  },
  {
    id: 'block-random-preprogram',
    title: 'block cadence with random drip plus scheduled unlock',
    naming: {
      tokenName: 'Fusion Drop',
      plural: 'Fusion Drops',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Fusion Drop', plural_form: 'Fusion Drops', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 3,
      baseSupply: '888000',
      maxSupply: '999000',
      startAsPaused: false,
      allowFrozenTransfers: true,
      keepsHistory: { transfers: true, mints: false, burns: false, freezes: true, purchases: true }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: true,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '15', startBlock: '50' },
      emission: { type: 'Random', min: '100', max: '750' },
      recipient: { type: 'contract-owner' },
      preProgrammedEntries: [
        { id: 'pp-entry-1', timestamp: '2025-03-01T00:00:00Z', identityId: 'DashAirdropPool', amount: '2500' },
        { id: 'pp-entry-2', timestamp: '2025-06-01T00:00:00Z', identityId: 'DashDevFund', amount: '4000' }
      ]
    },
    advanced: {
      changeControl: { freeze: true, unfreeze: true, destroyFrozen: true, emergency: false, directPurchase: false, admin: true }
    },
    search: {
      keywords: 'fusion, drop, unlocks, preprogrammed',
      description: 'Combines random drips with pre-scheduled unlocks for campaigns.'
    },
    registration: {
      identityId: 'reg-block-random-preprogram',
      privateKey: 'KzBlockRandom6666666666666666666666666666666666666'
    }
  }
];

test.describe('Registration validation fuzzing', () => {
  for (const config of TOKEN_FUZZ_CONFIGS) {
    test(`${config.id}: ${config.title}`, async ({ page }) => {
      await loadWizard(page);
      await seedWizardState(page, config);
      await navigateToRegistration(page);
      await assertNoValidationFailure(page, config.id);
    });
  }
});

async function loadWizard(page) {
  await page.goto(wizardFileUrl);
  await page.waitForLoadState('load');
  await page.waitForFunction(() => Boolean(window.wizardState));
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {TokenConfiguration} config
 */
async function seedWizardState(page, config) {
  await page.evaluate(
    ({ combo, stepIds }) => {
      const state = window.wizardState;
      if (!state) {
        throw new Error('wizardState was not initialised');
      }

      const ensureString = (value) => (value === undefined || value === null ? '' : String(value));

      state.form.tokenName = combo.naming.tokenName;
      state.form.naming = state.form.naming || {};
      state.form.naming.singular = combo.naming.tokenName;
      state.form.naming.plural = combo.naming.plural;
      state.form.naming.capitalize = combo.naming.capitalize;
      state.form.naming.rows = Object.entries(combo.naming.localizations).map(([code, entry]) => ({
        code,
        singularForm: entry.singular_form,
        pluralForm: entry.plural_form,
        shouldCapitalize: entry.should_capitalize
      }));
      state.form.naming.conventions = state.form.naming.conventions || { localizations: {} };
      state.form.naming.conventions.localizations = combo.naming.localizations;

      state.form.permissions.decimals = combo.permissions.decimals;
      state.form.permissions.baseSupply = ensureString(combo.permissions.baseSupply);
      state.form.permissions.baseSupplyMode = 'token';
      state.form.permissions.maxSupplyMode = 'token';
      state.form.permissions.useMaxSupply = Boolean(combo.permissions.maxSupply);
      state.form.permissions.maxSupply = ensureString(combo.permissions.maxSupply);
      state.form.permissions.startAsPaused = combo.permissions.startAsPaused;
      state.form.permissions.allowTransferToFrozenBalance = combo.permissions.allowFrozenTransfers;
      state.form.permissions.keepsHistory = combo.permissions.keepsHistory;

      state.form.distribution.cadence = {
        ...state.form.distribution.cadence,
        ...combo.distribution.cadence
      };
      state.form.distribution.emission = {
        ...state.form.distribution.emission,
        ...combo.distribution.emission
      };
      state.form.distribution.enablePerpetual = combo.distribution.enablePerpetual;
      state.form.distribution.enablePreProgrammed = combo.distribution.enablePreProgrammed;
      state.form.distribution.preProgrammed = {
        entries: combo.distribution.preProgrammedEntries || []
      };
      state.form.distribution.recipient = combo.distribution.recipient;

      state.form.advanced.changeControl = {
        ...state.form.advanced.changeControl,
        ...combo.advanced.changeControl
      };

      state.form.search = {
        keywords: combo.search.keywords,
        description: combo.search.description
      };

      state.form.registration.method = 'mobile';
      state.form.registration.preflight.mobile.qrGenerated = true;
      state.form.registration.preflight.det.jsonDisplayed = true;
      state.form.registration.identity.id = combo.registration.identityId;
      state.form.registration.wallet.privateKey = combo.registration.privateKey;
      state.form.registration.wallet.mnemonic = '';

      stepIds.forEach((id) => {
        state.steps[id] = state.steps[id] || { id, validity: 'unknown', touched: false };
        state.steps[id].validity = 'valid';
        state.steps[id].touched = true;
      });

      state.furthestValidIndex = 999;
      state.active = 'registration';

      if (typeof window.persistState === 'function') {
        window.persistState();
      }
    },
    { combo: config, stepIds: STEP_IDS }
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function navigateToRegistration(page) {
  await page.evaluate(() => {
    const showScreen = window.showScreen;
    if (typeof showScreen === 'function') {
      showScreen('registration', { force: true });
    }
  });

  await page.waitForFunction(() => {
    const card = document.getElementById('registration-validation-card');
    return !!card && !card.hasAttribute('hidden');
  }, { timeout: 5_000 });

  await page.waitForFunction(() => {
    const body = document.getElementById('registration-validation-body');
    if (!body) {
      return false;
    }
    return !body.textContent?.includes('Validating contract…');
  }, { timeout: 15_000 });
}

async function assertNoValidationFailure(page, label) {
  const card = page.locator('#registration-validation-card');
  await expect(card, `${label}: validation card should be visible`).toBeVisible();
  await expect(card, `${label}: contract validation should not fail`).not.toContainText('Contract validation failed');
}
