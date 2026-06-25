import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IOverviewRepository } from "@/modules/overview/interfaces/overview.repository.interface.js";
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
});
