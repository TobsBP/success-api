import { Type } from "@sinclair/typebox";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "@/core/errors/index.js";
import errorHandlerPlugin from "./error-handler.plugin.js";

describe("errorHandlerPlugin", () => {
	let fastify: FastifyInstance;

	beforeEach(async () => {
		fastify = Fastify();
		await fastify.register(errorHandlerPlugin);

		fastify.get("/not-found", async () => {
			throw new NotFoundError("User", "123");
		});
		fastify.get("/conflict", async () => {
			throw new ConflictError("Email already in use");
		});
		fastify.get("/boom", async () => {
			throw new Error("unexpected");
		});
		fastify.post(
			"/validate",
			{ schema: { body: Type.Object({ name: Type.String() }) } },
			async () => ({ ok: true }),
		);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("mapeia AppError para o seu statusCode e code", async () => {
		const res = await fastify.inject({ method: "GET", url: "/not-found" });
		expect(res.statusCode).toBe(404);
		expect(res.json()).toEqual({
			statusCode: 404,
			error: "NOT_FOUND",
			message: "User '123' not found",
		});
	});

	it("mapeia ConflictError para 409", async () => {
		const res = await fastify.inject({ method: "GET", url: "/conflict" });
		expect(res.statusCode).toBe(409);
		expect(res.json().error).toBe("CONFLICT");
	});

	it("transforma erro de validação em 400 com details", async () => {
		const res = await fastify.inject({
			method: "POST",
			url: "/validate",
			payload: {},
		});
		expect(res.statusCode).toBe(400);
		const body = res.json();
		expect(body.error).toBe("VALIDATION_ERROR");
		expect(body.details).toBeDefined();
	});

	it("transforma erro inesperado em 500 genérico", async () => {
		const res = await fastify.inject({ method: "GET", url: "/boom" });
		expect(res.statusCode).toBe(500);
		expect(res.json()).toEqual({
			statusCode: 500,
			error: "INTERNAL_ERROR",
			message: "Internal Server Error",
		});
	});
});
