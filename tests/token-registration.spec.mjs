import { expect, test } from '@playwright/test';
import { ensureServer } from './helpers/static-server.mjs';
// No filesystem routing needed; we preload EvoSDK instead

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
 * }} permissions``````
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
    id: 'block-interval-100',
    title: 'block cadence at minimum valid interval',
    naming: {
      tokenName: 'Min Block OK',
      plural: 'Min Block OKs',
      capitalize: true,
      localizations: { en: { singular_form: 'Min Block', plural_form: 'Min Blocks', should_capitalize: true } }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '100' },
      emission: { type: 'FixedAmount', amount: '1' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-block-interval-100', privateKey: 'KyBlockInt10011111111111111111111111111111111111' }
  },
  {
    id: 'epoch-stepwise',
    title: 'epoch cadence with Stepwise emission',
    naming: {
      tokenName: 'Epoch Stepwise',
      plural: 'Epoch Stepwise',
      capitalize: true,
      localizations: { en: { singular_form: 'Epoch Step', plural_form: 'Epoch Steps', should_capitalize: true } }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'EpochBasedDistribution', epoch: '2' },
      emission: { type: 'Stepwise', stepwise: [{ period: '0', amount: '3' }, { period: '2', amount: '1' }] },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-epoch-stepwise', privateKey: 'KyEpochStepwise111111111111111111111111111111111' }
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
        { id: 'pp-entry-1', timestamp: '2025-03-01T00:00:00Z', identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p', amount: '2500' },
        { id: 'pp-entry-2', timestamp: '2025-06-01T00:00:00Z', identityId: 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9', amount: '4000' }
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
  },
  {
    id: 'block-stepwise',
    title: 'block cadence with stepwise emissions',
    naming: {
      tokenName: 'Tiered Drop',
      plural: 'Tiered Drops',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Tiered Drop', plural_form: 'Tiered Drops', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '10' },
      emission: { type: 'Stepwise', stepwise: [{ period: '0', amount: '100' }, { period: '10', amount: '50' }] },
      recipient: { type: 'contract-owner' }
    },
    advanced: {
      changeControl: { freeze: false, unfreeze: false, destroyFrozen: false, emergency: false, directPurchase: false, admin: true }
    },
    search: { keywords: 'stepwise, tiered', description: 'Two-tier emission schedule.' },
    registration: { identityId: 'reg-block-stepwise', privateKey: 'KyBlockStepwise7777777777777777777777777777777777777' }
  },
  {
    id: 'preprogram-multi',
    title: 'pre-programmed distributions with multiple recipients per timestamp',
    naming: {
      tokenName: 'Airdrop Batch',
      plural: 'Airdrop Batches',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Airdrop Batch', plural_form: 'Airdrop Batches', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: false,
      enablePreProgrammed: true,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '100' },
      emission: { type: '' },
      recipient: { type: 'contract-owner' },
      preProgrammedEntries: [
        { id: 'pp1', timestamp: '2025-01-01T00:00:00Z', identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p', amount: '1000' },
        { id: 'pp2', timestamp: '2025-01-01T00:00:00Z', identityId: 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9', amount: '2000' }
      ]
    },
    advanced: { changeControl: { freeze: false, unfreeze: false, destroyFrozen: false, emergency: false, directPurchase: false, admin: true } },
    search: { keywords: 'pre-programmed, multi', description: 'Multiple recipients at the same timestamp.' },
    registration: { identityId: 'reg-preprogram-multi', privateKey: 'KxPreprogramMulti8888888888888888888888888888888888' }
  },
  {
    id: 'group-main-control',
    title: 'groups + main control group can be modified by main-group',
    naming: {
      tokenName: 'Governed Token',
      plural: 'Governed Tokens',
      capitalize: true,
      localizations: {
        en: { singular_form: 'Governed Token', plural_form: 'Governed Tokens', should_capitalize: true }
      }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false },
      mainControl: { enabled: true, changeRules: { type: 'main-group' } }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '50' },
      emission: { type: 'FixedAmount', amount: '10' },
      recipient: { type: 'contract-owner' }
    },
    groups: {
      members: [{ identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p', power: 1 }, { identityId: 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9', power: 1 }],
      threshold: 2
    },
    advanced: { changeControl: { freeze: false, unfreeze: false, destroyFrozen: false, emergency: false, directPurchase: false, admin: true } },
    search: { keywords: 'groups, governance', description: 'Main group controls token config.' },
    registration: { identityId: 'reg-group-main', privateKey: 'KwGroupMain9999999999999999999999999999999999999' }
  }
  ,
  {
    id: 'group-actor-owner',
    title: 'main control can be modified by owner',
    naming: {
      tokenName: 'Owner Governed',
      plural: 'Owner Governed',
      capitalize: true,
      localizations: { en: { singular_form: 'Owner Governed', plural_form: 'Owner Governed', should_capitalize: true } }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false },
      mainControl: { enabled: true, changeRules: { type: 'owner' } }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '50' },
      emission: { type: 'FixedAmount', amount: '1' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-owner-actor', privateKey: 'KwOwnerActor1111111111111111111111111111111111111' }
  }
  ,
  {
    id: 'group-actor-identity',
    title: 'main control can be modified by specific identity',
    naming: {
      tokenName: 'Identity Governed',
      plural: 'Identity Governed',
      capitalize: true,
      localizations: { en: { singular_form: 'Identity Governed', plural_form: 'Identity Governed', should_capitalize: true } }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false },
      mainControl: { enabled: true, changeRules: { type: 'identity', identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p' } }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '50' },
      emission: { type: 'FixedAmount', amount: '1' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-identity-actor', privateKey: 'KwIdentityActor22222222222222222222222222222222222' }
  }
  ,
  {
    id: 'group-actor-group',
    title: 'main control can be modified by group(0)',
    naming: {
      tokenName: 'Group Governed',
      plural: 'Group Governed',
      capitalize: true,
      localizations: { en: { singular_form: 'Group Governed', plural_form: 'Group Governed', should_capitalize: true } }
    },
    permissions: {
      decimals: 0,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false },
      mainControl: { enabled: true, changeRules: { type: 'group', groupId: 0 } }
    },
    groups: {
      members: [{ identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p', power: 1 }, { identityId: 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9', power: 1 }],
      threshold: 2
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '50' },
      emission: { type: 'FixedAmount', amount: '1' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-group-actor', privateKey: 'KwGroupActor3333333333333333333333333333333333333' }
  }
  ,
  {
    id: 'time-stepwise',
    title: 'time-based cadence with multi-step Stepwise emission',
    naming: {
      tokenName: 'Time Tiered',
      plural: 'Time Tiered',
      capitalize: true,
      localizations: { en: { singular_form: 'Time Tiered', plural_form: 'Time Tiered', should_capitalize: true } }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: false, purchases: false }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'TimeBasedDistribution', intervalSeconds: '3600' },
      emission: { type: 'Stepwise', stepwise: [{ period: '0', amount: '10' }, { period: '24', amount: '5' }, { period: '48', amount: '2' }] },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-time-stepwise', privateKey: 'KwTimeStepwise4444444444444444444444444444444444444' }
  }
  ,
  {
    id: 'action-rules-owner',
    title: 'freeze/unfreeze/destroy rules by owner',
    naming: {
      tokenName: 'Owner Actions',
      plural: 'Owner Actions',
      capitalize: true,
      localizations: { en: { singular_form: 'Owner Action', plural_form: 'Owner Actions', should_capitalize: true } }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: true, purchases: false },
      actionRules: {
        freeze: { performerType: 'owner' },
        unfreeze: { performerType: 'owner' },
        destroy: { performerType: 'owner' }
      }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '25' },
      emission: { type: 'FixedAmount', amount: '5' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-action-owner', privateKey: 'KwActionOwner5555555555555555555555555555555555555' }
  }
  ,
  {
    id: 'action-rules-identity',
    title: 'freeze/unfreeze/destroy rules by identity',
    naming: {
      tokenName: 'Identity Actions',
      plural: 'Identity Actions',
      capitalize: true,
      localizations: { en: { singular_form: 'Identity Action', plural_form: 'Identity Actions', should_capitalize: true } }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: true, purchases: false },
      actionRules: {
        freeze: { performerType: 'identity', performerReference: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p' },
        unfreeze: { performerType: 'identity', performerReference: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p' },
        destroy: { performerType: 'identity', performerReference: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p' }
      }
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '25' },
      emission: { type: 'FixedAmount', amount: '5' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-action-identity', privateKey: 'KwActionIdentity6666666666666666666666666666666666' }
  }
  ,
  {
    id: 'action-rules-group',
    title: 'freeze/unfreeze/destroy rules by group',
    naming: {
      tokenName: 'Group Actions',
      plural: 'Group Actions',
      capitalize: true,
      localizations: { en: { singular_form: 'Group Action', plural_form: 'Group Actions', should_capitalize: true } }
    },
    permissions: {
      decimals: 2,
      baseSupply: '0',
      startAsPaused: false,
      allowFrozenTransfers: false,
      keepsHistory: { transfers: true, mints: true, burns: true, freezes: true, purchases: false },
      actionRules: {
        freeze: { performerType: 'group', performerReference: '0' },
        unfreeze: { performerType: 'group', performerReference: '0' },
        destroy: { performerType: 'group', performerReference: '0' }
      }
    },
    groups: {
      members: [
        { identityId: 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p', power: 1 },
        { identityId: 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9', power: 1 }
      ],
      threshold: 2
    },
    distribution: {
      enablePerpetual: true,
      enablePreProgrammed: false,
      cadence: { type: 'BlockBasedDistribution', intervalBlocks: '25' },
      emission: { type: 'FixedAmount', amount: '5' },
      recipient: { type: 'contract-owner' }
    },
    registration: { identityId: 'reg-action-group', privateKey: 'KwActionGroup7777777777777777777777777777777777777' }
  }
];

test.describe('Registration validation fuzzing', () => {
  for (const config of TOKEN_FUZZ_CONFIGS) {
    test(`${config.id}: ${config.title}`, async ({ page }) => {
      await loadWizard(page);
      await seedWizardState(page, config);
      await navigateToRegistration(page);
      // Keep UI-based assertion (card text) for end-to-end confidence
      await assertNoValidationFailure(page, config.id);

      // Additionally, validate by calling Evo SDK directly to ensure
      // the generated JSON is accepted by DataContract.fromJSON
      await validateViaEvoSDK(page, config.id);

      // Structural sanity checks against rs-dpp expectations
      const structural = await page.evaluate((combo) => {
        const payload = window.generatePlatformContractJSON();
        const token = payload?.tokens?.['0'];
        const result = { ok: true, notes: [] };
        if (!token) {
          return { ok: false, notes: ['missing token 0'] };
        }

        // TimeBasedDistribution interval must be in milliseconds (>= 3600000)
        if (combo.distribution?.cadence?.type === 'TimeBasedDistribution') {
          const dt = token?.distributionRules?.perpetualDistribution?.distributionType?.TimeBasedDistribution;
          if (!dt || typeof dt.interval !== 'number' || dt.interval < 3_600_000) {
            result.ok = false;
            result.notes.push('TimeBasedDistribution.interval should be milliseconds >= 3600000');
          }
        }

        // Pre-programmed timestamps should be epoch millis keys
        if (combo.distribution?.enablePreProgrammed) {
          const pp = token?.distributionRules?.preProgrammedDistribution;
          const keys = pp ? Object.keys(pp.distributions || {}) : [];
          if (!pp || keys.length === 0) {
            result.ok = false;
            result.notes.push('preProgrammedDistribution missing or empty');
          } else {
            const allMillis = keys.every((k) => /^\d+$/.test(k) && Number(k) > 0);
            if (!allMillis) {
              result.ok = false;
              result.notes.push('preProgrammedDistribution keys should be epoch millis');
            }
          }
        }

        // Specific identity recipient encodes as { Identity: "..." }
        if (combo.distribution?.recipient?.type === 'specific-identity') {
          const recipient = token?.distributionRules?.perpetualDistribution?.distributionRecipient;
          if (!recipient || typeof recipient !== 'object' || !recipient.Identity) {
            result.ok = false;
            result.notes.push('distributionRecipient should be { Identity: "..." }');
          }
        }

        // StepDecreasing maps to StepDecreasingAmount variant
        if (combo.distribution?.emission?.type === 'StepDecreasing') {
          const fn = token?.distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution?.function;
          if (!fn || !fn.StepDecreasingAmount) {
            result.ok = false;
            result.notes.push('StepDecreasing should serialize as StepDecreasingAmount');
          }
        }

        // Stepwise encodes as an object map of period->amount (works with Block/Time/Epoch cadence)
        if (combo.distribution?.emission?.type === 'Stepwise') {
          const bd = token?.distributionRules?.perpetualDistribution?.distributionType?.BlockBasedDistribution;
          const td = token?.distributionRules?.perpetualDistribution?.distributionType?.TimeBasedDistribution;
          const ed = token?.distributionRules?.perpetualDistribution?.distributionType?.EpochBasedDistribution;
          const fn = bd?.function?.Stepwise ?? td?.function?.Stepwise ?? ed?.function?.Stepwise;
          if (!fn || Array.isArray(fn)) {
            result.ok = false;
            result.notes.push('Stepwise should be an object map of period->amount');
          } else {
            const keysValid = Object.keys(fn).every((k) => /^\d+$/.test(k));
            if (!keysValid) {
              result.ok = false;
              result.notes.push('Stepwise keys should be numeric strings');
            }
          }
        }

        // Groups + main control
        if (combo.groups) {
          if (!payload.groups || !payload.groups['0']) {
            result.ok = false;
            result.notes.push('groups[0] missing');
          } else {
            const g = payload.groups['0'];
            if (!g.members || typeof g.members !== 'object') {
              result.ok = false;
              result.notes.push('groups[0].members should be an object');
            }
            if (typeof g.required_power !== 'number') {
              result.ok = false;
              result.notes.push('groups[0].required_power should be a number');
            }
            if (token.mainControlGroup !== 0) {
              result.ok = false;
              result.notes.push('token.mainControlGroup should be 0 when groups are present');
            }
          }
        }

        if (combo.permissions?.mainControl) {
          const mc = combo.permissions.mainControl;
          const actor = token?.mainControlGroupCanBeModified;
          if (mc.changeRules?.type === 'main-group' && actor !== 'MainGroup') {
            result.ok = false;
            result.notes.push('mainControlGroupCanBeModified should be MainGroup');
          }
          if (mc.changeRules?.type === 'owner' && actor !== 'ContractOwner') {
            result.ok = false;
            result.notes.push('mainControlGroupCanBeModified should be ContractOwner');
          }
          if (mc.changeRules?.type === 'identity') {
            if (!actor || typeof actor !== 'object' || !actor.Identity) {
              result.ok = false;
              result.notes.push('mainControlGroupCanBeModified should be { Identity: ... }');
            }
          }
          if (mc.changeRules?.type === 'group') {
            if (!actor || typeof actor !== 'object' || typeof actor.Group !== 'number') {
              result.ok = false;
              result.notes.push('mainControlGroupCanBeModified should be { Group: number }');
            }
          }
        }

        // Action rules encoding (freeze/unfreeze/destroy)
        if (combo.permissions?.actionRules) {
          const rules = ['freezeRules', 'unfreezeRules', 'destroyFrozenFundsRules'];
          const expected = {
            freezeRules: combo.permissions.actionRules.freeze,
            unfreezeRules: combo.permissions.actionRules.unfreeze,
            destroyFrozenFundsRules: combo.permissions.actionRules.destroy,
          };
          rules.forEach((key) => {
            const rule = token?.[key]?.V0?.authorized_to_make_change;
            const cfg = expected[key];
            if (cfg.performerType === 'owner') {
              if (rule !== 'ContractOwner') {
                result.ok = false;
                result.notes.push(`${key}.authorized_to_make_change should be ContractOwner`);
              }
            } else if (cfg.performerType === 'identity') {
              if (!rule || typeof rule !== 'object' || rule.Identity !== cfg.performerReference) {
                result.ok = false;
                result.notes.push(`${key}.authorized_to_make_change should be { Identity: ... }`);
              }
            } else if (cfg.performerType === 'group') {
              if (!rule || typeof rule !== 'object' || typeof rule.Group !== 'number') {
                result.ok = false;
                result.notes.push(`${key}.authorized_to_make_change should be { Group: number }`);
              }
            }
          });
        }
        return result;
      }, config);

      expect(structural.ok, `${config.id}: structural checks failed: ${structural.notes?.join('; ')}`).toBeTruthy();
    });
  }
});

// Negative scenarios expected to fail validation
// Removed negative scenarios for now

// Removed negative scenarios suite
async function loadWizard(page) {
  const base = await ensureServer(new URL('../index.html', import.meta.url));
  await page.goto(base + 'index.html');
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

      // Optional: main control group modification rules
      if (combo.permissions && combo.permissions.mainControl) {
        state.form.permissions.mainControl = {
          enabled: Boolean(combo.permissions.mainControl.enabled),
          changeRules: combo.permissions.mainControl.changeRules || { type: 'owner' }
        };
      }

      // Optional: action rules for freeze/unfreeze/destroyFrozen
      if (combo.permissions?.actionRules) {
        state.form.permissions.manualFreeze = {
          enabled: true,
          performerType: combo.permissions.actionRules.freeze.performerType,
          performerReference: combo.permissions.actionRules.freeze.performerReference || ''
        };
        state.form.permissions.unfreeze = {
          enabled: true,
          performerType: combo.permissions.actionRules.unfreeze.performerType,
          performerReference: combo.permissions.actionRules.unfreeze.performerReference || ''
        };
        state.form.permissions.destroyFrozen = {
          enabled: true,
          performerType: combo.permissions.actionRules.destroy.performerType,
          performerReference: combo.permissions.actionRules.destroy.performerReference || ''
        };
      }

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

      // Optional: groups definition
      if (combo.groups && Array.isArray(combo.groups.members)) {
        state.form.group = state.form.group || {};
        state.form.group.enabled = true;
        state.form.group.threshold = combo.groups.threshold || 1;
        state.form.group.members = combo.groups.members.map((m, i) => ({
          id: `member-${i}`,
          identityId: m.identityId,
          power: String(m.power ?? 1)
        }));
      }

      if (combo.advanced && combo.advanced.changeControl) {
        state.form.advanced = state.form.advanced || {};
        state.form.advanced.changeControl = {
          ...state.form.advanced.changeControl,
          ...combo.advanced.changeControl
        };
      }

      if (combo.search) {
        state.form.search = {
          keywords: combo.search.keywords,
          description: combo.search.description
        };
      }

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

// Removed assertValidationFailure (negative tests)

/**
 * Calls Evo SDK's DataContract.fromJSON on the generated payload
 * Fails the test if validation rejects.
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
async function validateViaEvoSDK(page, label) {
  // Wait for the app's SDK loader signal or direct API availability
  await page.waitForFunction(() => Boolean(
    window.__evo_sdk_ready === true || (window.EvoSDK && window.EvoSDK.DataContract && typeof window.EvoSDK.DataContract.fromJSON === 'function')
  ), { timeout: 60000 });

  const result = await page.evaluate(async () => {
    const contractJSON = window.generatePlatformContractJSON();
    try {
      // Prefer fromJSON if available, otherwise use fromValue(full_validation=true, protocol=10)
      if (window.EvoSDK.DataContract && typeof window.EvoSDK.DataContract.fromJSON === 'function') {
        await window.EvoSDK.DataContract.fromJSON(contractJSON, 10);
      } else if (window.EvoSDK.DataContract && typeof window.EvoSDK.DataContract.fromValue === 'function') {
        await window.EvoSDK.DataContract.fromValue(contractJSON, true, 10);
      } else {
        throw new Error('EvoSDK.DataContract does not expose fromJSON/fromValue');
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        message: e && e.message ? e.message : String(e),
        fragment: {
          tokens: contractJSON?.tokens?.['0'] ? {
            distributionRules: contractJSON.tokens['0'].distributionRules,
            mainControlGroup: contractJSON.tokens['0'].mainControlGroup,
            mainControlGroupCanBeModified: contractJSON.tokens['0'].mainControlGroupCanBeModified,
          } : null
        }
      };
    }
  });

  expect(result.ok, `${label}: Evo SDK rejected JSON: ${result.message}\n${JSON.stringify(result.fragment, null, 2)}`).toBeTruthy();
}
