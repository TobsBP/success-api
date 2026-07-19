import type {
	CreateExpenseBody,
	ExpenseEntryDto,
	ExpensesResponseDto,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";

export interface IExpensesService {
	getMonthData(userId: string, month: string): Promise<ExpensesResponseDto>;
	listAll(userId: string): Promise<ExpenseEntryDto[]>;
	createEntry(
		userId: string,
		data: CreateExpenseBody,
	): Promise<ExpenseEntryDto>;
	updateEntry(
		userId: string,
		id: string,
		data: UpdateExpenseBody,
	): Promise<ExpenseEntryDto>;
	removeEntry(userId: string, id: string): Promise<void>;
	getLimit(userId: string): Promise<{ limit: number }>;
	setLimit(userId: string, limit: number): Promise<{ limit: number }>;
}
