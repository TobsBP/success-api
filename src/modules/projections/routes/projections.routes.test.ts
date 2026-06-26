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
import { ProjectionsController } from "@/modules/projections/controllers/projections.controller.js";
import type { IProjectionsService } from "@/modules/projections/interfaces/projections.service.interface.js";

const mockProjectionsResponse = {
	summary: {
		initialNetWorth: 0,
		plannedMonthlyContribution: 250000,
		estimatedAnnualRatePercent: 8.5,
		projectionIn10Years: 44583300,
	},
	timeframe: 10,
	scenarios: [
		{
			id: "base",
			name: "Cenário Base",
			type: "base" as const,
			points: [{ label: "Hoje", value: 0 }],
		},
	],
	assumptions: {
		inflationPercent: 4.5,
		contributionGrowthPercent: 5.5,
		returnsByClass: [],
	},
	compositionAtHorizon: { total: 44583300, items: [] },
};

describe("Projections Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getProjections: Mock;
		updateAssumptions: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			getProjections: vi.fn(),
			updateAssumptions: vi.fn(),
		};

		const controller = new ProjectionsController({
			projectionsService: mockService as unknown as IProjectionsService,
		});

		// Simula authUser no request
		fastify.addHook("onRequest", async (request) => {
			request.authUser = {
				id: "user-1",
				name: "User",
				email: "user@example.com",
			};
		});

		fastify.get("/projections", controller.getProjections);
		fastify.put("/projections/assumptions", controller.updateAssumptions);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /projections deve retornar a resposta de projeções", async () => {
		mockService.getProjections.mockResolvedValue(mockProjectionsResponse);

		const response = await fastify.inject({
			method: "GET",
			url: "/projections",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(mockProjectionsResponse);
		expect(mockService.getProjections).toHaveBeenCalledWith("user-1", 10);
	});

	it("GET /projections?timeframe=5 deve usar o timeframe informado", async () => {
		mockService.getProjections.mockResolvedValue({
			...mockProjectionsResponse,
			timeframe: 5,
		});

		const response = await fastify.inject({
			method: "GET",
			url: "/projections?timeframe=5",
		});

		expect(response.statusCode).toBe(200);
		expect(mockService.getProjections).toHaveBeenCalledWith("user-1", 5);
	});

	it("GET /projections?timeframe=999 deve usar timeframe padrão (10)", async () => {
		mockService.getProjections.mockResolvedValue(mockProjectionsResponse);

		await fastify.inject({ method: "GET", url: "/projections?timeframe=999" });

		expect(mockService.getProjections).toHaveBeenCalledWith("user-1", 10);
	});

	it("PUT /projections/assumptions deve retornar as premissas atualizadas", async () => {
		const body = {
			plannedMonthlyContribution: 500,
			estimatedAnnualRatePercent: 9,
			inflationPercent: 4,
			contributionGrowthPercent: 5,
			returnsByClass: [],
		};
		mockService.updateAssumptions.mockResolvedValue(body);

		const response = await fastify.inject({
			method: "PUT",
			url: "/projections/assumptions",
			payload: body,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(body);
	});
});
