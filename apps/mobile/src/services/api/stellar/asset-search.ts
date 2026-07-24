import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import { getActiveStellarNetwork } from "./stellar-config";

export interface AssetSearchResult {
  readonly code: string;
  readonly issuer: string;
  readonly trustlines: number;
  readonly rating: number;
}

interface StellarExpertAssetRecord {
  asset: string;
  trustlines: [number, number, number];
  rating?: {
    average?: number;
  };
}

interface StellarExpertAssetSearchResponse {
  _embedded: {
    records: StellarExpertAssetRecord[];
  };
}

function toStellarExpertNetworkSegment(networkId: StellarNetworkId): string {
  return networkId === "testnet" ? "testnet" : "public";
}

function parseAssetRecord(
  record: StellarExpertAssetRecord
): AssetSearchResult | null {
  const segments = record.asset.split("-");
  if (segments.length < 2) {
    return null;
  }

  const [code, issuer] = segments;

  return {
    code,
    issuer,
    trustlines: record.trustlines[0] ?? 0,
    rating: record.rating?.average ?? 0,
  };
}

/**
 * Searches known Stellar assets by code via StellarExpert's public asset directory.
 */
export async function searchAssets(
  query: string,
  networkId?: StellarNetworkId
): Promise<AssetSearchResult[]> {
  const activeNetworkId =
    networkId === undefined ? getActiveStellarNetwork().id : networkId;
  const expertNetworkSegment = toStellarExpertNetworkSegment(activeNetworkId);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.requestTimeoutMs
  );

  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/${expertNetworkSegment}/asset?search=${encodeURIComponent(query)}&limit=10`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new ApiError("Failed to search assets", response.status);
    }

    const body = (await response.json()) as StellarExpertAssetSearchResponse;

    return body._embedded.records
      .map(parseAssetRecord)
      .filter((result): result is AssetSearchResult => result !== null)
      .sort((a, b) => b.rating - a.rating);
  } finally {
    clearTimeout(timeout);
  }
}
