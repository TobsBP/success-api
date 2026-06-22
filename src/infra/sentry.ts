import * as Sentry from "@sentry/node";
import { env } from "../core/config/env.js";

/**
 * Inicializa o Sentry. Só é ativado quando `SENTRY_DSN` está definido,
 * então em desenvolvimento/testes sem DSN o app roda normalmente.
 */
export function initSentry() {
	if (!env.SENTRY_DSN) return;

	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.NODE_ENV,
	});
}

export { Sentry };
