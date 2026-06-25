import type {
	CreateGoalBody,
	GoalDto,
	GoalsResponseDto,
	UpdateGoalBody,
} from "@/modules/goals/schemas/index.js";

export interface IGoalsService {
	getData(userId: string): Promise<GoalsResponseDto>;
	createGoal(userId: string, data: CreateGoalBody): Promise<GoalDto>;
	updateGoal(id: string, data: UpdateGoalBody): Promise<GoalDto>;
	removeGoal(id: string): Promise<void>;
}
