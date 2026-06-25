import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "@/core/errors/index.js";
import type { IIncomeRepository } from "@/modules/income/interfaces/income.repository.interface.js";
import { IncomeService } from "./income.service.js";

const mockEntry = {
	id: "00000000-0000-0000-0000-000000000001",
	date: "2024-05-05",
	description: "Salário PJ",
	category: "PJ",
	status: "received" as const,
	amount: 500000,
};

const pendingEntry = {
	id: "00000000-0000-0000-0000-000000000002",
	date: "2024-05-10",
	description: "Freelance",
	category: "Freelance",
	status: "pending" as const,
	amount: 150000,
};

describe("IncomeService", () => {
	let service: IncomeService;
	let mockRepo: {
		findByMonth: Mock;
		findById: Mock;
		create: Mock;
		update: Mock;
		remove: Mock;
	};

	beforeEach(() => {
		mockRepo = {
			findByMonth: vi.fn().mockResolvedValue([]),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
		};
		service = new IncomeService({
			incomeRepository: mockRepo as unknown as IIncomeRepository,
		});
	});

	describe("getMonthData", () => {
		it("deve retornar a estrutura completa de dados do mês", async () => {
			mockRepo.findByMonth.mockResolvedValue([mockEntry]);
			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.entries).toHaveLength(1);
			expect(result.summary.totalReceived.amount).toBe(500000);
			expect(result.summary.toReceive.pendingCount).toBe(0);
			expect(result.summary.toReceive.amount).toBe(0);
			expect(result.summary.topSource).toBe("PJ");
			expect(result.history).toHaveLength(6);
			expect(result.sources).toHaveLength(1);
			expect(result.sources[0].name).toBe("PJ");
			expect(result.sources[0].percent).toBe(100);
		});

		it("deve calcular toReceive a partir das entradas pendentes", async () => {
			mockRepo.findByMonth.mockResolvedValue([mockEntry, pendingEntry]);
			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.summary.toReceive.amount).toBe(150000);
			expect(result.summary.toReceive.pendingCount).toBe(1);
			expect(result.summary.totalReceived.amount).toBe(500000);
		});

		it("deve retornar delta neutro quando não há dados no mês anterior", async () => {
			// Primeiro call (mês atual) retorna dados, segundo call (mês anterior) retorna vazio
			mockRepo.findByMonth
				.mockResolvedValueOnce([mockEntry])
				.mockResolvedValueOnce([]);
			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.summary.totalReceived.delta.direction).toBe("neutral");
			expect(result.summary.totalReceived.delta.value).toBe(0);
		});

		it("deve calcular delta positivo quando o total cresceu em relação ao mês anterior", async () => {
			const prevEntry = { ...mockEntry, amount: 400000 };
			mockRepo.findByMonth
				.mockResolvedValueOnce([mockEntry]) // mês atual: 500000
				.mockResolvedValueOnce([prevEntry]); // mês anterior: 400000
			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.summary.totalReceived.delta.direction).toBe("up");
			expect(result.summary.totalReceived.delta.value).toBe(25); // 25%
		});

		it("deve retornar histórico de 6 meses com o mês atual preenchido", async () => {
			mockRepo.findByMonth
				.mockResolvedValueOnce([mockEntry])
				.mockResolvedValueOnce([]);
			const result = await service.getMonthData("user-1", "2024-05");

			expect(result.history).toHaveLength(6);
			// Último item do histórico é o mês atual
			const last = result.history[result.history.length - 1];
			expect(last.label).toBe("Mai");
			expect(last.value).toBe(500000);
			// Meses anteriores devem ter valor 0
			expect(result.history[0].value).toBe(0);
		});
	});

	describe("createEntry", () => {
		it("deve criar entrada com userId", async () => {
			mockRepo.create.mockResolvedValue(mockEntry);
			const body = {
				date: "2024-05-05",
				description: "Salário PJ",
				category: "PJ",
				amount: 500000,
			};

			const result = await service.createEntry("user-1", body);

			expect(mockRepo.create).toHaveBeenCalledWith({
				...body,
				userId: "user-1",
			});
			expect(result).toEqual(mockEntry);
		});
	});

	describe("updateEntry", () => {
		it("deve atualizar e retornar a entrada", async () => {
			const updated = { ...mockEntry, amount: 600000 };
			mockRepo.update.mockResolvedValue(updated);

			const result = await service.updateEntry(
				"00000000-0000-0000-0000-000000000001",
				{
					amount: 600000,
				},
			);

			expect(result.amount).toBe(600000);
		});

		it("deve lançar NotFoundError se a entrada não existir", async () => {
			mockRepo.update.mockResolvedValue(null);

			await expect(
				service.updateEntry("00000000-0000-0000-0000-000000000001", {
					amount: 600000,
				}),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe("removeEntry", () => {
		it("deve remover a entrada com sucesso", async () => {
			mockRepo.findById.mockResolvedValue(mockEntry);
			mockRepo.remove.mockResolvedValue(undefined);

			await expect(
				service.removeEntry("00000000-0000-0000-0000-000000000001"),
			).resolves.toBeUndefined();
			expect(mockRepo.remove).toHaveBeenCalledWith(
				"00000000-0000-0000-0000-000000000001",
			);
		});

		it("deve lançar NotFoundError se a entrada não existir", async () => {
			mockRepo.findById.mockResolvedValue(null);

			await expect(
				service.removeEntry("00000000-0000-0000-0000-000000000001"),
			).rejects.toThrow(NotFoundError);
		});
	});
});
