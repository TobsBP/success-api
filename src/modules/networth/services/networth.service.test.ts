import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { INetworthRepository } from "@/modules/networth/interfaces/networth.repository.interface.js";
import { NetworthService } from "./networth.service.js";

describe("NetworthService", () => {
	let service: NetworthService;
	let mockRepo: { getTotalBalance: Mock };
	let mockCache: { get: Mock; set: Mock; del: Mock };

	beforeEach(() => {
		mockRepo = { getTotalBalance: vi.fn() };
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn(),
		};
		service = new NetworthService({
			networthRepository: mockRepo as unknown as INetworthRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	it("deve retornar o patrimônio líquido somando os investimentos", async () => {
		mockRepo.getTotalBalance.mockResolvedValue(10000000);

		const result = await service.getNetWorth("user-1");

		expect(result.amount).toBe(10000000);
		expect(result).toHaveProperty("changePercent");
		expect(result).toHaveProperty("changeLabel");
		expect(result).toHaveProperty("sparkline");
		expect(result).toHaveProperty("updatedAt");
		expect(mockCache.set).toHaveBeenCalled();
	});

	it("deve retornar o cache quando disponível", async () => {
		const cached = {
			amount: 5000000,
			changePercent: 1.5,
			changeLabel: "1,5% este mês",
			sparkline: [4900000, 5000000],
			updatedAt: new Date().toISOString(),
		};
		mockCache.get.mockResolvedValue(cached);

		const result = await service.getNetWorth("user-1");

		expect(result).toEqual(cached);
		expect(mockRepo.getTotalBalance).not.toHaveBeenCalled();
	});

	it("deve retornar zero quando não há investimentos", async () => {
		mockRepo.getTotalBalance.mockResolvedValue(0);

		const result = await service.getNetWorth("user-1");

		expect(result.amount).toBe(0);
	});
});
