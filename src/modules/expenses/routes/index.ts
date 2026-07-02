import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { ExpensesController } from "@/modules/expenses/controllers/expenses.controller.js";
import {
	CreateExpenseBodySchema,
	ExpenseEntrySchema,
	ExpenseListResponseSchema,
	ExpenseParamsSchema,
	ExpensesResponseSchema,
	LimitBodySchema,
	LimitResponseSchema,
	MonthQuerySchema,
	UpdateExpenseBodySchema,
} from "@/modules/expenses/schemas/index.js";

export async function expensesRoutes(fastify: FastifyInstance) {
	const controller =
		container.resolve<ExpensesController>("expensesController");

	fastify.get(
		"/overview",
		{
			schema: {
				tags: ["expenses"],
				summary: "Overview de despesas",
				querystring: MonthQuerySchema,
				response: { 200: ExpensesResponseSchema },
			},
		},
		controller.overview,
	);

	fastify.get(
		"/entries",
		{
			schema: {
				tags: ["expenses"],
				summary: "Listar todas as despesas",
				response: { 200: ExpenseListResponseSchema },
			},
		},
		controller.listAll,
	);

	fastify.post(
		"/entries",
		{
			schema: {
				tags: ["expenses"],
				summary: "Criar lançamento",
				body: CreateExpenseBodySchema,
				response: { 201: ExpenseEntrySchema },
			},
		},
		controller.create,
	);

	fastify.patch(
		"/entries/:id",
		{
			schema: {
				tags: ["expenses"],
				summary: "Atualizar lançamento",
				params: ExpenseParamsSchema,
				body: UpdateExpenseBodySchema,
				response: { 200: ExpenseEntrySchema },
			},
		},
		controller.update,
	);

	fastify.delete(
		"/entries/:id",
		{
			schema: {
				tags: ["expenses"],
				summary: "Excluir lançamento",
				params: ExpenseParamsSchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.remove,
	);

	fastify.get(
		"/limit",
		{
			schema: {
				tags: ["expenses"],
				summary: "Limite mensal",
				response: { 200: LimitResponseSchema },
			},
		},
		controller.getLimit,
	);

	fastify.put(
		"/limit",
		{
			schema: {
				tags: ["expenses"],
				summary: "Atualizar limite",
				body: LimitBodySchema,
				response: { 200: LimitResponseSchema },
			},
		},
		controller.setLimit,
	);
}
