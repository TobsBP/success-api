import { Redis } from "ioredis";
import { env } from "../../core/config/env.js";

let redis: Redis | null = null;

/**
 * Retorna a conexão Redis (singleton) ou `null` quando `REDIS_URL`
 * não está configurada, permitindo rodar o app sem Redis em dev/testes.
 */
export function getRedis(): Redis | null {
	if (!env.REDIS_URL) return null;

	if (!redis) {
		redis = new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 3,
		});
	}
	return redis;
}

export async function closeRedis() {
	if (redis) {
		await redis.quit();
		redis = null;
	}
}
