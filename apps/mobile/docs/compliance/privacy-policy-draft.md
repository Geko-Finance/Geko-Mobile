# Privacy Policy

> **DRAFT — for legal review, not published copy. Do not host this version publicly without legal sign-off.**

**Effective date:** [TBD]  
**Last updated:** [TBD]

Geko ("we", "us") operates the Geko mobile wallet app. This draft describes data practices grounded in the current codebase. Legal counsel must review and finalize before publication.

---

## 1. What we collect

| Category | Examples | Where in product | Stored by |
|----------|----------|------------------|-----------|
| **Account & contact info** | Email address, display name (from OAuth profile when provided) | Sign-in via email OTP or Google/Apple OAuth through Cavos (`apps/backend/src/auth/`) | Geko backend (`users`, `auth_identities`) |
| **Authentication session data** | Hashed refresh tokens, IP address, user agent | Issued on login (`auth.service.ts`, `sessions` schema) | Geko backend |
| **Wallet public addresses** | Stellar (and other chain) public keys linked to your account | Wallet registration | Geko backend (`wallets`) |
| **Non-custodial private keys** | Encrypted key material | Created/imported on device; signing via PIN + biometrics (`local-signer.ts`, `SecureStoreKeyStore`) | **Device only** — not transmitted to Geko servers for non-custodial wallets |
| **Custodial wallet linkage** | Cavos user identifier for custodial accounts | Custodial onboarding path | Geko backend (`custodial_wallet_details`) |
| **Saved contacts** | Label, blockchain address, network, optional memo | In-app address book | Geko backend (`contacts`) |
| **Cross-border payment details** | Bank account number, optional bank code, tax ID, target currency, payment method | Cross-border send flow | Geko backend (`cross_border_transactions`); forwarded to payment provider |
| **Cross-border transaction metadata** | Quote ID, transaction reference, status, on-chain tx hash | Cross-border service | Geko backend; shared with payment provider |
| **Identity verification (KYC) data** | Government ID, selfie, and related verification data required for regulatory compliance | KYC flows (in-app screens; verification may be completed via third-party link returned for cross-border transactions) | **Third-party KYC / payment provider** — not a dedicated `apps/backend/src/kyc` module today |
| **Device & push data** | Push notification token, app-generated device ID, platform (iOS/Android), app version | Push registration (`register-push-token.ts`, `devices` schema) | Geko backend |
| **Notification preferences** | Toggles for security, transaction, marketing, etc. alerts | Settings screen | Geko backend (`notification_preferences`) |
| **Security audit logs** | Action type, optional metadata, IP address | Security-sensitive operations | Geko backend (`audit_logs`) |

**What we do not collect (based on current codebase):** no third-party advertising or analytics SDKs; no data sold for cross-app tracking.

---

## 2. Why we collect it

| Purpose | Data used |
|---------|-----------|
| Create and secure your account | Email, OAuth identity, session tokens |
| Operate your wallet | Public addresses; on-device private keys (non-custodial) |
| Send/receive and record payments | Wallet addresses, transaction metadata |
| Cross-border remittances | Bank account, tax ID, currency/payment method — required to execute transfers |
| Regulatory compliance (KYC/AML) | Identity verification data via authorized providers |
| Fraud prevention & security | Session IP/user agent, audit logs, security notifications |
| Push notifications | Device push token, preferences |
| Convenience | Saved contacts, display name |

---

## 3. How we store and secure data

- **Server data** is stored in Geko’s backend database (PostgreSQL). Refresh tokens are stored as hashes, not plaintext.
- **Non-custodial private keys** are encrypted on your device using industry-standard libraries (`@stellar/typescript-wallet-sdk-km`, Scrypt encrypter) and protected by your wallet PIN and optional biometric lock (`expo-secure-store`, `expo-local-authentication`). Geko does not have custody of these keys.
- **Custodial wallet secrets** (if you use a custodial wallet) may be stored server-side in encrypted form (`wallet_secrets` schema) — details to be confirmed in final policy.
- **Transport:** API communication uses HTTPS in production environments.
- **Access controls:** Internal access limited to authorized personnel on a need-to-know basis [TBD — legal to specify].

---

## 4. Third parties we share data with

| Third party | Role | Data shared |
|-------------|------|-------------|
| **Cavos** | Identity provider — email OTP, Google/Apple OAuth | Email, verification codes, OAuth tokens (handled by Cavos during auth) |
| **Cavos** | Custodial wallet provider (custodial accounts only) | Account/wallet linkage per custodial integration |
| **Abroad Finance** (cross-border payment provider) | Cross-border quotes, transactions, and KYC | Bank account number, tax ID, user ID, transaction details (`abroad-finance.provider.ts`) |
| **KYC provider** (via payment provider link) | Identity verification for regulated transfers | Identity verification data required for compliance |
| **Apple / Google** | Push notification delivery (via Expo) | Push tokens |
| **Public blockchains** (e.g. Stellar) | Transaction broadcast | Public transaction data inherent to on-chain transfers |

We do not sell your personal information.

---

## 5. Your rights

Depending on your jurisdiction, you may have the right to:

- **Access** a copy of personal data we hold about you
- **Correct** inaccurate data
- **Delete** your account and associated data, subject to legal retention requirements
- **Withdraw consent** for optional processing (e.g. marketing notifications)
- **Port** certain data in a machine-readable format [TBD — legal to specify jurisdictions]

To exercise these rights, contact us at the address below. We will respond within the timeframe required by applicable law.

**Non-custodial wallets:** deleting your account does not remove funds from the blockchain. You must transfer or back up wallet access before account deletion.

---

## 6. Data retention

| Data | Retention (draft — legal to finalize) |
|------|---------------------------------------|
| Account & wallet records | Duration of account + [TBD] after closure |
| Session tokens | Until expiry or logout; refresh token hashes revoked on logout |
| Cross-border transaction records | As required by financial regulations [TBD period] |
| Audit logs | [TBD period] for security and compliance |
| Push tokens | Until device unregistered or token invalidated |

---

## 7. Children

Geko is not intended for users under [TBD age]. We do not knowingly collect data from children.

---

## 8. International transfers

Data may be processed in [TBD countries/regions]. Cross-border payment processing involves transfers to payment providers operating in destination countries. Legal mechanisms (e.g. SCCs) [TBD].

---

## 9. Changes to this policy

We will post updates at [TBD URL] and update the "Last updated" date. Material changes will be communicated via the app or email where required by law.

---

## 10. Contact us

**Privacy inquiries:** [TBD — privacy@geko.app or legal entity address]  
**Support:** [TBD — support URL from store listing]

---

> **DRAFT — for legal review, not published copy. Do not host this version publicly without legal sign-off.**
