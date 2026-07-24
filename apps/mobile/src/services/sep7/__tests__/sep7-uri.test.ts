import { describe, expect, it } from "@jest/globals";

import { Sep7ParseError, buildSep7TxUri, isSep7Uri, parseSep7Uri } from "../sep7-uri";

const XDR = "AAAAAgAAAAB+exampleenvelopexdr==";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

describe("isSep7Uri", () => {
  it("recognizes a web+stellar: string", () => {
    expect(isSep7Uri("web+stellar:tx?xdr=abc")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSep7Uri("https://example.com")).toBe(false);
    expect(isSep7Uri(XDR)).toBe(false);
  });
});

describe("buildSep7TxUri / parseSep7Uri round trip", () => {
  it("round-trips xdr and network_passphrase", () => {
    const uri = buildSep7TxUri({ xdr: XDR, networkPassphrase: NETWORK_PASSPHRASE });
    const parsed = parseSep7Uri(uri);

    expect(parsed.xdr).toBe(XDR);
    expect(parsed.networkPassphrase).toBe(NETWORK_PASSPHRASE);
    expect(parsed.msg).toBeUndefined();
  });

  it("round-trips an optional msg, url-encoded characters included", () => {
    const uri = buildSep7TxUri({
      xdr: XDR,
      networkPassphrase: NETWORK_PASSPHRASE,
      msg: "Approve payout & sign please",
    });
    const parsed = parseSep7Uri(uri);

    expect(parsed.msg).toBe("Approve payout & sign please");
  });

  it("passes through callback/pubkey/origin_domain/signature when present", () => {
    const uri = `web+stellar:tx?xdr=${encodeURIComponent(XDR)}&callback=url%3Ahttps%3A%2F%2Fexample.com%2Fcb&pubkey=GABC&origin_domain=example.com&signature=sig123`;
    const parsed = parseSep7Uri(uri);

    expect(parsed.callback).toBe("url:https://example.com/cb");
    expect(parsed.pubkey).toBe("GABC");
    expect(parsed.originDomain).toBe("example.com");
    expect(parsed.signature).toBe("sig123");
  });
});

describe("parseSep7Uri error cases", () => {
  it("rejects a non web+stellar: string", () => {
    expect(() => parseSep7Uri("https://example.com")).toThrow(Sep7ParseError);
  });

  it("rejects a URI with no query string", () => {
    expect(() => parseSep7Uri("web+stellar:tx")).toThrow(Sep7ParseError);
  });

  it("rejects an unsupported operation (e.g. pay)", () => {
    expect(() => parseSep7Uri("web+stellar:pay?destination=GABC")).toThrow(
      Sep7ParseError,
    );
  });

  it("rejects a tx request missing xdr", () => {
    expect(() =>
      parseSep7Uri(`web+stellar:tx?network_passphrase=${encodeURIComponent(NETWORK_PASSPHRASE)}`),
    ).toThrow(Sep7ParseError);
  });
});
