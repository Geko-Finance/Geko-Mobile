import type { WalletAccount, WalletSigner } from "@/src/domain/wallet";

import { LocalWalletSigner } from "./local-signer";

/** Resolves the right `WalletSigner` implementation for an account's custody kind. */
export function getWalletSigner(account: WalletAccount): WalletSigner {
  switch (account.custody) {
    case "non_custodial":
      return new LocalWalletSigner(account.publicKey);
    case "custodial":
      throw new Error("Custodial signing is not implemented yet");
    case "watch_only":
      throw new Error("Watch-only accounts cannot sign transactions");
  }
}
