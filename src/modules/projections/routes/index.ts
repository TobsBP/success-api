import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { ProjectionsController } from "@/modules/projections/controllers/projections.controller.js";
import {
	ProjectionsResponseSchema,
	TimeframeQuerySchema,
	UpdateAssumptionsBodySchema,
} from "@/modules/projections/schemas/index.js";

export async function projectionsRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<ProjectionsController>(
		"projectionsController",
	);

	fastify.get(
		"",
		{
			schema: {
				tags: ["projections"],
				summary: "Projeção patrimonial",
				querystring: TimeframeQuerySchema,
				response: { 200: ProjectionsResponseSchema },
			},
		},
		controller.getProjections,
	);

	fastify.put(
		"/assumptions",
		{
			schema: {
				tags: ["projections"],
				summary: "Atualizar premissas",
				body: UpdateAssumptionsBodySchema,
				response: { 200: UpdateAssumptionsBodySchema },
			},
		},
		controller.updateAssumptions,
	);
}
