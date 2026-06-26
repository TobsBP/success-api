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
import { GoalsController } from "@/modules/goals/controllers/goals.controller.js";
import type { IGoalsService } from "@/modules/goals/interfaces/goals.service.interface.js";
import type {
	GoalDto,
	GoalsResponseDto,
} from "@/modules/goals/schemas/index.js";

const makeGoal = (overrides: Partial<GoalDto> = {}): GoalDto => ({
	id: "00000000-0000-0000-0000-000000000001",
	name: "Reserva de emergência",
	priority: "high",
	status: "active",
	currentAmount: 4000000,
	targetAmount: 5000000,
	progressPercent: 80,
	remaining: 1000000,
	forecastDate: "",
	icon: "shield",
	color: "primary",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

const makeResponse = (): GoalsResponseDto => ({
	summary: { activeCount: 1, completedCount: 0, totalSaved: 4000000 },
	goals: [makeGoal()],
});

describe("Goals Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getData: Mock;
		createGoal: Mock;
		updateGoal: Mock;
		removeGoal: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();

		// Simula o authUser injetado pelo plugin firebase-auth
		fastify.addHook("onRequest", async (request) => {
			request.authUser = {
				id: "user-1",
				email: "user@test.com",
				name: "User",
			};
		});

		mockService = {
			getData: vi.fn(),
			createGoal: vi.fn(),
			updateGoal: vi.fn(),
			removeGoal: vi.fn(),
		};

		const controller = new GoalsController({
			goalsService: mockService as unknown as IGoalsService,
		});

		fastify.get("/goals", controller.list);
		fastify.post("/goals", controller.create);
		fastify.patch("/goals/:id", controller.update);
		fastify.delete("/goals/:id", controller.remove);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /goals should return summary and goals", async () => {
		const response_data = makeResponse();
		mockService.getData.mockResolvedValue(response_data);

		const response = await fastify.inject({ method: "GET", url: "/goals" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(response_data);
	});

	it("POST /goals should create and return 201", async () => {
		const goal = makeGoal();
		mockService.createGoal.mockResolvedValue(goal);

		const response = await fastify.inject({
			method: "POST",
			url: "/goals",
			payload: {
				name: "Reserva",
				priority: "high",
				targetAmount: 5000000,
				currentAmount: 0,
				icon: "shield",
				color: "primary",
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual(goal);
	});

	it("PATCH /goals/:id should return updated goal", async () => {
		const goal = makeGoal({ name: "Updated" });
		mockService.updateGoal.mockResolvedValue(goal);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/goals/00000000-0000-0000-0000-000000000001",
			payload: { name: "Updated" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(goal);
	});

	it("DELETE /goals/:id should return 204", async () => {
		mockService.removeGoal.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "DELETE",
			url: "/goals/00000000-0000-0000-0000-000000000001",
		});

		expect(response.statusCode).toBe(204);
	});
});
