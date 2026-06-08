import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../core/config/env.js";
import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof getDb>;

let pool: Pool | null = null;

export function getDb() {
	if (!pool) {
		pool = new Pool({
			connectionString: env.DATABASE_URL,
			max: 20,
		});
	}
	return drizzle(pool, { schema });
}

export async function closeDb() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
