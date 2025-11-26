/**
 * Token Configuration Type Definitions
 * Types matching Dash Platform token contract schemas
 */

export interface TokenLocalization {
  singular_form: string;
  plural_form: string;
  should_capitalize: boolean;
}

export interface TokenConventions {
  name: string;
  symbol: string;
  decimals: number;
  localizations: Record<string, TokenLocalization>;
}

export interface SupplyRules {
  base_supply: string;
  max_supply: string;
  is_mutable: boolean;
}

export interface HistoryTracking {
  transfers: boolean;
  mints: boolean;
  burns: boolean;
  freezes: boolean;
  purchases: boolean;
  direct_pricing: boolean;
}

export interface PermissionReference {
  type: 'none' | 'owner' | 'specific_identity' | 'committee';
  identity_id?: string;
  committee_id?: string;
}

export interface ManualActionPermissions {
  enabled: boolean;
  performer: PermissionReference;
  rule_changer: PermissionReference;
  flags: {
    allow_change_authorized_to_none: boolean;
    allow_change_admin_to_none: boolean;
    allow_self_change_admin: boolean;
  };
  destination?: {
    type: 'contract_owner' | 'performer' | 'custom_identity';
    identity_id?: string;
  };
}

export interface FreezePermissions {
  enabled: boolean;
  performer: PermissionReference;
  rule_changer: PermissionReference;
  flags: {
    change_authorized_to_no_one_allowed: boolean;
    change_admin_to_no_one_allowed: boolean;
    self_change_admin_allowed: boolean;
  };
}

export interface TokenPermissions {
  manual_mint: ManualActionPermissions;
  manual_burn: ManualActionPermissions;
  freeze: FreezePermissions;
  emergency_action: ManualActionPermissions;
  marketplace_trade_mode: ManualActionPermissions;
  direct_pricing: ManualActionPermissions;
  main_control: ManualActionPermissions;
}

export type DistributionCadenceType = 'block_based' | 'time_based' | 'epoch_based';

export interface BlockBasedCadence {
  type: 'block_based';
  interval_blocks: number;
}

export interface TimeBasedCadence {
  type: 'time_based';
  interval_seconds: number;
}

export interface EpochBasedCadence {
  type: 'epoch_based';
  interval_epochs: number;
}

export type DistributionCadence = BlockBasedCadence | TimeBasedCadence | EpochBasedCadence;

export type EmissionFunctionType = 'fixed' | 'exponential' | 'step_function' | 'linear';

export interface FixedEmission {
  type: 'fixed';
  amount: string;
}

export interface ExponentialEmission {
  type: 'exponential';
  initial_amount: string;
  decay_rate: number;
}

export interface StepFunctionEmission {
  type: 'step_function';
  steps: Array<{
    amount: string;
    duration_blocks: number;
  }>;
}

export interface LinearEmission {
  type: 'linear';
  start_amount: string;
  end_amount: string;
  duration_blocks: number;
}

export type EmissionFunction = FixedEmission | ExponentialEmission | StepFunctionEmission | LinearEmission;

export interface DistributionRules {
  cadence: DistributionCadence;
  emission_function: EmissionFunction;
  start_block?: number;
  end_block?: number;
}

export interface MarketplaceRules {
  trade_mode: 'permissionless' | 'committee_approved';
  direct_purchase_enabled: boolean;
  pricing_rules?: {
    min_price?: string;
    max_price?: string;
    price_adjustment_rate?: number;
  };
}

export interface ChangeControlRules {
  freeze: boolean;
  unfreeze: boolean;
  destroy_frozen: boolean;
  emergency: boolean;
  direct_purchase: boolean;
  admin: boolean;
}

export interface TokenConfiguration {
  conventions: TokenConventions;
  supply_rules: SupplyRules;
  history_tracking: HistoryTracking;
  permissions: TokenPermissions;
  distribution_rules?: DistributionRules;
  marketplace_rules?: MarketplaceRules;
  change_control: ChangeControlRules;
  owner_identity_id: string;
  metadata?: {
    description?: string;
    keywords?: string[];
    website_url?: string;
    social_links?: Record<string, string>;
  };
}

export interface TokenContractPayload {
  version: string;
  configuration: TokenConfiguration;
  created_at: number;
  created_by: string;
}

export interface QRCodePayload {
  type: 'dash_token_wizard';
  version: string;
  token_config: TokenConfiguration;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface TokenValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}
