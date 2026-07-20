/** Mirrors Horizon asset_type values we support; liquidity pool shares intentionally unsupported for now. */
export type AssetType = "native" | "credit_alphanum4" | "credit_alphanum12";

/** Canonical id: "XLM" for the native asset, "CODE:ISSUER" for issued assets. */
export type AssetId = string;

/** Stellar asset identity; `issuer` omitted for native. */
export interface Asset {
  readonly code: string;
  readonly id: AssetId;
  readonly issuer?: string;
  readonly type: AssetType;
}

/** The native Stellar lumens asset. */
export const NATIVE_ASSET: Asset = {
  id: "XLM",
  type: "native",
  code: "XLM",
};

/** Returns "XLM" when no issuer, else `${code}:${issuer}`. */
export function makeAssetId(code: string, issuer?: string): AssetId {
  if (issuer === undefined) {
    return "XLM";
  }
  return `${code}:${issuer}`;
}

/** Whether the asset is native XLM. */
export function isNativeAsset(asset: Asset): boolean {
  return asset.type === "native";
}
