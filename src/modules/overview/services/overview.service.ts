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

function neutralDelta(): DeltaDto {
	return { value: 0, unit: "percent", direction: "neutral" };
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

		const [
			totals,
			expCats,
			incSources,
			goalRows,
			topInvestment,
			largestExpense,
		] = await Promise.all([
			this.repo.getMonthTotals(userId, start, end),
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
		const expensesItems = expCats.map((c) => ({
			category: c.category,
			amount: c.total,
			percent:
				expensesTotal > 0
					? Math.round((c.total / expensesTotal) * 1000) / 10
					: 0,
		}));

		// incomeBySource
		const incomeTotal = incSources.reduce((s, c) => s + c.total, 0);
		const incomeItems = incSources.map((c) => ({
			source: c.source,
			amount: c.total,
			percent:
				incomeTotal > 0 ? Math.round((c.total / incomeTotal) * 1000) / 10 : 0,
		}));

		// goals
		const goalsResult = goalRows.map((g) => ({
			id: g.id,
			name: g.name,
			currentAmount: g.currentAmount,
			targetAmount: g.targetAmount,
			progressPercent:
				g.targetAmount > 0
					? Math.round((g.currentAmount / g.targetAmount) * 1000) / 10
					: 0,
		}));

		// investment
		const investment = topInvestment
			? {
					name: topInvestment.name,
					indexLabel: "—",
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

		const result: OverviewResponseDto = {
			metrics: {
				totalIncome: { value: totalIncome, delta: neutralDelta() },
				totalExpenses: { value: totalExpenses, delta: neutralDelta() },
				monthlyBalance: { value: monthlyBalance, delta: neutralDelta() },
				savingsRate: { value: savingsRate, delta: neutralDelta() },
			},
			monthlyFlow: {
				income: { id: "income", label: "Receitas", points: [] },
				expenses: { id: "expenses", label: "Despesas", points: [] },
				balance: { id: "balance", label: "Saldo", points: [] },
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
