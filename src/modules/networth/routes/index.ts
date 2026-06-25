import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { NetworthController } from "@/modules/networth/controllers/networth.controller.js";
import { NetWorthResponseSchema } from "@/modules/networth/schemas/index.js";

export async function networthRoutes(fastify: FastifyInstance) {
	const controller =
		container.resolve<NetworthController>("networthController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["net-worth"],
				summary: "Patrimônio líquido",
				response: { 200: NetWorthResponseSchema },
			},
		},
		controller.get,
	);
}
