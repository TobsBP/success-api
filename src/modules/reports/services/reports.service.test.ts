import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IReportsRepository } from "@/modules/reports/interfaces/reports.repository.interface.js";
import { ReportsService } from "./reports.service.js";

const makeRepo = (): Record<string, Mock> => ({
	getMonthlyAggregates: vi.fn().mockResolvedValue([]),
	getExpensesByCategory: vi.fn().mockResolvedValue([]),
});

describe("ReportsService", () => {
	let service: ReportsService;
	let mockRepo: Record<string, Mock>;
	let mockCache: { get: Mock; set: Mock; del: Mock };

	beforeEach(() => {
		mockRepo = makeRepo();
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn(),
		};
		service = new ReportsService({
			reportsRepository: mockRepo as unknown as IReportsRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	it("deve retornar relatório vazio quando não há lançamentos", async () => {
		const result = await service.getData("user-1", { range: "last-6-months" });

		expect(result.incomeVsExpense.income.points).toEqual([]);
		expect(result.incomeVsExpense.expenses.points).toEqual([]);
		expect(result.monthlySummary).toEqual([]);
		expect(result.kpis.averageIncome.amount).toBe(0);
		expect(mockCache.set).toHaveBeenCalled();
	});

	it("deve calcular médias e taxa de poupança corretamente", async () => {
		mockRepo.getMonthlyAggregates.mockResolvedValue([
			{ year: 2024, month: 4, totalIncome: 1000000, totalExpenses: 300000 },
			{ year: 2024, month: 5, totalIncome: 800000, totalExpenses: 200000 },
		]);

		const result = await service.getData("user-1", { range: "last-3-months" });

		expect(result.kpis.averageIncome.amount).toBe(900000);
		expect(result.kpis.averageExpense.amount).toBe(250000);
		expect(result.kpis.averageSavingsRate.percent).toBe(73); // avg(70%, 75%)
	});

	it("deve formatar corretamente as entradas do monthlySummary", async () => {
		mockRepo.getMonthlyAggregates.mockResolvedValue([
			{ year: 2024, month: 5, totalIncome: 866620, totalExpenses: 235700 },
		]);

		const result = await service.getData("user-1", { range: "last-3-months" });

		expect(result.monthlySummary[0].period).toBe("Maio/2024");
		expect(result.monthlySummary[0].balance).toBe(630920);
	});

	it("deve retornar o cache quando disponível", async () => {
		const cached = { filters: { range: "last-6-months" } } as unknown;
		mockCache.get.mockResolvedValue(cached);

		const result = await service.getData("user-1", { range: "last-6-months" });

		expect(result).toBe(cached);
		expect(mockRepo.getMonthlyAggregates).not.toHaveBeenCalled();
	});

	it("deve usar intervalo customizado corretamente", async () => {
		const result = await service.getData("user-1", {
			range: "custom",
			from: "2024-01-01",
			to: "2024-03-31",
		});

		expect(result.filters.range).toBe("custom");
		expect(mockRepo.getMonthlyAggregates).toHaveBeenCalledWith(
			"user-1",
			new Date("2024-01-01"),
			new Date("2024-03-31"),
			undefined,
		);
	});
});
