import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "../../../core/errors/index.js";
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

	beforeEach(() => {
		mockRepo = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByEmail: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		// Injecting the mock repository into the service
		service = new UsersService({
			usersRepository: mockRepo as unknown as IUsersRepository,
		});
	});

	it("should find an item by id", async () => {
		const item = { id: "123", email: "test@test.com", name: "Test" };
		mockRepo.findById.mockResolvedValue(item);

		await expect(service.getById("123")).resolves.toEqual(item);
		expect(mockRepo.findById).toHaveBeenCalledWith("123");
	});

	it("should throw NotFoundError if user is not found by id", async () => {
		mockRepo.findById.mockResolvedValue(null);
		await expect(service.getById("123")).rejects.toThrow(NotFoundError);
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
