import { decodeSep7Uri, encodeSep7PayRequest } from "./sep7";

// Real, checksum-valid Stellar public keys (Keypair.random() output) — the real
// SEP-7 parser validates the StrKey checksum, not just the G.../56-char shape.
const DESTINATION = "GAXWYIKC2N2Q43LZFVZWLL6VPEAYGW5AQHJYP3SUHPFPNMIGZJ2HNSEU";
const ISSUER = "GDH4ZIWJFO2GSCOAQBLUFIRVRSBQUZN7IZOLGIV24QIPCRS5AUCILQOT";

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
});
