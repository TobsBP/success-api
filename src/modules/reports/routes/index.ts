import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { ReportsController } from "@/modules/reports/controllers/reports.controller.js";
import {
	ReportsQuerySchema,
	ReportsResponseSchema,
} from "@/modules/reports/schemas/index.js";

export async function reportsRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<ReportsController>("reportsController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["reports"],
				summary: "Relatórios",
				querystring: ReportsQuerySchema,
				response: { 200: ReportsResponseSchema },
			},
		},
		controller.getData,
	);
}
