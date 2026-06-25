import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { InvestmentsController } from "@/modules/investments/controllers/investments.controller.js";
import {
	AssetParamsSchema,
	AssetSchema,
	CreateAssetBodySchema,
	InvestmentsResponseSchema,
	RangeQuerySchema,
	UpdateAssetBodySchema,
} from "@/modules/investments/schemas/index.js";

export async function investmentsRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<InvestmentsController>(
		"investmentsController",
	);

	fastify.get(
		"",
		{
			schema: {
				tags: ["investments"],
				summary: "Obter resumo de investimentos",
				querystring: RangeQuerySchema,
				response: { 200: InvestmentsResponseSchema },
			},
		},
		controller.list,
	);

	fastify.post(
		"/assets",
		{
			schema: {
				tags: ["investments"],
				summary: "Criar ativo",
				body: CreateAssetBodySchema,
				response: { 201: AssetSchema },
			},
		},
		controller.create,
	);

	fastify.patch(
		"/assets/:id",
		{
			schema: {
				tags: ["investments"],
				summary: "Atualizar ativo",
				params: AssetParamsSchema,
				body: UpdateAssetBodySchema,
				response: { 200: AssetSchema },
			},
		},
		controller.update,
	);

	fastify.delete(
		"/assets/:id",
		{
			schema: {
				tags: ["investments"],
				summary: "Remover ativo",
				params: AssetParamsSchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.remove,
	);
}
