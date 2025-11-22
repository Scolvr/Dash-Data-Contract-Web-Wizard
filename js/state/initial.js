/**
 * Initial wizard state factory
 * @module state/initial
 */

import { TRACKED_STEPS, MANUAL_ACTION_DEFINITIONS } from '../utils/constants.js';
import {
  DEFAULT_KEEP_HISTORY,
  DEFAULT_CHANGE_CONTROL_FLAGS,
  createDefaultManualActionState,
  createDefaultFreezeState,
  cloneDefaultWalletState,
  cloneDefaultIdentityState
} from './defaults.js';

/**
 * Create default wizard state
 * @returns {Object} Complete wizard state object
 */
export function createDefaultWizardState() {
  // Create step tracking for all steps
  const steps = TRACKED_STEPS.reduce((accumulator, id) => {
    accumulator[id] = { id, validity: 'unknown', touched: false };
    return accumulator;
  }, {});

  // Create manual action defaults (mint, burn, freeze, etc.)
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
      ownerIdentityId: '',
      naming: {
        singular: '',
        plural: '',
        capitalize: false,
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
          public: false,
          sharedEncrypted: false,
          privateEncrypted: false
        },
        groups: [],
        mainControlGroupIndex: -1,
        freeze: createDefaultFreezeState(),
        unfreeze: {
          enabled: false,
          performerType: 'none',
          performerReference: '',
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
        destroyFrozen: createDefaultManualActionState(),
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
          mint: false,
          burn: false,
          freeze: false,
          config: false,
          members: false
        }
      },
      documentTypes: {},
      advanced: {
        tradeMode: 'closed',
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
