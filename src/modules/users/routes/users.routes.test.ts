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
import { UsersController } from "@/modules/users/controllers/users.controller.js";
import type { IUsersService } from "@/modules/users/interfaces/users.service.interface.js";

describe("Users Routes Integration", () => {
	let fastify: FastifyInstance;
	let mockService: {
		list: Mock;
		getById: Mock;
		create: Mock;
		update: Mock;
		remove: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
		};

		// Mocking the container or manually registering the controller for the test
		const controller = new UsersController({
			usersService: mockService as unknown as IUsersService,
		});

		fastify.get("/users", controller.list);
		fastify.get("/users/:id", controller.getById);
		fastify.post("/users", controller.create);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /users should return list of users", async () => {
		const usersList = {
			data: [],
			meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
		};
		mockService.list.mockResolvedValue(usersList);

		const response = await fastify.inject({
			method: "GET",
			url: "/users",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(usersList);
	});

	it("POST /users should create user", async () => {
		const newUser = { id: "123", email: "test@test.com", name: "Test" };
		mockService.create.mockResolvedValue(newUser);

		const response = await fastify.inject({
			method: "POST",
			url: "/users",
			payload: { email: "test@test.com", name: "Test" },
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual(newUser);
	});
});
