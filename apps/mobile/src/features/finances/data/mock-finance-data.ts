export type FinancePeriod = "today" | "week" | "month" | "year";
export type FinanceTransactionType = "expense" | "income";
export type StatisticMetric = "cashFlow" | "expenseTrend" | "expenses" | "income";
export type TransactionFilter = "all" | "expenses" | "income";

export interface FinanceTransaction {
  amount: number;
  category: string;
  id: string;
  meta: string;
  period: FinancePeriod;
  title: string;
  type: FinanceTransactionType;
}

const periodRank: Record<FinancePeriod, number> = {
  today: 0,
  week: 1,
  month: 2,
  year: 3,
};

const previousExpensesByPeriod: Record<FinancePeriod, number> = {
  month: 2950,
  today: 0,
  week: 780,
  year: 37200,
};

const previousPeriodLabel: Record<FinancePeriod, string> = {
  month: "last month",
  today: "today",
  week: "last week",
  year: "last year",
};

export const financeTransactions: FinanceTransaction[] = [
  {
    amount: 30,
    category: "Transfers",
    id: "today-jose",
    meta: "Today - 6:22 AM",
    period: "today",
    title: "Jose Sanchez",
    type: "income",
  },
  {
    amount: 920,
    category: "Payroll",
    id: "week-payroll",
    meta: "Yesterday - 10:00 AM",
    period: "week",
    title: "Payroll Deposit",
    type: "income",
  },
  {
    amount: 450,
    category: "Travel",
    id: "week-mexico-trip",
    meta: "Yesterday - 12:31 PM",
    period: "week",
    title: "Mexico Trip Budget",
    type: "expense",
  },
  {
    amount: 145,
    category: "Gifts",
    id: "week-christmas",
    meta: "Nov 9 - 15:01 PM",
    period: "week",
    title: "Christmas Gift",
    type: "expense",
  },
  {
    amount: 150.2,
    category: "Freelance",
    id: "week-freelance",
    meta: "Nov 2 - 9:15 AM",
    period: "week",
    title: "Freelance Project",
    type: "income",
  },
  {
    amount: 4200,
    category: "Payroll",
    id: "month-main-salary",
    meta: "Nov 1 - 8:00 AM",
    period: "month",
    title: "Main Salary",
    type: "income",
  },
  {
    amount: 1200,
    category: "Housing",
    id: "month-rent",
    meta: "Nov 1 - 7:40 AM",
    period: "month",
    title: "Rent Payment",
    type: "expense",
  },
  {
    amount: 420.35,
    category: "Groceries",
    id: "month-groceries",
    meta: "Oct 30 - 6:15 PM",
    period: "month",
    title: "Groceries",
    type: "expense",
  },
  {
    amount: 276.15,
    category: "Dining",
    id: "month-restaurants",
    meta: "Oct 28 - 9:45 PM",
    period: "month",
    title: "Restaurants",
    type: "expense",
  },
  {
    amount: 260,
    category: "Shopping",
    id: "month-shopping",
    meta: "Oct 27 - 4:20 PM",
    period: "month",
    title: "Weekend Shopping",
    type: "expense",
  },
  {
    amount: 180,
    category: "Utilities",
    id: "month-utilities",
    meta: "Oct 25 - 11:05 AM",
    period: "month",
    title: "Electricity & Internet",
    type: "expense",
  },
  {
    amount: 118.45,
    category: "Transport",
    id: "month-transport",
    meta: "Oct 23 - 8:30 AM",
    period: "month",
    title: "Transport",
    type: "expense",
  },
  {
    amount: 54.97,
    category: "Subscriptions",
    id: "month-subscriptions",
    meta: "Oct 21 - 2:00 PM",
    period: "month",
    title: "Subscriptions",
    type: "expense",
  },
  {
    amount: 39.99,
    category: "Health",
    id: "month-gym",
    meta: "Oct 20 - 7:10 AM",
    period: "month",
    title: "Gym Membership",
    type: "expense",
  },
  {
    amount: 32.8,
    category: "Dining",
    id: "month-coffee",
    meta: "Oct 19 - 8:04 PM",
    period: "month",
    title: "Coffee & Snacks",
    type: "expense",
  },
  {
    amount: 640,
    category: "Freelance",
    id: "year-side-project",
    meta: "Sep 15 - 1:00 PM",
    period: "year",
    title: "Side Project",
    type: "income",
  },
  {
    amount: 860,
    category: "Travel",
    id: "year-flight",
    meta: "Sep 3 - 10:10 AM",
    period: "year",
    title: "Flight Tickets",
    type: "expense",
  },
];

export function formatMoney(value: number, options?: { signed?: boolean }) {
  const sign = options?.signed && value > 0 ? "+" : value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  return `${sign}$${absoluteValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function getFinanceTransactions(period: FinancePeriod) {
  return financeTransactions.filter(
    (transaction) => periodRank[transaction.period] <= periodRank[period]
  );
}

export function getFilteredTransactions(
  period: FinancePeriod,
  filter: TransactionFilter
) {
  const transactions = getFinanceTransactions(period);

  if (filter === "all") {
    return transactions;
  }

  return transactions.filter((transaction) =>
    filter === "income"
      ? transaction.type === "income"
      : transaction.type === "expense"
  );
}

export function getFinanceSummary(period: FinancePeriod) {
  const transactions = getFinanceTransactions(period);
  const income = sumTransactions(transactions, "income");
  const expenses = sumTransactions(transactions, "expense");
  const cashFlow = income - expenses;
  const previousExpenses = previousExpensesByPeriod[period];
  const expenseDelta =
    previousExpenses === 0
      ? 0
      : Math.round(((expenses - previousExpenses) / previousExpenses) * 100);
  const expenseDirection =
    expenseDelta > 0 ? "more than" : expenseDelta < 0 ? "less than" : "same as";

  return {
    cashFlow,
    expenseDelta,
    expenseDeltaLabel:
      period === "today"
        ? "0% today"
        : `${Math.abs(expenseDelta)}% ${expenseDirection} ${previousPeriodLabel[period]}`,
    expenses,
    income,
  };
}

export function getChartSeries(metric: StatisticMetric, period: FinancePeriod) {
  if (metric === "expenseTrend") {
    return buildExpenseTrendSeries(period);
  }

  const transactions = getFinanceTransactions(period);
  const relevantTransactions = transactions.filter((transaction) => {
    if (metric === "income") {
      return transaction.type === "income";
    }

    if (metric === "expenses") {
      return transaction.type === "expense";
    }

    return true;
  });

  if (relevantTransactions.length === 0) {
    return [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }];
  }

  let total = 0;

  return relevantTransactions.map((transaction) => {
    if (metric === "cashFlow") {
      total += transaction.type === "income" ? transaction.amount : -transaction.amount;
    } else {
      total += transaction.amount;
    }

    return { value: Math.max(total, 0) };
  });
}

export function getExpenseBreakdown(period: FinancePeriod) {
  const expenses = getFinanceTransactions(period).filter(
    (transaction) => transaction.type === "expense"
  );
  const breakdown = expenses.reduce<Record<string, number>>((groups, transaction) => {
    return {
      ...groups,
      [transaction.category]: (groups[transaction.category] ?? 0) + transaction.amount,
    };
  }, {});

  return Object.entries(breakdown)
    .map(([category, amount]) => ({ amount, category }))
    .sort((first, second) => second.amount - first.amount);
}

export function getLargestExpense(period: FinancePeriod) {
  return getFinanceTransactions(period)
    .filter((transaction) => transaction.type === "expense")
    .sort((first, second) => second.amount - first.amount)[0];
}

function buildExpenseTrendSeries(period: FinancePeriod) {
  const summary = getFinanceSummary(period);
  const finalValue = Math.max(Math.abs(summary.expenseDelta), 0);

  if (finalValue === 0) {
    return [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }];
  }

  return [
    { value: Math.round(finalValue * 0.25) },
    { value: Math.round(finalValue * 0.45) },
    { value: Math.round(finalValue * 0.7) },
    { value: finalValue },
  ];
}

function sumTransactions(
  transactions: FinanceTransaction[],
  type: FinanceTransactionType
) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}
