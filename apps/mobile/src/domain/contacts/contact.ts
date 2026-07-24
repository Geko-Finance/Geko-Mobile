import type { StellarNetworkId } from "../wallet/network";

/**
 * Saved recipient address. `id` is a server-assigned uuid; uniqueness is enforced per
 * (user, network, address) on the backend.
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

/** Normalized payload for `POST /contacts` — no server-assigned fields. */
export interface MakeContactInput {
  label: string;
  address: string;
  network: StellarNetworkId;
  memo?: string;
  favorite?: boolean;
}

/** Normalizes user input into a contact creation payload for the backend. */
export function makeContact(input: MakeContactInput): MakeContactInput {
  const memo = input.memo?.trim();

  return {
    address: input.address.trim(),
    favorite: input.favorite ?? false,
    label: input.label.trim(),
    memo: memo === undefined || memo === "" ? undefined : memo,
    network: input.network,
  };
}
