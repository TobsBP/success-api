import type { Redis } from "ioredis";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { CacheService } from "./cache.service.js";

describe("CacheService", () => {
	describe("sem Redis configurado (no-op)", () => {
		const cache = new CacheService({ redis: null });

		it("get sempre retorna null", async () => {
			await expect(cache.get("any")).resolves.toBeNull();
		});

		it("set e del não lançam erro", async () => {
			await expect(cache.set("k", { a: 1 })).resolves.toBeUndefined();
			await expect(cache.del("k")).resolves.toBeUndefined();
		});
	});

	describe("com Redis", () => {
		let cache: CacheService;
		let mockRedis: { get: Mock; set: Mock; del: Mock };

		beforeEach(() => {
			mockRedis = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
			cache = new CacheService({
				redis: mockRedis as unknown as Redis,
			});
		});

		it("get desserializa o JSON armazenado", async () => {
			mockRedis.get.mockResolvedValue(JSON.stringify({ id: "1" }));
			await expect(cache.get("k")).resolves.toEqual({ id: "1" });
		});

		it("get retorna null quando a chave não existe", async () => {
			mockRedis.get.mockResolvedValue(null);
			await expect(cache.get("k")).resolves.toBeNull();
		});

		it("set serializa o valor sem TTL", async () => {
			await cache.set("k", { id: "1" });
			expect(mockRedis.set).toHaveBeenCalledWith("k", '{"id":"1"}');
		});

		it("set aplica EX quando há TTL", async () => {
			await cache.set("k", { id: "1" }, 60);
			expect(mockRedis.set).toHaveBeenCalledWith("k", '{"id":"1"}', "EX", 60);
		});

		it("del repassa as chaves", async () => {
			await cache.del("a", "b");
			expect(mockRedis.del).toHaveBeenCalledWith("a", "b");
		});

		it("del é no-op sem chaves", async () => {
			await cache.del();
			expect(mockRedis.del).not.toHaveBeenCalled();
		});
	});
});
