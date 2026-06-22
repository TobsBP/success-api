import type { FastifyError } from "fastify";
import fp from "fastify-plugin";
import { AppError } from "@/core/errors/index.js";
import { Sentry } from "@/infra/sentry.js";

interface ValidationDetail {
	keyword: string;
	dataPath: string;
	schemaPath: string;
	params: Record<string, unknown>;
	message?: string;
}

// Type predicate function to check for Fastify validation errors
function isFastifyValidationError(
	error: unknown,
): error is FastifyError & { validation: ValidationDetail[] } {
	return typeof error === "object" && error !== null && "validation" in error;
}

export default fp(async (fastify) => {
	fastify.setErrorHandler((error, _request, reply) => {
		if (error instanceof AppError) {
			return reply.status(error.statusCode).send({
				statusCode: error.statusCode,
				error: error.code,
				message: error.message,
			});
		}

		if (isFastifyValidationError(error)) {
			return reply.status(400).send({
				statusCode: 400,
				error: "VALIDATION_ERROR",
				message: "Validation failed",
				details: error.validation,
			});
		}

		Sentry.captureException(error);
		fastify.log.error(error);
		return reply.status(500).send({
			statusCode: 500,
			error: "INTERNAL_ERROR",
			message: "Internal Server Error",
		});
	});
});
