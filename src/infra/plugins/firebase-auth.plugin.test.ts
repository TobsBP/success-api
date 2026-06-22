import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdToken, dbResult } = vi.hoisted(() => ({
	verifyIdToken: vi.fn(),
	dbResult: vi.fn(),
}));

vi.mock("firebase-admin", () => ({
	default: {
		initializeApp: vi.fn(() => ({ auth: () => ({ verifyIdToken }) })),
		credential: { cert: vi.fn() },
	},
}));

vi.mock("../db/client.js", () => ({
	getDb: () => ({
		select: () => ({
			from: () => ({
				where: () => ({ limit: () => dbResult() }),
			}),
		}),
	}),
}));

import errorHandlerPlugin from "./error-handler.plugin.js";
import firebaseAuthPlugin from "./firebase-auth.plugin.js";

describe("firebaseAuthPlugin", () => {
	let fastify: FastifyInstance;

	beforeEach(async () => {
		// Reset de implementação + defaults felizes; cada teste sobrescreve o que precisa
		verifyIdToken.mockReset();
		dbResult.mockReset();
		verifyIdToken.mockResolvedValue({ email: "user@test.com" });
		dbResult.mockResolvedValue([
			{ id: "1", email: "user@test.com", name: "User" },
		]);

		fastify = Fastify();
		await fastify.register(errorHandlerPlugin);
		await fastify.register(firebaseAuthPlugin);

		fastify.get("/protected", async (req) => ({ user: req.authUser }));
		fastify.get("/public", { config: { isPublic: true } }, async () => ({
			ok: true,
		}));

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("permite rota pública sem token", async () => {
		const res = await fastify.inject({ method: "GET", url: "/public" });
		expect(res.statusCode).toBe(200);
	});

	it("401 sem header Authorization", async () => {
		const res = await fastify.inject({ method: "GET", url: "/protected" });
		expect(res.statusCode).toBe(401);
	});

	it("401 quando o header não é Bearer", async () => {
		const res = await fastify.inject({
			method: "GET",
			url: "/protected",
			headers: { authorization: "Basic abc" },
		});
		expect(res.statusCode).toBe(401);
	});

	it("401 quando o token é inválido", async () => {
		verifyIdToken.mockRejectedValue(new Error("invalid"));
		const res = await fastify.inject({
			method: "GET",
			url: "/protected",
			headers: { authorization: "Bearer bad-token" },
		});
		expect(res.statusCode).toBe(401);
	});

	it("404 quando o usuário não existe no banco", async () => {
		verifyIdToken.mockResolvedValue({ email: "ghost@test.com" });
		dbResult.mockResolvedValue([]);
		const res = await fastify.inject({
			method: "GET",
			url: "/protected",
			headers: { authorization: "Bearer ok" },
		});
		expect(res.statusCode).toBe(404);
	});

	it("200 e popula authUser quando o token é válido", async () => {
		verifyIdToken.mockResolvedValue({ email: "user@test.com" });
		dbResult.mockResolvedValue([
			{ id: "1", email: "user@test.com", name: "User" },
		]);
		const res = await fastify.inject({
			method: "GET",
			url: "/protected",
			headers: { authorization: "Bearer ok" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().user).toMatchObject({
			id: "1",
			email: "user@test.com",
		});
	});
});
