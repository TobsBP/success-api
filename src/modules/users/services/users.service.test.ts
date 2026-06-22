import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "../../../core/errors/index.js";
import type { CacheService } from "../../../infra/cache/cache.service.js";
import type { IUsersRepository } from "../interfaces/users.repository.interface.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
	let service: UsersService;
	let mockRepo: {
		findAll: Mock;
		findById: Mock;
		findByEmail: Mock;
		create: Mock;
		update: Mock;
		delete: Mock;
	};
	let mockCache: {
		get: Mock;
		set: Mock;
		del: Mock;
	};

	beforeEach(() => {
		mockRepo = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByEmail: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn(),
			del: vi.fn(),
		};
		// Injecting the mock repository and cache into the service
		service = new UsersService({
			usersRepository: mockRepo as unknown as IUsersRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	it("should find an item by id and cache it on a miss", async () => {
		const item = { id: "123", email: "test@test.com", name: "Test" };
		mockRepo.findById.mockResolvedValue(item);

		await expect(service.getById("123")).resolves.toEqual(item);
		expect(mockRepo.findById).toHaveBeenCalledWith("123");
		expect(mockCache.set).toHaveBeenCalledWith(
			"user:123",
			item,
			expect.any(Number),
		);
	});

	it("should return the cached item without hitting the repository", async () => {
		const item = { id: "123", email: "test@test.com", name: "Test" };
		mockCache.get.mockResolvedValue(item);

		await expect(service.getById("123")).resolves.toEqual(item);
		expect(mockRepo.findById).not.toHaveBeenCalled();
	});

	it("should throw NotFoundError if user is not found by id", async () => {
		mockRepo.findById.mockResolvedValue(null);
		await expect(service.getById("123")).rejects.toThrow(NotFoundError);
	});

	it("should invalidate the cache when removing a user", async () => {
		mockRepo.findById.mockResolvedValue({ id: "123" });

		await service.remove("123");

		expect(mockRepo.delete).toHaveBeenCalledWith("123");
		expect(mockCache.del).toHaveBeenCalledWith("user:123");
	});

	it("should create a new user", async () => {
		const newItem = { id: "123", email: "test@test.com", name: "Test" };
		const createBody = { email: "test@test.com", name: "Test" };
		mockRepo.create.mockResolvedValue(newItem);

		await expect(service.create(createBody)).resolves.toEqual(newItem);
		expect(mockRepo.create).toHaveBeenCalledWith(createBody);
	});

	it("should list users with pagination", async () => {
		const query = { limit: 10, page: 1 };
		const repoResponse = { rows: [], total: 0 };
		mockRepo.findAll.mockResolvedValue(repoResponse);

		const result = await service.list(query);

		expect(result.data).toEqual([]);
		expect(result.meta.total).toBe(0);
		expect(mockRepo.findAll).toHaveBeenCalledWith(1, 10);
	});
});
