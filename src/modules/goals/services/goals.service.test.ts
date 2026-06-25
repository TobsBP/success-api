import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotFoundError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IGoalsRepository } from "@/modules/goals/interfaces/goals.repository.interface.js";
import type { GoalDto } from "@/modules/goals/schemas/index.js";
import { GoalsService } from "./goals.service.js";

const makeGoal = (overrides: Partial<GoalDto> = {}): GoalDto => ({
	id: "goal-1",
	name: "Reserva de emergência",
	priority: "high",
	status: "active",
	currentAmount: 4000000,
	targetAmount: 5000000,
	progressPercent: 80,
	remaining: 1000000,
	forecastDate: "",
	icon: "shield",
	color: "primary",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe("GoalsService", () => {
	let service: GoalsService;
	let mockRepo: {
		findAll: Mock;
		findById: Mock;
		create: Mock;
		update: Mock;
		remove: Mock;
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
			create: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
		};
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn(),
			del: vi.fn(),
		};
		service = new GoalsService({
			goalsRepository: mockRepo as unknown as IGoalsRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	describe("getData", () => {
		it("should return summary and goals list", async () => {
			const goals = [
				makeGoal({ status: "active", currentAmount: 3000000 }),
				makeGoal({ id: "goal-2", status: "completed", currentAmount: 2000000 }),
			];
			mockRepo.findAll.mockResolvedValue(goals);

			const result = await service.getData("user-1");

			expect(result.summary.activeCount).toBe(1);
			expect(result.summary.completedCount).toBe(1);
			expect(result.summary.totalSaved).toBe(5000000);
			expect(result.goals).toHaveLength(2);
		});

		it("should return empty summary when no goals exist", async () => {
			mockRepo.findAll.mockResolvedValue([]);

			const result = await service.getData("user-1");

			expect(result.summary).toEqual({
				activeCount: 0,
				completedCount: 0,
				totalSaved: 0,
			});
			expect(result.goals).toHaveLength(0);
		});
	});

	describe("createGoal", () => {
		it("should create a goal with the userId", async () => {
			const goal = makeGoal();
			mockRepo.create.mockResolvedValue(goal);

			const body = {
				name: "Reserva",
				priority: "high" as const,
				targetAmount: 5000000,
				currentAmount: 0,
				icon: "shield",
				color: "primary",
			};

			const result = await service.createGoal("user-1", body);

			expect(mockRepo.create).toHaveBeenCalledWith({
				...body,
				userId: "user-1",
			});
			expect(result).toEqual(goal);
		});
	});

	describe("updateGoal", () => {
		it("should return the updated goal", async () => {
			const goal = makeGoal({ name: "Updated" });
			mockRepo.update.mockResolvedValue(goal);

			const result = await service.updateGoal("goal-1", { name: "Updated" });

			expect(result).toEqual(goal);
		});

		it("should throw NotFoundError if goal does not exist", async () => {
			mockRepo.update.mockResolvedValue(null);

			await expect(
				service.updateGoal("missing", { name: "X" }),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe("removeGoal", () => {
		it("should remove the goal when it exists", async () => {
			mockRepo.findById.mockResolvedValue(makeGoal());
			mockRepo.remove.mockResolvedValue(undefined);

			await expect(service.removeGoal("goal-1")).resolves.toBeUndefined();
			expect(mockRepo.remove).toHaveBeenCalledWith("goal-1");
		});

		it("should throw NotFoundError if goal does not exist", async () => {
			mockRepo.findById.mockResolvedValue(null);

			await expect(service.removeGoal("missing")).rejects.toThrow(
				NotFoundError,
			);
			expect(mockRepo.remove).not.toHaveBeenCalled();
		});
	});
});
