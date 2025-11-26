/**
 * Wizard State Type Definitions
 * Core types for the Dash Token Wizard application state
 */

export type StepId =
  | 'welcome'
  | 'naming'
  | 'permissions'
  | 'advanced'
  | 'distribution'
  | 'search'
  | 'registration';

export type InfoStepId =
  | 'permissions-group'
  | 'permissions-manual-mint'
  | 'permissions-manual-burn'
  | 'permissions-unfreeze'
  | 'permissions-destroy-frozen'
  | 'permissions-emergency-action'
  | 'permissions-max-supply'
  | 'permissions-conventions'
  | 'permissions-marketplace-trade-mode'
  | 'permissions-direct-pricing'
  | 'permissions-main-control';

export type AllStepId = StepId | InfoStepId;

export type StepValidity = 'valid' | 'invalid' | 'unknown' | 'pending';

export interface StepState {
  id: AllStepId;
  validity: StepValidity;
  touched: boolean;
}

export interface LocalizationEntry {
  code: string;
  singularForm: string;
  pluralForm: string;
  shouldCapitalize: boolean;
}

export interface LocalizationRow {
  id: string;
  entry: LocalizationEntry;
}

export interface NamingFormState {
  conventions: {
    localizations: Record<string, LocalizationEntry>;
  };
  rows: LocalizationRow[];
}

export interface KeepHistoryFlags {
  transfers: boolean;
  mints: boolean;
  burns: boolean;
  freezes: boolean;
  purchases: boolean;
  directPricing: boolean;
}

export interface ChangeControlFlags {
  freeze: boolean;
  unfreeze: boolean;
  destroyFrozen: boolean;
  emergency: boolean;
  directPurchase: boolean;
  admin: boolean;
}

export interface PermissionMember {
  type: 'none' | 'owner' | 'specific' | 'committee';
  identity: string;
}

export interface PermissionGroup {
  members: PermissionMember[];
}

export interface ManualActionState {
  enabled: boolean;
  performerType: 'none' | 'owner' | 'specific' | 'committee';
  performerReference: string;
  ruleChangerType: 'none' | 'owner' | 'specific' | 'committee';
  ruleChangerReference: string;
  allowChangeAuthorizedToNone: boolean;
  allowChangeAdminToNone: boolean;
  allowSelfChangeAdmin: boolean;
  destinationType: 'contract-owner' | 'performer' | 'custom';
  destinationIdentity: string;
  allowCustomDestination: boolean;
}

export interface FreezeRulesState {
  enabled: boolean;
  perform: {
    type: 'none' | 'owner' | 'specific' | 'committee';
    identity: string;
  };
  changeRules: {
    type: 'none' | 'owner' | 'specific' | 'committee';
    identity: string;
  };
  flags: {
    changeAuthorizedToNoOneAllowed: boolean;
    changeAdminToNoOneAllowed: boolean;
    selfChangeAdminAllowed: boolean;
  };
}

export interface PermissionsFormState {
  decimals: number;
  baseSupply: string;
  maxSupply: string;
  keepsHistory: KeepHistoryFlags;
  startAsPaused: boolean;
  manualMint: ManualActionState;
  manualBurn: ManualActionState;
  manualFreeze: FreezeRulesState;
  emergencyAction: ManualActionState;
  marketplaceTradeMode: ManualActionState;
  directPricing: ManualActionState;
  mainControl: ManualActionState;
}

export type CadenceType = 'BlockBasedDistribution' | 'TimeBasedDistribution' | 'EpochBasedDistribution';
export type EmissionType = 'FixedAmount' | 'Exponential' | 'StepFunction' | 'Linear';

export interface CadenceConfig {
  type: CadenceType;
  intervalBlocks?: string;
  intervalSeconds?: string;
  intervalEpochs?: string;
}

export interface EmissionConfig {
  type: EmissionType;
  amount?: string;
  initialAmount?: string;
  decayRate?: string;
  steps?: Array<{ amount: string; duration: string }>;
  startAmount?: string;
  endAmount?: string;
}

export interface DistributionFormState {
  cadence: CadenceConfig;
  emission: EmissionConfig;
}

export interface AdvancedFormState {
  tradeMode: 'permissionless' | 'committee-approved';
  changeControl: ChangeControlFlags;
}

export interface WalletState {
  mnemonic: string;
  privateKey: string;
  address: string;
  balance: number | null;
  fingerprint: string;
}

export interface IdentityState {
  id: string;
}

export interface PreflightState {
  hasEnoughBalance: boolean;
  estimatedCost: number;
  message: string;
}

export type RegistrationMethod = 'mobile' | 'det' | 'self';

export interface RegistrationFormState {
  method: RegistrationMethod;
  wallet: WalletState;
  identity: IdentityState;
  preflight: PreflightState;
}

export interface FormState {
  tokenName: string;
  tokenSymbol: string;
  ownerIdentity: string;
  naming: NamingFormState;
  permissions: PermissionsFormState;
  distribution: DistributionFormState;
  advanced: AdvancedFormState;
  registration: RegistrationFormState;
}

export interface RuntimeState {
  walletClient: any | null;
  identityId: string | null;
  contractId: string | null;
}

export interface WizardState {
  active: AllStepId;
  furthestValidIndex: number;
  steps: Record<AllStepId, StepState>;
  form: FormState;
  runtime: RuntimeState;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  normalized?: string;
  errors?: string[];
}

export interface LocalizationValidationResult {
  valid: boolean;
  errors: string[];
}
