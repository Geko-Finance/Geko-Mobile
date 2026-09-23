import {
  ArrowDown,
  Bell,
  ChevronDown,
  Grid2X2,
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
  isWithinPeriod,
  useFinanceChartSeries,
  useFinanceEntries,
  useFinanceSummary,
  type FinanceEntry,
  type FinancePeriod,
  type StatisticMetric,
  type TransactionFilter,
} from "@/src/features/finances/api/finance-queries";
import { TransactionRow } from "@/src/features/home/components/TransactionRow";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

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

const DEFAULT_CHART_DATA: ChartPoint[] = [
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
];

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

function formatXlm(value: number, options?: { signed?: boolean }): string {
  const sign = options?.signed && value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)} XLM`;
}

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

  return formatXlm(value);
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

function toFinanceEntryRowProps(entry: FinanceEntry) {
  const title =
    entry.crossBorder || entry.counterparty === null
      ? "Cross-border transfer"
      : `${entry.counterparty.slice(0, 4)}…${entry.counterparty.slice(-4)}`;

  const dateStr = new Date(entry.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const meta = entry.pending ? `Processing · ${dateStr}` : dateStr;

  const amount =
    entry.amountXlm === null
      ? "Pending"
      : formatXlm(
          Number(entry.amountXlm) * (entry.type === "received" ? 1 : -1),
          { signed: true }
        );

  const amountTone = entry.pending
    ? ("yellow" as const)
    : entry.type === "received"
      ? ("green" as const)
      : ("red" as const);

  const icon = entry.crossBorder
    ? Repeat2
    : entry.type === "received"
      ? ArrowDown
      : Send;

  return {
    amount,
    amountTone,
    icon,
    meta,
    title,
  };
}

export function FinancesScreen() {
  const insets = useSafeAreaInsets();
  const activeAccount = useActiveAccount();
  const [statisticsPeriod, setStatisticsPeriod] =
    useState<FinancePeriod>("today");
  const [selectedMetric, setSelectedMetric] =
    useState<StatisticMetric>("income");
  const [transactionsPeriod, setTransactionsPeriod] =
    useState<FinancePeriod>("today");
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");
  const [isTransactionFilterOpen, setIsTransactionFilterOpen] = useState(false);
  const summaryQuery = useFinanceSummary(statisticsPeriod);
  const chartQuery = useFinanceChartSeries(selectedMetric, statisticsPeriod);
  const entriesQuery = useFinanceEntries();
  const isLoading =
    summaryQuery.isLoading || chartQuery.isLoading || entriesQuery.isLoading;
  const isError =
    summaryQuery.isError || chartQuery.isError || entriesQuery.isError;
  const screenWidth = Dimensions.get("window").width;
  const chartCardWidth = screenWidth - 40;
  const chartWidth = Math.max(chartCardWidth - 82, 240);
  const statistics = summaryQuery.data;
  const transactions = useMemo(() => {
    if (entriesQuery.data === undefined) {
      return [];
    }

    return entriesQuery.data
      .filter((entry) => isWithinPeriod(entry.createdAt, transactionsPeriod))
      .filter((entry) => {
        if (transactionFilter === "all") {
          return true;
        }

        if (transactionFilter === "income") {
          return entry.type === "received";
        }

        return entry.type === "sent";
      });
  }, [entriesQuery.data, transactionFilter, transactionsPeriod]);
  const chartData = chartQuery.data ?? DEFAULT_CHART_DATA;
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
  const handleRetry = useCallback(() => {
    void Promise.all([
      summaryQuery.refetch(),
      chartQuery.refetch(),
      entriesQuery.refetch(),
    ]);
  }, [chartQuery, entriesQuery, summaryQuery]);

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

        {!activeAccount ? (
          <ScreenPlaceholder
            description="Add or create a wallet to see your balances and activity."
            eyebrow="App"
            title="Finances"
          />
        ) : (
          <>
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

            {isLoading ? (
              <>
                <Skeleton
                  className="mt-4 h-[220px] rounded-[20px]"
                  startColor="bg-[#242426]"
                />
                <View className="mt-4 flex-row gap-2.5">
                  <Skeleton
                    className="h-[78px] flex-1 rounded-[16px]"
                    startColor="bg-[#242426]"
                  />
                  <Skeleton
                    className="h-[78px] flex-1 rounded-[16px]"
                    startColor="bg-[#242426]"
                  />
                </View>
                <View className="mt-2.5 flex-row gap-2.5">
                  <Skeleton
                    className="h-[78px] flex-1 rounded-[16px]"
                    startColor="bg-[#242426]"
                  />
                  <Skeleton
                    className="h-[78px] flex-1 rounded-[16px]"
                    startColor="bg-[#242426]"
                  />
                </View>
              </>
            ) : isError ? (
              <View className="mt-4 flex-row items-center justify-center gap-3">
                <Text className="text-[15px] font-semibold text-[#77777B]">
                  Couldn&apos;t load your finances
                </Text>
                <Pressable accessibilityRole="button" onPress={handleRetry}>
                  <Text className="text-[15px] font-semibold text-[#087BFF]">
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="relative mt-4 rounded-[20px] bg-[#141416] px-3 pb-5 pt-14">
                  <View
                    pointerEvents="none"
                    className="absolute z-10 w-[142px] rounded-[14px] px-3.5 py-3"
                    style={{
                      backgroundColor: chartColor,
                      left: bubbleLeft,
                      top: bubbleTop,
                    }}
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
                    value={formatXlm(statistics?.income ?? 0)}
                  />
                  <StatCard
                    isSelected={selectedMetric === "expenses"}
                    label="Expenses"
                    onPress={() => setSelectedMetric("expenses")}
                    tone="red"
                    value={formatXlm(statistics?.expenses ?? 0)}
                  />
                </View>
                <View className="mt-2.5 flex-row gap-2.5">
                  <StatCard
                    isSelected={selectedMetric === "cashFlow"}
                    label="Cash flow"
                    onPress={() => setSelectedMetric("cashFlow")}
                    tone="blue"
                    value={formatXlm(statistics?.cashFlow ?? 0, { signed: true })}
                  />
                  <StatCard
                    isSelected={selectedMetric === "expenseTrend"}
                    label="Expense trend"
                    onPress={() => setSelectedMetric("expenseTrend")}
                    tone={
                      statistics?.expenseDeltaLabel?.includes("more")
                        ? "yellow"
                        : "green"
                    }
                    value={statistics?.expenseDeltaLabel ?? "0% today"}
                  />
                </View>
              </>
            )}

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
              {isLoading ? (
                <Skeleton
                  className="h-[120px] rounded-[20px]"
                  startColor="bg-[#242426]"
                />
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    {...toFinanceEntryRowProps(transaction)}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
