import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { AuthController } from "@/modules/auth/controllers/auth.controller.js";
import {
	LoginBodySchema,
	LoginResponseSchema,
	UserProfileSchema,
} from "@/modules/auth/schemas/index.js";

export async function authRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<AuthController>("authController");

	fastify.post(
		"/login",
		{
			config: { isPublic: true },
			schema: {
				tags: ["auth"],
				summary: "Login",
				body: LoginBodySchema,
				response: { 200: LoginResponseSchema },
			},
		},
		controller.login,
	);

	fastify.post(
		"/logout",
		{
			schema: {
				tags: ["auth"],
				summary: "Logout",
				response: { 204: { type: "null" } },
			},
		},
		controller.logout,
	);

	fastify.get(
		"/me",
		{
			schema: {
				tags: ["auth"],
				summary: "Usuário autenticado",
				response: { 200: UserProfileSchema },
			},
		},
		controller.me,
	);
}
