# Apple Privacy Nutrition Labels

> **DRAFT — for legal/product review before App Store Connect submission. Not final copy.**

Maps data handled by Geko (per codebase) to [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) categories.

**Codebase references:** `apps/backend/src/auth/`, `apps/backend/src/db/schema/`, `apps/backend/src/cross-border/`, `apps/mobile/src/services/wallet/local-signer.ts`, `apps/mobile/src/features/notifications/register-push-token.ts`

---

## Data Used to Track You

| Apple category | Collected? | Notes |
|----------------|------------|-------|
| All tracking categories | **No** | No advertising or cross-app tracking SDKs in codebase |

Declare **No, we do not track users** unless legal identifies tracking not visible in code.

---

## Data Linked to You

Data connected to the user's identity (account, device, or other identifiable link).

### Contact Info

| Apple subcategory | Collected? | Purpose | Third-party sharing |
|-------------------|------------|---------|---------------------|
| Email address | Yes | App functionality, account management | Cavos (auth provider) |
| Name | Yes (OAuth profile, when provided) | App functionality | Cavos (auth provider) |

### Financial Info

| Apple subcategory | Collected? | Purpose | Third-party sharing |
|-------------------|------------|---------|---------------------|
| Payment info (bank account number, bank code, tax ID) | Yes | App functionality (cross-border remittance) | Abroad Finance |
| Other financial info (wallet public addresses, transaction references, on-chain hashes, target currency) | Yes | App functionality | Abroad Finance; public blockchains |

**Not collected by Geko servers:** non-custodial private keys remain on device (`local-signer.ts`, `custody: "non_custodial"`).

### Identifiers

| Apple subcategory | Collected? | Purpose | Third-party sharing |
|-------------------|------------|---------|---------------------|
| User ID | Yes (internal UUID, Cavos `providerSubject`) | App functionality | Cavos; Abroad Finance (`user_id`) |
| Device ID | Yes (app-generated UUID in `register-push-token.ts`) | App functionality (push registration) | Not shared beyond push infra |

### User Content

| Apple subcategory | Collected? | Purpose | Third-party sharing |
|-------------------|------------|---------|---------------------|
| Other user content (saved contact labels, memos, wallet labels) | Yes | App functionality | No |
| Photos or videos | Planned (KYC screens are placeholders; `kycLink` from Abroad Finance for verification) | App functionality (compliance) | KYC provider via Abroad Finance |

### Usage Data

| Apple subcategory | Collected? | Purpose | Third-party sharing |
|-------------------|------------|---------|---------------------|
| Product interaction | Limited (audit log actions, session IP/user agent) | App functionality, fraud prevention | No |
| Advertising data | No | — | — |
| Other usage data | No analytics SDK | — | — |

---

## Data Not Linked to You

| Apple category | Collected? | Notes |
|----------------|------------|-------|
| All categories | **None identified** | Data in codebase is tied to authenticated user accounts or registered devices |

If legal determines any aggregated/de-identified processing exists outside this codebase review, update accordingly.

---

## Purpose labels (per collected type)

Use these purposes when filling App Store Connect checkboxes:

| Purpose | Applies to |
|---------|------------|
| App Functionality | Account auth, wallet, contacts, cross-border payments, push notifications |
| Developer's Advertising or Marketing | Notification preference includes `marketing` toggle — only if marketing pushes are sent |
| Analytics | **No** — not implemented in codebase |
| Product Personalization | **No** — not implemented in codebase |
| Other Purposes | Fraud prevention / security (audit logs, session metadata) — confirm with legal |

---

## Third-party partners (App Store Connect disclosure)

| Partner | Data received | Linked to user? |
|---------|---------------|-----------------|
| Cavos | Email, name, auth identifiers | Yes |
| Abroad Finance | Bank account, tax ID, user ID, transaction data | Yes |
| KYC provider (via Abroad Finance `kycLink`) | Identity verification documents | Yes |
| Apple Push Notification service | Push token (via Expo) | Yes (device registration) |

---

## Encryption export compliance

`ITSAppUsesNonExemptEncryption: false` is set in `apps/mobile/app.json`. Legal must confirm exemption eligibility before submission (Stellar wallet crypto libraries on device). See `store-submission-checklist.md`.

---

## Quick reference — declare in App Store Connect

| Section | Draft declaration |
|---------|-------------------|
| Tracking | No |
| Data Linked to You | Contact Info, Financial Info, Identifiers, User Content (as above) |
| Data Not Linked to You | None |
| Privacy policy URL | [TBD — public URL after legal finalizes policy] |

---

> **DRAFT — for legal/product review before App Store Connect submission. Not final copy.**
