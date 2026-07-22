# geko-cavos-server

Minimal standalone HTTP proxy for [@cavos/kit](https://docs.cavos.xyz/docs/stellar) Stellar wallet operations.

## Why this exists

The Cavos SDK relies on browser-only globals (`Event`, `indexedDB` for WebCrypto device-key storage) that are not available in React Native's Hermes runtime. Importing `@cavos/kit` directly in the mobile app fails at runtime. This Node.js service runs the SDK in a real server environment (with `fake-indexeddb` polyfilled before the SDK loads) and exposes a small HTTP API that the Expo app calls instead.

The service is stateless: every request reconnects to Cavos via deterministic identity (`userId` + `appSalt`), matching how `Cavos.connect` works.

## Setup

```bash
cd server
cp .env.example .env
# Edit .env — set CAVOS_APP_ID (required) and other values as needed
npm install
npm run dev
```

For production-style runs: `npm run build` then `npm start`.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | HTTP listen port |
| `CAVOS_APP_ID` | **Yes** | — | Cavos App ID from the dashboard |
| `CAVOS_APP_SALT` | No | `geko-mobile` | Salt for deterministic wallet derivation |
| `CAVOS_NETWORK` | No | `testnet` | `testnet` or `mainnet` |

## API

### `GET /health`

**Response (200):**

```json
{ "ok": true }
```

### `POST /api/cavos/connect`

Connect (or reconnect) a deterministic Stellar wallet for a user.

**Request body:**

```json
{
  "userId": "string (required, non-empty)",
  "email": "string (optional)"
}
```

**Response (200):**

```json
{
  "address": "G...",
  "status": "ready" | "needs-device-approval"
}
```

**Errors:** `400` invalid body, `500` SDK failure (`{ "error": "message" }`).

### `POST /api/cavos/execute`

Send a Stellar payment in stroops. Reconnects via `userId` only (same deterministic address).

**Request body:**

```json
{
  "userId": "string (required, non-empty)",
  "amountStroops": "string (required, valid bigint integer)",
  "destination": "string (required, non-empty Stellar public key)"
}
```

**Response (200):**

```json
{ "hash": "horizon-transaction-hash" }
```

**Errors:** `400` invalid body, `409` `{ "error": "needs-device-approval" }`, `500` SDK failure.

### `GET /api/cavos/balance`

Fetch wallet balance in stroops. Reconnects via `userId`.

**Query:** `?userId=<string>` (required)

**Response (200):**

```json
{ "stroops": "1234567890" }
```

**Errors:** `400` missing `userId`, `409` `{ "error": "needs-device-approval" }`, `500` SDK failure.
