import type {
	MonthlyAggregate,
	ReportCategoryRow,
} from "@/modules/reports/repositories/reports.repository.js";

export interface IReportsRepository {
	getMonthlyAggregates(
		userId: string,
		start: Date,
		end: Date,
		categories?: string[],
	): Promise<MonthlyAggregate[]>;
	getExpensesByCategory(
		userId: string,
		start: Date,
		end: Date,
		categories?: string[],
	): Promise<ReportCategoryRow[]>;
}
