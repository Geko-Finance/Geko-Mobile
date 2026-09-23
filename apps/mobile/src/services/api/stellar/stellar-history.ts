import { scValToNative, xdr } from "@stellar/stellar-sdk/base";

import { appConfig } from "@/src/config/env";
import { cctpChainByDomainId, decodeCctpV2BurnMessage, type CctpChainId } from "@/src/domain/cctp";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import { getCctpStellarContracts } from "../cctp/cctp-config";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
} from "./stellar-config";

export interface StellarTransactionEntry {
  readonly id: string;
  readonly type: "sent" | "received";
  readonly counterparty: string;
  /** Decimal amount in `assetCode` units. */
  readonly amount: string;
  /** "XLM" for native lumens, otherwise the issued asset's code (e.g. "USDC"). */
  readonly assetCode: string;
  readonly createdAt: string;
  readonly hash: string;
  /** Set when the funds arrived through CCTP: the network the sender burned on. */
  readonly originChainId?: CctpChainId;
}

interface HorizonAssetBalanceChange {
  asset_type: string;
  asset_code?: string;
  type: string;
  from?: string;
  to?: string;
  amount: string;
}

export interface HorizonPaymentRecord {
  id: string;
  type: string;
  type_i: number;
  created_at: string;
  transaction_hash: string;
  asset_type?: string;
  asset_code?: string;
  from?: string;
  to?: string;
  amount?: string;
  funder?: string;
  account?: string;
  starting_balance?: string;
  asset_balance_changes?: HorizonAssetBalanceChange[];
  parameters?: { type: string; value: string }[];
}

interface HorizonPaymentsResponse {
  _embedded: {
    records: HorizonPaymentRecord[];
  };
}

const CCTP_FORWARDERS = new Set([
  getCctpStellarContracts("testnet").cctpForwarder,
  getCctpStellarContracts("mainnet").cctpForwarder,
]);

/**
 * For a CctpForwarder `mint_and_forward` call, the real sender is the wallet that
 * burned on the other network - carried in the CCTP message passed as the call's
 * first argument. Returns undefined for any other contract call or unreadable data.
 */
function cctpSenderOf(
  record: HorizonPaymentRecord
): { counterparty: string; originChainId?: CctpChainId } | undefined {
  const [contract, method, message] = record.parameters ?? [];

  try {
    if (
      contract === undefined ||
      message === undefined ||
      !CCTP_FORWARDERS.has(scValToNative(xdr.ScVal.fromXDR(contract.value, "base64")) as string) ||
      scValToNative(xdr.ScVal.fromXDR(method.value, "base64")) !== "mint_and_forward"
    ) {
      return undefined;
    }

    const bytes = scValToNative(xdr.ScVal.fromXDR(message.value, "base64")) as Uint8Array;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const decoded = decodeCctpV2BurnMessage(hex);

    return {
      counterparty: decoded.messageSender,
      originChainId: cctpChainByDomainId(decoded.sourceDomain)?.id,
    };
  } catch {
    return undefined;
  }
}

function assetCodeOf(assetType: string | undefined, assetCode: string | undefined): string {
  return assetType === "native" || assetCode === undefined ? "XLM" : assetCode;
}

export function mapPaymentRecord(
  record: HorizonPaymentRecord,
  publicKey: string
): StellarTransactionEntry | null {
  const base = { id: record.id, createdAt: record.created_at, hash: record.transaction_hash };

  if (record.type === "payment") {
    const received = record.to === publicKey;

    return {
      ...base,
      type: received ? "received" : "sent",
      counterparty: received ? record.from! : record.to!,
      amount: record.amount!,
      assetCode: assetCodeOf(record.asset_type, record.asset_code),
    };
  }

  if (record.type === "create_account") {
    if (record.account === publicKey) {
      return {
        ...base,
        type: "received",
        counterparty: record.funder!,
        amount: record.starting_balance!,
        assetCode: "XLM",
      };
    }

    if (record.funder === publicKey) {
      return {
        ...base,
        type: "sent",
        counterparty: record.account!,
        amount: record.starting_balance!,
        assetCode: "XLM",
      };
    }
  }

  // Contract calls (CCTP mints, vault withdrawals, swaps, ...) only show this
  // account's funds moving inside asset_balance_changes.
  if (record.type === "invoke_host_function") {
    const change = record.asset_balance_changes?.find(
      (entry) => entry.to === publicKey || entry.from === publicKey
    );

    if (change !== undefined) {
      const received = change.to === publicKey;
      const cctpSender = received ? cctpSenderOf(record) : undefined;

      return {
        ...base,
        type: received ? "received" : "sent",
        counterparty: cctpSender?.counterparty ?? (received ? change.from : change.to) ?? "",
        amount: change.amount,
        assetCode: assetCodeOf(change.asset_type, change.asset_code),
        ...(cctpSender?.originChainId !== undefined ? { originChainId: cctpSender.originChainId } : {}),
      };
    }
  }

  return null;
}

/**
 * Fetches recent payment history (any asset, including contract-call transfers) for an account from Horizon.
 */
export async function fetchAccountPayments(
  publicKey: string,
  networkId?: StellarNetworkId
): Promise<StellarTransactionEntry[]> {
  const config =
    networkId === undefined
      ? getActiveStellarNetwork()
      : STELLAR_NETWORKS[networkId];

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.requestTimeoutMs
  );

  try {
    const response = await fetch(
      `${config.horizonUrl}/accounts/${encodeURIComponent(publicKey)}/payments?order=desc&limit=20&include_failed=false`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new ApiError("Failed to fetch account payments", response.status);
    }

    const body = (await response.json()) as HorizonPaymentsResponse;

    return body._embedded.records
      .map((record) => mapPaymentRecord(record, publicKey))
      .filter((entry): entry is StellarTransactionEntry => entry !== null);
  } finally {
    clearTimeout(timeout);
  }
}
