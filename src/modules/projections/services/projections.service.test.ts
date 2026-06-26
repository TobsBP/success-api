import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IProjectionsRepository } from "@/modules/projections/interfaces/projections.repository.interface.js";
import { ProjectionsService } from "./projections.service.js";

describe("ProjectionsService", () => {
	let service: ProjectionsService;
	let mockRepo: {
		getAssumptions: Mock;
		upsertAssumptions: Mock;
	};
	let mockCache: {
		get: Mock;
		set: Mock;
		del: Mock;
	};

	beforeEach(() => {
		mockRepo = {
			getAssumptions: vi.fn(),
			upsertAssumptions: vi.fn(),
		};
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};
		service = new ProjectionsService({
			projectionsRepository: mockRepo as unknown as IProjectionsRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	describe("getProjections", () => {
		it("deve retornar projeções com valores padrão quando não há premissas salvas", async () => {
			mockRepo.getAssumptions.mockResolvedValue(null);

			const result = await service.getProjections("user-1", 10);

			expect(result.timeframe).toBe(10);
			expect(result.scenarios).toHaveLength(3);
			expect(result.scenarios[0].type).toBe("base");
			expect(result.scenarios[1].type).toBe("conservative");
			expect(result.scenarios[2].type).toBe("aggressive");
			expect(result.summary.initialNetWorth).toBe(0);
			expect(result.summary.estimatedAnnualRatePercent).toBe(8.5);
			expect(mockCache.set).toHaveBeenCalled();
		});

		it("deve usar as premissas salvas do usuário quando existentes", async () => {
			mockRepo.getAssumptions.mockResolvedValue({
				plannedMonthlyContribution: 1000,
				estimatedAnnualRatePercent: 10,
				inflationPercent: 4,
				contributionGrowthPercent: 5,
				returnsByClass: [{ assetClass: "Renda Fixa", annualRatePercent: 10 }],
			});

			const result = await service.getProjections("user-1", 5);

			expect(result.summary.plannedMonthlyContribution).toBe(1000);
			expect(result.summary.estimatedAnnualRatePercent).toBe(10);
			expect(result.assumptions.returnsByClass).toHaveLength(1);
		});

		it("deve retornar resultado em cache se disponível e timeframe igual", async () => {
			const cached = {
				timeframe: 10,
				summary: {
					initialNetWorth: 0,
					plannedMonthlyContribution: 0,
					estimatedAnnualRatePercent: 8.5,
					projectionIn10Years: 0,
				},
				scenarios: [],
				assumptions: {
					inflationPercent: 4.5,
					contributionGrowthPercent: 5.5,
					returnsByClass: [],
				},
				compositionAtHorizon: { total: 0, items: [] },
			};
			mockCache.get.mockResolvedValue(cached);

			const result = await service.getProjections("user-1", 10);

			expect(result).toEqual(cached);
			expect(mockRepo.getAssumptions).not.toHaveBeenCalled();
		});

		it("deve gerar pontos de projeção corretos para o cenário base", async () => {
			mockRepo.getAssumptions.mockResolvedValue({
				plannedMonthlyContribution: 0,
				estimatedAnnualRatePercent: 10,
				inflationPercent: 4,
				contributionGrowthPercent: 5,
				returnsByClass: [],
			});

			const result = await service.getProjections("user-1", 2);
			const basePoints = result.scenarios.find(
				(s) => s.type === "base",
			)?.points;

			expect(basePoints).toBeDefined();
			// Ano 1: 0 * 1.1 + 0 * 12 = 0
			expect(basePoints?.[0].label).toBe("Hoje");
			expect(basePoints?.[0].value).toBe(0);
			expect(basePoints?.[1].label).toBe("Ano 1");
			expect(basePoints?.[2].label).toBe("Ano 2");
			expect(basePoints).toHaveLength(3); // Hoje + 2 anos
		});

		it("deve calcular compositionAtHorizon proporcionalmente ao returnsByClass", async () => {
			mockRepo.getAssumptions.mockResolvedValue({
				plannedMonthlyContribution: 0,
				estimatedAnnualRatePercent: 10,
				inflationPercent: 4,
				contributionGrowthPercent: 5,
				returnsByClass: [
					{ assetClass: "Renda Fixa", annualRatePercent: 60 },
					{ assetClass: "Ações", annualRatePercent: 40 },
				],
			});

			const result = await service.getProjections("user-1", 5);

			expect(result.compositionAtHorizon.items).toHaveLength(2);
			expect(result.compositionAtHorizon.items[0].percent).toBe(60);
			expect(result.compositionAtHorizon.items[1].percent).toBe(40);
		});
	});

	describe("updateAssumptions", () => {
		it("deve fazer upsert das premissas e invalidar o cache", async () => {
			const data = {
				plannedMonthlyContribution: 500,
				estimatedAnnualRatePercent: 9,
				inflationPercent: 4,
				contributionGrowthPercent: 5,
				returnsByClass: [],
			};
			mockRepo.upsertAssumptions.mockResolvedValue(data);

			const result = await service.updateAssumptions("user-1", data);

			expect(mockRepo.upsertAssumptions).toHaveBeenCalledWith("user-1", data);
			expect(mockCache.del).toHaveBeenCalledWith("projections:user-1");
			expect(result).toEqual(data);
		});
	});
});
