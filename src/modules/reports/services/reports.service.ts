import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IReportsRepository } from "@/modules/reports/interfaces/reports.repository.interface.js";
import type { IReportsService } from "@/modules/reports/interfaces/reports.service.interface.js";
import type {
	ReportDeltaDto,
	ReportsQuery,
	ReportsResponseDto,
} from "@/modules/reports/schemas/index.js";

const CACHE_TTL_SECONDS = 300;

const PT_MONTHS = [
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

function neutralDelta(): ReportDeltaDto {
	return { value: 0, unit: "percent", direction: "neutral" };
}

function formatPeriod(year: number, month: number): string {
	return `${PT_MONTHS[month - 1]}/${String(year).slice(2)}`;
}

function formatPeriodLong(year: number, month: number): string {
	const names = [
		"Janeiro",
		"Fevereiro",
		"Março",
		"Abril",
		"Maio",
		"Junho",
		"Julho",
		"Agosto",
		"Setembro",
		"Outubro",
		"Novembro",
		"Dezembro",
	];
	return `${names[month - 1]}/${year}`;
}

function parseDateRange(query: ReportsQuery): { start: Date; end: Date } {
	const now = new Date();
	const range = query.range ?? "last-6-months";

	if (range === "last-3-months") {
		const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		return { start, end };
	}

	if (range === "last-6-months") {
		const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		return { start, end };
	}

	if (range === "this-year") {
		const start = new Date(now.getFullYear(), 0, 1);
		const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
		return { start, end };
	}

	// custom
	const start = query.from
		? new Date(query.from)
		: new Date(now.getFullYear(), 0, 1);
	const end = query.to ? new Date(query.to) : now;
	return { start, end };
}

function average(values: number[]): number {
	if (values.length === 0) return 0;
	return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export class ReportsService implements IReportsService {
	private repo: IReportsRepository;
	private cache: CacheService;

	constructor({
		reportsRepository,
		cache,
	}: {
		reportsRepository: IReportsRepository;
		cache: CacheService;
	}) {
		this.repo = reportsRepository;
		this.cache = cache;
	}

	async getData(
		userId: string,
		query: ReportsQuery,
	): Promise<ReportsResponseDto> {
		const range = query.range ?? "last-6-months";
		const key = `reports:${userId}:${range}:${query.from ?? ""}:${query.to ?? ""}:${query.categories ?? ""}`;
		const cached = await this.cache.get<ReportsResponseDto>(key);
		if (cached) return cached;

		const { start, end } = parseDateRange(query);
		const categories = query.categories
			? query.categories
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined;

		const [aggregates, catRows] = await Promise.all([
			this.repo.getMonthlyAggregates(userId, start, end, categories),
			this.repo.getExpensesByCategory(userId, start, end, categories),
		]);

		// Pontos do gráfico
		const incomePoints = aggregates.map((a) => ({
			label: formatPeriod(a.year, a.month),
			value: a.totalIncome,
		}));
		const expensePoints = aggregates.map((a) => ({
			label: formatPeriod(a.year, a.month),
			value: a.totalExpenses,
		}));

		// KPIs
		const avgIncome = average(aggregates.map((a) => a.totalIncome));
		const avgExpense = average(aggregates.map((a) => a.totalExpenses));
		const savingsRates = aggregates.map((a) =>
			a.totalIncome > 0
				? Math.round(((a.totalIncome - a.totalExpenses) / a.totalIncome) * 100)
				: 0,
		);
		const avgSavingsRate = average(savingsRates);

		// expensesByCategory
		const catTotal = catRows.reduce((s, c) => s + c.total, 0);
		const catItems = catRows.map((c) => ({
			category: c.category,
			amount: c.total,
			percent: catTotal > 0 ? Math.round((c.total / catTotal) * 1000) / 10 : 0,
		}));

		// monthlySummary
		const monthlySummary = aggregates.map((a) => ({
			period: formatPeriodLong(a.year, a.month),
			income: a.totalIncome,
			expenses: a.totalExpenses,
			balance: a.totalIncome - a.totalExpenses,
		}));

		const result: ReportsResponseDto = {
			filters: {
				range,
				accounts: [],
				categories: categories ?? [],
			},
			incomeVsExpense: {
				income: { id: "income", label: "Receitas", points: incomePoints },
				expenses: { id: "expenses", label: "Despesas", points: expensePoints },
			},
			kpis: {
				averageIncome: { amount: avgIncome, delta: neutralDelta() },
				averageExpense: { amount: avgExpense, delta: neutralDelta() },
				averageSavingsRate: { percent: avgSavingsRate, targetPercent: 50 },
			},
			expensesByCategory: { total: catTotal, items: catItems },
			monthlySummary,
		};

		await this.cache.set(key, result, CACHE_TTL_SECONDS);
		return result;
	}
}
