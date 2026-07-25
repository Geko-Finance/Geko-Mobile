import { describe, expect, it } from "@jest/globals";

import { Sep7ParseError } from "../sep7-uri";
import { buildSep7PayUri, parseSep7PayUri } from "../sep7-pay-uri";

const DESTINATION = "GBRLUEXAMPLE0000000000000000000000000000000000000000000000";
const ISSUER = "GISSUEREXAMPLE00000000000000000000000000000000000000000000";

describe("buildSep7PayUri / parseSep7PayUri round trip", () => {
  it("round-trips a bare destination", () => {
    const uri = buildSep7PayUri({ destination: DESTINATION });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.destination).toBe(DESTINATION);
    expect(parsed.amount).toBeUndefined();
    expect(parsed.asset).toBeUndefined();
  });

  it("round-trips destination + amount", () => {
    const uri = buildSep7PayUri({ destination: DESTINATION, amount: "12.5" });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.amount).toBe("12.5");
  });

  it("round-trips an issued asset (short code -> credit_alphanum4)", () => {
    const uri = buildSep7PayUri({
      destination: DESTINATION,
      asset: { code: "USDC", issuer: ISSUER },
    });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.asset).toEqual({
      code: "USDC",
      id: `USDC:${ISSUER}`,
      issuer: ISSUER,
      type: "credit_alphanum4",
    });
  });

  it("infers credit_alphanum12 for a longer asset code", () => {
    const uri = buildSep7PayUri({
      destination: DESTINATION,
      asset: { code: "LONGASSETCODE", issuer: ISSUER },
    });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.asset?.type).toBe("credit_alphanum12");
  });

  it("round-trips memo and memo_type, url-encoded characters included", () => {
    const uri = buildSep7PayUri({
      destination: DESTINATION,
      memo: "Order #42 & tip",
      memoType: "MEMO_TEXT",
    });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.memo).toBe("Order #42 & tip");
    expect(parsed.memoType).toBe("MEMO_TEXT");
  });

  it("round-trips network_passphrase and msg", () => {
    const uri = buildSep7PayUri({
      destination: DESTINATION,
      networkPassphrase: "Test SDF Network ; September 2015",
      msg: "Pay for coffee",
    });
    const parsed = parseSep7PayUri(uri);

    expect(parsed.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(parsed.msg).toBe("Pay for coffee");
  });
});

describe("parseSep7PayUri error cases", () => {
  it("rejects a non web+stellar: string", () => {
    expect(() => parseSep7PayUri("https://example.com")).toThrow(Sep7ParseError);
  });

  it("rejects the tx operation (belongs to sep7-uri.ts, not this module)", () => {
    expect(() => parseSep7PayUri("web+stellar:tx?xdr=abc")).toThrow(Sep7ParseError);
  });

  it("rejects a pay request missing destination", () => {
    expect(() => parseSep7PayUri("web+stellar:pay?amount=10")).toThrow(Sep7ParseError);
  });

  it("rejects asset_code without asset_issuer", () => {
    expect(() =>
      parseSep7PayUri(`web+stellar:pay?destination=${DESTINATION}&asset_code=USDC`),
    ).toThrow(Sep7ParseError);
  });

  it("rejects asset_issuer without asset_code", () => {
    expect(() =>
      parseSep7PayUri(`web+stellar:pay?destination=${DESTINATION}&asset_issuer=${ISSUER}`),
    ).toThrow(Sep7ParseError);
  });
});
