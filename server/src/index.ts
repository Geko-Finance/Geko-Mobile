import "fake-indexeddb/auto";

import { Cavos, generateRecoveryCode } from "@cavos/kit";
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

app.listen(PORT, () => {
  console.log(`geko-cavos-server listening on http://localhost:${PORT}`);
});
