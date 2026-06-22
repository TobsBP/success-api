import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env } from "./core/config/env.js";
import { setupContainer } from "./core/di/container.js";
import { closeRedis } from "./infra/cache/client.js";
import { closeDb } from "./infra/db/client.js";
import errorHandlerPlugin from "./infra/plugins/error-handler.plugin.js";
import firebaseAuthPlugin from "./infra/plugins/firebase-auth.plugin.js";
import healthPlugin from "./infra/plugins/health.plugin.js";
import swaggerPlugin from "./infra/plugins/swagger.plugin.js";
import { initSentry, Sentry } from "./infra/sentry.js";
import { appModules } from "./modules/index.js";

const fastify = Fastify({
	logger: true,
	disableRequestLogging: env.NODE_ENV === "production",
});

async function bootstrap() {
	initSentry();
	setupContainer();
	await fastify.register(cors, {
		origin: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
	});
	await fastify.register(helmet, {
		contentSecurityPolicy: false,
	});
	await fastify.register(rateLimit, {
		max: env.RATE_LIMIT_MAX,
		timeWindow: env.RATE_LIMIT_WINDOW,
	});

	await fastify.register(swaggerPlugin);
	await fastify.register(errorHandlerPlugin);
	await fastify.register(healthPlugin);
	await fastify.register(firebaseAuthPlugin);

	await fastify.register(appModules);

	await fastify.ready();
	await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
}

// Graceful Shutdown
const signals = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
	process.on(signal, async () => {
		fastify.log.info(`Received ${signal}, shutting down...`);
		try {
			await fastify.close();
			await closeDb();
			await closeRedis();
			await Sentry.close(2000);
			fastify.log.info("Server closed successfully.");
			process.exit(0);
		} catch (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	});
}

// Erros não capturados: reporta ao Sentry, loga e encerra (estado indefinido)
process.on("uncaughtException", (err) => {
	Sentry.captureException(err);
	fastify.log.fatal(err, "Uncaught exception");
	Sentry.close(2000).finally(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
	Sentry.captureException(reason);
	fastify.log.fatal(reason, "Unhandled promise rejection");
	Sentry.close(2000).finally(() => process.exit(1));
});

bootstrap().catch((err) => {
	fastify.log.error(err);
	process.exit(1);
});
