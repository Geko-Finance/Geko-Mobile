import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAccountTransactions } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { apiRequest } from "@/src/services/api/api-client";
import type { StellarTransactionEntry } from "@/src/services/api/stellar/stellar-history";

import type {
  FinancePeriod,
  StatisticMetric,
  TransactionFilter,
} from "../data/mock-finance-data";

export type { FinancePeriod, StatisticMetric, TransactionFilter };

const DAY_MS = 24 * 60 * 60 * 1000;

const previousPeriodLabel: Record<Exclude<FinancePeriod, "today">, string> = {
  month: "last month",
  week: "last week",
  year: "last year",
};

/** TanStack Query key factory for finance queries. */
export const financeKeys = {
  all: ["finance"] as const,
  crossBorderTransactions: () =>
    [...financeKeys.all, "cross-border-transactions"] as const,
};

export type CrossBorderTransactionStatus =
  | "AWAITING_PAYMENT"
  | "PROCESSING_PAYMENT"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "WRONG_AMOUNT";

export type CrossBorderTransactionNetwork = "STELLAR" | "SOLANA" | "CELO";

export type CrossBorderPaymentMethod = "BREB" | "PIX";

export type CrossBorderTargetCurrency = "COP" | "BRL";

export interface CrossBorderTransaction {
  id: string;
  status: CrossBorderTransactionStatus;
  quoteId: string;
  transactionReference: string;
  network: CrossBorderTransactionNetwork;
  paymentMethod: CrossBorderPaymentMethod;
  targetCurrency: CrossBorderTargetCurrency;
  accountNumber: string;
  bankCode: string | null;
  kycLink: string | null;
  onChainTxHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceEntry {
  id: string;
  type: "sent" | "received";
  amountXlm: string | null;
  counterparty: string | null;
  createdAt: string;
  crossBorder?: {
    status: CrossBorderTransaction["status"];
    targetCurrency: CrossBorderTransaction["targetCurrency"];
  };
  pending: boolean;
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  cashFlow: number;
  expenseDeltaLabel: string;
}

interface CrossBorderTransactionsResponse {
  page: number;
  pageSize: number;
  total: number;
  transactions: CrossBorderTransaction[];
}

const FLAT_ZERO_CHART_SERIES = [
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
] as const;

/** Fetches the authenticated user's cross-border transaction history from the backend. */
export function useCrossBorderTransactions() {
  return useQuery<CrossBorderTransactionsResponse, Error, CrossBorderTransaction[]>({
    queryFn: () =>
      apiRequest<CrossBorderTransactionsResponse>(
        "/cross-border/transactions?pageSize=100",
        { requiresAuth: true }
      ),
    queryKey: financeKeys.crossBorderTransactions(),
    select: (response) => response.transactions,
  });
}

/** Merges on-chain Stellar payments with cross-border rows into a single finance feed. */
export function mergeFinanceEntries(
  stellarTransactions: StellarTransactionEntry[],
  crossBorderTransactions: CrossBorderTransaction[]
): FinanceEntry[] {
  const entriesByHash = new Map<string, FinanceEntry>();
  const merged: FinanceEntry[] = stellarTransactions.map((transaction) => {
    const entry: FinanceEntry = {
      id: transaction.hash,
      type: transaction.type,
      amountXlm: transaction.amountXlm,
      counterparty: transaction.counterparty,
      createdAt: transaction.createdAt,
      pending: false,
    };

    entriesByHash.set(transaction.hash, entry);
    return entry;
  });

  for (const transaction of crossBorderTransactions) {
    const crossBorder = {
      status: transaction.status,
      targetCurrency: transaction.targetCurrency,
    };

    if (
      transaction.onChainTxHash !== null &&
      entriesByHash.has(transaction.onChainTxHash)
    ) {
      const matchedEntry = entriesByHash.get(transaction.onChainTxHash)!;
      matchedEntry.crossBorder = crossBorder;
      continue;
    }

    merged.push({
      id: transaction.id,
      type: "sent",
      amountXlm: null,
      counterparty: null,
      createdAt: transaction.createdAt,
      crossBorder,
      pending: true,
    });
  }

  return merged.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

/** Combines Stellar payment history and cross-border transactions for the active wallet. */
export function useFinanceEntries() {
  const activeAccount = useActiveAccount();
  const stellarTransactions = useAccountTransactions(activeAccount?.publicKey);
  const crossBorderTransactions = useCrossBorderTransactions();

  const data = useMemo(() => {
    if (
      stellarTransactions.data === undefined ||
      crossBorderTransactions.data === undefined
    ) {
      return undefined;
    }

    return mergeFinanceEntries(
      stellarTransactions.data,
      crossBorderTransactions.data
    );
  }, [crossBorderTransactions.data, stellarTransactions.data]);

  return {
    data,
    isLoading: stellarTransactions.isLoading || crossBorderTransactions.isLoading,
    isError: stellarTransactions.isError || crossBorderTransactions.isError,
    refetch: () =>
      Promise.all([
        stellarTransactions.refetch(),
        crossBorderTransactions.refetch(),
      ]).then(() => undefined),
  };
}

/** Returns whether an ISO timestamp falls within the selected finance period. */
export function isWithinPeriod(
  isoDate: string,
  period: FinancePeriod,
  now: Date = new Date()
): boolean {
  const date = new Date(isoDate);

  if (period === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  const end = now.getTime();
  const windowMs =
    period === "week" ? 7 * DAY_MS : period === "month" ? 30 * DAY_MS : 365 * DAY_MS;

  return date.getTime() >= end - windowMs && date.getTime() <= end;
}

/** Computes income, expenses, cash flow, and expense delta for a finance period. */
export function computeFinanceSummary(
  entries: FinanceEntry[],
  period: FinancePeriod,
  now: Date = new Date()
): FinanceSummary {
  const income = sumKnownAmounts(entries, period, "received", now);
  const expenses = sumKnownAmounts(entries, period, "sent", now);
  const cashFlow = income - expenses;
  const expenseDelta = computeExpenseDelta(entries, period, now);
  const expenseDirection =
    expenseDelta > 0 ? "more than" : expenseDelta < 0 ? "less than" : "same as";

  return {
    cashFlow,
    expenseDeltaLabel:
      period === "today"
        ? "0% today"
        : `${Math.abs(expenseDelta)}% ${expenseDirection} ${previousPeriodLabel[period]}`,
    expenses,
    income,
  };
}

/** Builds a cumulative chart series for the selected metric and finance period. */
export function computeFinanceChartSeries(
  entries: FinanceEntry[],
  metric: StatisticMetric,
  period: FinancePeriod,
  now: Date = new Date()
): { value: number }[] {
  if (metric === "expenseTrend") {
    return buildExpenseTrendSeries(entries, period, now);
  }

  const relevantEntries = entries
    .filter(
      (entry) =>
        entry.amountXlm !== null && isWithinPeriod(entry.createdAt, period, now)
    )
    .filter((entry) => {
      if (metric === "income") {
        return entry.type === "received";
      }

      if (metric === "expenses") {
        return entry.type === "sent";
      }

      return true;
    })
    .sort(
      (first, second) =>
        new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
    );

  if (relevantEntries.length === 0) {
    return [...FLAT_ZERO_CHART_SERIES];
  }

  if (relevantEntries.length === 1) {
    const amount = getEntryContribution(relevantEntries[0]!, metric);
    return [{ value: 0 }, { value: Math.max(amount, 0) }];
  }

  let total = 0;

  return relevantEntries.map((entry) => {
    total += getEntryContribution(entry, metric);
    return { value: Math.max(total, 0) };
  });
}

/** Returns finance summary metrics for the selected period from real wallet data. */
export function useFinanceSummary(period: FinancePeriod) {
  const financeEntries = useFinanceEntries();

  const data = useMemo(() => {
    if (financeEntries.data === undefined) {
      return undefined;
    }

    return computeFinanceSummary(financeEntries.data, period);
  }, [financeEntries.data, period]);

  return {
    data,
    isLoading: financeEntries.isLoading,
    isError: financeEntries.isError,
    refetch: financeEntries.refetch,
  };
}

/** Returns chart series points for the selected metric and period from real wallet data. */
export function useFinanceChartSeries(
  metric: StatisticMetric,
  period: FinancePeriod
) {
  const financeEntries = useFinanceEntries();

  const data = useMemo(() => {
    if (financeEntries.data === undefined) {
      return undefined;
    }

    return computeFinanceChartSeries(financeEntries.data, metric, period);
  }, [financeEntries.data, metric, period]);

  return {
    data,
    isLoading: financeEntries.isLoading,
    isError: financeEntries.isError,
    refetch: financeEntries.refetch,
  };
}

function sumKnownAmounts(
  entries: FinanceEntry[],
  period: FinancePeriod,
  type: FinanceEntry["type"],
  now: Date
): number {
  return entries
    .filter(
      (entry) =>
        entry.amountXlm !== null &&
        entry.type === type &&
        isWithinPeriod(entry.createdAt, period, now)
    )
    .reduce((total, entry) => total + Number(entry.amountXlm), 0);
}

function sumPriorPeriodExpenses(
  entries: FinanceEntry[],
  period: FinancePeriod,
  now: Date
): number {
  const { start, end } = getPriorPeriodBounds(period, now);

  return entries
    .filter(
      (entry) =>
        entry.amountXlm !== null &&
        entry.type === "sent" &&
        isWithinTimestampRange(entry.createdAt, start, end)
    )
    .reduce((total, entry) => total + Number(entry.amountXlm), 0);
}

function getPriorPeriodBounds(
  period: FinancePeriod,
  now: Date
): { start: number; end: number } {
  const end = now.getTime();

  if (period === "today") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const priorEnd = new Date(yesterday);
    priorEnd.setHours(23, 59, 59, 999);

    return { start: start.getTime(), end: priorEnd.getTime() };
  }

  if (period === "week") {
    return { start: end - 14 * DAY_MS, end: end - 7 * DAY_MS };
  }

  if (period === "month") {
    return { start: end - 60 * DAY_MS, end: end - 30 * DAY_MS };
  }

  return { start: end - 730 * DAY_MS, end: end - 365 * DAY_MS };
}

function isWithinTimestampRange(
  isoDate: string,
  start: number,
  end: number
): boolean {
  const timestamp = new Date(isoDate).getTime();
  return timestamp >= start && timestamp <= end;
}

function getEntryContribution(
  entry: FinanceEntry,
  metric: StatisticMetric
): number {
  const amount = Number(entry.amountXlm);

  if (metric === "cashFlow") {
    return entry.type === "received" ? amount : -amount;
  }

  return amount;
}

function computeExpenseDelta(
  entries: FinanceEntry[],
  period: FinancePeriod,
  now: Date
): number {
  const expenses = sumKnownAmounts(entries, period, "sent", now);
  const previousExpenses = sumPriorPeriodExpenses(entries, period, now);

  if (previousExpenses === 0) {
    return 0;
  }

  return Math.round(((expenses - previousExpenses) / previousExpenses) * 100);
}

function buildExpenseTrendSeries(
  entries: FinanceEntry[],
  period: FinancePeriod,
  now: Date
): { value: number }[] {
  const expenseDelta = computeExpenseDelta(entries, period, now);
  const finalValue = Math.max(Math.abs(expenseDelta), 0);

  if (finalValue === 0) {
    return [...FLAT_ZERO_CHART_SERIES];
  }

  return [
    { value: Math.round(finalValue * 0.25) },
    { value: Math.round(finalValue * 0.45) },
    { value: Math.round(finalValue * 0.7) },
    { value: finalValue },
  ];
}
