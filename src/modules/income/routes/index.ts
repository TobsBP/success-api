import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { IncomeController } from "@/modules/income/controllers/income.controller.js";
import {
	CreateIncomeEntryBodySchema,
	IncomeEntrySchema,
	IncomeParamsSchema,
	IncomeResponseSchema,
	MonthQuerySchema,
	UpdateIncomeEntryBodySchema,
} from "@/modules/income/schemas/index.js";

export async function incomeRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<IncomeController>("incomeController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["income"],
				summary: "Receitas do mês",
				querystring: MonthQuerySchema,
				response: { 200: IncomeResponseSchema },
			},
		},
		controller.list,
	);

	fastify.post(
		"/entries",
		{
			schema: {
				tags: ["income"],
				summary: "Criar lançamento",
				body: CreateIncomeEntryBodySchema,
				response: { 201: IncomeEntrySchema },
			},
		},
		controller.create,
	);

	fastify.patch(
		"/entries/:id",
		{
			schema: {
				tags: ["income"],
				summary: "Atualizar lançamento",
				params: IncomeParamsSchema,
				body: UpdateIncomeEntryBodySchema,
				response: { 200: IncomeEntrySchema },
			},
		},
		controller.update,
	);

	fastify.delete(
		"/entries/:id",
		{
			schema: {
				tags: ["income"],
				summary: "Excluir lançamento",
				params: IncomeParamsSchema,
				response: { 204: {} },
			},
		},
		controller.remove,
	);
}
