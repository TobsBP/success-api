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
import { NetworthController } from "@/modules/networth/controllers/networth.controller.js";
import type { INetworthService } from "@/modules/networth/interfaces/networth.service.interface.js";

describe("Net Worth Routes", () => {
	let fastify: FastifyInstance;
	let mockService: { getNetWorth: Mock };

	beforeEach(async () => {
		fastify = Fastify();
		mockService = { getNetWorth: vi.fn() };

		const controller = new NetworthController({
			networthService: mockService as unknown as INetworthService,
		});

		fastify.get("/net-worth", controller.get);
		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /net-worth deve retornar o patrimônio líquido", async () => {
		const payload = {
			amount: 10000000,
			changePercent: 3.45,
			changeLabel: "3,45% este mês",
			sparkline: [96000, 97500, 99000, 100000],
			updatedAt: new Date().toISOString(),
		};
		mockService.getNetWorth.mockResolvedValue(payload);

		const response = await fastify.inject({ method: "GET", url: "/net-worth" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(payload);
	});
});
