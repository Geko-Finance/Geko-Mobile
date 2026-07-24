import "fake-indexeddb/auto";

// CavosAuth guards its OAuth URL methods on `typeof window === "undefined"`, and after a
// successful OTP/OAuth verify it unconditionally calls `window.localStorage.setItem(...)`
// to remember the last identity for browser apps (verified in the compiled SDK) - neither
// needs a real browser, so a minimal window+localStorage stub satisfies both without faking
// one. Without the localStorage piece, verify crashes with a client-facing 500 *after* Cavos
// has already accepted the code/OAuth callback, silently burning a one-time-use OTP code.
//
// `isSecureContext: true` is required too: Cavos's device-key WebCrypto path
// (`assertSecureContext` in @cavos/kit) only skips its browser secure-context check when
// `window` is *undefined* - once this stub defines `window` at all, it falls through to
// checking `window.isSecureContext`, which would otherwise be undefined and wrongly fail
// wallet connect/create/recover here even though Node's own `crypto.subtle` is available
// and this backend is a trusted local service, not a public browser origin.
if (typeof (globalThis as { window?: unknown }).window === "undefined") {
  const memoryStorage = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    isSecureContext: true,
    localStorage: {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
    },
  };
}

import { Cavos, CavosAuth, generateRecoveryCode } from "@cavos/kit";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";

import { getRecoveryCode, saveRecoveryCode } from "./recovery-store";

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
const CAVOS_APP_ID = process.env.CAVOS_APP_ID;
const CAVOS_APP_SALT = process.env.CAVOS_APP_SALT ?? "geko-mobile";
const CAVOS_NETWORK =
  process.env.CAVOS_NETWORK === "mainnet" ? "mainnet" : "testnet";

if (!CAVOS_APP_ID || CAVOS_APP_ID.trim().length === 0) {
  console.error("Fatal: CAVOS_APP_ID is required. Set it in server/.env");
  process.exit(1);
}

const cavosAuth = new CavosAuth({ appId: CAVOS_APP_ID });

const app = express();

app.use(express.json());
app.use(cors());

type CavosIdentity = {
  userId: string;
  email?: string;
};

const connectStellarWallet = async (identity: CavosIdentity) => {
  const wallet = await Cavos.connect({
    appId: CAVOS_APP_ID,
    appSalt: CAVOS_APP_SALT,
    chain: "stellar",
    identity,
    network: CAVOS_NETWORK,
  });

  if (wallet.chain !== "stellar") {
    throw new Error("Expected Stellar wallet from Cavos.connect with chain: stellar");
  }

  if (wallet.status === "needs-device-approval") {
    try {
      const code = await getRecoveryCode(identity.userId);
      if (code) {
        await wallet.approveThisDeviceWithRecovery(code);
      }
    } catch (error) {
      console.error("Recovery approval failed:", error);
    }
    return wallet;
  }

  if (wallet.status === "ready") {
    try {
      const existingCode = await getRecoveryCode(identity.userId);
      if (!existingCode) {
        const code = generateRecoveryCode();
        await wallet.setupRecovery(code);
        await saveRecoveryCode(identity.userId, code);
      }
    } catch (error) {
      console.error("Recovery setup failed:", error);
    }
    return wallet;
  }

  return wallet;
};

const sdkErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown Cavos SDK error";

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post("/api/cavos/connect", async (req: Request, res: Response) => {
  const { userId, email } = req.body as {
    userId?: unknown;
    email?: unknown;
  };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return;
  }

  const identity: CavosIdentity = { userId: userId.trim() };
  if (typeof email === "string" && email.trim().length > 0) {
    identity.email = email.trim();
  }

  try {
    const wallet = await connectStellarWallet(identity);
    res.status(200).json({ address: wallet.address, status: wallet.status });
  } catch (error) {
    console.error("POST /api/cavos/connect failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/cavos/execute", async (req: Request, res: Response) => {
  const { userId, amountStroops, destination } = req.body as {
    userId?: unknown;
    amountStroops?: unknown;
    destination?: unknown;
  };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return;
  }

  if (typeof amountStroops !== "string" || amountStroops.trim().length === 0) {
    res.status(400).json({ error: "amountStroops is required and must be a non-empty string" });
    return;
  }

  if (typeof destination !== "string" || destination.trim().length === 0) {
    res.status(400).json({ error: "destination is required and must be a non-empty string" });
    return;
  }

  let amount: bigint;
  try {
    amount = BigInt(amountStroops);
  } catch {
    res.status(400).json({ error: "amountStroops must be a valid integer string" });
    return;
  }

  try {
    const wallet = await connectStellarWallet({ userId: userId.trim() });

    if (wallet.status !== "ready") {
      res.status(409).json({ error: "needs-device-approval" });
      return;
    }

    const hash = await wallet.execute(amount, destination.trim());
    res.status(200).json({ hash });
  } catch (error) {
    console.error("POST /api/cavos/execute failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/cavos/sign", async (req: Request, res: Response) => {
  const { userId, unsignedXdr } = req.body as {
    userId?: unknown;
    unsignedXdr?: unknown;
  };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return;
  }

  if (typeof unsignedXdr !== "string" || unsignedXdr.trim().length === 0) {
    res.status(400).json({ error: "unsignedXdr is required and must be a non-empty string" });
    return;
  }

  try {
    const wallet = await connectStellarWallet({ userId: userId.trim() });

    if (wallet.status !== "ready") {
      res.status(409).json({ error: "needs-device-approval" });
      return;
    }

    const signedXdr = await wallet.signXdr(unsignedXdr.trim());
    res.status(200).json({ signedXdr });
  } catch (error) {
    console.error("POST /api/cavos/sign failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/cavos/trustline", async (req: Request, res: Response) => {
  const { userId, code, issuer } = req.body as {
    userId?: unknown;
    code?: unknown;
    issuer?: unknown;
  };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return;
  }

  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "code is required and must be a non-empty string" });
    return;
  }

  if (typeof issuer !== "string" || issuer.trim().length === 0) {
    res.status(400).json({ error: "issuer is required and must be a non-empty string" });
    return;
  }

  try {
    const wallet = await connectStellarWallet({ userId: userId.trim() });

    if (wallet.status !== "ready") {
      res.status(409).json({ error: "needs-device-approval" });
      return;
    }

    // Cavos relayer rejects sponsored ChangeTrust for this app tier; account pays its own reserve/fee.
    const hash = await wallet.addTrustline(
      { code: code.trim(), issuer: issuer.trim() },
      { sponsored: false },
    );
    res.status(200).json({ hash });
  } catch (error) {
    console.error("POST /api/cavos/trustline failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.get("/api/cavos/recovery-code", async (req: Request, res: Response) => {
  const userId = req.query.userId;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }

  try {
    const code = await getRecoveryCode(userId.trim());
    if (code === undefined) {
      res.status(404).json({ error: "No recovery code on file for this account" });
      return;
    }
    res.status(200).json({ code });
  } catch (error) {
    console.error("GET /api/cavos/recovery-code failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/cavos/recover-device", async (req: Request, res: Response) => {
  const { userId, code } = req.body as {
    userId?: unknown;
    code?: unknown;
  };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return;
  }

  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "code is required and must be a non-empty string" });
    return;
  }

  try {
    const wallet = await Cavos.connect({
      appId: CAVOS_APP_ID,
      appSalt: CAVOS_APP_SALT,
      chain: "stellar",
      identity: { userId: userId.trim() },
      network: CAVOS_NETWORK,
    });

    if (wallet.chain !== "stellar") {
      throw new Error("Expected Stellar wallet from Cavos.connect with chain: stellar");
    }

    if (wallet.status === "needs-device-approval") {
      await wallet.approveThisDeviceWithRecovery(code.trim());
    }

    await saveRecoveryCode(userId.trim(), code.trim());
    res.status(200).json({ address: wallet.address, status: "ready" });
  } catch (error) {
    console.error("POST /api/cavos/recover-device failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.get("/api/cavos/balance", async (req: Request, res: Response) => {
  const userId = req.query.userId;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }

  try {
    const wallet = await connectStellarWallet({ userId: userId.trim() });

    if (wallet.status !== "ready") {
      res.status(409).json({ error: "needs-device-approval" });
      return;
    }

    const stroops = await wallet.balance();
    res.status(200).json({ stroops: stroops.toString() });
  } catch (error) {
    console.error("GET /api/cavos/balance failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/auth/otp/send", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: unknown };

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "email is required and must be a non-empty string" });
    return;
  }

  try {
    await cavosAuth.sendOtp(email.trim());
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/otp/send failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/auth/otp/verify", async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: unknown; code?: unknown };

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "email is required and must be a non-empty string" });
    return;
  }

  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "code is required and must be a non-empty string" });
    return;
  }

  try {
    const identity = await cavosAuth.verifyOtp(email.trim(), code.trim());
    res.status(200).json({ userId: identity.userId, email: identity.email, name: identity.name });
  } catch (error) {
    console.error("POST /api/auth/otp/verify failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.get("/api/auth/oauth/google-url", async (req: Request, res: Response) => {
  const redirectUri = req.query.redirectUri;

  if (typeof redirectUri !== "string" || redirectUri.trim().length === 0) {
    res.status(400).json({ error: "redirectUri query parameter is required" });
    return;
  }

  try {
    const url = await cavosAuth.getGoogleOAuthUrl(redirectUri);
    res.status(200).json({ url });
  } catch (error) {
    console.error("GET /api/auth/oauth/google-url failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.get("/api/auth/oauth/apple-url", async (req: Request, res: Response) => {
  const redirectUri = req.query.redirectUri;

  if (typeof redirectUri !== "string" || redirectUri.trim().length === 0) {
    res.status(400).json({ error: "redirectUri query parameter is required" });
    return;
  }

  try {
    const url = await cavosAuth.getAppleOAuthUrl(redirectUri);
    res.status(200).json({ url });
  } catch (error) {
    console.error("GET /api/auth/oauth/apple-url failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.post("/api/auth/oauth/callback", async (req: Request, res: Response) => {
  const { authData } = req.body as { authData?: unknown };

  if (typeof authData !== "string" || authData.trim().length === 0) {
    res.status(400).json({ error: "authData is required and must be a non-empty string" });
    return;
  }

  try {
    const identity = await cavosAuth.handleCallback(authData.trim());
    res.status(200).json({ userId: identity.userId, email: identity.email, name: identity.name });
  } catch (error) {
    console.error("POST /api/auth/oauth/callback failed:", error);
    res.status(500).json({ error: sdkErrorMessage(error) });
  }
});

app.listen(PORT, () => {
  console.log(`geko-cavos-server listening on http://localhost:${PORT}`);
});
