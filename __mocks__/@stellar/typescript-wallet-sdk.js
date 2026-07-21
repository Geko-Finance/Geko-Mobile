// Mock for @stellar/typescript-wallet-sdk
// Provides minimal implementations for Sep7Pay and Sep7Tx classes

class Sep7Pay {
  constructor(destination) {
    this.destination = destination;
    this.amount = undefined;
    this.assetCode = undefined;
    this.assetIssuer = undefined;
    this.memo = undefined;
    this.msg = undefined;
  }

  static forDestination(destination) {
    return new Sep7Pay(destination);
  }

  toString() {
    let uri = `web+stellar:pay?destination=${this.destination}`;
    if (this.amount !== undefined) {
      uri += `&amount=${this.amount}`;
    }
    if (this.assetCode !== undefined) {
      uri += `&asset_code=${this.assetCode}`;
    }
    if (this.assetIssuer !== undefined) {
      uri += `&asset_issuer=${this.assetIssuer}`;
    }
    if (this.memo !== undefined) {
      uri += `&memo=${this.memo}`;
    }
    if (this.msg !== undefined) {
      uri += `&msg=${this.msg}`;
    }
    return uri;
  }
}

class Sep7Tx {
  constructor() {
    this.xdr = undefined;
    this.networkPassphrase = undefined;
    this.msg = undefined;
  }

  toString() {
    let uri = `web+stellar:tx?xdr=${this.xdr}&network_passphrase=${this.networkPassphrase}`;
    if (this.msg !== undefined) {
      uri += `&msg=${this.msg}`;
    }
    return uri;
  }
}

function isValidSep7Uri(uri) {
  if (typeof uri !== "string") {
    return { result: false };
  }

  if (uri.startsWith("web+stellar:pay?")) {
    const query = uri.split("?")[1];
    const params = new URLSearchParams(query);
    // Pay request must have a destination
    const result = params.has("destination") && params.get("destination") !== null;
    return { result };
  }

  if (uri.startsWith("web+stellar:tx?")) {
    const query = uri.split("?")[1];
    const params = new URLSearchParams(query);
    // Tx request must have xdr and networkPassphrase
    const result =
      (params.has("xdr") && params.get("xdr") !== null) &&
      (params.has("network_passphrase") && params.get("network_passphrase") !== null);
    return { result };
  }

  return { result: false };
}

function parseSep7Uri(uri) {
  if (!uri.startsWith("web+stellar:")) {
    throw new Error("Not a valid SEP-7 URI");
  }

  const [scheme, query] = uri.split("?");

  if (scheme === "web+stellar:pay") {
    const params = new URLSearchParams(query);
    const pay = new Sep7Pay(params.get("destination"));
    if (params.has("amount")) {
      pay.amount = params.get("amount");
    }
    if (params.has("asset_code")) {
      pay.assetCode = params.get("asset_code");
    }
    if (params.has("asset_issuer")) {
      pay.assetIssuer = params.get("asset_issuer");
    }
    if (params.has("memo")) {
      pay.memo = params.get("memo");
    }
    if (params.has("msg")) {
      pay.msg = params.get("msg");
    }
    return pay;
  }

  if (scheme === "web+stellar:tx") {
    const params = new URLSearchParams(query);
    const tx = new Sep7Tx();
    if (params.has("xdr")) {
      tx.xdr = params.get("xdr");
    }
    if (params.has("network_passphrase")) {
      tx.networkPassphrase = params.get("network_passphrase");
    }
    if (params.has("msg")) {
      tx.msg = params.get("msg");
    }
    return tx;
  }

  throw new Error("Unsupported SEP-7 operation");
}

module.exports = {
  Sep7Pay,
  Sep7Tx,
  isValidSep7Uri,
  parseSep7Uri,
};
