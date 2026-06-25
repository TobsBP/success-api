import type { UpdateAssumptionsBody } from "@/modules/projections/schemas/index.js";

export interface IProjectionsRepository {
	getAssumptions(
		userId: string,
	): Promise<(UpdateAssumptionsBody & { id?: string }) | null>;
	upsertAssumptions(
		userId: string,
		data: UpdateAssumptionsBody,
	): Promise<UpdateAssumptionsBody>;
}
