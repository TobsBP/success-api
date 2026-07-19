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
	REDIS_URL: Type.Optional(Type.String()),
	// Firebase Admin (auth) — obrigatórias, validadas no startup
	FIREBASE_PROJECT_ID: Type.String(),
	FIREBASE_CLIENT_EMAIL: Type.String(),
	FIREBASE_PRIVATE_KEY: Type.String(),
	// Firebase REST API key (usada no login via identitytoolkit)
	FIREBASE_API_KEY: Type.String(),
	// Rate limit global
	RATE_LIMIT_MAX: Type.Number({ default: 50 }),
	RATE_LIMIT_WINDOW: Type.String({ default: "1 minute" }),
	// Qual provider de LLM o módulo assistant usa. Trocar é só mudar isso.
	AI_PROVIDER: Type.Optional(
		Type.Union([Type.Literal("claude"), Type.Literal("gemini")], {
			default: "claude",
		}),
	),
	// Opcional: se vazio, o assistente responde com erro claro ao ser chamado
	ANTHROPIC_API_KEY: Type.Optional(Type.String()),
	GEMINI_API_KEY: Type.Optional(Type.String()),
	// Nomes de modelo configuráveis: providers descontinuam versões com o tempo
	// (ex.: gemini-2.5-flash saiu de circulação), então isso evita ter que fazer
	// deploy só pra trocar o modelo.
	ANTHROPIC_MODEL: Type.String({ default: "claude-sonnet-5" }),
	GEMINI_MODEL: Type.String({ default: "gemini-flash-latest" }),
	// Adicione outras variáveis conforme o projeto crescer
});

type Env = Static<typeof envSchema>;

function validateEnv(): Env {
	try {
		const envWithDefaults = {
			...process.env,
			PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
			RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX
				? Number(process.env.RATE_LIMIT_MAX)
				: 50,
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
