/**
 * Token Templates Data
 * Predefined token configurations for common use cases
 */

export const TOKEN_TEMPLATES = {
  scratch: null, // No template, start fresh

  'simple-fixed': {
    name: 'SimpleToken',
    description: 'A basic fixed-supply token with burn capability and transfer notes',
    keywords: ['simple', 'fixed', 'basic', 'burnable'],
    decimals: 8,
    baseSupply: '1000000',
    maxSupply: '1000000',
    useMaxSupply: true,
    keepsHistory: {
      transfers: true,
      mints: true,
      burns: true,
      freezes: false,
      purchases: false
    },
    startAsPaused: false,
    manualMint: { enabled: false },
    manualBurn: { enabled: true },
    manualFreeze: { enabled: false },
    unfreeze: { enabled: false },
    destroyFrozen: { enabled: false },
    emergency: { enabled: false },
    transferNotesEnabled: true,
    transferNoteTypes: {
      public: true,
      sharedEncrypted: false,
      privateEncrypted: false
    },
    tradeMode: 'closed',
    changeControl: {
      mint: false,
      burn: false,
      freeze: false,
      unfreeze: false,
      destroyFrozen: false,
      emergency: false
    },
    distribution: null,
    enabledFeatures: {
      manualMint: false,
      manualBurn: true,
      manualFreeze: false,
      unfreeze: false,
      destroyFrozen: false,
      distribution: false,
      transferNotes: true
    },
    recommendedSubsteps: [
      'permissions-manual-burn',
      'permissions-transfer'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '1000000',
      maxSupplyDefault: '1000000',
      decimalsDefault: 8,
      useMaxSupplyDefault: true
    }
  },

  utility: {
    name: 'UtilityToken',
    description: 'Full-featured token for platform access, payments, and compliance',
    keywords: ['utility', 'platform', 'service', 'compliance', 'freeze'],
    decimals: 2,
    baseSupply: '10000000',
    maxSupply: '100000000',
    useMaxSupply: true,
    keepsHistory: {
      transfers: true,
      mints: true,
      burns: true,
      freezes: true,
      purchases: true
    },
    startAsPaused: false,
    allowTransferToFrozenBalance: true,
    transferNotesEnabled: true,
    transferNoteTypes: {
      public: true,
      sharedEncrypted: true,
      privateEncrypted: false
    },
    manualMint: { enabled: true },
    manualBurn: { enabled: true },
    manualFreeze: { enabled: true },
    unfreeze: { enabled: true },
    destroyFrozen: { enabled: true },
    emergency: { enabled: true },
    tradeMode: 'closed',
    changeControl: {
      mint: false,
      burn: false,
      freeze: true,
      unfreeze: true,
      destroyFrozen: true,
      emergency: true
    },
    distribution: null,
    enabledFeatures: {
      manualMint: true,
      manualBurn: true,
      manualFreeze: true,
      unfreeze: true,
      destroyFrozen: true,
      distribution: false,
      transferNotes: true
    },
    recommendedSubsteps: [
      'permissions-manual-mint',
      'permissions-manual-burn',
      'permissions-manual-freeze',
      'permissions-emergency',
      'permissions-transfer'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '10000000',
      maxSupplyDefault: '100000000',
      decimalsDefault: 2,
      useMaxSupplyDefault: true
    }
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
    unfreeze: { enabled: false },
    destroyFrozen: { enabled: false },
    emergency: { enabled: false },
    tradeMode: 'closed',
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
        intervalSeconds: '86400'
      },
      emission: {
        type: 'FixedAmount',
        amount: '1000'
      }
    },
    enabledFeatures: {
      manualMint: true,
      manualBurn: true,
      manualFreeze: false,
      unfreeze: false,
      destroyFrozen: false,
      distribution: true,
      transferNotes: false
    },
    recommendedSubsteps: [
      'permissions-manual-mint',
      'permissions-manual-burn',
      'distribution-perpetual'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '0',
      maxSupplyDefault: null,
      decimalsDefault: 0,
      useMaxSupplyDefault: false
    }
  },

  membership: {
    name: 'MembershipToken',
    description: 'Subscription-based access token for tiered memberships and gated content',
    keywords: ['membership', 'subscription', 'access', 'tier', 'premium'],
    decimals: 0,
    baseSupply: '10000',
    maxSupply: '100000',
    useMaxSupply: true,
    keepsHistory: {
      transfers: true,
      mints: true,
      burns: true,
      freezes: true,
      purchases: false
    },
    startAsPaused: false,
    allowTransferToFrozenBalance: false,
    transferNotesEnabled: true,
    transferNoteTypes: {
      public: true,
      sharedEncrypted: true,
      privateEncrypted: false
    },
    manualMint: { enabled: true },
    manualBurn: { enabled: true },
    manualFreeze: { enabled: true },
    unfreeze: { enabled: true },
    destroyFrozen: { enabled: false },
    emergency: { enabled: true },
    tradeMode: 'closed',
    changeControl: {
      mint: true,
      burn: true,
      freeze: true,
      unfreeze: true,
      destroyFrozen: false,
      emergency: true
    },
    distribution: null,
    enabledFeatures: {
      manualMint: true,
      manualBurn: true,
      manualFreeze: true,
      unfreeze: true,
      destroyFrozen: false,
      distribution: false,
      transferNotes: true
    },
    recommendedSubsteps: [
      'permissions-manual-mint',
      'permissions-manual-burn',
      'permissions-manual-freeze',
      'permissions-emergency',
      'permissions-transfer'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '10000',
      maxSupplyDefault: '100000',
      decimalsDefault: 0,
      useMaxSupplyDefault: true
    }
  },

  testnet: {
    name: 'TestToken',
    description: 'Developer sandbox token with all features enabled for experimentation',
    keywords: ['test', 'dev', 'sandbox', 'experiment', 'debug'],
    decimals: 8,
    baseSupply: '1000000000',
    maxSupply: null,
    useMaxSupply: false,
    keepsHistory: {
      transfers: true,
      mints: true,
      burns: true,
      freezes: true,
      purchases: true
    },
    startAsPaused: false,
    allowTransferToFrozenBalance: true,
    transferNotesEnabled: true,
    transferNoteTypes: {
      public: true,
      sharedEncrypted: true,
      privateEncrypted: true
    },
    manualMint: { enabled: true },
    manualBurn: { enabled: true },
    manualFreeze: { enabled: true },
    unfreeze: { enabled: true },
    destroyFrozen: { enabled: true },
    emergency: { enabled: true },
    tradeMode: 'permissionless',
    changeControl: {
      mint: true,
      burn: true,
      freeze: true,
      unfreeze: true,
      destroyFrozen: true,
      emergency: true
    },
    distribution: {
      cadence: {
        type: 'BlockBasedDistribution',
        intervalBlocks: '10'
      },
      emission: {
        type: 'FixedAmount',
        amount: '10000'
      }
    },
    enabledFeatures: {
      manualMint: true,
      manualBurn: true,
      manualFreeze: true,
      unfreeze: true,
      destroyFrozen: true,
      distribution: true,
      transferNotes: true
    },
    recommendedSubsteps: [
      'permissions-manual-mint',
      'permissions-manual-burn',
      'permissions-manual-freeze',
      'permissions-emergency',
      'permissions-transfer',
      'distribution-perpetual',
      'advanced'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '1000000000',
      maxSupplyDefault: null,
      decimalsDefault: 8,
      useMaxSupplyDefault: false
    }
  },

  invoice: {
    name: 'InvoiceToken',
    description: 'B2B payment token with encrypted notes for invoices and audit trails',
    keywords: ['invoice', 'b2b', 'payment', 'business', 'audit', 'accounting'],
    decimals: 2,
    baseSupply: '0',
    maxSupply: null,
    useMaxSupply: false,
    keepsHistory: {
      transfers: true,
      mints: true,
      burns: true,
      freezes: true,
      purchases: false
    },
    startAsPaused: false,
    allowTransferToFrozenBalance: false,
    transferNotesEnabled: true,
    transferNoteTypes: {
      public: false,
      sharedEncrypted: true,
      privateEncrypted: true
    },
    manualMint: { enabled: true },
    manualBurn: { enabled: true },
    manualFreeze: { enabled: true },
    unfreeze: { enabled: true },
    destroyFrozen: { enabled: false },
    emergency: { enabled: true },
    tradeMode: 'closed',
    changeControl: {
      mint: true,
      burn: true,
      freeze: true,
      unfreeze: true,
      destroyFrozen: false,
      emergency: true
    },
    distribution: null,
    enabledFeatures: {
      manualMint: true,
      manualBurn: true,
      manualFreeze: true,
      unfreeze: true,
      destroyFrozen: false,
      distribution: false,
      transferNotes: true
    },
    recommendedSubsteps: [
      'permissions-manual-mint',
      'permissions-manual-burn',
      'permissions-manual-freeze',
      'permissions-emergency',
      'permissions-transfer'
    ],
    supplyConfig: {
      editable: true,
      baseSupplyDefault: '0',
      maxSupplyDefault: null,
      decimalsDefault: 2,
      useMaxSupplyDefault: false
    }
  }
};

/**
 * Get a template by key
 */
export function getTemplate(key) {
  return TOKEN_TEMPLATES[key] || null;
}

/**
 * Get all template keys
 */
export function getTemplateKeys() {
  return Object.keys(TOKEN_TEMPLATES);
}

/**
 * Check if a template exists
 */
export function hasTemplate(key) {
  return key in TOKEN_TEMPLATES;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.TokenTemplates = {
    all: TOKEN_TEMPLATES,
    get: getTemplate,
    keys: getTemplateKeys,
    has: hasTemplate
  };
}
