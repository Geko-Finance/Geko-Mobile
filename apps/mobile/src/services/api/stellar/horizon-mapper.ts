import type { Horizon } from "@stellar/stellar-sdk";

import {
  NATIVE_ASSET,
  makeAssetId,
  type AssetType,
  type Balance,
} from "@/src/domain/wallet";

/** Maps a single Horizon balance line to a domain balance, or null when unsupported. */
export function mapHorizonBalanceLine(
  line: Horizon.HorizonApi.BalanceLine
): Balance | null {
  if (line.asset_type === "native") {
    return {
      amount: line.balance,
      asset: NATIVE_ASSET,
    };
  }

  if (
    line.asset_type === "credit_alphanum4" ||
    line.asset_type === "credit_alphanum12"
  ) {
    const assetType: AssetType =
      line.asset_type === "credit_alphanum4"
        ? "credit_alphanum4"
        : "credit_alphanum12";

    return {
      amount: line.balance,
      asset: {
        id: makeAssetId(line.asset_code, line.asset_issuer),
        type: assetType,
        code: line.asset_code,
        issuer: line.asset_issuer,
      },
      limit: line.limit,
    };
  }

  return null;
}

/** Maps Horizon balance lines to domain balances, omitting unsupported asset types. */
export function mapHorizonBalances(
  lines: Horizon.HorizonApi.BalanceLine[]
): Balance[] {
  return lines
    .map(mapHorizonBalanceLine)
    .filter((balance): balance is Balance => balance !== null);
}
