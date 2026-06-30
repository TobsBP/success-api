import type {
	CategoryTotal,
	GoalRow,
	InvestmentRow,
	LargestExpenseRow,
	MonthlyTotals,
	MonthTotals,
	SourceTotal,
} from "@/modules/overview/repositories/overview.repository.js";

export interface IOverviewRepository {
	getMonthTotals(userId: string, start: Date, end: Date): Promise<MonthTotals>;
	getMonthlyTotalsByMonth(
		userId: string,
		start: Date,
		end: Date,
	): Promise<MonthlyTotals[]>;
	getExpensesByCategory(
		userId: string,
		start: Date,
		end: Date,
	): Promise<CategoryTotal[]>;
	getIncomeBySource(
		userId: string,
		start: Date,
		end: Date,
	): Promise<SourceTotal[]>;
	getActiveGoals(userId: string): Promise<GoalRow[]>;
	getTopInvestment(userId: string): Promise<InvestmentRow | null>;
	getLargestExpense(
		userId: string,
		start: Date,
		end: Date,
	): Promise<LargestExpenseRow | null>;
}
