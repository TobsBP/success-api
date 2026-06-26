import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { GoalsController } from "@/modules/goals/controllers/goals.controller.js";
import {
	CreateGoalBodySchema,
	DepositBodySchema,
	GoalParamsSchema,
	GoalSchema,
	GoalsResponseSchema,
	UpdateGoalBodySchema,
} from "@/modules/goals/schemas/index.js";

export async function goalsRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<GoalsController>("goalsController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["goals"],
				summary: "Listar metas",
				response: { 200: GoalsResponseSchema },
			},
		},
		controller.list,
	);

	fastify.post(
		"",
		{
			schema: {
				tags: ["goals"],
				summary: "Criar meta",
				body: CreateGoalBodySchema,
				response: { 201: GoalSchema },
			},
		},
		controller.create,
	);

	fastify.patch(
		"/:id",
		{
			schema: {
				tags: ["goals"],
				summary: "Atualizar meta",
				params: GoalParamsSchema,
				body: UpdateGoalBodySchema,
				response: { 200: GoalSchema },
			},
		},
		controller.update,
	);

	fastify.post(
		"/:id/deposit",
		{
			schema: {
				tags: ["goals"],
				summary: "Adicionar aporte à meta",
				params: GoalParamsSchema,
				body: DepositBodySchema,
				response: { 200: GoalSchema },
			},
		},
		controller.deposit,
	);

	fastify.delete(
		"/:id",
		{
			schema: {
				tags: ["goals"],
				summary: "Excluir meta",
				params: GoalParamsSchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.remove,
	);
}
