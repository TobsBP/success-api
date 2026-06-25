import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { UsersController } from "@/modules/users/controllers/users.controller.js";
import {
	CreateUserBodySchema,
	ListUsersQuerySchema,
	PaginatedUsersSchema,
	UpdateUserBodySchema,
	UserParamsSchema,
	UserSchema,
} from "@/modules/users/schemas/index.js";
import { ErrorResponseSchema } from "@/shared/schemas/common.js";

export async function usersRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<UsersController>("usersController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["users"],
				summary: "List users",
				querystring: ListUsersQuerySchema,
				response: { 200: PaginatedUsersSchema },
			},
		},
		controller.list,
	);

	fastify.get(
		"/:id",
		{
			schema: {
				tags: ["users"],
				summary: "Get user by ID",
				params: UserParamsSchema,
				response: {
					200: UserSchema,
					404: ErrorResponseSchema,
				},
			},
		},
		controller.getById,
	);

	fastify.post(
		"",
		{
			schema: {
				tags: ["users"],
				summary: "Create user",
				body: CreateUserBodySchema,
				response: {
					201: UserSchema,
					409: ErrorResponseSchema,
				},
			},
		},
		controller.create,
	);

	fastify.patch(
		"/:id",
		{
			schema: {
				tags: ["users"],
				summary: "Update user",
				params: UserParamsSchema,
				body: UpdateUserBodySchema,
				response: {
					200: UserSchema,
					404: ErrorResponseSchema,
				},
			},
		},
		controller.update,
	);

	fastify.delete(
		"/:id",
		{
			schema: {
				tags: ["users"],
				summary: "Delete user",
				params: UserParamsSchema,
				response: {
					204: { type: "null" },
					404: ErrorResponseSchema,
				},
			},
		},
		controller.remove,
	);
}
