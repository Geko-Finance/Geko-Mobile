import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { decodeSep7Uri, encodeSep7PayRequest, encodeSep7TxRequest } from "./sep7";

// Real, checksum-valid Stellar public keys (Keypair.random() output) — the real
// SEP-7 parser validates the StrKey checksum, not just the G.../56-char shape.
const DESTINATION = "GAXWYIKC2N2Q43LZFVZWLL6VPEAYGW5AQHJYP3SUHPFPNMIGZJ2HNSEU";
const ISSUER = "GDH4ZIWJFO2GSCOAQBLUFIRVRSBQUZN7IZOLGIV24QIPCRS5AUCILQOT";

/**
 * Builds a real, unsigned transaction envelope XDR (not a hand-crafted string) — the
 * wallet-sdk's `isValidSep7Uri`/`parseSep7Uri` actually construct a `Transaction(xdr,
 * networkPassphrase)` to validate a 'tx' URI, so a fixture must be a genuinely valid
 * envelope on the given network or decode will reject it as "not a valid transaction
 * envelope". This is a test-only import of `@stellar/stellar-sdk` (fine under Jest/Node;
 * the runtime-import ban is about the Metro/Expo app bundle, not tests — see the existing
 * precedent in `src/services/wallet/local-signer.test.ts`).
 */
function buildTestXdr(): string {
  const sourcePublicKey = Keypair.random().publicKey();
  const account = new Account(sourcePublicKey, "0");
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: sourcePublicKey,
        asset: Asset.native(),
        amount: "1",
      })
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

describe("encodeSep7PayRequest", () => {
  it("encodes a minimal pay request with just a destination", () => {
    const uri = encodeSep7PayRequest({ kind: "pay", destination: DESTINATION });

    expect(uri.startsWith("web+stellar:pay?")).toBe(true);
    expect(uri).toContain(`destination=${DESTINATION}`);
  });

  it("encodes amount, asset, and memo", () => {
    const uri = encodeSep7PayRequest({
      kind: "pay",
      destination: DESTINATION,
      amount: "10.5",
      assetCode: "USDC",
      assetIssuer: ISSUER,
      memo: "invoice-42",
    });

    expect(uri).toContain("amount=10.5");
    expect(uri).toContain("asset_code=USDC");
    expect(uri).toContain(`asset_issuer=${ISSUER}`);
    expect(uri).toContain("memo=invoice-42");
  });

  it("throws when destination is not a syntactically valid Stellar address", () => {
    expect(() =>
      encodeSep7PayRequest({ kind: "pay", destination: "not-a-valid-address" })
    ).toThrow(/destination/i);
  });

  it("throws when assetCode is given without assetIssuer", () => {
    expect(() =>
      encodeSep7PayRequest({
        kind: "pay",
        destination: DESTINATION,
        assetCode: "USDC",
      })
    ).toThrow(/asset_issuer/i);
  });
});

describe("decodeSep7Uri", () => {
  it("round-trips a pay request through encode then decode", () => {
    const request: import("./types").Sep7PayRequest = {
      kind: "pay",
      destination: DESTINATION,
      amount: "10.5",
      assetCode: "USDC",
      assetIssuer: ISSUER,
      memo: "invoice-42",
    };

    const decoded = decodeSep7Uri(encodeSep7PayRequest(request));

    expect(decoded).toEqual(request);
  });

  it("decodes a minimal pay URI built by hand", () => {
    const uri = `web+stellar:pay?destination=${DESTINATION}`;

    expect(decodeSep7Uri(uri)).toEqual({
      kind: "pay",
      destination: DESTINATION,
    });
  });

  it("throws on a URI that isn't a SEP-7 URI at all", () => {
    expect(() => decodeSep7Uri("https://example.com")).toThrow(
      /valid SEP-7/i
    );
  });

  it("throws on a pay URI missing its required destination", () => {
    expect(() => decodeSep7Uri("web+stellar:pay?amount=10")).toThrow(
      /valid SEP-7/i
    );
  });

  it("throws on a pay URI with asset_code but no asset_issuer", () => {
    const uri = `web+stellar:pay?destination=${DESTINATION}&asset_code=USDC`;

    expect(() => decodeSep7Uri(uri)).toThrow(/asset_issuer/i);
  });

  it("throws on a pay URI with a non-text memo_type (e.g. MEMO_ID)", () => {
    const uri = `web+stellar:pay?destination=${DESTINATION}&memo=837465&memo_type=id`;

    expect(() => decodeSep7Uri(uri)).toThrow(/memo type/i);
  });

  it("accepts a pay URI with an explicit memo_type=MEMO_TEXT", () => {
    const uri = `web+stellar:pay?destination=${DESTINATION}&memo=invoice-42&memo_type=MEMO_TEXT`;

    expect(decodeSep7Uri(uri)).toEqual({
      kind: "pay",
      destination: DESTINATION,
      memo: "invoice-42",
    });
  });

  it("accepts a pay URI with a memo but no memo_type (defaults to text per SEP-7)", () => {
    const uri = `web+stellar:pay?destination=${DESTINATION}&memo=invoice-42`;

    expect(decodeSep7Uri(uri)).toEqual({
      kind: "pay",
      destination: DESTINATION,
      memo: "invoice-42",
    });
  });
});

describe("encodeSep7TxRequest", () => {
  const XDR = buildTestXdr();
  const NETWORK_PASSPHRASE: string = Networks.TESTNET;

  it("encodes an xdr and networkPassphrase into a web+stellar:tx uri", () => {
    const uri = encodeSep7TxRequest({
      kind: "tx",
      xdr: XDR,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    expect(uri.startsWith("web+stellar:tx?")).toBe(true);
    expect(decodeURIComponent(uri)).toContain(`xdr=${XDR}`);
  });

  it("includes pubkey when given", () => {
    const destination = "GAXWYIKC2N2Q43LZFVZWLL6VPEAYGW5AQHJYP3SUHPFPNMIGZJ2HNSEU";
    const uri = encodeSep7TxRequest({
      kind: "tx",
      xdr: XDR,
      networkPassphrase: NETWORK_PASSPHRASE,
      pubkey: destination,
    });

    expect(uri).toContain(`pubkey=${destination}`);
  });

  it("round-trips through decodeSep7Uri", () => {
    const request = {
      kind: "tx" as const,
      xdr: XDR,
      networkPassphrase: NETWORK_PASSPHRASE,
      pubkey: "GAXWYIKC2N2Q43LZFVZWLL6VPEAYGW5AQHJYP3SUHPFPNMIGZJ2HNSEU",
    };

    expect(decodeSep7Uri(encodeSep7TxRequest(request))).toEqual(request);
  });
});
