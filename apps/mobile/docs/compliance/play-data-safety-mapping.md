# Google Play Data Safety Form Mapping

> **DRAFT, for legal/product review before Play Console submission. Not final copy.**

Maps data handled by Geko (per codebase) to [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469) categories.

**Codebase references:** `apps/backend/src/auth/`, `apps/backend/src/db/schema/`, `apps/backend/src/cross-border/`, `apps/mobile/src/services/wallet/local-signer.ts`, `apps/mobile/src/features/notifications/register-push-token.ts`

**Tracking:** No advertising or cross-app tracking SDKs found in the codebase. Declare **No** for "Does your app collect or share any of the required user data types for tracking purposes?" unless legal identifies otherwise.

---

## Personal info

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| Email address | Yes | Yes, Cavos (auth) | Account creation, sign-in, communication | Required for account |
| Name | Yes (when provided via OAuth) | Yes, Cavos (auth) | Account profile | Optional (OAuth only) |
| User IDs | Yes (internal UUID, Cavos provider subject, device ID) | Yes, Cavos, Abroad Finance (`user_id`) | Account linking, cross-border transactions | Required |
| Address (blockchain wallet addresses) | Yes | Yes, public blockchains on broadcast | Wallet operations, saved contacts | Required for wallet use |
| Other personal info (saved contact labels, memos) | Yes | No | User convenience (address book) | Optional |

---

## Financial info

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| User payment info (bank account number, bank code) | Yes | Yes, Abroad Finance | Cross-border remittance execution | Required for cross-border sends |
| Other financial info (tax ID, target currency, payment method, quote/tx metadata, on-chain tx hash) | Yes | Yes, Abroad Finance | Cross-border quotes & settlement | Required for cross-border sends |
| Purchase history | No (in-app purchases not implemented) | N/A | N/A | N/A |

**Note:** Non-custodial wallet private keys are **not** collected by Geko servers (`local-signer.ts`). Custodial encrypted secrets may exist server-side (`wallet_secrets`), confirm disclosure with legal if custodial path ships in v1.

---

## Photos and videos

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| Photos | Planned (KYC document/selfie screens exist as placeholders; verification via third-party `kycLink` from Abroad Finance) | Yes, KYC provider (via Abroad Finance) | Regulatory identity verification | Required for cross-border where mandated |

---

## App activity

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| App interactions | Limited (audit log actions, session metadata) | No | Security, fraud prevention | Required (automatic) |
| In-app search history | No | N/A | N/A | N/A |
| Other user-generated content | Yes (contact labels/memos) | No | Address book | Optional |
| Other actions | Yes (notification preference toggles) | No | Notification settings | Optional |

---

## App info and performance

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| Crash logs | Not implemented in codebase | N/A | N/A | N/A |
| Diagnostics | Not implemented in codebase | N/A | N/A | N/A |
| Other app performance data | No | N/A | N/A | N/A |

---

## Device or other IDs

| Data type (Play category) | Collected? | Shared with third parties? | Purpose | Optional or required |
|---------------------------|------------|----------------------------|---------|----------------------|
| Device or other IDs | Yes (app-generated `deviceId`, Expo push token) | Yes, Apple/Google (push delivery via Expo) | Push notifications, device registration | Optional (user can deny notification permission) |

---

## Security practices (Play Console declarations)

| Declaration | Draft answer | Notes |
|-------------|--------------|-------|
| Data encrypted in transit | Yes | HTTPS to backend |
| Data encrypted at rest | Yes [confirm with infra] | Server DB + on-device SecureStore for keys |
| Users can request data deletion | Yes [TBD process] | See privacy policy draft |
| Committed to Play Families Policy | N/A unless targeting children | Fintech wallet, likely not |

---

## Third-party sharing summary

| Third party | Data categories shared | Purpose |
|-------------|------------------------|---------|
| Cavos | Email, name, auth identifiers | Authentication; custodial wallet (if used) |
| Abroad Finance | Bank account, tax ID, user ID, transaction metadata | Cross-border payments & KYC |
| Apple / Google (via Expo push) | Push token | Notification delivery |

---

> **DRAFT, for legal/product review before Play Console submission. Not final copy.**
