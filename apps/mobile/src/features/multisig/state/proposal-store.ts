import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PendingProposal } from "@/src/domain/multisig";
import { useSessionStore } from "@/src/features/auth/session/session-store";
import { asyncStateStorage } from "@/src/services/storage/async-json-storage";

interface ProposalState {
  proposals: PendingProposal[];
  upsertProposal: (proposal: PendingProposal) => void;
  removeProposal: (id: string) => void;
  markSubmitted: (id: string, hash: string) => void;
  markRejected: (id: string) => void;
}

const initialProposals: PendingProposal[] = [];

/**
 * Local-only pending-proposal state (no backend coordination this epic - see the epic
 * ticket's "off-chain coordination backend: out of scope" note). Persists proposal metadata
 * and the accumulated envelope XDR (never secrets - public keys/XDR/weights only) via
 * AsyncStorage, mirroring wallet-store.ts.
 *
 * `envelopeXdr` on each proposal is the single source of truth for which signatures exist;
 * this store never tracks "who has signed" independently of it. `upsertProposal` is used both
 * to create a new proposal and to merge in an updated envelope scanned back from a co-signer.
 */
export const useProposalStore = create<ProposalState>()(
  persist(
    (set) => ({
      proposals: initialProposals,
      upsertProposal: (proposal) =>
        set((state) => {
          const existingIndex = state.proposals.findIndex(
            (entry) => entry.id === proposal.id
          );
          const proposals =
            existingIndex >= 0
              ? state.proposals.map((entry, index) =>
                  index === existingIndex ? proposal : entry
                )
              : [...state.proposals, proposal];

          return { proposals };
        }),
      removeProposal: (id) =>
        set((state) => ({
          proposals: state.proposals.filter((proposal) => proposal.id !== id),
        })),
      markSubmitted: (id, hash) =>
        set((state) => ({
          proposals: state.proposals.map((proposal) =>
            proposal.id === id
              ? {
                  ...proposal,
                  status: "submitted",
                  submittedHash: hash,
                  updatedAt: new Date().toISOString(),
                }
              : proposal
          ),
        })),
      markRejected: (id) =>
        set((state) => ({
          proposals: state.proposals.map((proposal) =>
            proposal.id === id
              ? {
                  ...proposal,
                  status: "rejected",
                  updatedAt: new Date().toISOString(),
                }
              : proposal
          ),
        })),
    }),
    {
      name: "geko.multisig.proposals.v1",
      partialize: (state) => ({ proposals: state.proposals }),
      storage: createJSONStorage(() => asyncStateStorage),
      version: 1,
    }
  )
);

/**
 * Subscribes to pending proposals for one multisig account, filtered to the signed-in
 * session's own proposals - this store persists across sign-outs (metadata, not a secret),
 * so every read path must filter by owner, same discipline as useWalletAccounts.
 */
export function useProposalsForAccount(
  accountPublicKey: string | undefined
): PendingProposal[] {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const proposals = useProposalStore((state) => state.proposals);

  return useMemo(
    () =>
      ownerUserId === undefined || accountPublicKey === undefined
        ? []
        : proposals.filter(
            (proposal) =>
              proposal.ownerUserId === ownerUserId &&
              proposal.accountPublicKey === accountPublicKey
          ),
    [proposals, ownerUserId, accountPublicKey]
  );
}

/** Subscribes to a single pending proposal by id, scoped to the signed-in session. */
export function useProposal(id: string | undefined): PendingProposal | undefined {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const proposals = useProposalStore((state) => state.proposals);

  return proposals.find(
    (proposal) => proposal.id === id && proposal.ownerUserId === ownerUserId
  );
}
