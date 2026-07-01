import type { Redis } from "ioredis";

/**
 * Cache simples baseado em Redis com serialização JSON.
 * Se o Redis não estiver configurado (`redis === null`), todas as operações
 * viram no-op (sempre cache miss), então o app funciona sem Redis.
 */
export class CacheService {
	private redis: Redis | null;

	constructor({ redis }: { redis: Redis | null }) {
		this.redis = redis;
	}

	async get<T>(key: string): Promise<T | null> {
		if (!this.redis) return null;
		const value = await this.redis.get(key);
		return value ? (JSON.parse(value) as T) : null;
	}

	/** `ttlSeconds` opcional define a expiração da chave. */
	async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		if (!this.redis) return;
		const payload = JSON.stringify(value);
		if (ttlSeconds) {
			await this.redis.set(key, payload, "EX", ttlSeconds);
		} else {
			await this.redis.set(key, payload);
		}
	}

	async del(...keys: string[]): Promise<void> {
		if (!this.redis || keys.length === 0) return;
		await this.redis.del(...keys);
	}

	/**
	 * Remove todas as chaves que casam com o `pattern` (glob do Redis, ex.:
	 * `overview:123:*`). Usa `SCAN` para não bloquear o Redis com `KEYS`.
	 */
	async delByPattern(pattern: string): Promise<void> {
		if (!this.redis) return;
		let cursor = "0";
		do {
			const [next, keys] = await this.redis.scan(
				cursor,
				"MATCH",
				pattern,
				"COUNT",
				100,
			);
			cursor = next;
			if (keys.length > 0) await this.redis.del(...keys);
		} while (cursor !== "0");
	}
}
