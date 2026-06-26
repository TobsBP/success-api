import { eq, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { goals } from "@/infra/db/schema/index.js";
import type { IGoalsRepository } from "@/modules/goals/interfaces/goals.repository.interface.js";
import type {
	CreateGoalBody,
	GoalDto,
	UpdateGoalBody,
} from "@/modules/goals/schemas/index.js";

type GoalRow = typeof goals.$inferSelect;

export class GoalsRepository implements IGoalsRepository {
	private db: Db;
	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findAll(userId: string): Promise<GoalDto[]> {
		const rows = await this.db
			.select()
			.from(goals)
			.where(eq(goals.userId, userId));
		return rows.map((row) => this.toDto(row));
	}

	async findById(id: string): Promise<GoalDto | null> {
		const [row] = await this.db.select().from(goals).where(eq(goals.id, id));
		return row ? this.toDto(row) : null;
	}

	async create(data: CreateGoalBody & { userId: string }): Promise<GoalDto> {
		const [row] = await this.db.insert(goals).values(data).returning();
		return this.toDto(row);
	}

	async update(id: string, data: UpdateGoalBody): Promise<GoalDto | null> {
		const [row] = await this.db
			.update(goals)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(goals.id, id))
			.returning();
		return row ? this.toDto(row) : null;
	}

	async deposit(id: string, amount: number): Promise<GoalDto | null> {
		const [row] = await this.db
			.update(goals)
			.set({
				currentAmount: sql`${goals.currentAmount} + ${amount}`,
				updatedAt: new Date(),
			})
			.where(eq(goals.id, id))
			.returning();
		return row ? this.toDto(row) : null;
	}

	async remove(id: string): Promise<void> {
		await this.db.delete(goals).where(eq(goals.id, id));
	}

	private toDto(row: GoalRow): GoalDto {
		const progressPercent =
			row.targetAmount > 0 ? (row.currentAmount / row.targetAmount) * 100 : 0;
		const remaining = row.targetAmount - row.currentAmount;
		return {
			id: row.id,
			name: row.name,
			description: row.description ?? undefined,
			priority: row.priority,
			status: row.status,
			currentAmount: row.currentAmount,
			targetAmount: row.targetAmount,
			progressPercent: Math.min(100, progressPercent),
			remaining: Math.max(0, remaining),
			forecastDate: "",
			icon: row.icon,
			color: row.color,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
