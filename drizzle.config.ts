import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/infra/db/schema/index.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "", // Drizzle-kit expects a string, empty string will cause a clear error
	},
	verbose: true,
	strict: true,
});

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}
