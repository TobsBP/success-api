import { Value } from "@sinclair/typebox/value";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IOverviewRepository } from "@/modules/overview/interfaces/overview.repository.interface.js";
import { OverviewResponseSchema } from "@/modules/overview/schemas/index.js";
import { OverviewService } from "./overview.service.js";

const makeRepo = (): Record<string, Mock> => ({
	getMonthTotals: vi
		.fn()
		.mockResolvedValue({ totalIncome: 0, totalExpenses: 0 }),
	getExpensesByCategory: vi.fn().mockResolvedValue([]),
	getIncomeBySource: vi.fn().mockResolvedValue([]),
	getActiveGoals: vi.fn().mockResolvedValue([]),
	getTopInvestment: vi.fn().mockResolvedValue(null),
	getLargestExpense: vi.fn().mockResolvedValue(null),
	getMonthlyTotalsByMonth: vi.fn().mockResolvedValue([]),
});

describe("OverviewService", () => {
	let service: OverviewService;
	let mockRepo: Record<string, Mock>;
	let mockCache: { get: Mock; set: Mock; del: Mock };

	beforeEach(() => {
		mockRepo = makeRepo();
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn(),
		};
		service = new OverviewService({
			overviewRepository: mockRepo as unknown as IOverviewRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	it("deve retornar dados do overview com totais zerados quando não há lançamentos", async () => {
		const result = await service.getData("user-1", "2024-06");

		expect(result.metrics.totalIncome.value).toBe(0);
		expect(result.metrics.totalExpenses.value).toBe(0);
		expect(result.metrics.monthlyBalance.value).toBe(0);
		expect(result.metrics.savingsRate.value).toBe(0);
		expect(result.goals).toEqual([]);
		expect(mockCache.set).toHaveBeenCalled();
	});

	it("deve calcular corretamente o saldo e a taxa de poupança", async () => {
		mockRepo.getMonthTotals.mockResolvedValue({
			totalIncome: 1000000,
			totalExpenses: 300000,
		});

		const result = await service.getData("user-1", "2024-06");

		expect(result.metrics.monthlyBalance.value).toBe(700000);
		expect(result.metrics.savingsRate.value).toBe(70);
	});

	it("deve retornar o cache quando disponível", async () => {
		const cached = { metrics: {}, monthlyFlow: {}, goals: [] } as unknown;
		mockCache.get.mockResolvedValue(cached);

		const result = await service.getData("user-1", "2024-06");

		expect(result).toBe(cached);
		expect(mockRepo.getMonthTotals).not.toHaveBeenCalled();
	});

	it("deve incluir categorias de despesas com percentuais", async () => {
		mockRepo.getExpensesByCategory.mockResolvedValue([
			{ category: "alimentação", total: 60000 },
			{ category: "transporte", total: 40000 },
		]);

		const result = await service.getData("user-1", "2024-06");

		expect(result.expensesByCategory.total).toBe(100000);
		expect(result.expensesByCategory.items[0].percent).toBe(60);
		expect(result.expensesByCategory.items[1].percent).toBe(40);
	});

	it("deve montar o contrato completo com histórico, deltas, preview e três metas", async () => {
		mockRepo.getMonthlyTotalsByMonth.mockResolvedValue([
			{ month: "2023-12", totalIncome: 800, totalExpenses: 400 },
			{ month: "2024-01", totalIncome: 900, totalExpenses: 500 },
			{ month: "2024-02", totalIncome: 1000, totalExpenses: 600 },
			{ month: "2024-03", totalIncome: 1100, totalExpenses: 700 },
			{ month: "2024-04", totalIncome: 1200, totalExpenses: 800 },
			{ month: "2024-05", totalIncome: 1000, totalExpenses: 500 },
			{ month: "2024-06", totalIncome: 1200, totalExpenses: 600 },
			{ month: "2024-07", totalIncome: 300, totalExpenses: 0 },
		]);
		mockRepo.getMonthTotals.mockResolvedValue({
			totalIncome: 1200,
			totalExpenses: 600,
		});
		mockRepo.getActiveGoals.mockResolvedValue(
			Array.from({ length: 4 }, (_, index) => ({
				id: `goal-${index + 1}`,
				name: `Meta ${index + 1}`,
				currentAmount: 50,
				targetAmount: 100,
				indicatorClassName: `indicator-${index + 1}`,
				iconClassName: `icon-${index + 1}`,
			})),
		);
		mockRepo.getTopInvestment.mockResolvedValue({
			name: "CDB",
			indexLabel: "120% do CDI",
			balance: 10000,
			monthlyYieldAmount: 128,
			monthlyYieldPercent: 1.28,
		});

		const result = await service.getData("user-1", "2024-06");

		expect(result.metrics).toEqual({
			totalIncome: {
				value: 1200,
				delta: {
					value: 20,
					unit: "percent",
					direction: "up",
					comparisonLabel: "vs mês anterior",
				},
			},
			totalExpenses: {
				value: 600,
				delta: {
					value: 20,
					unit: "percent",
					direction: "up",
					comparisonLabel: "vs mês anterior",
				},
			},
			monthlyBalance: {
				value: 600,
				delta: {
					value: 20,
					unit: "percent",
					direction: "up",
					comparisonLabel: "vs mês anterior",
				},
			},
			savingsRate: {
				value: 50,
				delta: {
					value: 0,
					unit: "pp",
					direction: "up",
					comparisonLabel: "vs mês anterior",
				},
			},
		});
		expect(result.monthlyFlow.income.points).toEqual([
			{ label: "Jan/24", value: 900 },
			{ label: "Fev/24", value: 1000 },
			{ label: "Mar/24", value: 1100 },
			{ label: "Abr/24", value: 1200 },
			{ label: "Mai/24", value: 1000 },
			{ label: "Jun/24", value: 1200 },
		]);
		expect(result.monthlyFlow.income.color).toBeTypeOf("string");
		expect(result.monthlyFlow.expenses.color).toBeTypeOf("string");
		expect(result.monthlyFlow.balance.color).toBeTypeOf("string");
		expect(result.monthlyFlow.nextMonthPreview).toEqual({
			label: "Jul/24",
			income: 300,
		});
		expect(result.goals).toHaveLength(3);
		expect(result.goals[0]).toMatchObject({
			indicatorClassName: "indicator-1",
			iconClassName: "icon-1",
		});
		expect(result.investment.indexLabel).toBe("120% do CDI");
		expect(Value.Check(OverviewResponseSchema, result)).toBe(true);
	});

	it("deve omitir a previsão quando o mês seguinte não tem lançamentos", async () => {
		mockRepo.getMonthlyTotalsByMonth.mockResolvedValue([]);

		const result = await service.getData("user-1", "2024-06");

		expect(result.monthlyFlow.nextMonthPreview).toBeUndefined();
	});
});
