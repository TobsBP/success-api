import type {
	ReportsQuery,
	ReportsResponseDto,
} from "@/modules/reports/schemas/index.js";

export interface IReportsService {
	getData(userId: string, query: ReportsQuery): Promise<ReportsResponseDto>;
}
