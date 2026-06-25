import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth/routes/index.js";
import { expensesRoutes } from "./expenses/routes/index.js";
import { goalsRoutes } from "./goals/routes/index.js";
import { incomeRoutes } from "./income/routes/index.js";
import { investmentsRoutes } from "./investments/routes/index.js";
import { networthRoutes } from "./networth/routes/index.js";
import { overviewRoutes } from "./overview/routes/index.js";
import { projectionsRoutes } from "./projections/routes/index.js";
import { reportsRoutes } from "./reports/routes/index.js";
import { settingsRoutes } from "./settings/routes/index.js";
import { usersRoutes } from "./users/routes/index.js";

/**
 * Este plugin centraliza o registro de todos os módulos da aplicação.
 * Ao adicionar um novo módulo via scaffolding, basta registrar a rota aqui.
 */
export async function appModules(fastify: FastifyInstance) {
	await fastify.register(usersRoutes, { prefix: "/users" });
	await fastify.register(incomeRoutes, { prefix: "/income" });
	await fastify.register(expensesRoutes, { prefix: "/expenses" });
	await fastify.register(investmentsRoutes, { prefix: "/investments" });
	await fastify.register(goalsRoutes, { prefix: "/goals" });
	await fastify.register(authRoutes, { prefix: "/auth" });
	await fastify.register(networthRoutes, { prefix: "/net-worth" });
	await fastify.register(overviewRoutes, { prefix: "/overview" });
	await fastify.register(reportsRoutes, { prefix: "/reports" });
	await fastify.register(projectionsRoutes, { prefix: "/projections" });
	await fastify.register(settingsRoutes, { prefix: "/settings" });
}
