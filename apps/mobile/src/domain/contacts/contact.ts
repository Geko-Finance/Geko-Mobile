import type { StellarNetworkId } from "../wallet/network";

/**
 * Saved recipient address. `id` equals `address` — one contact per address per network is the
 * v1 model, mirroring `WalletAccount` (`id === publicKey`); editing an address is treated as
 * replacing the entry rather than renaming its id.
 */
export interface Contact {
  readonly id: string;
  readonly label: string;
  readonly address: string;
  readonly network: StellarNetworkId;
  readonly memo?: string;
  readonly favorite: boolean;
  readonly createdAt: string;
}

export interface MakeContactInput {
  label: string;
  address: string;
  network: StellarNetworkId;
  memo?: string;
  favorite?: boolean;
  createdAt?: string;
}

export function makeContact(input: MakeContactInput): Contact {
  const memo = input.memo?.trim();

  return {
    address: input.address,
    createdAt: input.createdAt ?? new Date().toISOString(),
    favorite: input.favorite ?? false,
    id: input.address,
    label: input.label.trim(),
    memo: memo === undefined || memo === "" ? undefined : memo,
    network: input.network,
  };
}
