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
import { AuthController } from "@/modules/auth/controllers/auth.controller.js";
import type { AuthService } from "@/modules/auth/services/auth.service.js";

describe("Auth Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		login: Mock;
		logout: Mock;
		getMe: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			login: vi.fn(),
			logout: vi.fn(),
			getMe: vi.fn(),
		};

		const controller = new AuthController({
			authService: mockService as unknown as AuthService,
		});

		// Popula authUser nas rotas protegidas (simulando o plugin firebase-auth)
		fastify.addHook("preHandler", async (request) => {
			(request as any).authUser = {
				id: "test-id",
				name: "Test User",
				email: "test@example.com",
			};
		});

		fastify.post(
			"/auth/login",
			{ config: { isPublic: true } },
			controller.login,
		);
		fastify.post("/auth/logout", controller.logout);
		fastify.get("/auth/me", controller.me);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("POST /auth/login deve retornar 200 com token", async () => {
		const loginResult = {
			user: { id: "1", name: "João", email: "joao@example.com" },
			token: "firebase-token",
			expiresAt: new Date().toISOString(),
		};
		mockService.login.mockResolvedValue(loginResult);

		const response = await fastify.inject({
			method: "POST",
			url: "/auth/login",
			payload: { email: "joao@example.com", password: "senha123" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(loginResult);
	});

	it("POST /auth/logout deve retornar 204", async () => {
		const response = await fastify.inject({
			method: "POST",
			url: "/auth/logout",
		});

		expect(response.statusCode).toBe(204);
	});

	it("GET /auth/me deve retornar o perfil do usuário", async () => {
		const profile = { id: "1", name: "João", email: "joao@example.com" };
		mockService.getMe.mockReturnValue(profile);

		const response = await fastify.inject({
			method: "GET",
			url: "/auth/me",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(profile);
	});
});
