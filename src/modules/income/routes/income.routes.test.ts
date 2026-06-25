import Fastify, { type FastifyInstance } from "fastify";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { IncomeController } from "@/modules/income/controllers/income.controller.js";
import type { IIncomeService } from "@/modules/income/interfaces/income.service.interface.js";
import type {
	IncomeEntryDto,
	IncomeResponseDto,
} from "@/modules/income/schemas/index.js";

const mockEntry: IncomeEntryDto = {
	id: "00000000-0000-0000-0000-000000000001",
	date: "2024-05-05",
	description: "Salário PJ",
	category: "PJ",
	status: "received",
	amount: 500000,
};

const mockResponse: IncomeResponseDto = {
	summary: {
		totalReceived: {
			amount: 500000,
			delta: {
				value: 0,
				unit: "percent",
				direction: "neutral",
				comparisonLabel: "vs Abr",
			},
		},
		toReceive: { amount: 0, pendingCount: 0 },
		topSource: "PJ",
	},
	entries: [mockEntry],
	history: [
		{ label: "Dez", value: 0 },
		{ label: "Jan", value: 0 },
		{ label: "Fev", value: 0 },
		{ label: "Mar", value: 0 },
		{ label: "Abr", value: 0 },
		{ label: "Mai", value: 500000 },
	],
	sources: [{ id: "pj", name: "PJ", amount: 500000, percent: 100 }],
};

describe("Income Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getMonthData: Mock;
		createEntry: Mock;
		updateEntry: Mock;
		removeEntry: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();

		mockService = {
			getMonthData: vi.fn().mockResolvedValue(mockResponse),
			createEntry: vi.fn().mockResolvedValue(mockEntry),
			updateEntry: vi.fn().mockResolvedValue(mockEntry),
			removeEntry: vi.fn().mockResolvedValue(undefined),
		};

		const controller = new IncomeController({
			incomeService: mockService as unknown as IIncomeService,
		});

		// Simula o hook de autenticação
		fastify.addHook("onRequest", async (request) => {
			request.authUser = {
				id: "user-1",
				email: "test@example.com",
				name: "Test",
			};
		});

		fastify.get("/income", controller.list);
		fastify.post("/income/entries", controller.create);
		fastify.patch("/income/entries/:id", controller.update);
		fastify.delete("/income/entries/:id", controller.remove);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /income deve retornar dados do mês", async () => {
		const response = await fastify.inject({
			method: "GET",
			url: "/income?month=2024-05",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(mockResponse);
		expect(mockService.getMonthData).toHaveBeenCalledWith("user-1", "2024-05");
	});

	it("GET /income sem month deve usar o mês atual", async () => {
		const response = await fastify.inject({ method: "GET", url: "/income" });

		expect(response.statusCode).toBe(200);
		// Verifica que getMonthData foi chamado com algum mês no formato YYYY-MM
		const [, month] = mockService.getMonthData.mock.calls[0];
		expect(month).toMatch(/^\d{4}-\d{2}$/);
	});

	it("POST /income/entries deve criar entrada e retornar 201", async () => {
		const body = {
			date: "2024-05-05",
			description: "Salário PJ",
			category: "PJ",
			amount: 500000,
		};

		const response = await fastify.inject({
			method: "POST",
			url: "/income/entries",
			headers: { "content-type": "application/json" },
			payload: JSON.stringify(body),
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual(mockEntry);
		expect(mockService.createEntry).toHaveBeenCalledWith("user-1", body);
	});

	it("PATCH /income/entries/:id deve atualizar entrada", async () => {
		const response = await fastify.inject({
			method: "PATCH",
			url: "/income/entries/00000000-0000-0000-0000-000000000001",
			headers: { "content-type": "application/json" },
			payload: JSON.stringify({ amount: 600000 }),
		});

		expect(response.statusCode).toBe(200);
		expect(mockService.updateEntry).toHaveBeenCalledWith(
			"00000000-0000-0000-0000-000000000001",
			{ amount: 600000 },
		);
	});

	it("DELETE /income/entries/:id deve retornar 204", async () => {
		const response = await fastify.inject({
			method: "DELETE",
			url: "/income/entries/00000000-0000-0000-0000-000000000001",
		});

		expect(response.statusCode).toBe(204);
		expect(mockService.removeEntry).toHaveBeenCalledWith(
			"00000000-0000-0000-0000-000000000001",
		);
	});
});
