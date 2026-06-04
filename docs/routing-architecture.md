# Routing Architecture

## Rule

`app/` is the routing layer. Product code lives in `src/features/*`.

## Route Groups

- `(public)`: unauthenticated public routes such as welcome and acquisition-safe screens.
- `(auth)`: login, registration, and credential recovery.
- `(app)`: authenticated product routes.
- `(app)/(tabs)`: primary authenticated tabs.

## Current Product Routes

- `/welcome`
- `/login`
- `/register`
- `/forgot-password`
- `/home`
- `/wallet`
- `/wallet/[accountId]`
- `/payments`
- `/payments/send`
- `/payments/confirm`
- `/payments/success`
- `/activity`
- `/profile`
- `/kyc`
- `/kyc/document`
- `/kyc/selfie`
- `/kyc/review`

## Practices

- Keep route files as thin re-exports from `src/features`.
- Use stable Expo Router APIs for production paths.
- Put auth/session gating in `(app)/_layout.tsx` when the session provider exists.
- Do not store business logic in route files.
