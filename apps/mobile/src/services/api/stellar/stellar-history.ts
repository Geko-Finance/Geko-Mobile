import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
} from "./stellar-config";

export interface StellarTransactionEntry {
  readonly id: string;
  readonly type: "sent" | "received";
  readonly counterparty: string;
  readonly amountXlm: string;
  readonly createdAt: string;
  readonly hash: string;
}

interface HorizonPaymentRecord {
  id: string;
  type: string;
  type_i: number;
  created_at: string;
  transaction_hash: string;
  asset_type?: string;
  from?: string;
  to?: string;
  amount?: string;
  funder?: string;
  account?: string;
  starting_balance?: string;
}

interface HorizonPaymentsResponse {
  _embedded: {
    records: HorizonPaymentRecord[];
  };
}

function mapPaymentRecord(
  record: HorizonPaymentRecord,
  publicKey: string
): StellarTransactionEntry | null {
  if (record.type === "payment" && record.asset_type === "native") {
    const received = record.to === publicKey;
    const counterparty = received ? record.from! : record.to!;
    return {
      id: record.id,
      type: received ? "received" : "sent",
      counterparty,
      amountXlm: record.amount!,
      createdAt: record.created_at,
      hash: record.transaction_hash,
    };
  }

  if (record.type === "create_account") {
    if (record.account === publicKey) {
      return {
        id: record.id,
        type: "received",
        counterparty: record.funder!,
        amountXlm: record.starting_balance!,
        createdAt: record.created_at,
        hash: record.transaction_hash,
      };
    }

    if (record.funder === publicKey) {
      return {
        id: record.id,
        type: "sent",
        counterparty: record.account!,
        amountXlm: record.starting_balance!,
        createdAt: record.created_at,
        hash: record.transaction_hash,
      };
    }
  }

  return null;
}

/**
 * Fetches recent native XLM payment history for an account from Horizon.
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
