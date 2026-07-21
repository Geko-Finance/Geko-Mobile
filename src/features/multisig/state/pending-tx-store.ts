import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mergeSignatures, pendingTxIdForXdr } from "@/src/domain/multisig";
import type { PendingTx } from "@/src/domain/multisig";
import { asyncStateStorage } from "@/src/services/storage/async-json-storage";

interface PendingTxState {
  pendingTxs: PendingTx[];
  upsertPendingTx: (
    sourceAccountId: string,
    envelopeXdr: string,
    networkPassphrase: string,
    description?: string
  ) => void;
  removePendingTx: (id: string) => void;
}

export const usePendingTxStore = create<PendingTxState>()(
  persist(
    (set, get) => ({
      pendingTxs: [],
      upsertPendingTx: (sourceAccountId, envelopeXdr, networkPassphrase, description) => {
        const id = pendingTxIdForXdr(envelopeXdr, networkPassphrase);
        const existingIndex = get().pendingTxs.findIndex((tx) => tx.id === id);

        if (existingIndex === -1) {
          const pendingTx: PendingTx = {
            id,
            sourceAccountId,
            envelopeXdr,
            networkPassphrase,
            createdAt: new Date().toISOString(),
            description,
          };

          set((state) => ({ pendingTxs: [...state.pendingTxs, pendingTx] }));
          return;
        }

        set((state) => ({
          pendingTxs: state.pendingTxs.map((tx, index) =>
            index === existingIndex
              ? {
                  ...tx,
                  envelopeXdr: mergeSignatures(tx.envelopeXdr, envelopeXdr, networkPassphrase),
                }
              : tx
          ),
        }));
      },
      removePendingTx: (id) =>
        set((state) => ({
          pendingTxs: state.pendingTxs.filter((tx) => tx.id !== id),
        })),
    }),
    {
      name: "geko.wallet.pendingTransactions.v1",
      partialize: (state) => ({ pendingTxs: state.pendingTxs }),
      storage: createJSONStorage(() => asyncStateStorage),
      version: 1,
    }
  )
);

/** Subscribes to all locally-known pending transactions for a given source account. */
export function usePendingTxsForAccount(accountId: string): PendingTx[] {
  return usePendingTxStore((state) =>
    state.pendingTxs.filter((tx) => tx.sourceAccountId === accountId)
  );
}
