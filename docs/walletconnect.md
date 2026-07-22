# WalletConnect (planned, not built)

Status: **not implemented**. This documents the research done and the intended approach so the work isn't lost, not a description of current behavior.

## Goal

Let a Geko wallet connect to external Stellar dApps (sign transactions a dApp requests, the way LOBSTR/Freighter/xBull already do) via WalletConnect.

## Scope decision

Custodial (Cavos) wallets only, for now. Non-custodial WalletConnect support is blocked on the non-custodial wallet epic itself existing first (see "Two wallet-custody paths" - `src/domain/wallet/account.ts`'s `WalletCustody` doc comment) - there is no on-device signer to relay a signing request to yet. Don't bundle non-custodial signer work into a WalletConnect task; treat it as a separate, later epic.

## Why this is viable for custodial wallets

WalletConnect (now under Reown) doesn't care about custody model - it only needs something to call when a dApp requests a signature. For custodial accounts, that's the already-built `getCavosClient().signXdr(session, xdr)` (`src/services/api/cavos/cavos-client.ts`) - the same relay pattern Geko already uses for asset payments today. No backend changes are required; the pairing/relay traffic talks directly to WalletConnect's relay server from the mobile app, and only the actual signing step touches Geko's existing Cavos backend.

## Stellar support in WalletConnect/Reown

- RPC methods: `stellar_signXDR` (sign only) and `stellar_signAndSubmitXDR` (sign + submit; a `status: "pending"` response indicates multisig needing more signatures - out of scope, Cavos custodial accounts don't support multisig).
- Source: <https://docs.reown.com/advanced/multichain/rpc-reference/stellar-rpc> (flagged by Reown as still under review as of this writing - re-check before implementing).
- The Stellar CAIP-2 namespace string was not directly confirmed from the docs fetched during this research - confirm it before implementation.

## Wallet-side SDK

`@reown/walletkit` (successor to `@walletconnect/web3wallet`) for React Native. Install docs: <https://docs.walletconnect.network/wallet-sdk/react-native/installation>. Native deps: `@walletconnect/react-native-compat`, `@react-native-async-storage/async-storage` (already used), `@react-native-community/netinfo`, `react-native-get-random-values`, `fast-text-encoding`, plus `expo-application`. Needs a dev-client/EAS build - not a new constraint, Geko already requires one (expo-camera, react-native-svg, etc.).

## Reference implementation

LOBSTR wallet has shipped this exact custodial-relay pattern since 2021: QR-pair with a dApp (StellarX, StellarTerm, etc.), an in-app approve/reject prompt per signing request, review-before-sign, keys never leave the wallet. Write-up: <https://medium.com/ultra-stellar/lobstr-walletconnect-7807fb9c83ae>. Good UX template to copy for the approval screen.

## Planned integration shape

1. Add `@reown/walletkit` + deps, rebuild the dev client.
2. New screens: QR/pairing entry, session-proposal approval, signing-request approval (reuse `ConfirmPaymentScreen`'s review-before-send pattern).
3. On an incoming `stellar_signXDR` / `stellar_signAndSubmitXDR` request: call the existing `getCavosClient().signXdr(...)`, then either return the signed XDR to the dApp or submit it via the existing Horizon-submit path already used for asset payments.

## Known limitations for v1

- Signing requests need the app foregrounded - no push notifications in Geko yet. LOBSTR's own flow is foreground-only too, so this is an acceptable v1 constraint, not a blocker.
- Multisig (the `pending` status case) is out of scope - Cavos custodial accounts don't support it.
