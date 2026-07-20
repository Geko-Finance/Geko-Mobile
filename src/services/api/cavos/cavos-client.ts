import type {
  CavosExecuteResult,
  CavosIdentity,
  CavosSession,
} from "./cavos-types";

/**
 * Internal Cavos wallet-as-a-service port scoped to this MVP.
 * Not the real `@cavos/kit` types — swapping in the SDK later should only touch this file.
 */
export interface CavosClient {
  connect(identity: CavosIdentity): Promise<CavosSession>;
  execute(
    session: CavosSession,
    amountStroops: bigint,
    destinationPublicKey: string
  ): Promise<CavosExecuteResult>;
  getBalance(session: CavosSession): Promise<bigint>;
}

const STELLAR_BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MOCK_BALANCE_STROOPS = 10_000_000_000n;

const identitySeed = (identity: CavosIdentity): string =>
  `${identity.userId}\0${identity.email ?? ""}`;

const digestSeed = (seed: string, length: number): Uint8Array => {
  const out = new Uint8Array(length);
  let h1 = 2_166_136_261;
  let h2 = 1_677_761_9;

  for (let i = 0; i < seed.length; i += 1) {
    const code = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 1_677_761_9);
    h2 = Math.imul(h2 ^ code, 2_246_822_519);
  }

  for (let i = 0; i < length; i += 1) {
    h1 = Math.imul(h1 ^ (h2 + i), 1_677_761_9);
    h2 = Math.imul(h2 ^ (h1 + i), 2_246_822_519);
    out[i] = (h1 ^ h2) & 0xff;
  }

  return out;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** Deterministic G...-shaped testnet address; stable for the same identity across calls. */
const deriveMockStellarAddress = (identity: CavosIdentity): string => {
  const bytes = digestSeed(identitySeed(identity), 55);
  let address = "G";

  for (let i = 0; i < 55; i += 1) {
    address += STELLAR_BASE32_ALPHABET[bytes[i]! % 32]!;
  }

  return address;
};

const syntheticTxHash = (
  session: CavosSession,
  amountStroops: bigint,
  destinationPublicKey: string
): string => {
  const seed = `${session.userId}\0${session.address}\0${amountStroops}\0${destinationPublicKey}`;
  return toHex(digestSeed(seed, 32));
};

const createMockCavosClient = (): CavosClient => ({
  async connect(identity: CavosIdentity): Promise<CavosSession> {
    return {
      address: deriveMockStellarAddress(identity),
      status: "ready",
      userId: identity.userId,
    };
  },

  async execute(
    session: CavosSession,
    amountStroops: bigint,
    destinationPublicKey: string
  ): Promise<CavosExecuteResult> {
    return {
      hash: syntheticTxHash(session, amountStroops, destinationPublicKey),
    };
  },

  async getBalance(_session: CavosSession): Promise<bigint> {
    return MOCK_BALANCE_STROOPS;
  },
});

let cavosClient: CavosClient | undefined;

/** Returns the singleton mock Cavos client until `@cavos/kit` is wired in. */
export function getCavosClient(): CavosClient {
  if (cavosClient === undefined) {
    cavosClient = createMockCavosClient();
  }

  return cavosClient;
}
