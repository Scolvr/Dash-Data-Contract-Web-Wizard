/**
 * Dash Platform SDK Type Definitions
 * Types for Dash SDK integration
 */

export interface DashClientConfig {
  network: 'testnet' | 'mainnet' | 'local';
  wallet?: {
    mnemonic?: string;
    privateKey?: string;
    unsafeOptions?: {
      skipSynchronizationBeforeHeight?: number;
    };
  };
  apps?: Record<string, any>;
  seeds?: string[];
}

export interface DashWallet {
  getAccount(): Promise<DashAccount>;
  exportWallet(): string;
  getUnusedAddress(): Promise<DashAddress>;
  disconnect(): Promise<void>;
}

export interface DashAccount {
  getIdentityIds(): string[];
  getUnusedIdentity(): Promise<DashIdentity>;
  getTotalBalance(): number;
  getConfirmedBalance(): number;
  getUnconfirmedBalance(): number;
}

export interface DashAddress {
  address: string;
  path: string;
  index: number;
}

export interface DashIdentity {
  getId(): string;
  getBalance(): number;
  toJSON(): any;
}

export interface DashPlatform {
  identities: {
    register(): Promise<DashIdentity>;
    get(identityId: string): Promise<DashIdentity | null>;
    topUp(identityId: string, amount: number): Promise<void>;
  };
  contracts: {
    create(contractDefinition: any, identity: DashIdentity): Promise<DashDataContract>;
    publish(dataContract: DashDataContract, identity: DashIdentity): Promise<DashDataContract>;
    get(contractId: string): Promise<DashDataContract | null>;
  };
  documents: {
    create(
      contractId: string,
      identity: DashIdentity,
      documentType: string,
      data: Record<string, any>
    ): Promise<DashDocument>;
    broadcast(document: DashDocument, identity: DashIdentity): Promise<void>;
    get(contractId: string, documentType: string, options?: any): Promise<DashDocument[]>;
  };
  names: {
    register(name: string, identity: DashIdentity): Promise<void>;
    resolve(name: string): Promise<DashIdentity | null>;
    search(pattern: string, limit?: number): Promise<string[]>;
  };
}

export interface DashDataContract {
  getId(): string;
  getOwnerId(): string;
  toJSON(): any;
  setDocumentSchema(documentType: string, schema: any): void;
}

export interface DashDocument {
  getId(): string;
  getOwnerId(): string;
  getType(): string;
  getData(): Record<string, any>;
  set(field: string, value: any): void;
  toJSON(): any;
}

export interface DashClient {
  wallet: DashWallet;
  platform: DashPlatform;
  disconnect(): Promise<void>;
  getStatus(): Promise<DashNetworkStatus>;
}

export interface DashNetworkStatus {
  network: string;
  chain: {
    blocksCount: number;
    bestBlockHash: string;
    difficulty: number;
  };
  masternode: {
    status: string;
    proTxHash: string;
  };
  platform: {
    tenderdash: {
      version: string;
      latestBlockHash: string;
      latestBlockHeight: number;
    };
  };
}

export interface DashError extends Error {
  code?: number;
  data?: any;
}

export interface TransactionResult {
  transactionId: string;
  blockHeight?: number;
  confirmations: number;
}

export interface BalanceInfo {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

declare global {
  interface Window {
    Dash: {
      Client: new (config: DashClientConfig) => DashClient;
    };
  }
}

export {};
