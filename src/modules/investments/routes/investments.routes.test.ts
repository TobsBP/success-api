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
import { InvestmentsController } from "@/modules/investments/controllers/investments.controller.js";
import type { IInvestmentsService } from "@/modules/investments/interfaces/investments.service.interface.js";
import type {
	AssetDto,
	InvestmentsResponseDto,
} from "@/modules/investments/schemas/index.js";

const USER_ID = "user-test-123";

const makeAsset = (overrides: Partial<AssetDto> = {}): AssetDto => ({
	id: "550e8400-e29b-41d4-a716-446655440000",
	name: "Tesouro Selic 2029",
	assetClass: "Renda Fixa",
	currentBalance: 5000,
	weightPercent: 50,
	monthlyYield: { amount: 50, percent: 1.0 },
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

const makeResponse = (): InvestmentsResponseDto => ({
	summary: {
		investedNetWorth: {
			amount: 10000,
			delta: { value: 0, unit: "percent", direction: "neutral" },
		},
		monthlyYield: {
			amount: 100,
			delta: { value: 0, unit: "percent", direction: "neutral" },
		},
		yearlyYield: { amount: 1200, returnPercentYtd: 0 },
	},
	allocation: {
		total: 10000,
		items: [{ assetClass: "Renda Fixa", percent: 100 }],
	},
	evolution: [],
	assets: [makeAsset()],
});

describe("Investments Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getData: Mock;
		createAsset: Mock;
		updateAsset: Mock;
		removeAsset: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			getData: vi.fn(),
			createAsset: vi.fn(),
			updateAsset: vi.fn(),
			removeAsset: vi.fn(),
		};

		const controller = new InvestmentsController({
			investmentsService: mockService as unknown as IInvestmentsService,
		});

		// Simula o plugin firebase-auth populando request.authUser
		fastify.addHook("preHandler", async (request) => {
			(request as unknown as { authUser: { id: string } }).authUser = {
				id: USER_ID,
			};
		});

		fastify.get("/investments", controller.list);
		fastify.post("/investments/assets", controller.create);
		fastify.patch("/investments/assets/:id", controller.update);
		fastify.delete("/investments/assets/:id", controller.remove);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /investments deve retornar resumo de investimentos", async () => {
		const data = makeResponse();
		mockService.getData.mockResolvedValue(data);

		const response = await fastify.inject({
			method: "GET",
			url: "/investments",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			summary: { investedNetWorth: { amount: 10000 } },
		});
		expect(mockService.getData).toHaveBeenCalledWith(USER_ID, undefined);
	});

	it("POST /investments/assets deve criar ativo e retornar 201", async () => {
		const asset = makeAsset();
		mockService.createAsset.mockResolvedValue(asset);

		const response = await fastify.inject({
			method: "POST",
			url: "/investments/assets",
			payload: {
				name: "Tesouro Selic 2029",
				assetClass: "Renda Fixa",
				currentBalance: 5000,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ name: "Tesouro Selic 2029" });
		expect(mockService.createAsset).toHaveBeenCalledWith(
			USER_ID,
			expect.objectContaining({ name: "Tesouro Selic 2029" }),
		);
	});

	it("PATCH /investments/assets/:id deve atualizar ativo", async () => {
		const updated = makeAsset({ name: "Novo Nome" });
		mockService.updateAsset.mockResolvedValue(updated);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/investments/assets/550e8400-e29b-41d4-a716-446655440000",
			payload: { name: "Novo Nome" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ name: "Novo Nome" });
	});

	it("DELETE /investments/assets/:id deve retornar 204", async () => {
		mockService.removeAsset.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "DELETE",
			url: "/investments/assets/550e8400-e29b-41d4-a716-446655440000",
		});

		expect(response.statusCode).toBe(204);
		expect(mockService.removeAsset).toHaveBeenCalledWith(
			"550e8400-e29b-41d4-a716-446655440000",
		);
	});
});
