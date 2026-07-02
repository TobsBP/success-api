import type {
	CreateExpenseBody,
	ExpenseEntryDto,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";

/** Configuração do cartão usada para calcular a fatura (dias 1-31). */
export interface CardConfig {
	closingDay: number;
	dueDay: number;
}

/**
 * Dados para persistir uma despesa. `billingDate` (data da fatura/efetiva) é
 * calculada no service e sempre gravada. `installments`/`recurringMonths` são
 * consumidos no service e não chegam ao repositório.
 */
export type CreateExpenseData = Omit<
	CreateExpenseBody,
	"installments" | "recurringMonths"
> & {
	userId: string;
	billingDate: string;
};

/** Atualização parcial; `billingDate` é recalculada no service quando necessário. */
export type UpdateExpenseData = UpdateExpenseBody & {
	billingDate?: string;
};

export interface IExpensesRepository {
	findByMonth(userId: string, month: string): Promise<ExpenseEntryDto[]>;
	findAll(userId: string): Promise<ExpenseEntryDto[]>;
	findById(id: string): Promise<ExpenseEntryDto | null>;
	getCardConfig(userId: string): Promise<CardConfig | null>;
	create(data: CreateExpenseData): Promise<ExpenseEntryDto>;
	update(id: string, data: UpdateExpenseData): Promise<ExpenseEntryDto | null>;
	remove(id: string): Promise<void>;
	getLimit(userId: string): Promise<number>;
	setLimit(userId: string, limit: number): Promise<number>;
}
