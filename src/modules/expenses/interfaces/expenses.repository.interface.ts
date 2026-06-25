import type {
	CreateExpenseBody,
	ExpenseEntryDto,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";

export interface IExpensesRepository {
	findByMonth(userId: string, month: string): Promise<ExpenseEntryDto[]>;
	findById(id: string): Promise<ExpenseEntryDto | null>;
	create(
		data: CreateExpenseBody & { userId: string },
	): Promise<ExpenseEntryDto>;
	update(id: string, data: UpdateExpenseBody): Promise<ExpenseEntryDto | null>;
	remove(id: string): Promise<void>;
	getLimit(userId: string): Promise<number>;
	setLimit(userId: string, limit: number): Promise<number>;
}
