import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		setupFiles: [],
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
