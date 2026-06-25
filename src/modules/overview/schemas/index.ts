import { type Static, Type } from "@sinclair/typebox";

// --- Delta ---
export const DeltaSchema = Type.Object({
	value: Type.Number(),
	unit: Type.Union([
		Type.Literal("percent"),
		Type.Literal("pp"),
		Type.Literal("currency"),
	]),
	direction: Type.Union([
		Type.Literal("up"),
		Type.Literal("down"),
		Type.Literal("neutral"),
	]),
	comparisonLabel: Type.Optional(Type.String()),
});

// --- ChartPoint e ChartSeries ---
export const ChartPointSchema = Type.Object({
	label: Type.String(),
	value: Type.Number(),
});

export const ChartSeriesSchema = Type.Object({
	id: Type.String(),
	label: Type.String(),
	points: Type.Array(ChartPointSchema),
});

// --- MetricEntry ---
export const MetricEntrySchema = Type.Object({
	value: Type.Number(),
	delta: DeltaSchema,
});

// --- ExpenseCategoryItem / IncomeSourceItem ---
export const ExpenseCategoryItemSchema = Type.Object({
	category: Type.String(),
	amount: Type.Number(),
	percent: Type.Number(),
});

export const IncomeSourceItemSchema = Type.Object({
	source: Type.String(),
	amount: Type.Number(),
	percent: Type.Number(),
});

// --- Goal entry ---
export const GoalEntrySchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	currentAmount: Type.Number(),
	targetAmount: Type.Number(),
	progressPercent: Type.Number(),
});

// --- Investment summary ---
export const MonthChangeSchema = Type.Object({
	amount: Type.Number(),
	percent: Type.Number(),
});

export const InvestmentSummarySchema = Type.Object({
	name: Type.String(),
	indexLabel: Type.String(),
	balance: Type.Number(),
	monthChange: MonthChangeSchema,
	monthYield: Type.Number(),
	yearYield: Type.Number(),
});

// --- QuickStats ---
export const LargestExpenseSchema = Type.Object({
	amount: Type.Number(),
	category: Type.String(),
});

export const QuickStatsSchema = Type.Object({
	averageDailySpend: Type.Number(),
	largestExpense: LargestExpenseSchema,
	daysRemaining: Type.Number(),
	averageDailySurplus: Type.Number(),
});

// --- Full response ---
export const OverviewResponseSchema = Type.Object({
	metrics: Type.Object({
		totalIncome: MetricEntrySchema,
		totalExpenses: MetricEntrySchema,
		monthlyBalance: MetricEntrySchema,
		savingsRate: MetricEntrySchema,
	}),
	monthlyFlow: Type.Object({
		income: ChartSeriesSchema,
		expenses: ChartSeriesSchema,
		balance: ChartSeriesSchema,
	}),
	expensesByCategory: Type.Object({
		total: Type.Number(),
		items: Type.Array(ExpenseCategoryItemSchema),
	}),
	incomeBySource: Type.Object({
		total: Type.Number(),
		items: Type.Array(IncomeSourceItemSchema),
	}),
	goals: Type.Array(GoalEntrySchema),
	investment: InvestmentSummarySchema,
	quickStats: QuickStatsSchema,
});

// --- Query ---
export const OverviewQuerySchema = Type.Object({
	month: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}$" })),
});

export type OverviewResponseDto = Static<typeof OverviewResponseSchema>;
export type OverviewQuery = Static<typeof OverviewQuerySchema>;
export type DeltaDto = Static<typeof DeltaSchema>;
