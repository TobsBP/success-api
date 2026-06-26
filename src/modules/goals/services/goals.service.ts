import { AppError, NotFoundError } from "@/core/errors/index.js";
import type { IGoalsRepository } from "@/modules/goals/interfaces/goals.repository.interface.js";
import type { IGoalsService } from "@/modules/goals/interfaces/goals.service.interface.js";
import type {
	CreateGoalBody,
	GoalDto,
	GoalsResponseDto,
	UpdateGoalBody,
} from "@/modules/goals/schemas/index.js";

export class GoalsService implements IGoalsService {
	private repo: IGoalsRepository;
	constructor({ goalsRepository }: { goalsRepository: IGoalsRepository }) {
		this.repo = goalsRepository;
	}

	async getData(userId: string): Promise<GoalsResponseDto> {
		const goals = await this.repo.findAll(userId);

		const goalsWithForecast = goals.map((g) => ({ ...g, forecastDate: "" }));

		const activeCount = goalsWithForecast.filter(
			(g) => g.status === "active",
		).length;
		const completedCount = goalsWithForecast.filter(
			(g) => g.status === "completed",
		).length;
		const totalSaved = goalsWithForecast.reduce(
			(sum, g) => sum + g.currentAmount,
			0,
		);

		return {
			summary: { activeCount, completedCount, totalSaved },
			goals: goalsWithForecast,
		};
	}

	async createGoal(userId: string, data: CreateGoalBody): Promise<GoalDto> {
		return this.repo.create({ ...data, userId });
	}

	async updateGoal(id: string, data: UpdateGoalBody): Promise<GoalDto> {
		const updated = await this.repo.update(id, data);
		if (!updated) throw new NotFoundError("Goal", id);
		return updated;
	}

	async deposit(id: string, amount: number): Promise<GoalDto> {
		const existing = await this.repo.findById(id);
		if (!existing) throw new NotFoundError("Goal", id);
		const updated = await this.repo.deposit(id, amount);
		if (!updated) throw new AppError("Deposit");

		return updated;
	}

	async removeGoal(id: string): Promise<void> {
		const existing = await this.repo.findById(id);
		if (!existing) throw new NotFoundError("Goal", id);
		await this.repo.remove(id);
	}
}
