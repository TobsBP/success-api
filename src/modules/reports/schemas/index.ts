import { type Static, Type } from "@sinclair/typebox";

// --- Delta ---
export const ReportDeltaSchema = Type.Object({
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
export const ReportChartPointSchema = Type.Object({
	label: Type.String(),
	value: Type.Number(),
});

export const ReportChartSeriesSchema = Type.Object({
	id: Type.String(),
	label: Type.String(),
	points: Type.Array(ReportChartPointSchema),
});

// --- Category item ---
export const ReportCategoryItemSchema = Type.Object({
	category: Type.String(),
	amount: Type.Number(),
	percent: Type.Number(),
});

// --- Monthly summary row ---
export const MonthlySummaryRowSchema = Type.Object({
	period: Type.String(),
	income: Type.Number(),
	expenses: Type.Number(),
	balance: Type.Number(),
});

// --- KPIs ---
export const ReportKpisSchema = Type.Object({
	averageIncome: Type.Object({
		amount: Type.Number(),
		delta: ReportDeltaSchema,
	}),
	averageExpense: Type.Object({
		amount: Type.Number(),
		delta: ReportDeltaSchema,
	}),
	averageSavingsRate: Type.Object({
		percent: Type.Number(),
		targetPercent: Type.Number(),
	}),
});

// --- Full response ---
export const ReportsResponseSchema = Type.Object({
	filters: Type.Object({
		range: Type.String(),
		accounts: Type.Array(Type.String()),
		categories: Type.Array(Type.String()),
	}),
	incomeVsExpense: Type.Object({
		income: ReportChartSeriesSchema,
		expenses: ReportChartSeriesSchema,
	}),
	kpis: ReportKpisSchema,
	expensesByCategory: Type.Object({
		total: Type.Number(),
		items: Type.Array(ReportCategoryItemSchema),
	}),
	monthlySummary: Type.Array(MonthlySummaryRowSchema),
});

// --- Query ---
export const ReportsQuerySchema = Type.Object({
	range: Type.Optional(
		Type.Union([
			Type.Literal("last-3-months"),
			Type.Literal("last-6-months"),
			Type.Literal("this-year"),
			Type.Literal("custom"),
		]),
	),
	from: Type.Optional(Type.String()),
	to: Type.Optional(Type.String()),
	accounts: Type.Optional(Type.String()),
	categories: Type.Optional(Type.String()),
});

export type ReportsResponseDto = Static<typeof ReportsResponseSchema>;
export type ReportsQuery = Static<typeof ReportsQuerySchema>;
export type ReportDeltaDto = Static<typeof ReportDeltaSchema>;
