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
import { OverviewController } from "@/modules/overview/controllers/overview.controller.js";
import type { IOverviewService } from "@/modules/overview/interfaces/overview.service.interface.js";

describe("Overview Routes", () => {
	let fastify: FastifyInstance;
	let mockService: { getData: Mock };

	beforeEach(async () => {
		fastify = Fastify();

		fastify.addHook("onRequest", async (request) => {
			request.authUser = { id: "", email: "", name: "" };
		});

		mockService = { getData: vi.fn() };

		const controller = new OverviewController({
			overviewService: mockService as unknown as IOverviewService,
		});

		fastify.get("/overview", controller.getData);
		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /overview deve retornar os dados do overview", async () => {
		const payload = {
			metrics: {
				totalIncome: {
					value: 866620,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
				totalExpenses: {
					value: 235700,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
				monthlyBalance: {
					value: 630920,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
				savingsRate: {
					value: 72.8,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
			},
			monthlyFlow: {
				income: { id: "income", label: "Receitas", points: [] },
				expenses: { id: "expenses", label: "Despesas", points: [] },
				balance: { id: "balance", label: "Saldo", points: [] },
			},
			expensesByCategory: { total: 235700, items: [] },
			incomeBySource: { total: 866620, items: [] },
			goals: [],
			investment: {
				name: "—",
				indexLabel: "—",
				balance: 0,
				monthChange: { amount: 0, percent: 0 },
				monthYield: 0,
				yearYield: 0,
			},
			quickStats: {
				averageDailySpend: 7603,
				largestExpense: { amount: 100000, category: "alimentação" },
				daysRemaining: 6,
				averageDailySurplus: 21031,
			},
		};
		mockService.getData.mockResolvedValue(payload);

		const response = await fastify.inject({
			method: "GET",
			url: "/overview?month=2024-06",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(payload);
		expect(mockService.getData).toHaveBeenCalledWith("", "2024-06");
	});
});
