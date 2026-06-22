import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: "node",
		globals: true,
		setupFiles: [],
		// Envs dummy para que módulos que importam `env.ts` rodem nos testes
		env: {
			NODE_ENV: "test",
			DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
			FIREBASE_PROJECT_ID: "test-project",
			FIREBASE_CLIENT_EMAIL: "test@test.iam.gserviceaccount.com",
			FIREBASE_PRIVATE_KEY: "test-key",
		},
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/scripts/**",
				"**/types/**",
				"**/infra/db/migrations/**",
				"**/infra/db/schema/**",
				"**/*.d.ts",
			],
		},
	},
});
