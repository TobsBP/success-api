import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { OverviewController } from "@/modules/overview/controllers/overview.controller.js";
import {
	OverviewQuerySchema,
	OverviewResponseSchema,
} from "@/modules/overview/schemas/index.js";

export async function overviewRoutes(fastify: FastifyInstance) {
	const controller =
		container.resolve<OverviewController>("overviewController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["overview"],
				summary: "Visão geral",
				querystring: OverviewQuerySchema,
				response: { 200: OverviewResponseSchema },
			},
		},
		controller.getData,
	);
}
