import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "@/core/errors/index.js";
import type { IInvestmentsRepository } from "@/modules/investments/interfaces/investments.repository.interface.js";
import type { AssetDto } from "@/modules/investments/schemas/index.js";
import { InvestmentsService } from "./investments.service.js";

const makeAsset = (overrides: Partial<AssetDto> = {}): AssetDto => ({
	id: "asset-1",
	name: "Tesouro Selic 2029",
	assetClass: "Renda Fixa",
	currentBalance: 5000,
	weightPercent: 0,
	monthlyYield: { amount: 50, percent: 1.0 },
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe("InvestmentsService", () => {
	let service: InvestmentsService;
	let mockRepo: {
		findAll: Mock;
		findById: Mock;
		create: Mock;
		update: Mock;
		remove: Mock;
	};

	beforeEach(() => {
		mockRepo = {
			findAll: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
		};
		service = new InvestmentsService({
			investmentsRepository: mockRepo as unknown as IInvestmentsRepository,
		});
	});

	describe("getData", () => {
		it("deve retornar resumo com ativos e alocação calculados", async () => {
			const asset1 = makeAsset({
				id: "a1",
				assetClass: "Renda Fixa",
				currentBalance: 6000,
				monthlyYield: { amount: 60, percent: 1.0 },
			});
			const asset2 = makeAsset({
				id: "a2",
				assetClass: "Renda Variável",
				currentBalance: 4000,
				monthlyYield: { amount: 40, percent: 1.0 },
			});
			mockRepo.findAll.mockResolvedValue([asset1, asset2]);

			const result = await service.getData("user-1");

			expect(result.summary.investedNetWorth.amount).toBe(10000);
			expect(result.summary.monthlyYield.amount).toBe(100);
			expect(result.summary.yearlyYield.amount).toBe(1200);
			expect(result.allocation.total).toBe(10000);
			expect(result.allocation.items).toHaveLength(2);
			const rf = result.allocation.items.find(
				(i) => i.assetClass === "Renda Fixa",
			);
			expect(rf?.percent).toBeCloseTo(60);
			expect(result.assets[0].weightPercent).toBeCloseTo(60);
			expect(result.assets[1].weightPercent).toBeCloseTo(40);
			expect(result.evolution).toEqual([]);
		});

		it("deve retornar estrutura vazia quando não há ativos", async () => {
			mockRepo.findAll.mockResolvedValue([]);

			const result = await service.getData("user-1");

			expect(result.summary.investedNetWorth.amount).toBe(0);
			expect(result.assets).toEqual([]);
			expect(result.allocation.items).toEqual([]);
		});
	});

	describe("createAsset", () => {
		it("deve criar ativo com userId", async () => {
			const asset = makeAsset();
			mockRepo.create.mockResolvedValue(asset);

			const result = await service.createAsset("user-1", {
				name: "Tesouro Selic 2029",
				assetClass: "Renda Fixa",
				currentBalance: 5000,
			});

			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "user-1" }),
			);
			expect(result).toEqual(asset);
		});
	});

	describe("updateAsset", () => {
		it("deve retornar ativo atualizado", async () => {
			const updated = makeAsset({ name: "Novo Nome" });
			mockRepo.update.mockResolvedValue(updated);

			const result = await service.updateAsset("asset-1", {
				name: "Novo Nome",
			});

			expect(result).toEqual(updated);
		});

		it("deve lançar NotFoundError quando ativo não existe", async () => {
			mockRepo.update.mockResolvedValue(null);

			await expect(
				service.updateAsset("inexistente", { name: "X" }),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe("removeAsset", () => {
		it("deve remover ativo existente", async () => {
			mockRepo.findById.mockResolvedValue(makeAsset());
			mockRepo.remove.mockResolvedValue(undefined);

			await expect(service.removeAsset("asset-1")).resolves.toBeUndefined();
			expect(mockRepo.remove).toHaveBeenCalledWith("asset-1");
		});

		it("deve lançar NotFoundError quando ativo não existe", async () => {
			mockRepo.findById.mockResolvedValue(null);

			await expect(service.removeAsset("inexistente")).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});
