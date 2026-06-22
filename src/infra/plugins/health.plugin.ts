import { sql } from "drizzle-orm";
import fp from "fastify-plugin";
import { getRedis } from "@/infra/cache/client.js";
import { getDb } from "@/infra/db/client.js";

/**
 * Endpoints de health check (públicos, fora da autenticação).
 * - GET /health  -> liveness: o processo está de pé.
 * - GET /ready   -> readiness: dependências (DB e Redis) respondem.
 */
export default fp(async (fastify) => {
	fastify.get(
		"/health",
		{
			config: { isPublic: true },
			schema: {
				tags: ["Health"],
				summary: "Liveness probe",
			},
		},
		async () => ({ status: "ok", uptime: process.uptime() }),
	);

	fastify.get(
		"/ready",
		{
			config: { isPublic: true },
			schema: {
				tags: ["Health"],
				summary: "Readiness probe",
			},
		},
		async (_request, reply) => {
			const checks: Record<string, "up" | "down" | "disabled"> = {
				database: "down",
				redis: "disabled",
			};

			try {
				await getDb().execute(sql`SELECT 1`);
				checks.database = "up";
			} catch (err) {
				fastify.log.error(err, "Readiness: database check failed");
			}

			const redis = getRedis();
			if (redis) {
				try {
					await redis.ping();
					checks.redis = "up";
				} catch (err) {
					checks.redis = "down";
					fastify.log.error(err, "Readiness: redis check failed");
				}
			}

			const healthy = checks.database === "up" && checks.redis !== "down";

			return reply
				.status(healthy ? 200 : 503)
				.send({ status: healthy ? "ok" : "degraded", checks });
		},
	);
});
