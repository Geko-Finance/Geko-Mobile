import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { canTransition, type CctpTransfer, type CctpTransferStatus } from "@/src/domain/cctp";
import { useSessionStore } from "@/src/features/auth/session/session-store";
import { asyncStateStorage } from "@/src/services/storage/async-json-storage";

interface CctpTransferState {
  transfers: CctpTransfer[];
  upsertTransfer: (transfer: CctpTransfer) => void;
  /** Advances `id` to `status`, merging in any newly observed on-chain facts; no-ops (returns false) on an invalid transition. */
  advance: (
    id: string,
    status: CctpTransferStatus,
    patch?: Partial<
      Pick<CctpTransfer, "burnTxHash" | "messageBytes" | "attestation" | "mintTxHash">
    >
  ) => boolean;
  markFailed: (id: string, step: CctpTransfer["failedStep"], reason: string) => void;
}

const initialTransfers: CctpTransfer[] = [];

/**
 * Local-only CCTP transfer state (no backend coordination, mirroring
 * multisig/state/proposal-store.ts and wallet/state/wallet-store.ts). This is what
 * makes an interrupted transfer resumable: every on-chain fact learned mid-flow
 * (burnTxHash, messageBytes, attestation, mintTxHash) is written here immediately,
 * before the app moves on to the next step, so a relaunch can pick up exactly where
 * it left off (see domain/cctp/transfer.ts#nextStep and
 * features/cctp/api/cctp-flow.ts#resumeCctpTransfer).
 */
export const useCctpTransferStore = create<CctpTransferState>()(
  persist(
    (set, get) => ({
      transfers: initialTransfers,
      upsertTransfer: (transfer) =>
        set((state) => {
          const existingIndex = state.transfers.findIndex((entry) => entry.id === transfer.id);
          const transfers =
            existingIndex >= 0
              ? state.transfers.map((entry, index) => (index === existingIndex ? transfer : entry))
              : [...state.transfers, transfer];

          return { transfers };
        }),
      advance: (id, status, patch) => {
        const current = get().transfers.find((entry) => entry.id === id);

        if (current === undefined || !canTransition(current.status, status)) {
          return false;
        }

        set((state) => ({
          transfers: state.transfers.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  ...patch,
                  status,
                  failedStep: status === "failed" ? entry.failedStep : undefined,
                  failureReason: status === "failed" ? entry.failureReason : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : entry
          ),
        }));

        return true;
      },
      markFailed: (id, step, reason) =>
        set((state) => ({
          transfers: state.transfers.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: "failed",
                  failedStep: step,
                  failureReason: reason,
                  updatedAt: new Date().toISOString(),
                }
              : entry
          ),
        })),
    }),
    {
      name: "geko.cctp.transfers.v1",
      partialize: (state) => ({ transfers: state.transfers }),
      storage: createJSONStorage(() => asyncStateStorage),
      version: 1,
    }
  )
);

/** Subscribes to CCTP transfers for the signed-in session's own Stellar account, newest first. */
export function useCctpTransfers(stellarPublicKey: string | undefined): CctpTransfer[] {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const transfers = useCctpTransferStore((state) => state.transfers);

  return useMemo(
    () =>
      ownerUserId === undefined || stellarPublicKey === undefined
        ? []
        : transfers
            .filter(
              (transfer) =>
                transfer.ownerUserId === ownerUserId && transfer.stellarPublicKey === stellarPublicKey
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [transfers, ownerUserId, stellarPublicKey]
  );
}

/** Subscribes to a single CCTP transfer by id, scoped to the signed-in session. */
export function useCctpTransfer(id: string | undefined): CctpTransfer | undefined {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const transfers = useCctpTransferStore((state) => state.transfers);

  return transfers.find((transfer) => transfer.id === id && transfer.ownerUserId === ownerUserId);
}

/** Every non-terminal (resumable) transfer for the signed-in session, across all accounts - used to resume on app launch. */
export function useResumableCctpTransfers(): CctpTransfer[] {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const transfers = useCctpTransferStore((state) => state.transfers);

  return useMemo(
    () =>
      ownerUserId === undefined
        ? []
        : transfers.filter(
            (transfer) => transfer.ownerUserId === ownerUserId && transfer.status !== "minted"
          ),
    [transfers, ownerUserId]
  );
}
