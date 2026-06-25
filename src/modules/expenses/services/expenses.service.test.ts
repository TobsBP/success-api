import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IExpensesRepository } from "@/modules/expenses/interfaces/expenses.repository.interface.js";
import { ExpensesService } from "./expenses.service.js";

describe("ExpensesService", () => {
	let service: ExpensesService;
	let mockRepo: {
		findByMonth: Mock;
		findById: Mock;
		create: Mock;
		update: Mock;
		remove: Mock;
		getLimit: Mock;
		setLimit: Mock;
	};
	let mockCache: {
		get: Mock;
		set: Mock;
		del: Mock;
	};

	const sampleEntry = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		date: "2024-05-10",
		description: "Supermercado",
		category: "Alimentação",
		amount: 10000,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	beforeEach(() => {
		mockRepo = {
			findByMonth: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
			getLimit: vi.fn(),
			setLimit: vi.fn(),
		};
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn(),
			del: vi.fn(),
		};
		service = new ExpensesService({
			expensesRepository: mockRepo as unknown as IExpensesRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	describe("getMonthData", () => {
		it("deve retornar dados agregados do mês", async () => {
			mockRepo.findByMonth.mockResolvedValue([sampleEntry]);
			mockRepo.getLimit.mockResolvedValue(400000);

			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.summary.totalSpent.amount).toBe(10000);
			expect(result.summary.monthlyLimit.limit).toBe(400000);
			expect(result.summary.monthlyLimit.spent).toBe(10000);
			expect(result.summary.monthlyLimit.remaining).toBe(390000);
			expect(result.byCategory.total).toBe(10000);
			expect(result.byCategory.items).toHaveLength(1);
			expect(result.byCategory.items[0].category).toBe("Alimentação");
			expect(result.byCategory.items[0].percent).toBe(100);
			expect(result.recent).toHaveLength(1);
		});

		it("deve usar o mês atual quando month está vazio", async () => {
			mockRepo.findByMonth.mockResolvedValue([]);
			mockRepo.getLimit.mockResolvedValue(0);

			await service.getMonthData("user-1", "");

			expect(mockRepo.findByMonth).toHaveBeenCalledWith(
				"user-1",
				expect.stringMatching(/^\d{4}-\d{2}$/),
			);
		});

		it("deve retornar delta stub neutro", async () => {
			mockRepo.findByMonth.mockResolvedValue([]);
			mockRepo.getLimit.mockResolvedValue(0);

			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.summary.totalSpent.delta).toEqual({
				value: 0,
				unit: "percent",
				direction: "neutral",
			});
		});
	});

	describe("createEntry", () => {
		it("deve criar uma entrada e retorná-la", async () => {
			mockRepo.create.mockResolvedValue(sampleEntry);

			const result = await service.createEntry("user-1", {
				date: "2024-05-10",
				description: "Supermercado",
				category: "Alimentação",
				amount: 10000,
			});

			expect(result).toEqual(sampleEntry);
			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "user-1", amount: 10000 }),
			);
		});
	});

	describe("updateEntry", () => {
		it("deve atualizar e retornar a entrada", async () => {
			mockRepo.update.mockResolvedValue(sampleEntry);
			const result = await service.updateEntry("uuid-1", { amount: 20000 });
			expect(result).toEqual(sampleEntry);
		});

		it("deve lançar NotFoundError se a entrada não existir", async () => {
			mockRepo.update.mockResolvedValue(null);
			await expect(service.updateEntry("uuid-1", {})).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe("removeEntry", () => {
		it("deve remover a entrada com sucesso", async () => {
			mockRepo.findById.mockResolvedValue(sampleEntry);
			mockRepo.remove.mockResolvedValue(undefined);

			await expect(service.removeEntry("uuid-1")).resolves.toBeUndefined();
			expect(mockRepo.remove).toHaveBeenCalledWith("uuid-1");
		});

		it("deve lançar NotFoundError se a entrada não existir", async () => {
			mockRepo.findById.mockResolvedValue(null);
			await expect(service.removeEntry("uuid-1")).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe("getLimit", () => {
		it("deve retornar o limite do usuário", async () => {
			mockRepo.getLimit.mockResolvedValue(400000);
			const result = await service.getLimit("user-1");
			expect(result).toEqual({ limit: 400000 });
		});

		it("deve retornar 0 quando não há limite definido", async () => {
			mockRepo.getLimit.mockResolvedValue(0);
			const result = await service.getLimit("user-1");
			expect(result).toEqual({ limit: 0 });
		});
	});

	describe("setLimit", () => {
		it("deve definir e retornar o novo limite", async () => {
			mockRepo.setLimit.mockResolvedValue(500000);
			const result = await service.setLimit("user-1", 500000);
			expect(result).toEqual({ limit: 500000 });
			expect(mockRepo.setLimit).toHaveBeenCalledWith("user-1", 500000);
		});
	});
});
