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
import { ReportsController } from "@/modules/reports/controllers/reports.controller.js";
import type { IReportsService } from "@/modules/reports/interfaces/reports.service.interface.js";

describe("Reports Routes", () => {
	let fastify: FastifyInstance;
	let mockService: { getData: Mock };

	beforeEach(async () => {
		fastify = Fastify();

		fastify.addHook("onRequest", async (request) => {
			request.authUser = { id: "", email: "", name: "" };
		});

		mockService = { getData: vi.fn() };

		const controller = new ReportsController({
			reportsService: mockService as unknown as IReportsService,
		});

		fastify.get("/reports", controller.getData);
		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /reports deve retornar o relatório do período", async () => {
		const payload = {
			filters: { range: "last-6-months", accounts: [], categories: [] },
			incomeVsExpense: {
				income: { id: "income", label: "Receitas", points: [] },
				expenses: { id: "expenses", label: "Despesas", points: [] },
			},
			kpis: {
				averageIncome: {
					amount: 745000,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
				averageExpense: {
					amount: 215000,
					delta: { value: 0, unit: "percent", direction: "neutral" },
				},
				averageSavingsRate: { percent: 71, targetPercent: 50 },
			},
			expensesByCategory: { total: 0, items: [] },
			monthlySummary: [],
		};
		mockService.getData.mockResolvedValue(payload);

		const response = await fastify.inject({
			method: "GET",
			url: "/reports?range=last-6-months",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(payload);
		expect(mockService.getData).toHaveBeenCalledWith("", {
			range: "last-6-months",
		});
	});
});
