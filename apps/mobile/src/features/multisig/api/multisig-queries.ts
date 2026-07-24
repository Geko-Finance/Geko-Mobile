import { useQuery } from "@tanstack/react-query";

import type { MultisigAccount } from "@/src/domain/multisig";
import type { StellarNetworkId } from "@/src/domain/wallet";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { getStellarClient } from "@/src/services/api/stellar/stellar-client";

/** TanStack Query key factory for multisig queries. */
export const multisigKeys = {
  all: ["multisig"] as const,
  account: (networkId: StellarNetworkId, publicKey: string) =>
    [...multisigKeys.all, "account", networkId, publicKey] as const,
};

/** Fetches the live signer/threshold state for a Stellar account on the active network. */
export function useMultisigAccount(publicKey: string | undefined) {
  const networkId = useActiveNetworkId();

  return useQuery<MultisigAccount, Error>({
    enabled: publicKey !== undefined,
    queryFn: () => getStellarClient().fetchMultisigAccount(publicKey!),
    queryKey: multisigKeys.account(networkId, publicKey ?? "none"),
  });
}
