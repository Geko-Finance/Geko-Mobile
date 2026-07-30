import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  isTerminalStatus,
  nextStep,
  stellarAmountToUnits,
  type CctpChainId,
  type CctpTransfer,
  type CctpTransferDirection,
} from "@/src/domain/cctp";
import type { WalletSigner } from "@/src/domain/wallet";
import { useActiveNetworkId, walletKeys } from "@/src/features/wallet/api/wallet-queries";
import { evmAddressToMintRecipientHex } from "@/src/services/api/cctp";

import {
  completeMintStep,
  pollAttestationStep,
  recordExternalBurn,
  resumeCctpTransfer,
  runBurnStep,
  startOutboundTransfer,
} from "./cctp-flow";
import { useResumableCctpTransfers } from "../state/transfer-store";

export const cctpKeys = {
  all: ["cctp"] as const,
  attestation: (transferId: string) => [...cctpKeys.all, "attestation", transferId] as const,
};

const ATTESTATION_POLL_INTERVAL_MS = 5000;

/**
 * Polls Circle's attestation API for a burned/attesting transfer until it reaches a
 * terminal state (`attested`/`minted`) or `failed`; `refetchInterval` stops itself
 * once terminal, matching wallet-queries.ts's read-hook shape. Safe to mount on a
 * screen that was just opened for a transfer resumed mid-flight - it reads the
 * transfer's already-persisted status from the store (via `queryFn`) rather than
 * assuming it starts at `burned`.
 */
export function useCctpAttestationPolling(transfer: CctpTransfer | undefined) {
  return useQuery<CctpTransfer, Error>({
    enabled:
      transfer !== undefined &&
      (transfer.status === "burned" || transfer.status === "attesting"),
    queryFn: () => pollAttestationStep(transfer!.id),
    queryKey: cctpKeys.attestation(transfer?.id ?? "none"),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data === undefined || isTerminalStatus(data.status) || data.status === "attested"
        ? false
        : ATTESTATION_POLL_INTERVAL_MS;
    },
  });
}

export interface StartStellarToRemoteInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly sourceChainId: Extract<CctpChainId, "stellar">;
  readonly destinationChainId: CctpChainId;
  readonly stellarPublicKey: string;
  /** Destination-chain (EVM) recipient address, e.g. `0x...`. */
  readonly recipientAddress: string;
  readonly amount: string;
  readonly signer: WalletSigner;
}

/** Starts a `stellar_to_remote` transfer: records it, then signs+submits the Stellar burn. */
export function useStartStellarToRemoteTransfer() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: StartStellarToRemoteInput): Promise<CctpTransfer> => {
      startOutboundTransfer({
        id: input.id,
        ownerUserId: input.ownerUserId,
        direction: "stellar_to_remote" as CctpTransferDirection,
        sourceChainId: input.sourceChainId,
        destinationChainId: input.destinationChainId,
        stellarPublicKey: input.stellarPublicKey,
        recipientAddress: input.recipientAddress,
        amount: input.amount,
      });

      return runBurnStep({
        transferId: input.id,
        amountUnits: stellarAmountToUnits(input.amount),
        mintRecipientHex: evmAddressToMintRecipientHex(input.recipientAddress),
        signer: input.signer,
      });
    },
    onSuccess: (_transfer, input) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.stellarPublicKey),
      });
    },
  });
}

export interface RecordExternalBurnInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly sourceChainId: CctpChainId;
  readonly stellarPublicKey: string;
  readonly amount: string;
  readonly burnTxHash: string;
}

/** Registers a `remote_to_stellar` transfer whose burn already happened on another wallet - the first step of "receive USDC from another chain". */
export function useRecordExternalCctpBurn() {
  return useMutation({
    mutationFn: async (input: RecordExternalBurnInput): Promise<CctpTransfer> =>
      recordExternalBurn({
        id: input.id,
        ownerUserId: input.ownerUserId,
        direction: "remote_to_stellar",
        sourceChainId: input.sourceChainId,
        destinationChainId: "stellar",
        stellarPublicKey: input.stellarPublicKey,
        recipientAddress: input.stellarPublicKey,
        amount: input.amount,
        burnTxHash: input.burnTxHash,
      }),
  });
}

/** Completes a `remote_to_stellar` transfer's mint and reconciles the recipient's Stellar balance. */
export function useCompleteCctpMint() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: { transferId: string; signer: WalletSigner }): Promise<CctpTransfer> =>
      completeMintStep(input),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, transfer.stellarPublicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(networkId, transfer.stellarPublicKey),
      });
    },
  });
}

/**
 * Resumes one transfer by exactly one step, surfacing failures (including
 * `CctpFlowError("NEEDS_BURN_VERIFICATION")`) to the caller instead of swallowing
 * them - the counterpart to `useResumeAllCctpTransfers`'s best-effort sweep, for an
 * explicit "Retry" tap on a single transfer's status screen.
 */
export function useResumeSingleCctpTransfer() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: {
      transferId: string;
      signer: WalletSigner;
      freshBurn?: { amountUnits: bigint; mintRecipientHex: string };
    }): Promise<CctpTransfer> =>
      resumeCctpTransfer(input.transferId, { signer: input.signer, freshBurn: input.freshBurn }),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, transfer.stellarPublicKey),
      });
    },
  });
}

/**
 * Resumes every non-terminal transfer for the signed-in session by one step each -
 * intended to run once on app launch (see the CCTP status screen's mount effect).
 * Skips (and reports, via `verificationNeeded`) any transfer stuck at
 * `"verify_burn"` rather than guessing at its outcome - see
 * cctp-flow.ts#resumeCctpTransfer's doc.
 */
export function useResumeAllCctpTransfers() {
  const resumable = useResumableCctpTransfers();
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (signer: WalletSigner) => {
      const results: CctpTransfer[] = [];
      const verificationNeeded: CctpTransfer[] = [];

      for (const transfer of resumable) {
        const step = nextStep(transfer);

        if (step === "verify_burn") {
          verificationNeeded.push(transfer);
          continue;
        }

        try {
          const freshBurn =
            step === "burn"
              ? {
                  amountUnits: stellarAmountToUnits(transfer.amount),
                  mintRecipientHex: evmAddressToMintRecipientHex(transfer.recipientAddress),
                }
              : undefined;

          results.push(await resumeCctpTransfer(transfer.id, { signer, freshBurn }));
        } catch {
          // Individual failures are already persisted onto the transfer record
          // (status "failed") by cctp-flow.ts - swallow here so one stuck transfer
          // doesn't block the rest of the resume sweep.
        }
      }

      return { results, verificationNeeded };
    },
    onSuccess: ({ results }) => {
      for (const transfer of results) {
        queryClient.invalidateQueries({
          queryKey: walletKeys.balances(networkId, transfer.stellarPublicKey),
        });
      }
    },
  });
}
