import type { FastifyInstance } from "fastify";
import { usersRoutes } from "./users/routes/index.js";

/**
 * Este plugin centraliza o registro de todos os módulos da aplicação.
 * Ao adicionar um novo módulo via scaffolding, basta registrar a rota aqui.
 */
export async function appModules(fastify: FastifyInstance) {
	await fastify.register(usersRoutes, { prefix: "/users" });
}
