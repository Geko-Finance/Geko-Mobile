import { Asset as StellarAsset } from '@stellar/stellar-sdk/base';

import type { Asset } from '@/src/domain/wallet';

export function toStellarAsset(asset: Asset): StellarAsset {
  if (asset.type === 'native') {
    return StellarAsset.native();
  }

  if (asset.issuer === undefined) {
    throw new Error(`Issued asset ${asset.code} is missing its issuer`);
  }

  return new StellarAsset(asset.code, asset.issuer);
}

export function toContractId(asset: Asset, networkPassphrase: string): string {
  return toStellarAsset(asset).contractId(networkPassphrase);
}
