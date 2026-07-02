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
import { ExpensesController } from "@/modules/expenses/controllers/expenses.controller.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";

describe("Expenses Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getMonthData: Mock;
		listAll: Mock;
		createEntry: Mock;
		updateEntry: Mock;
		removeEntry: Mock;
		getLimit: Mock;
		setLimit: Mock;
	};

	const monthData = {
		summary: {
			totalSpent: {
				amount: 10000,
				delta: { value: 0, unit: "percent", direction: "neutral" },
			},
			monthlyLimit: {
				limit: 400000,
				spent: 10000,
				remaining: 390000,
				usedPercent: 2.5,
			},
		},
		byCategory: {
			total: 10000,
			items: [{ category: "Alimentação", amount: 10000, percent: 100 }],
		},
		recent: [
			{
				id: "550e8400-e29b-41d4-a716-446655440000",
				description: "Supermercado",
				category: "Alimentação",
				date: "2024-05-10",
				amount: 10000,
			},
		],
	};

	const entry = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		date: "2024-05-10",
		description: "Supermercado",
		category: "Alimentação",
		paymentMethod: "credit",
		amount: 10000,
		billingDate: "2024-06-10",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			getMonthData: vi.fn(),
			listAll: vi.fn(),
			createEntry: vi.fn(),
			updateEntry: vi.fn(),
			removeEntry: vi.fn(),
			getLimit: vi.fn(),
			setLimit: vi.fn(),
		};

		const controller = new ExpensesController({
			expensesService: mockService as unknown as IExpensesService,
		});

		fastify.get("/expenses/overview", controller.overview);
		fastify.get("/expenses/entries", controller.listAll);
		fastify.post("/expenses/entries", controller.create);
		fastify.patch("/expenses/entries/:id", controller.update);
		fastify.delete("/expenses/entries/:id", controller.remove);
		fastify.get("/expenses/limit", controller.getLimit);
		fastify.put("/expenses/limit", controller.setLimit);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /expenses/overview deve retornar os dados do mês", async () => {
		mockService.getMonthData.mockResolvedValue(monthData);

		const response = await fastify.inject({
			method: "GET",
			url: "/expenses/overview?month=2024-05",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(monthData);
		expect(mockService.getMonthData).toHaveBeenCalledWith("", "2024-05");
	});

	it("GET /expenses/entries deve listar todas as despesas", async () => {
		mockService.listAll.mockResolvedValue([entry]);

		const response = await fastify.inject({
			method: "GET",
			url: "/expenses/entries",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual([entry]);
		expect(mockService.listAll).toHaveBeenCalledWith("");
	});

	it("POST /expenses/entries deve criar uma entrada", async () => {
		mockService.createEntry.mockResolvedValue(entry);

		const response = await fastify.inject({
			method: "POST",
			url: "/expenses/entries",
			payload: {
				date: "2024-05-10",
				description: "Supermercado",
				category: "Alimentação",
				paymentMethod: "credit",
				amount: 10000,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual(entry);
	});

	it("GET /expenses/limit deve retornar o limite", async () => {
		mockService.getLimit.mockResolvedValue({ limit: 400000 });

		const response = await fastify.inject({
			method: "GET",
			url: "/expenses/limit",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ limit: 400000 });
	});

	it("PUT /expenses/limit deve atualizar o limite", async () => {
		mockService.setLimit.mockResolvedValue({ limit: 500000 });

		const response = await fastify.inject({
			method: "PUT",
			url: "/expenses/limit",
			payload: { limit: 500000 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ limit: 500000 });
	});
});
