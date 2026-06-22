import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import "dotenv/config";

const envSchema = Type.Object({
	NODE_ENV: Type.Optional(
		Type.Union(
			[
				Type.Literal("development"),
				Type.Literal("production"),
				Type.Literal("test"),
			],
			{ default: "development" },
		),
	),
	PORT: Type.Number({ default: 3000 }),
	DATABASE_URL: Type.String(),
	SENTRY_DSN: Type.Optional(Type.String()),
	// Adicione outras variáveis conforme o projeto crescer
});

type Env = Static<typeof envSchema>;

function validateEnv(): Env {
	try {
		const envWithDefaults = {
			...process.env,
			PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
		};

		const validated = Value.Cast(envSchema, envWithDefaults);

		if (!Value.Check(envSchema, validated)) {
			const errors = [...Value.Errors(envSchema, validated)];
			console.error("❌ Invalid environment variables:");
			for (const error of errors) {
				console.error(`  - ${error.path}: ${error.message}`);
			}
			process.exit(1);
		}

		return validated;
	} catch (error) {
		console.error("❌ Error validating environment variables:", error);
		process.exit(1);
	}
}

export const env = validateEnv();
