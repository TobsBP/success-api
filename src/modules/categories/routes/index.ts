import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { CategoriesController } from "@/modules/categories/controllers/categories.controller.js";
import {
	CategoryListQuerySchema,
	CategoryParamsSchema,
	CategorySchema,
	CreateCategoryBodySchema,
	UpdateCategoryBodySchema,
} from "@/modules/categories/schemas/index.js";

export async function categoriesRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<CategoriesController>(
		"categoriesController",
	);

	fastify.get(
		"",
		{
			schema: {
				tags: ["categories"],
				summary: "Listar categorias",
				querystring: CategoryListQuerySchema,
				response: { 200: Type.Array(CategorySchema) },
			},
		},
		controller.list,
	);

	fastify.post(
		"",
		{
			schema: {
				tags: ["categories"],
				summary: "Criar categoria",
				body: CreateCategoryBodySchema,
				response: { 201: CategorySchema },
			},
		},
		controller.create,
	);

	fastify.patch(
		"/:id",
		{
			schema: {
				tags: ["categories"],
				summary: "Atualizar categoria",
				params: CategoryParamsSchema,
				body: UpdateCategoryBodySchema,
				response: { 200: CategorySchema },
			},
		},
		controller.update,
	);

	fastify.delete(
		"/:id",
		{
			schema: {
				tags: ["categories"],
				summary: "Remover categoria",
				params: CategoryParamsSchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.remove,
	);
}
