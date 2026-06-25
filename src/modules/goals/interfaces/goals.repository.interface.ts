import type {
	CreateGoalBody,
	GoalDto,
	UpdateGoalBody,
} from "@/modules/goals/schemas/index.js";

export interface IGoalsRepository {
	findAll(userId: string): Promise<GoalDto[]>;
	findById(id: string): Promise<GoalDto | null>;
	create(data: CreateGoalBody & { userId: string }): Promise<GoalDto>;
	update(id: string, data: UpdateGoalBody): Promise<GoalDto | null>;
	remove(id: string): Promise<void>;
}
