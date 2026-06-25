import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { projectionAssumptions } from "@/infra/db/schema/index.js";
import type { IProjectionsRepository } from "@/modules/projections/interfaces/projections.repository.interface.js";
import type { UpdateAssumptionsBody } from "@/modules/projections/schemas/index.js";

export class ProjectionsRepository implements IProjectionsRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async getAssumptions(
		userId: string,
	): Promise<(UpdateAssumptionsBody & { id?: string }) | null> {
		const [row] = await this.db
			.select()
			.from(projectionAssumptions)
			.where(eq(projectionAssumptions.userId, userId));

		if (!row) return null;

		return this.toDto(row);
	}

	async upsertAssumptions(
		userId: string,
		data: UpdateAssumptionsBody,
	): Promise<UpdateAssumptionsBody> {
		const [row] = await this.db
			.insert(projectionAssumptions)
			.values({
				userId,
				plannedMonthlyContribution: data.plannedMonthlyContribution,
				estimatedAnnualRatePercent: String(data.estimatedAnnualRatePercent),
				inflationPercent: String(data.inflationPercent),
				contributionGrowthPercent: String(data.contributionGrowthPercent),
				returnsByClass: data.returnsByClass,
			})
			.onConflictDoUpdate({
				target: projectionAssumptions.userId,
				set: {
					plannedMonthlyContribution: data.plannedMonthlyContribution,
					estimatedAnnualRatePercent: String(data.estimatedAnnualRatePercent),
					inflationPercent: String(data.inflationPercent),
					contributionGrowthPercent: String(data.contributionGrowthPercent),
					returnsByClass: data.returnsByClass,
					updatedAt: new Date(),
				},
			})
			.returning();

		return this.toDto(row);
	}

	private toDto(
		row: typeof projectionAssumptions.$inferSelect,
	): UpdateAssumptionsBody & { id?: string } {
		return {
			id: row.id,
			plannedMonthlyContribution: row.plannedMonthlyContribution,
			estimatedAnnualRatePercent: Number(row.estimatedAnnualRatePercent),
			inflationPercent: Number(row.inflationPercent),
			contributionGrowthPercent: Number(row.contributionGrowthPercent),
			returnsByClass: row.returnsByClass as Array<{
				assetClass: string;
				annualRatePercent: number;
			}>,
		};
	}
}
