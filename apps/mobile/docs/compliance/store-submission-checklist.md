# Store Submission Checklist

> **DRAFT — for legal/product review before real submission. Not final copy.**

Issue [#27](https://github.com/geko-mobile/Geko-Mobile/issues/27) · Pre-flight for `eas submit --profile production`

---

## Store accounts & app records

| Item | Status | Notes |
|------|--------|-------|
| App Store Connect app record created | ☐ | Bundle ID must match `com.gekomobile.gekomobile` |
| Google Play Console app record created | ☐ | Package name must match `com.gekomobile.gekomobile` |
| Apple Developer Program membership active | ☐ | Team ID needed for submit profile |
| Google Play developer account active | ☐ | Service account with release permissions |

---

## EAS submit configuration (`apps/mobile/eas.json`)

Replace all `REPLACE_WITH_*` placeholders before a real submit:

| Placeholder | Action |
|-------------|--------|
| `appleId` | Apple ID email used for App Store Connect |
| `ascAppId` | Numeric App Store Connect app ID |
| `appleTeamId` | Apple Developer Team ID |
| `serviceAccountKeyPath` | Upload JSON key via EAS secret — do **not** commit the key file |

```bash
# Example: store Android service account key as an EAS secret, then reference it in eas.json
eas secret:create --name GOOGLE_SERVICE_ACCOUNT_KEY --type file --value ./path/to/play-service-account.json
```

Verify `submit.production` resolves all four values in a dry run before submitting.

---

## Production identifiers (confirm permanence)

| Platform | Field | Current value | Confirmed permanent? |
|----------|-------|---------------|----------------------|
| iOS | `bundleIdentifier` (`app.json`) | `com.gekomobile.gekomobile` | ☐ |
| Android | `package` (`app.json`) | `com.gekomobile.gekomobile` | ☐ |

Changing these after first public release requires a new store listing. Legal/product must sign off before first production build.

---

## Store listing assets & copy

| Item | Status | Notes |
|------|--------|-------|
| App Store screenshots (6.7", 6.5", 5.5" iPhone; iPad if supporting tablet) | ☐ | `supportsTablet: true` in `app.json` |
| Play Store screenshots (phone; 7" / 10" tablet if applicable) | ☐ | Feature graphic (1024×500) required |
| App name, subtitle (iOS), short & full description (Play) | ☐ | Draft copy — legal review |
| Keywords (iOS, 100 chars max) | ☐ | |
| Support URL | ☐ | Must be live before review |
| Marketing URL (optional) | ☐ | |
| Privacy policy URL | ☐ | Host `privacy-policy-draft.md` final version at a public HTTPS URL |
| App category & content rating questionnaire | ☐ | Fintech / crypto wallet — expect enhanced scrutiny |
| Age rating | ☐ | |

---

## Privacy & compliance forms

| Item | Status | Reference doc |
|------|--------|---------------|
| Apple Privacy Nutrition Labels submitted in ASC | ☐ | `apple-privacy-nutrition-labels.md` |
| Google Play Data Safety form completed | ☐ | `play-data-safety-mapping.md` |
| Privacy policy published at public URL | ☐ | `privacy-policy-draft.md` (finalize first) |

---

## Export compliance — encryption (`ITSAppUsesNonExemptEncryption`)

| Item | Status | Notes |
|------|--------|-------|
| `ITSAppUsesNonExemptEncryption: false` in `app.json` | ☐ Re-verify with legal | App bundles Stellar wallet cryptography (`@stellar/stellar-base`, `@stellar/typescript-wallet-sdk-km`) and uses `expo-secure-store` / `expo-local-authentication` for on-device key protection |
| Legal sign-off on exemption eligibility | ☐ | Standard crypto library usage *likely* qualifies for the Apple export-compliance exemption — **requires real legal sign-off, not an engineering assumption** |
| Annual self-classification report (if required) | ☐ | Confirm with counsel |

Current setting in `apps/mobile/app.json`:

```json
"ITSAppUsesNonExemptEncryption": false
```

---

## Permissions & store disclosures

Confirm store listings and privacy forms match declared permissions:

| Permission | Declared in | Purpose |
|------------|-------------|---------|
| Camera | `expo-camera` plugin in `app.json` | Scan wallet addresses |
| Face ID / biometrics | `NSFaceIDUsageDescription` in `app.json` | Protect wallet signing (`local-signer.ts`) |
| Push notifications | Runtime request in `register-push-token.ts` | Transaction and security alerts |

---

## Build & submit commands (when above is complete)

```bash
# Production build
eas build --profile production --platform all

# Submit (only after checklist complete)
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

---

## Timeline — start store review in parallel

Crypto / fintech wallet apps face **wall-clock-bound** store review (often **days**, sometimes longer). Do **not** wait until engineering is finished.

| Parallel track | Owner | Start when |
|----------------|-------|------------|
| App Store Connect / Play Console setup & draft listing | Product / legal | Now |
| Privacy policy finalization & public hosting | Legal | Now |
| Privacy Nutrition Labels & Data Safety forms | Legal + engineering | As soon as draft mappings are reviewed |
| Screenshot & copy production | Design / product | Before first submit |
| First production `eas build` | Engineering | When blockers resolved |
| `eas submit --profile production` | Engineering | After all ☐ above are checked |

---

> **DRAFT — for legal/product review before real submission. Not final copy.**
