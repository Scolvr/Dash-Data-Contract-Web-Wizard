/**
 * Contract Generator Module
 * Transforms wizard state into Dash Platform-compatible JSON
 *
 * This module generates the data contract JSON structure expected by Dash Platform
 * for token configuration. It handles:
 * - Token configuration (supply, decimals, history tracking)
 * - Authorization rules (mint, burn, freeze, etc.)
 * - Distribution rules (perpetual and pre-programmed)
 * - Marketplace rules
 * - Groups
 */

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Encode Authorized Action Takers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encode AuthorizedActionTakers value into expected JSON shape
 * Rust enum serialization:
 * - Unit variants (NoOne, ContractOwner, MainGroup) serialize as STRINGS
 * - Tuple variants (Identity, Group) serialize as { "VariantName": data }
 *
 * @param {*} actor - Actor value
 * @returns {string|object} Encoded actor
 */
export function encodeAuthorizedActionTaker(actor) {
  // Already in correct tuple variant format (Group or Identity with data)
  if (typeof actor === 'object' && actor !== null) {
    if (actor.Group !== undefined || actor.Identity !== undefined) {
      return actor;
    }
    // Convert object format to string for unit variants
    if (actor.NoOne !== undefined) return 'NoOne';
    if (actor.ContractOwner !== undefined) return 'ContractOwner';
    if (actor.MainGroup !== undefined) return 'MainGroup';
  }

  // Unit variants - serialize as STRINGS (not objects!)
  if (!actor && actor !== 0) return 'NoOne';
  if (actor === 'NoOne') return 'NoOne';
  if (actor === 'ContractOwner') return 'ContractOwner';
  if (actor === 'MainGroup') return 'MainGroup';

  // Group index - serialize as { "Group": index }
  if (typeof actor === 'number' && Number.isFinite(actor)) {
    return { Group: actor };
  }

  // Identity id string - serialize as { "Identity": identifier }
  if (typeof actor === 'string' && actor.length > 0) {
    return { Identity: actor };
  }

  return 'NoOne';
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Create Rule V0
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert change control boolean to ChangeControlRules object
 * Uses externally tagged V0 wrapper with snake_case fields
 *
 * @param {boolean} isEnabled - Whether the rule is enabled
 * @param {*} actionTaker - Who can perform the action
 * @param {object} governanceFlags - Governance configuration flags
 * @returns {object} Rule V0 structure
 */
export function createRuleV0(isEnabled, actionTaker = 'ContractOwner', governanceFlags = {}) {
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
      authorized_to_make_change: encodeAuthorizedActionTaker(isEnabled ? actionTaker : 'NoOne'),
      admin_action_takers: encodeAuthorizedActionTaker(isEnabled ? actionTaker : 'NoOne'),
      changing_authorized_action_takers_to_no_one_allowed: changingAuthorizedToNoOneAllowed,
      changing_admin_action_takers_to_no_one_allowed: changingAdminToNoOneAllowed,
      self_changing_admin_action_takers_allowed: selfChangingAdminAllowed
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get Actor from Performer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert performer type and reference to actor
 *
 * @param {string} performerType - Type of performer (none, owner, identity, group, main-group)
 * @param {string} performerReference - Reference (identity ID or group index)
 * @returns {*} Actor value
 */
export function getActorFromPerformer(performerType, performerReference) {
  if (!performerType || performerType === 'none') {
    return 'NoOne';
  }

  if (performerType === 'owner') {
    return 'ContractOwner';
  } else if (performerType === 'identity' && performerReference) {
    return { Identity: performerReference };
  } else if (performerType === 'group' && performerReference) {
    return { Group: (parseInt(performerReference, 10) || 0) };
  } else if (performerType === 'main-group') {
    return 'MainGroup';
  }

  return 'NoOne';
}

/**
 * Convert new format state (performerType/ruleChangerType) to ChangeControlRules
 *
 * @param {object} state - State with performerType, ruleChangerType, etc.
 * @returns {object} Rule V0 structure
 */
export function createPermissionChangeRuleFromNewFormat(state) {
  if (!state) {
    return createRuleV0(false);
  }

  const authorizedToMakeChange = getActorFromPerformer(state.performerType, state.performerReference);
  const adminActionTakers = getActorFromPerformer(state.ruleChangerType, state.ruleChangerReference);

  return {
    V0: {
      authorized_to_make_change: encodeAuthorizedActionTaker(authorizedToMakeChange),
      admin_action_takers: encodeAuthorizedActionTaker(adminActionTakers),
      changing_authorized_action_takers_to_no_one_allowed: Boolean(state.allowChangeAuthorizedToNone),
      changing_admin_action_takers_to_no_one_allowed: Boolean(state.allowChangeAdminToNone),
      self_changing_admin_action_takers_allowed: Boolean(state.allowSelfChangeAdmin)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Transform Keeps History
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform keepsHistory to Platform format
 *
 * @param {object} keepsHistory - History tracking configuration
 * @returns {object} Platform format history configuration
 */
export function transformKeepsHistory(keepsHistory) {
  return {
    $format_version: '0',
    keepsTransferHistory: Boolean(keepsHistory?.transfers),
    keepsMintingHistory: Boolean(keepsHistory?.mints),
    keepsBurningHistory: Boolean(keepsHistory?.burns),
    keepsFreezingHistory: Boolean(keepsHistory?.freezes),
    keepsDirectPricingHistory: Boolean(keepsHistory?.directPricing),
    keepsDirectPurchaseHistory: Boolean(keepsHistory?.purchases)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Transform Localizations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform localizations to Platform format (camelCase)
 *
 * @param {object} localizations - Localization entries
 * @returns {object} Platform format localizations
 */
export function transformLocalizations(localizations) {
  const result = {};
  if (!localizations) return result;

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

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Build Emission Function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build emission function based on type
 *
 * @param {object} emission - Emission configuration
 * @returns {object} Platform format emission function
 */
export function buildEmissionFunction(emission) {
  const type = emission?.type;

  // FixedAmount: Constant emission per period
  if (type === 'FixedAmount') {
    return {
      FixedAmount: {
        amount: parseInt(emission.amount, 10) || 0
      }
    };
  }

  // Random: Random amount between min and max
  if (type === 'Random') {
    return {
      Random: {
        min: parseInt(emission.min, 10) || 0,
        max: parseInt(emission.max, 10) || 100
      }
    };
  }

  // StepDecreasing: Bitcoin-style halving
  if (type === 'StepDecreasing') {
    const stepObj = {
      step_count: parseInt(emission.stepCount, 10) || 1,
      decrease_per_interval_numerator: parseInt(emission.decreasePerIntervalNumerator, 10) || 1,
      decrease_per_interval_denominator: parseInt(emission.decreasePerIntervalDenominator, 10) || 2,
      distribution_start_amount: parseInt(emission.distributionStartAmount, 10) || 100,
      trailing_distribution_interval_amount: parseInt(emission.trailingDistributionIntervalAmount, 10) || 0
    };

    if (emission.stepOffset && emission.stepOffset !== '' && emission.stepOffset !== 'None') {
      stepObj.start_decreasing_offset = parseInt(emission.stepOffset, 10);
    }
    if (emission.stepMinValue && emission.stepMinValue !== '' && emission.stepMinValue !== 'None') {
      stepObj.min_value = parseInt(emission.stepMinValue, 10);
    }
    if (emission.stepMaxInterval && emission.stepMaxInterval !== '' && emission.stepMaxInterval !== 'None') {
      stepObj.max_interval_count = parseInt(emission.stepMaxInterval, 10);
    }

    return { StepDecreasingAmount: stepObj };
  }

  // Linear: f(x) = (a * (x - s) / d) + b
  if (type === 'Linear') {
    const linearObj = {
      a: parseInt(emission.linearSlopeNumerator, 10) || 0,
      d: parseInt(emission.linearSlopeDivisor, 10) || 1,
      starting_amount: parseInt(emission.linearStartingAmount, 10) || 0
    };

    if (emission.linearStartStep && emission.linearStartStep !== '' && emission.linearStartStep !== 'None') {
      linearObj.start_step = parseInt(emission.linearStartStep, 10);
    }
    if (emission.linearMinValue && emission.linearMinValue !== '' && emission.linearMinValue !== 'None') {
      linearObj.min_value = parseInt(emission.linearMinValue, 10);
    }
    if (emission.linearMaxValue && emission.linearMaxValue !== '' && emission.linearMaxValue !== 'None') {
      linearObj.max_value = parseInt(emission.linearMaxValue, 10);
    }

    return { Linear: linearObj };
  }

  // Exponential
  if (type === 'Exponential') {
    const expObj = {
      a: parseInt(emission.expA, 10) || 0,
      m: parseInt(emission.expM, 10) || 2,
      n: parseInt(emission.expN, 10) || 1,
      d: parseInt(emission.expD, 10) || 1,
      o: parseInt(emission.expO, 10) || 0,
      b: parseInt(emission.expB, 10) || 0
    };

    if (emission.expS && emission.expS !== '' && emission.expS !== 'None') {
      expObj.start_moment = parseInt(emission.expS, 10);
    }
    if (emission.expMinValue && emission.expMinValue !== '' && emission.expMinValue !== 'None') {
      expObj.min_value = parseInt(emission.expMinValue, 10);
    }
    if (emission.expMaxValue && emission.expMaxValue !== '' && emission.expMaxValue !== 'None') {
      expObj.max_value = parseInt(emission.expMaxValue, 10);
    }

    return { Exponential: expObj };
  }

  // Polynomial
  if (type === 'Polynomial') {
    const polyObj = {
      a: parseInt(emission.polyA, 10) || 0,
      m: parseInt(emission.polyM, 10) || 2,
      n: parseInt(emission.polyN, 10) || 1,
      d: parseInt(emission.polyD, 10) || 1,
      o: parseInt(emission.polyO, 10) || 0,
      b: parseInt(emission.polyB, 10) || 0
    };

    if (emission.polyS && emission.polyS !== '' && emission.polyS !== 'None') {
      polyObj.start_moment = parseInt(emission.polyS, 10);
    }
    if (emission.polyMinValue && emission.polyMinValue !== '' && emission.polyMinValue !== 'None') {
      polyObj.min_value = parseInt(emission.polyMinValue, 10);
    }
    if (emission.polyMaxValue && emission.polyMaxValue !== '' && emission.polyMaxValue !== 'None') {
      polyObj.max_value = parseInt(emission.polyMaxValue, 10);
    }

    return { Polynomial: polyObj };
  }

  // Logarithmic
  if (type === 'Logarithmic') {
    const logObj = {
      a: parseInt(emission.logA, 10) || 0,
      d: parseInt(emission.logD, 10) || 1,
      m: parseInt(emission.logM, 10) || 1,
      n: parseInt(emission.logN, 10) || 1,
      o: parseInt(emission.logO, 10) || 0,
      b: parseInt(emission.logB, 10) || 0
    };

    if (emission.logS && emission.logS !== '' && emission.logS !== 'None') {
      logObj.start_moment = parseInt(emission.logS, 10);
    }
    if (emission.logMinValue && emission.logMinValue !== '' && emission.logMinValue !== 'None') {
      logObj.min_value = parseInt(emission.logMinValue, 10);
    }
    if (emission.logMaxValue && emission.logMaxValue !== '' && emission.logMaxValue !== 'None') {
      logObj.max_value = parseInt(emission.logMaxValue, 10);
    }

    return { Logarithmic: logObj };
  }

  // InvertedLogarithmic
  if (type === 'InvertedLogarithmic') {
    const invlogObj = {
      a: parseInt(emission.invlogA, 10) || 0,
      d: parseInt(emission.invlogD, 10) || 1,
      m: parseInt(emission.invlogM, 10) || 1,
      n: parseInt(emission.invlogN, 10) || 1,
      o: parseInt(emission.invlogO, 10) || 0,
      b: parseInt(emission.invlogB, 10) || 0
    };

    if (emission.invlogS && emission.invlogS !== '' && emission.invlogS !== 'None') {
      invlogObj.start_moment = parseInt(emission.invlogS, 10);
    }
    if (emission.invlogMinValue && emission.invlogMinValue !== '' && emission.invlogMinValue !== 'None') {
      invlogObj.min_value = parseInt(emission.invlogMinValue, 10);
    }
    if (emission.invlogMaxValue && emission.invlogMaxValue !== '' && emission.invlogMaxValue !== 'None') {
      invlogObj.max_value = parseInt(emission.invlogMaxValue, 10);
    }

    return { InvertedLogarithmic: invlogObj };
  }

  // Stepwise: Custom step-based schedule
  if (type === 'Stepwise' && Array.isArray(emission.stepwise) && emission.stepwise.length > 0) {
    const stepsMap = {};
    emission.stepwise.forEach(step => {
      const k = String(parseInt(step.period, 10) || 0);
      stepsMap[k] = parseInt(step.amount, 10) || 0;
    });
    return { Stepwise: stepsMap };
  }

  // Default fallback to FixedAmount
  return { FixedAmount: { amount: 100 } };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Transform Distribution Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform distribution rules from wizard state
 *
 * @param {object} state - Wizard state
 * @returns {object|null} Distribution rules or null if none configured
 */
export function transformDistributionRules(state) {
  const dist = state.form?.distribution;
  if (!dist) return null;

  const manualMint = state.form?.permissions?.manualMint;
  const mintDestinationType = manualMint?.destinationType || 'contract-owner';
  const mintDestinationIdentity = manualMint?.destinationIdentity || '';
  const allowCustomDestination = Boolean(manualMint?.allowCustomDestination);

  const perpetualSafeguards = dist.safeguards || {};
  const preProgrammedRules = dist.preProgrammedRules || {};
  const mintDestinationRules = dist.mintDestinationRules || {};
  const allowChoosingRules = dist.allowChoosingRules || {};

  const mapActorValueWithId = (value, identityId, groupId) => {
    switch (value) {
      case 'no-one': return 'NoOne';
      case 'owner': return 'ContractOwner';
      case 'main-group': return 'MainGroup';
      case 'identity': return identityId ? identityId : 'NoOne';
      case 'group': return groupId ? parseInt(groupId, 10) : 'NoOne';
      default: return 'ContractOwner';
    }
  };

  const mapActorValue = (value) => mapActorValueWithId(value, null, null);

  const buildRuleV0 = (ruleConfig) => {
    const performActor = mapActorValueWithId(
      ruleConfig.performAction || 'no-one',
      ruleConfig.performIdentityId,
      ruleConfig.performGroupId
    );
    const changeRulesActor = mapActorValueWithId(
      ruleConfig.changeRules || 'no-one',
      ruleConfig.changeRulesIdentityId,
      ruleConfig.changeRulesGroupId
    );

    return {
      V0: {
        authorized_to_make_change: encodeAuthorizedActionTaker(performActor),
        admin_action_takers: encodeAuthorizedActionTaker(changeRulesActor),
        changing_authorized_action_takers_to_no_one_allowed: Boolean(ruleConfig.allowChangeAuthorizedToNone),
        changing_admin_action_takers_to_no_one_allowed: Boolean(ruleConfig.allowChangeAdminToNone),
        self_changing_admin_action_takers_allowed: Boolean(ruleConfig.allowSelfChangeAdmin)
      }
    };
  };

  const performActor = mapActorValue(perpetualSafeguards.performAction || 'no-one');
  const changeRulesActor = mapActorValue(perpetualSafeguards.changeRules || 'no-one');

  const distributionRules = {
    $format_version: '0',
    perpetualDistribution: null,
    perpetualDistributionRules: {
      V0: {
        authorized_to_make_change: encodeAuthorizedActionTaker(performActor),
        admin_action_takers: encodeAuthorizedActionTaker(changeRulesActor),
        changing_authorized_action_takers_to_no_one_allowed: Boolean(perpetualSafeguards.allowChangeAuthorizedToNone),
        changing_admin_action_takers_to_no_one_allowed: Boolean(perpetualSafeguards.allowChangeAdminToNone),
        self_changing_admin_action_takers_allowed: Boolean(perpetualSafeguards.allowSelfChangeAdmin)
      }
    },
    preProgrammedDistribution: null,
    preProgrammedDistributionRules: buildRuleV0(preProgrammedRules),
    newTokensDestinationIdentity: mintDestinationType === 'default-identity' && mintDestinationIdentity ? mintDestinationIdentity : null,
    newTokensDestinationIdentityRules: buildRuleV0(mintDestinationRules),
    mintingAllowChoosingDestination: allowCustomDestination,
    mintingAllowChoosingDestinationRules: buildRuleV0(allowChoosingRules),
    changeDirectPurchasePricingRules: createPermissionChangeRuleFromNewFormat(state.form?.advanced?.directPricing)
  };

  const hasEmission = Boolean(dist.emission && dist.emission.type);
  const hasPreProgrammed = Boolean(dist.preProgrammed && Array.isArray(dist.preProgrammed.entries) && dist.preProgrammed.entries.length > 0);

  if (!hasEmission && !hasPreProgrammed) {
    return null;
  }

  // Build perpetual distribution if emission is configured
  if (hasEmission) {
    let distributionType = {};
    const cadence = dist.cadence;

    if (cadence.type === 'BlockBasedDistribution') {
      const interval = parseInt(cadence.intervalBlocks, 10) || 100;
      distributionType.BlockBasedDistribution = {
        interval: interval,
        function: buildEmissionFunction(dist.emission)
      };
    } else if (cadence.type === 'TimeBasedDistribution') {
      const interval = (parseInt(cadence.intervalSeconds, 10) || 3600) * 1000;
      distributionType.TimeBasedDistribution = {
        interval: interval,
        function: buildEmissionFunction(dist.emission)
      };
    } else if (cadence.type === 'EpochBasedDistribution') {
      const interval = Number.isFinite(parseInt(cadence.epoch, 10)) ? parseInt(cadence.epoch, 10) : 1;
      distributionType.EpochBasedDistribution = {
        interval,
        function: buildEmissionFunction(dist.emission)
      };
    }

    // Determine recipient
    let recipient;
    if (dist.recipient?.type === 'evonodes-by-participation') {
      recipient = 'EvonodesByParticipation';
    } else if ((dist.recipient?.type === 'identity' || dist.recipient?.type === 'specific-identity') && dist.recipient.identityId) {
      recipient = { Identity: dist.recipient.identityId };
    } else {
      recipient = 'ContractOwner';
    }

    distributionRules.perpetualDistribution = {
      $format_version: '0',
      distributionType: distributionType,
      distributionRecipient: recipient
    };
  }

  // Build pre-programmed distribution if configured
  if (hasPreProgrammed) {
    const distributions = {};
    dist.preProgrammed.entries.forEach(entry => {
      if (entry.timestamp && entry.identityId && entry.amount) {
        let ts;
        if (typeof entry.timestamp === 'number') {
          ts = entry.timestamp;
        } else {
          const parsed = Date.parse(entry.timestamp);
          ts = Number.isFinite(parsed) ? parsed : null;
        }
        if (ts === null) return;
        const k = String(ts);
        if (!distributions[k]) {
          distributions[k] = {};
        }
        distributions[k][entry.identityId] = parseInt(entry.amount, 10) || 0;
      }
    });

    const hasAny = Object.keys(distributions).length > 0;
    if (hasAny) {
      distributionRules.preProgrammedDistribution = {
        $format_version: '0',
        distributions
      };
      distributionRules.preProgrammedDistributionRules = createRuleV0(true);
    }
  }

  return distributionRules;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Transform Marketplace Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform marketplace rules from wizard state
 *
 * @param {object} state - Wizard state
 * @returns {object} Marketplace rules
 */
export function transformMarketplaceRules(state) {
  return {
    $format_version: '0',
    tradeMode: 'NotTradeable',
    tradeModeChangeRules: createPermissionChangeRuleFromNewFormat(state.form?.advanced?.marketplaceTradeMode)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: Generate Platform Contract JSON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate Platform-compatible data contract JSON from wizard state
 *
 * @param {object} state - Wizard state (form data)
 * @param {object} options - Optional configuration
 * @param {string} options.contractId - Override contract ID
 * @param {string} options.ownerId - Override owner ID
 * @returns {object} Platform contract JSON
 */
export function generatePlatformContractJSON(state, options = {}) {
  const rawName = state.form?.tokenName || '';
  const tokenName = rawName.trim() || 'Unnamed Token';

  // Build token configuration
  const localizations = state.form?.naming?.conventions?.localizations || {};
  const hasLocalizations = Object.keys(localizations).length > 0;

  const tokenConfig = {
    $format_version: '0',
    conventions: {
      $format_version: '0',
      localizations: hasLocalizations ? transformLocalizations(localizations) : {
        en: {
          $format_version: '0',
          shouldCapitalize: true,
          singularForm: tokenName,
          pluralForm: tokenName + 's'
        }
      }
    },
    conventionsChangeRules: createPermissionChangeRuleFromNewFormat(state.form?.naming?.updateNames),
    baseSupply: parseInt(state.form?.permissions?.baseSupply, 10) || 0,
    maxSupply: state.form?.permissions?.useMaxSupply ? (parseInt(state.form?.permissions?.maxSupply, 10) || null) : null,
    maxSupplyChangeRules: createRuleV0(
      Boolean(state.form?.permissions?.changeMaxSupply?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.changeMaxSupply?.perform?.type,
        state.form?.permissions?.changeMaxSupply?.perform?.identityId
      ),
      state.form?.permissions?.changeMaxSupply || {}
    ),
    decimals: parseInt(state.form?.permissions?.decimals, 10) ?? 8,
    keepsHistory: transformKeepsHistory(state.form?.permissions?.keepsHistory),
    startAsPaused: Boolean(state.form?.permissions?.startAsPaused),
    allowTransferToFrozenBalanceRules: {
      V0: {
        transfer_to_frozen_balance_allowed: Boolean(state.form?.permissions?.allowTransferToFrozenBalance),
        transferability_change_rules: createRuleV0(false).V0
      }
    },
    manualMintingRules: createRuleV0(
      Boolean(state.form?.permissions?.manualMint?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.manualMint?.performerType,
        state.form?.permissions?.manualMint?.performerReference
      ),
      state.form?.permissions?.manualMint || {}
    ),
    manualBurningRules: createRuleV0(
      Boolean(state.form?.permissions?.manualBurn?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.manualBurn?.performerType,
        state.form?.permissions?.manualBurn?.performerReference
      ),
      state.form?.permissions?.manualBurn || {}
    ),
    freezeRules: createRuleV0(
      Boolean(state.form?.permissions?.manualFreeze?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.manualFreeze?.performerType,
        state.form?.permissions?.manualFreeze?.performerReference
      ),
      state.form?.permissions?.manualFreeze || {}
    ),
    unfreezeRules: createRuleV0(
      Boolean(state.form?.permissions?.unfreeze?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.unfreeze?.performerType,
        state.form?.permissions?.unfreeze?.performerReference
      ),
      state.form?.permissions?.unfreeze || {}
    ),
    destroyFrozenFundsRules: createRuleV0(
      Boolean(state.form?.permissions?.destroyFrozen?.enabled),
      getActorFromPerformer(
        state.form?.permissions?.destroyFrozen?.performerType,
        state.form?.permissions?.destroyFrozen?.performerReference
      ),
      state.form?.permissions?.destroyFrozen || {}
    ),
    emergencyActionRules: createRuleV0(
      Boolean(state.form?.advanced?.changeControl?.emergency),
      getActorFromPerformer(
        state.form?.permissions?.emergencyAction?.performerType,
        state.form?.permissions?.emergencyAction?.performerReference
      ),
      state.form?.permissions?.emergencyAction || {}
    ),
    mainControlGroup: null,
    mainControlGroupCanBeModified: state.form?.advanced?.mainControl?.performerType && state.form?.advanced?.mainControl?.performerType !== 'none'
      ? encodeAuthorizedActionTaker(getActorFromPerformer(state.form?.advanced?.mainControl?.performerType, state.form?.advanced?.mainControl?.performerReference))
      : 'NoOne'
  };

  // Add distribution rules if configured
  const distributionRules = transformDistributionRules(state);
  if (distributionRules) {
    tokenConfig.distributionRules = distributionRules;
  }

  // Add marketplace rules
  tokenConfig.marketplaceRules = transformMarketplaceRules(state);

  // Add description if user provided one
  const userDescription = state.form?.search?.description?.trim();
  if (userDescription && userDescription.length >= 3) {
    tokenConfig.description = userDescription.substring(0, 200);
  } else if (tokenName && tokenName !== 'Unnamed Token') {
    tokenConfig.description = `Token: ${tokenName}`.substring(0, 100);
  }

  // Build groups at root level
  const groups = {};
  if (state.form?.group?.enabled && state.form?.group?.members?.length > 0) {
    const memberPairs = state.form.group.members
      .filter(m => m.identityId)
      .map(m => [m.identityId, parseInt(m.power, 10) || 1]);

    if (memberPairs.length > 0) {
      const membersMap = {};
      memberPairs.forEach(([id, power]) => { membersMap[id] = power; });
      groups['0'] = {
        $format_version: '0',
        members: membersMap,
        required_power: parseInt(state.form.group.threshold, 10) || 2
      };
      tokenConfig.mainControlGroup = 0;
      tokenConfig.mainControlGroupCanBeModified = state.form?.advanced?.mainControl?.performerType && state.form?.advanced?.mainControl?.performerType !== 'none'
        ? encodeAuthorizedActionTaker(getActorFromPerformer(state.form?.advanced?.mainControl?.performerType, state.form?.advanced?.mainControl?.performerReference))
        : 'NoOne';
    }
  }

  // Generate IDs
  let contractId = options.contractId || 'HtQNfXBZJu3WnvjvCFJKgbvfgWYJxWxaFWy23TKoFjg9';
  let ownerIdentity = options.ownerId || state.form?.ownerIdentityId?.trim() || 'BmKTJeLL3GfH8FxEx7SUbTog4eAKj8vJRDi97gYkxB9p';

  // Try to use EvoSDK for ID generation if available
  if (typeof window !== 'undefined' && window.EvoSDK?.Identifier?.generate) {
    try {
      if (!options.contractId) {
        contractId = window.EvoSDK.Identifier.generate().toString();
      }
      if (!options.ownerId && !state.form?.ownerIdentityId?.trim()) {
        ownerIdentity = window.EvoSDK.Identifier.generate().toString();
      }
    } catch (e) {
      // Fallback to hardcoded placeholders
    }
  }

  // Build Platform contract structure
  const platformContract = {
    $format_version: '1',
    id: contractId,
    ownerId: ownerIdentity,
    version: 1,
    config: {
      $format_version: '0',
      canBeDeleted: false,
      readonly: false,
      keepsHistory: false,
      documentsKeepHistoryContractDefault: false,
      documentsMutableContractDefault: true,
      documentsCanBeDeletedContractDefault: false,
      requiresIdentityEncryptionBoundedKey: null,
      requiresIdentityDecryptionBoundedKey: null,
      sizedIntegerTypes: true
    },
    schemaDefs: {},
    documentSchemas: {},
    tokens: {
      0: tokenConfig
    }
  };

  // Add document schemas if defined
  if (state.form?.documentTypes && Object.keys(state.form.documentTypes).length > 0) {
    platformContract.documentSchemas = state.form.documentTypes;
  }

  // Add groups if any
  if (Object.keys(groups).length > 0) {
    platformContract.groups = groups;
  }

  // Add keywords
  const userKeywordsText = state.form?.search?.keywords?.trim();
  const userKeywords = userKeywordsText ? userKeywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];
  if (userKeywords.length > 0) {
    platformContract.keywords = userKeywords.slice(0, 50);
  } else if (tokenName && tokenName !== 'Unnamed Token') {
    platformContract.keywords = [tokenName.toLowerCase()];
  }

  // Add description
  if (userDescription && userDescription.length >= 3) {
    platformContract.description = userDescription.substring(0, 100);
  } else if (tokenName && tokenName !== 'Unnamed Token') {
    platformContract.description = `Data contract for ${tokenName}`;
  }

  return platformContract;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR GLOBAL ACCESS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.ContractGenerator = {
    generate: generatePlatformContractJSON,
    encodeAuthorizedActionTaker,
    createRuleV0,
    getActorFromPerformer,
    transformKeepsHistory,
    transformLocalizations,
    buildEmissionFunction,
    transformDistributionRules,
    transformMarketplaceRules
  };
}
