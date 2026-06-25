import type {
	ProjectionsResponseDto,
	UpdateAssumptionsBody,
} from "@/modules/projections/schemas/index.js";

export interface IProjectionsService {
	getProjections(
		userId: string,
		timeframe: number,
	): Promise<ProjectionsResponseDto>;
	updateAssumptions(
		userId: string,
		data: UpdateAssumptionsBody,
	): Promise<UpdateAssumptionsBody>;
}
