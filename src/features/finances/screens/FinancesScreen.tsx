import {
  ArrowDown,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Grid2X2,
  PiggyBank,
  Repeat2,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMoney,
  getChartSeries,
  getFilteredTransactions,
  getFinanceSummary,
  type FinancePeriod,
  type FinanceTransaction,
  type StatisticMetric,
  type TransactionFilter,
} from "@/src/features/finances/data/mock-finance-data";
import { TransactionRow } from "@/src/features/home/components/TransactionRow";

type ChartPoint = { value: number };
type ChartPointer = {
  index: number;
  x: number;
  y: number;
};

const CHART_BUBBLE_WIDTH = 142;
const CHART_HEIGHT = 220;
const CHART_END_SPACING = 28;
const CHART_INITIAL_SPACING = 18;
const CHART_Y_AXIS_LABEL_WIDTH = 46;
const CHART_Y_AXIS_TEXT_STYLE = {
  color: "#66666A",
  fontSize: 13,
  fontWeight: "700" as const,
};

const METRIC_COLORS: Record<StatisticMetric, string> = {
  cashFlow: "#087BFF",
  expenseTrend: "#5BED97",
  expenses: "#F45F64",
  income: "#5BED97",
};

const TRANSACTION_FILTER_LABELS: Record<TransactionFilter, string> = {
  all: "All",
  expenses: "Expenses",
  income: "Income",
};

const PERIOD_OPTIONS: { label: string; value: FinancePeriod }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export const CHART_BY_METRIC: Record<
  StatisticMetric,
  Record<FinancePeriod, ChartPoint[]>
> = {
  cashFlow: {
    today: [
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 30 },
    ],
    week: [
      { value: 420 },
      { value: 310 },
      { value: 560 },
      { value: 740 },
      { value: 910 },
      { value: 1180 },
      { value: 1050 },
      { value: 1320 },
      { value: 1540 },
      { value: 1840 },
    ],
    month: [
      { value: 820 },
      { value: 1160 },
      { value: 1580 },
      { value: 2100 },
      { value: 2480 },
      { value: 2910 },
      { value: 3280 },
      { value: 3720 },
      { value: 3980 },
      { value: 4280 },
    ],
    year: [
      { value: 4200 },
      { value: 6800 },
      { value: 9200 },
      { value: 11700 },
      { value: 15100 },
      { value: 18400 },
      { value: 21100 },
      { value: 24600 },
      { value: 28900 },
      { value: 32700 },
      { value: 35600 },
      { value: 38900 },
    ],
  },
  expenseTrend: {
    today: [
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
    ],
    week: [
      { value: 4 },
      { value: 6 },
      { value: 7 },
      { value: 5 },
      { value: 9 },
      { value: 11 },
      { value: 10 },
      { value: 8 },
    ],
    month: [
      { value: 7 },
      { value: 9 },
      { value: 12 },
      { value: 15 },
      { value: 13 },
      { value: 16 },
      { value: 18 },
    ],
    year: [
      { value: 10 },
      { value: 9 },
      { value: 8 },
      { value: 7 },
      { value: 8 },
      { value: 6 },
    ],
  },
  expenses: {
    today: [
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
    ],
    week: [
      { value: 160 },
      { value: 260 },
      { value: 420 },
      { value: 610 },
      { value: 760 },
      { value: 970 },
      { value: 1180 },
      { value: 1420 },
    ],
    month: [
      { value: 520 },
      { value: 840 },
      { value: 1210 },
      { value: 1690 },
      { value: 2150 },
      { value: 2710 },
      { value: 3120 },
      { value: 3760 },
    ],
    year: [
      { value: 3200 },
      { value: 6100 },
      { value: 9200 },
      { value: 12800 },
      { value: 16600 },
      { value: 20800 },
      { value: 24900 },
      { value: 29100 },
      { value: 33400 },
      { value: 37900 },
      { value: 42100 },
    ],
  },
  income: {
    today: [
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 30 },
    ],
    week: [
      { value: 420 },
      { value: 760 },
      { value: 1180 },
      { value: 1480 },
      { value: 1920 },
      { value: 2380 },
      { value: 2860 },
      { value: 3260 },
    ],
    month: [
      { value: 960 },
      { value: 1680 },
      { value: 2520 },
      { value: 3380 },
      { value: 4210 },
      { value: 5160 },
      { value: 6120 },
      { value: 7040 },
      { value: 8040 },
    ],
    year: [
      { value: 6200 },
      { value: 11800 },
      { value: 18400 },
      { value: 24600 },
      { value: 31200 },
      { value: 38900 },
      { value: 46800 },
      { value: 55200 },
      { value: 63700 },
      { value: 72100 },
      { value: 81000 },
    ],
  },
};

export const STATISTICS: Record<
  FinancePeriod,
  {
    cashFlow: string;
    expenseDelta: string;
    expenses: string;
    income: string;
  }
> = {
  today: {
    cashFlow: "+$30.00",
    expenseDelta: "0% today",
    expenses: "$0.00",
    income: "$30.00",
  },
  week: {
    cashFlow: "+$1,840.00",
    expenseDelta: "8% more than last week",
    expenses: "$1,420.00",
    income: "$3,260.00",
  },
  month: {
    cashFlow: "+$4,280.00",
    expenseDelta: "18% more than last month",
    expenses: "$3,760.00",
    income: "$8,040.00",
  },
  year: {
    cashFlow: "+$38,900.00",
    expenseDelta: "6% less than last year",
    expenses: "$42,100.00",
    income: "$81,000.00",
  },
};

export const TRANSACTIONS = [
  {
    amount: "+$30,00",
    amountTone: "green" as const,
    icon: Repeat2,
    meta: "Today - 6:22 AM",
    period: "today" as const,
    title: "Jose Sanchez",
  },
  {
    amount: "$450,00",
    amountTone: "yellow" as const,
    icon: PiggyBank,
    meta: "Yesterday - 12:31 PM",
    period: "week" as const,
    title: "Mexico Trip Budget",
  },
  {
    amount: "-$145,00",
    amountTone: "red" as const,
    icon: Repeat2,
    meta: "Nov 9 - 15:01 PM",
    period: "week" as const,
    title: "Christmas Gift",
  },
  {
    amount: "+$50,00",
    amountTone: "green" as const,
    icon: Send,
    meta: "Nov 4 - 12:31 PM",
    period: "month" as const,
    title: "Salary Bonus",
  },
  {
    amount: "+$150,20",
    amountTone: "green" as const,
    icon: ArrowDown,
    meta: "Nov 2 - 9:15 AM",
    period: "month" as const,
    title: "Freelance Project",
  },
  {
    amount: "-$32,80",
    amountTone: "red" as const,
    icon: CircleDollarSign,
    meta: "Oct 31 - 8:04 PM",
    period: "year" as const,
    title: "Coffee & Snacks",
  },
  {
    amount: "+$920,00",
    amountTone: "green" as const,
    icon: ArrowDown,
    meta: "Oct 29 - 10:00 AM",
    period: "year" as const,
    title: "Payroll Deposit",
  },
];

function PeriodSelector({
  onChange,
  value,
}: {
  onChange: (period: FinancePeriod) => void;
  value: FinancePeriod;
}) {
  return (
    <View className="flex-row rounded-full border border-[#303033] p-1">
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`h-[42px] flex-1 items-center justify-center rounded-full ${
              isSelected ? "bg-[#242426]" : "bg-transparent"
            }`}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`text-[15px] ${
                isSelected
                  ? "font-extrabold text-[#D8D8DC]"
                  : "font-bold text-[#9D9D9F]"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCard({
  isSelected,
  label,
  onPress,
  tone,
  value,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  tone: "green" | "red" | "blue" | "yellow";
  value: string;
}) {
  const toneClassName = {
    blue: "text-[#087BFF]",
    green: "text-[#5BED97]",
    red: "text-[#F45F64]",
    yellow: "text-[#F2CB63]",
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`min-h-[78px] flex-1 justify-between rounded-[16px] border px-4 py-3 ${
        isSelected
          ? "border-[#087BFF] bg-[#172033]"
          : "border-transparent bg-[#141416]"
      }`}
      onPress={onPress}
    >
      <Text className="text-[12px] font-semibold text-[#77777B]">{label}</Text>
      <Text className={`text-[17px] font-extrabold ${toneClassName}`}>
        {value}
      </Text>
    </Pressable>
  );
}

function getChartMaxValue(data: ChartPoint[]) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const magnitude = Math.pow(10, Math.max(String(Math.floor(maxValue)).length - 1, 0));

  return Math.ceil((maxValue * 1.18) / magnitude) * magnitude;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}.00`;
}

function formatCompactValue(value: number, metric: StatisticMetric) {
  if (metric === "expenseTrend") {
    return `${Math.round(value)}%`;
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }

  return `${Math.round(value)}`;
}

function formatBubbleValue(value: number, metric: StatisticMetric) {
  if (metric === "expenseTrend") {
    return `${Math.round(value)}%`;
  }

  return formatCurrency(value);
}

function getPointerPosition({
  chartMaxValue,
  chartSpacing,
  data,
  index,
}: {
  chartMaxValue: number;
  chartSpacing: number;
  data: ChartPoint[];
  index: number;
}): ChartPointer {
  return {
    index,
    x: CHART_Y_AXIS_LABEL_WIDTH + CHART_INITIAL_SPACING + chartSpacing * index,
    y:
      CHART_HEIGHT -
      ((data[index]?.value ?? 0) / chartMaxValue) * CHART_HEIGHT,
  };
}

function getTransactionIcon(transaction: FinanceTransaction) {
  if (transaction.type === "income") {
    return transaction.category === "Transfers" ? Repeat2 : ArrowDown;
  }

  if (transaction.category === "Travel" || transaction.category === "Housing") {
    return PiggyBank;
  }

  if (transaction.category === "Dining" || transaction.category === "Shopping") {
    return CircleDollarSign;
  }

  return Send;
}

function toTransactionRowProps(transaction: FinanceTransaction) {
  const signedAmount =
    transaction.type === "income" ? transaction.amount : -transaction.amount;
  const amountTone =
    transaction.type === "income"
      ? ("green" as const)
      : transaction.category === "Travel"
        ? ("yellow" as const)
        : ("red" as const);

  return {
    amount: formatMoney(signedAmount, { signed: true }),
    amountTone,
    icon: getTransactionIcon(transaction),
    meta: transaction.meta,
    title: transaction.title,
  };
}

export function visibleByPeriod(period: FinancePeriod) {
  return TRANSACTIONS.filter((transaction) => {
    if (period === "year") {
      return true;
    }

    if (period === "month") {
      return transaction.period !== "year";
    }

    if (period === "week") {
      return transaction.period === "today" || transaction.period === "week";
    }

    return transaction.period === "today";
  });
}

export function visibleByTransactionFilter(
  transactions: typeof TRANSACTIONS,
  filter: TransactionFilter
) {
  if (filter === "all") {
    return transactions;
  }

  return transactions.filter((transaction) => {
    if (filter === "income") {
      return transaction.amount.startsWith("+");
    }

    return transaction.amount.startsWith("-");
  });
}

export function FinancesScreen() {
  const insets = useSafeAreaInsets();
  const [statisticsPeriod, setStatisticsPeriod] =
    useState<FinancePeriod>("today");
  const [selectedMetric, setSelectedMetric] =
    useState<StatisticMetric>("income");
  const [transactionsPeriod, setTransactionsPeriod] =
    useState<FinancePeriod>("today");
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");
  const [isTransactionFilterOpen, setIsTransactionFilterOpen] = useState(false);
  const screenWidth = Dimensions.get("window").width;
  const chartCardWidth = screenWidth - 40;
  const chartWidth = Math.max(chartCardWidth - 82, 240);
  const statistics = useMemo(
    () => getFinanceSummary(statisticsPeriod),
    [statisticsPeriod]
  );
  const transactions = useMemo(
    () => getFilteredTransactions(transactionsPeriod, transactionFilter),
    [transactionFilter, transactionsPeriod]
  );
  const chartData = useMemo(
    () => getChartSeries(selectedMetric, statisticsPeriod),
    [selectedMetric, statisticsPeriod]
  );
  const chartColor = METRIC_COLORS[selectedMetric];
  const chartMaxValue = useMemo(() => getChartMaxValue(chartData), [chartData]);
  const yAxisLabelTexts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        formatCompactValue((chartMaxValue / 5) * index, selectedMetric)
      ),
    [chartMaxValue, selectedMetric]
  );
  const initialPointerIndex = Math.max(chartData.length - 1, 0);
  const chartSpacing = useMemo(
    () =>
      Math.max(
        10,
        Math.floor(
          (chartWidth - CHART_INITIAL_SPACING - CHART_END_SPACING) /
            Math.max(chartData.length - 1, 1)
        )
      ),
    [chartData.length, chartWidth]
  );
  const [activePointer, setActivePointer] = useState<ChartPointer>(() =>
    getPointerPosition({
      chartMaxValue,
      chartSpacing,
      data: chartData,
      index: initialPointerIndex,
    })
  );
  const pointerConfig = useMemo(
    () => ({
      activatePointersInstantlyOnTouch: true,
      autoAdjustPointerLabelPosition: true,
      initialPointerIndex,
      persistPointer: true,
      pointerColor: chartColor,
      pointerStripColor: "#8E8E92",
      pointerStripHeight: CHART_HEIGHT,
      pointerStripUptoDataPoint: false,
      pointerStripWidth: 1,
      radius: 7,
      resetPointerIndexOnRelease: false,
      showPointerStrip: true,
      strokeDashArray: [4, 4],
    }),
    [chartColor, initialPointerIndex]
  );
  useEffect(() => {
    const nextPointer = getPointerPosition({
      chartMaxValue,
      chartSpacing,
      data: chartData,
      index: initialPointerIndex,
    });

    setActivePointer((current) =>
      current.index === nextPointer.index &&
      current.x === nextPointer.x &&
      current.y === nextPointer.y
        ? current
        : nextPointer
    );
  }, [chartData, chartMaxValue, chartSpacing, initialPointerIndex]);
  const activeValue =
    chartData[activePointer.index]?.value ??
    chartData[initialPointerIndex]?.value ??
    0;
  const bubbleLeft = Math.min(
    Math.max(
      activePointer.x + CHART_Y_AXIS_LABEL_WIDTH - CHART_BUBBLE_WIDTH / 2,
      12
    ),
    chartCardWidth - CHART_BUBBLE_WIDTH - 12
  );
  const bubbleTop = Math.max(activePointer.y - 6, 12);
  const handlePointerChange = useCallback(
    ({
      pointerIndex,
      pointerX,
      pointerY,
    }: {
      pointerIndex: number;
      pointerX: number;
      pointerY: number;
    }) => {
      setActivePointer((current) => {
        if (
          current.index === pointerIndex &&
          current.x === pointerX &&
          current.y === pointerY
        ) {
          return current;
        }

        return {
          index: pointerIndex,
          x: pointerX,
          y: pointerY,
        };
      });
    },
    []
  );

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-row items-center justify-between">
          <Grid2X2 color="#FFFFFF" fill="#FFFFFF" size={25} strokeWidth={2.5} />
          <Bell color="#8E8E92" fill="#8E8E92" size={25} strokeWidth={2.5} />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-[29px] font-extrabold text-[#A6A6A8]">
            Statistics
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[20px] font-bold text-[#77777B]">All</Text>
            <ChevronDown color="#77777B" size={19} strokeWidth={3} />
          </View>
        </View>

        <View className="mt-4">
          <PeriodSelector
            onChange={setStatisticsPeriod}
            value={statisticsPeriod}
          />
        </View>

        <View className="relative mt-4 rounded-[20px] bg-[#141416] px-3 pb-5 pt-14">
          <View
            pointerEvents="none"
            className="absolute z-10 w-[142px] rounded-[14px] px-3.5 py-3"
            style={{ backgroundColor: chartColor, left: bubbleLeft, top: bubbleTop }}
          >
            <Text className="text-center text-[14px] font-extrabold text-[#06101B]">
              {formatBubbleValue(activeValue, selectedMetric)}
            </Text>
          </View>

          <LineChart
            key={`${selectedMetric}-${statisticsPeriod}`}
            animateOnDataChange
            animationDuration={850}
            areaChart
            color={chartColor}
            curved
            data={chartData}
            dataPointsColor={chartColor}
            dataPointsHeight={7}
            dataPointsWidth={7}
            disableScroll
            endFillColor={chartColor}
            endOpacity={0.02}
            endSpacing={CHART_END_SPACING}
            getPointerProps={handlePointerChange}
            height={CHART_HEIGHT}
            hideDataPoints
            initialSpacing={CHART_INITIAL_SPACING}
            isAnimated
            maxValue={chartMaxValue}
            noOfSections={5}
            overflowTop={72}
            pointerConfig={pointerConfig}
            rulesColor="#303033"
            rulesLength={chartWidth}
            rulesType="solid"
            spacing={chartSpacing}
            startFillColor={chartColor}
            startOpacity={0.36}
            thickness={3}
            width={chartWidth}
            xAxisColor="transparent"
            yAxisColor="transparent"
            yAxisLabelWidth={CHART_Y_AXIS_LABEL_WIDTH}
            yAxisLabelTexts={yAxisLabelTexts}
            yAxisTextStyle={CHART_Y_AXIS_TEXT_STYLE}
          />
        </View>

        <View className="mt-4 flex-row gap-2.5">
          <StatCard
            isSelected={selectedMetric === "income"}
            label="Income"
            onPress={() => setSelectedMetric("income")}
            tone="green"
            value={formatMoney(statistics.income)}
          />
          <StatCard
            isSelected={selectedMetric === "expenses"}
            label="Expenses"
            onPress={() => setSelectedMetric("expenses")}
            tone="red"
            value={formatMoney(statistics.expenses)}
          />
        </View>
        <View className="mt-2.5 flex-row gap-2.5">
          <StatCard
            isSelected={selectedMetric === "cashFlow"}
            label="Cash flow"
            onPress={() => setSelectedMetric("cashFlow")}
            tone="blue"
            value={formatMoney(statistics.cashFlow, { signed: true })}
          />
          <StatCard
            isSelected={selectedMetric === "expenseTrend"}
            label="Expense trend"
            onPress={() => setSelectedMetric("expenseTrend")}
            tone={
              statistics.expenseDeltaLabel.includes("more") ? "yellow" : "green"
            }
            value={statistics.expenseDeltaLabel}
          />
        </View>

        <View className="mt-6">
          <PeriodSelector
            onChange={setTransactionsPeriod}
            value={transactionsPeriod}
          />
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-[29px] font-extrabold text-[#A6A6A8]">
            Transactions
          </Text>
          <View className="relative items-end">
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center"
              onPress={() =>
                setIsTransactionFilterOpen((currentValue) => !currentValue)
              }
            >
              <Text className="text-[20px] font-bold text-[#77777B]">
                {TRANSACTION_FILTER_LABELS[transactionFilter]}
              </Text>
              <ChevronDown color="#77777B" size={19} strokeWidth={3} />
            </Pressable>

            {isTransactionFilterOpen ? (
              <View className="absolute right-0 top-9 z-20 w-[132px] overflow-hidden rounded-[14px] border border-white/10 bg-[#1D1D1F]">
                {(["all", "expenses", "income"] as TransactionFilter[]).map(
                  (filter) => {
                    const isSelected = transactionFilter === filter;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={`px-4 py-3 ${
                          isSelected ? "bg-[#242426]" : "bg-transparent"
                        }`}
                        key={filter}
                        onPress={() => {
                          setTransactionFilter(filter);
                          setIsTransactionFilterOpen(false);
                        }}
                      >
                        <Text
                          className={`text-[14px] font-bold ${
                            isSelected ? "text-white" : "text-[#9D9D9F]"
                          }`}
                        >
                          {TRANSACTION_FILTER_LABELS[filter]}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214]">
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                {...toTransactionRowProps(transaction)}
              />
            ))
          ) : (
            <View className="items-center justify-center px-5 py-10">
              <Text className="text-[15px] font-bold text-[#77777B]">
                No hay transacciones
              </Text>
            </View>
          )}
        </View>

        <View className="mt-5 flex-row gap-2.5">
          <View className="flex-1 flex-row items-center rounded-[16px] bg-[#141416] px-4 py-4">
            <TrendingUp color="#5BED97" size={20} strokeWidth={2.6} />
            <Text className="ml-2 text-[13px] font-bold text-[#D8D8DC]">
              Income is trending up
            </Text>
          </View>
          <View className="flex-1 flex-row items-center rounded-[16px] bg-[#141416] px-4 py-4">
            <TrendingDown color="#F2CB63" size={20} strokeWidth={2.6} />
            <Text className="ml-2 text-[13px] font-bold text-[#D8D8DC]">
              Spending needs review
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
