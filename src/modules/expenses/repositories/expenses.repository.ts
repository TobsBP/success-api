import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import {
	expenses,
	expensesLimit,
	userSettings,
} from "@/infra/db/schema/index.js";
import type {
	CardConfig,
	CreateExpenseData,
	IExpensesRepository,
	UpdateExpenseData,
} from "@/modules/expenses/interfaces/expenses.repository.interface.js";
import type { ExpenseEntryDto } from "@/modules/expenses/schemas/index.js";

function parseLocalDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function getMonthRange(month: string) {
	const [y, m] = month.split("-").map(Number);
	return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export class ExpensesRepository implements IExpensesRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findByMonth(userId: string, month: string): Promise<ExpenseEntryDto[]> {
		const { start, end } = getMonthRange(month);
		const rows = await this.db
			.select()
			.from(expenses)
			.where(
				and(
					eq(expenses.userId, userId),
					// Bucketiza pela data da fatura (crédito cai no mês do vencimento).
					gte(expenses.billingDate, start),
					lt(expenses.billingDate, end),
				),
			);
		return rows.map((r) => this.toDto(r));
	}

	async getCardConfig(userId: string): Promise<CardConfig | null> {
		const [row] = await this.db
			.select({
				closingDay: userSettings.cardClosingDay,
				dueDay: userSettings.cardDueDay,
			})
			.from(userSettings)
			.where(eq(userSettings.userId, userId));
		if (!row || row.closingDay == null || row.dueDay == null) return null;
		return { closingDay: row.closingDay, dueDay: row.dueDay };
	}

	async findAll(userId: string): Promise<ExpenseEntryDto[]> {
		const rows = await this.db
			.select()
			.from(expenses)
			.where(eq(expenses.userId, userId))
			.orderBy(desc(expenses.date));
		return rows.map((r) => this.toDto(r));
	}

	async findById(id: string): Promise<ExpenseEntryDto | null> {
		const [row] = await this.db
			.select()
			.from(expenses)
			.where(eq(expenses.id, id));
		return row ? this.toDto(row) : null;
	}

	async create(data: CreateExpenseData): Promise<ExpenseEntryDto> {
		const [row] = await this.db
			.insert(expenses)
			.values({
				userId: data.userId,
				date: parseLocalDate(data.date),
				description: data.description,
				category: data.category,
				paymentMethod: data.paymentMethod ?? "debit",
				amount: String(data.amount),
				billingDate: parseLocalDate(data.billingDate),
			})
			.returning();
		return this.toDto(row);
	}

	async update(
		id: string,
		data: UpdateExpenseData,
	): Promise<ExpenseEntryDto | null> {
		const set = {
			...(data.date !== undefined && { date: parseLocalDate(data.date) }),
			...(data.description !== undefined && { description: data.description }),
			...(data.category !== undefined && { category: data.category }),
			...(data.paymentMethod !== undefined && {
				paymentMethod: data.paymentMethod,
			}),
			...(data.amount !== undefined && { amount: String(data.amount) }),
			...(data.billingDate !== undefined && {
				billingDate: parseLocalDate(data.billingDate),
			}),
			updatedAt: new Date(),
		};

		const [row] = await this.db
			.update(expenses)
			.set(set)
			.where(eq(expenses.id, id))
			.returning();
		return row ? this.toDto(row) : null;
	}

	async remove(id: string): Promise<void> {
		await this.db.delete(expenses).where(eq(expenses.id, id));
	}

	async getLimit(userId: string): Promise<number> {
		const [row] = await this.db
			.select()
			.from(expensesLimit)
			.where(eq(expensesLimit.userId, userId));
		return row ? row.limitAmount : 0;
	}

	async setLimit(userId: string, limit: number): Promise<number> {
		const [row] = await this.db
			.insert(expensesLimit)
			.values({ userId, limitAmount: limit })
			.onConflictDoUpdate({
				target: expensesLimit.userId,
				set: { limitAmount: limit, updatedAt: new Date() },
			})
			.returning();
		return row.limitAmount;
	}

	private toDto(row: typeof expenses.$inferSelect): ExpenseEntryDto {
		return {
			id: row.id,
			date: row.date.toISOString().split("T")[0],
			description: row.description,
			category: row.category,
			paymentMethod: row.paymentMethod as ExpenseEntryDto["paymentMethod"],
			amount: Number(row.amount),
			billingDate: row.billingDate.toISOString().split("T")[0],
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
