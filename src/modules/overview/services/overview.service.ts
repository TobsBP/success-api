import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IOverviewRepository } from "@/modules/overview/interfaces/overview.repository.interface.js";
import type { IOverviewService } from "@/modules/overview/interfaces/overview.service.interface.js";
import type {
	DeltaDto,
	OverviewResponseDto,
} from "@/modules/overview/schemas/index.js";

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string, month: string) =>
	`overview:${userId}:${month}`;

const EXPENSE_COLORS = [
	"var(--color-primary-container)",
	"var(--color-inverse-primary)",
	"var(--color-secondary)",
	"var(--color-tertiary)",
];

const INCOME_INDICATORS = ["bg-secondary", "bg-inverse-primary", "bg-primary"];

const MONTH_LABELS = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
];

function addMonths(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
	return `${MONTH_LABELS[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
}

function delta(value: number, unit: DeltaDto["unit"]): DeltaDto {
	return {
		value: Math.round(Math.abs(value) * 10) / 10,
		unit,
		direction: value >= 0 ? "up" : "down",
		comparisonLabel: "vs mês anterior",
	};
}

function percentDelta(current: number, previous: number): DeltaDto {
	const change =
		previous === 0
			? current === 0
				? 0
				: 100
			: ((current - previous) / Math.abs(previous)) * 100;
	return delta(change, "percent");
}

function parseMonthRange(month?: string): { start: Date; end: Date } {
	const now = new Date();
	if (month) {
		const [year, mon] = month.split("-").map(Number);
		const start = new Date(year, mon - 1, 1);
		const end = new Date(year, mon, 1);
		return { start, end };
	}
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	return { start, end };
}

export class OverviewService implements IOverviewService {
	private repo: IOverviewRepository;
	private cache: CacheService;

	constructor({
		overviewRepository,
		cache,
	}: {
		overviewRepository: IOverviewRepository;
		cache: CacheService;
	}) {
		this.repo = overviewRepository;
		this.cache = cache;
	}

	async getData(userId: string, month?: string): Promise<OverviewResponseDto> {
		const key = cacheKey(userId, month ?? "current");
		const cached = await this.cache.get<OverviewResponseDto>(key);
		if (cached) return cached;

		const { start, end } = parseMonthRange(month);
		const historyStart = addMonths(start, -6);
		const historyEnd = addMonths(start, 2);

		const [
			totals,
			monthlyTotals,
			expCats,
			incSources,
			goalRows,
			topInvestment,
			largestExpense,
		] = await Promise.all([
			this.repo.getMonthTotals(userId, start, end),
			this.repo.getMonthlyTotalsByMonth(userId, historyStart, historyEnd),
			this.repo.getExpensesByCategory(userId, start, end),
			this.repo.getIncomeBySource(userId, start, end),
			this.repo.getActiveGoals(userId),
			this.repo.getTopInvestment(userId),
			this.repo.getLargestExpense(userId, start, end),
		]);

		const { totalIncome, totalExpenses } = totals;
		const monthlyBalance = totalIncome - totalExpenses;
		const savingsRate =
			totalIncome > 0
				? Math.round((monthlyBalance / totalIncome) * 1000) / 10
				: 0;

		const totalsByMonth = new Map(
			monthlyTotals.map((item) => [item.month, item]),
		);
		const previousMonth = totalsByMonth.get(monthKey(addMonths(start, -1)));
		const previousIncome = previousMonth?.totalIncome ?? 0;
		const previousExpenses = previousMonth?.totalExpenses ?? 0;
		const previousBalance = previousIncome - previousExpenses;
		const previousSavingsRate =
			previousIncome > 0
				? Math.round((previousBalance / previousIncome) * 1000) / 10
				: 0;

		const chartMonths = Array.from({ length: 6 }, (_, index) =>
			addMonths(start, index - 5),
		);
		const nextMonth = addMonths(start, 1);
		const nextMonthData = totalsByMonth.get(monthKey(nextMonth));

		// Dias no mês e dias restantes
		const now = new Date();
		const daysInMonth = new Date(
			start.getFullYear(),
			start.getMonth() + 1,
			0,
		).getDate();
		const dayOfMonth =
			start.getMonth() === now.getMonth() ? now.getDate() : daysInMonth;
		const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

		// expensesByCategory
		const expensesTotal = expCats.reduce((s, c) => s + c.total, 0);
		const expensesItems = expCats.map((c, i) => ({
			category: c.category,
			amount: c.total,
			percent:
				expensesTotal > 0
					? Math.round((c.total / expensesTotal) * 1000) / 10
					: 0,
			...(EXPENSE_COLORS[i] !== undefined && { color: EXPENSE_COLORS[i] }),
		}));

		// incomeBySource
		const incomeTotal = incSources.reduce((s, c) => s + c.total, 0);
		const incomeItems = incSources.map((c, i) => ({
			source: c.source,
			amount: c.total,
			percent:
				incomeTotal > 0 ? Math.round((c.total / incomeTotal) * 1000) / 10 : 0,
			...(INCOME_INDICATORS[i] !== undefined && {
				indicatorClassName: INCOME_INDICATORS[i],
			}),
		}));

		// goals (máximo 3)
		const goalsResult = goalRows.slice(0, 3).map((g) => ({
			id: g.id,
			name: g.name,
			currentAmount: g.currentAmount,
			targetAmount: g.targetAmount,
			progressPercent:
				g.targetAmount > 0
					? Math.round((g.currentAmount / g.targetAmount) * 1000) / 10
					: 0,
			indicatorClassName: g.indicatorClassName,
			iconClassName: g.iconClassName,
		}));

		// investment
		const investment = topInvestment
			? {
					name: topInvestment.name,
					indexLabel: topInvestment.indexLabel,
					balance: topInvestment.balance,
					monthChange: {
						amount: topInvestment.monthlyYieldAmount,
						percent: topInvestment.monthlyYieldPercent,
					},
					monthYield: topInvestment.monthlyYieldAmount,
					yearYield: topInvestment.monthlyYieldAmount * 12,
				}
			: {
					name: "—",
					indexLabel: "—",
					balance: 0,
					monthChange: { amount: 0, percent: 0 },
					monthYield: 0,
					yearYield: 0,
				};

		// quickStats
		const averageDailySpend =
			dayOfMonth > 0 ? Math.round(totalExpenses / dayOfMonth) : 0;
		const averageDailySurplus =
			dayOfMonth > 0 ? Math.round(monthlyBalance / dayOfMonth) : 0;

		const incomePoints = chartMonths.map((m) => {
			const row = totalsByMonth.get(monthKey(m));
			return { label: monthLabel(m), value: row?.totalIncome ?? 0 };
		});
		const expensesPoints = chartMonths.map((m) => {
			const row = totalsByMonth.get(monthKey(m));
			return { label: monthLabel(m), value: row?.totalExpenses ?? 0 };
		});
		const balancePoints = chartMonths.map((m) => {
			const row = totalsByMonth.get(monthKey(m));
			return {
				label: monthLabel(m),
				value: (row?.totalIncome ?? 0) - (row?.totalExpenses ?? 0),
			};
		});

		const nextMonthPreview =
			nextMonthData && nextMonthData.totalIncome > 0
				? { label: monthLabel(nextMonth), income: nextMonthData.totalIncome }
				: undefined;

		const result: OverviewResponseDto = {
			metrics: {
				totalIncome: {
					value: totalIncome,
					delta: percentDelta(totalIncome, previousIncome),
				},
				totalExpenses: {
					value: totalExpenses,
					delta: percentDelta(totalExpenses, previousExpenses),
				},
				monthlyBalance: {
					value: monthlyBalance,
					delta: percentDelta(monthlyBalance, previousBalance),
				},
				savingsRate: {
					value: savingsRate,
					delta: delta(savingsRate - previousSavingsRate, "pp"),
				},
			},
			monthlyFlow: {
				income: {
					id: "income",
					label: "Receitas",
					color: "#22c55e",
					points: incomePoints,
				},
				expenses: {
					id: "expenses",
					label: "Despesas",
					color: "#ef4444",
					points: expensesPoints,
				},
				balance: {
					id: "balance",
					label: "Saldo",
					color: "#3b82f6",
					points: balancePoints,
				},
				nextMonthPreview,
			},
			expensesByCategory: { total: expensesTotal, items: expensesItems },
			incomeBySource: { total: incomeTotal, items: incomeItems },
			goals: goalsResult,
			investment,
			quickStats: {
				averageDailySpend,
				largestExpense: largestExpense
					? { amount: largestExpense.amount, category: largestExpense.category }
					: { amount: 0, category: "—" },
				daysRemaining,
				averageDailySurplus,
			},
		};

		await this.cache.set(key, result, CACHE_TTL_SECONDS);
		return result;
	}
}
