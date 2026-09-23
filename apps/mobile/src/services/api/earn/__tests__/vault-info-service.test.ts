import { describe, expect, it } from "@jest/globals";

import {
  convertSharesToUnderlyingValue,
  type VaultAssetAllocation,
} from "../vault-info-service";

describe("convertSharesToUnderlyingValue", () => {
  const usdc: VaultAssetAllocation = {
    asset: "USDC_CONTRACT",
    totalAmount: 1_000_000n,
  };
  const eurc: VaultAssetAllocation = {
    asset: "EURC_CONTRACT",
    totalAmount: 500_000n,
  };

  it("returns zero for every asset when totalSupply is zero", () => {
    expect(convertSharesToUnderlyingValue(100n, [usdc, eurc], 0n)).toEqual([
      { asset: "USDC_CONTRACT", totalAmount: 0n },
      { asset: "EURC_CONTRACT", totalAmount: 0n },
    ]);
  });

  it("returns zero for every asset when shares is zero", () => {
    expect(convertSharesToUnderlyingValue(0n, [usdc, eurc], 1_000n)).toEqual([
      { asset: "USDC_CONTRACT", totalAmount: 0n },
      { asset: "EURC_CONTRACT", totalAmount: 0n },
    ]);
  });

  it("converts shares proportionally across all vault assets", () => {
    const totalManagedFunds = [usdc, eurc];
    const totalSupply = 1_000n;
    const shares = 250n;

    expect(convertSharesToUnderlyingValue(shares, totalManagedFunds, totalSupply)).toEqual([
      { asset: "USDC_CONTRACT", totalAmount: 250_000n },
      { asset: "EURC_CONTRACT", totalAmount: 125_000n },
    ]);
  });

  it("uses integer division and truncates toward zero", () => {
    const totalManagedFunds = [{ asset: "USDC_CONTRACT", totalAmount: 10n }];
    const totalSupply = 3n;
    const shares = 1n;

    expect(convertSharesToUnderlyingValue(shares, totalManagedFunds, totalSupply)).toEqual([
      { asset: "USDC_CONTRACT", totalAmount: 3n },
    ]);
  });
});
