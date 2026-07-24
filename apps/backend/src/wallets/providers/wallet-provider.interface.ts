import type { WalletRecord } from '../wallets.repository';

export type ProvisionWalletInput =
  | { custodyType: 'cavos_custodial'; userId: string; label?: string }
  | {
      custodyType: 'non_custodial';
      userId: string;
      label?: string;
      publicKey: string;
    };

export interface ProvisionedWallet {
  publicAddress: string;
  status: 'pending' | 'needs_device_approval' | 'ready';
  /** Provider-specific fields for the corresponding *_wallet_details table. */
  providerDetails: Record<string, unknown>;
}

export interface WalletBalance {
  stroops: string;
}

export interface WalletProvider {
  readonly custodyType: 'cavos_custodial' | 'non_custodial';
  provisionWallet(input: ProvisionWalletInput): Promise<ProvisionedWallet>;
  getBalance(wallet: WalletRecord): Promise<WalletBalance>;
  /**
   * Optional post-persist hook (e.g. custodial recovery-code setup once wallet.id exists).
   * May return `revealOnce` secrets shown to the client exactly once in the create response —
   * never persisted in plaintext for re-fetch, never logged.
   */
  finalizeProvisioning?(
    wallet: WalletRecord,
  ): Promise<{ revealOnce?: Record<string, string> } | void>;
}

export interface SigningCapableWalletProvider extends WalletProvider {
  execute(
    wallet: WalletRecord,
    params: { amountStroops: string; destination: string },
  ): Promise<{ hash: string }>;
  sign(
    wallet: WalletRecord,
    unsignedXdr: string,
  ): Promise<{ signedXdr: string }>;
  addTrustline(
    wallet: WalletRecord,
    params: { code: string; issuer: string },
  ): Promise<{ hash: string }>;
  recoverDevice(
    wallet: WalletRecord,
    recoveryCode: string,
  ): Promise<{ status: 'ready' }>;
}

export function isSigningCapable(
  provider: WalletProvider,
): provider is SigningCapableWalletProvider {
  return (
    typeof (provider as SigningCapableWalletProvider).execute === 'function'
  );
}
