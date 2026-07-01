import { NotFoundError } from "@/core/errors/index.js";
import type { IExpensesRepository } from "@/modules/expenses/interfaces/expenses.repository.interface.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type {
	CreateExpenseBody,
	ExpenseEntryDto,
	ExpensesResponseDto,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const SUBSCRIPTION_CATEGORY = "assinatura";

/**
 * Soma `months` meses a uma data `YYYY-MM-DD`, mantendo o dia. Se o mês de
 * destino não tiver aquele dia (ex.: 31 → fevereiro), usa o último dia do mês.
 */
function addMonths(dateStr: string, months: number): string {
	const [year, month, day] = dateStr.split("-").map(Number);
	const targetIndex = month - 1 + months;
	const targetYear = year + Math.floor(targetIndex / 12);
	const targetMonth = ((targetIndex % 12) + 12) % 12;
	const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
	const clampedDay = Math.min(day, lastDay);
	return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export class ExpensesService implements IExpensesService {
	private repo: IExpensesRepository;

	constructor({
		expensesRepository,
	}: { expensesRepository: IExpensesRepository }) {
		this.repo = expensesRepository;
	}

	async getMonthData(
		userId: string,
		month: string,
	): Promise<ExpensesResponseDto> {
		const targetMonth = month || getCurrentMonth();
		const entries = await this.repo.findByMonth(userId, targetMonth);
		const limitAmount = await this.repo.getLimit(userId);

		const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0);

		// Agrupa por categoria
		const categoryMap = new Map<string, number>();
		for (const entry of entries) {
			categoryMap.set(
				entry.category,
				(categoryMap.get(entry.category) ?? 0) + entry.amount,
			);
		}
		const categoryItems = Array.from(categoryMap.entries()).map(
			([category, amount]) => ({
				category,
				amount,
				percent:
					totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0,
			}),
		);

		const remaining = limitAmount - totalSpent;
		const usedPercent =
			limitAmount > 0 ? Math.round((totalSpent / limitAmount) * 1000) / 10 : 0;

		// Entradas recentes: últimas 5 ordenadas por data decrescente
		const recent = [...entries]
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, 5)
			.map((e) => ({
				id: e.id,
				description: e.description,
				category: e.category,
				date: e.date,
				amount: e.amount,
			}));

		const stubDelta = {
			value: 0,
			unit: "percent" as const,
			direction: "neutral" as const,
		};

		return {
			summary: {
				totalSpent: { amount: totalSpent, delta: stubDelta },
				monthlyLimit: {
					limit: limitAmount,
					spent: totalSpent,
					remaining,
					usedPercent,
				},
			},
			byCategory: { total: totalSpent, items: categoryItems },
			recent,
		};
	}

	async createEntry(
		userId: string,
		data: CreateExpenseBody,
	): Promise<ExpenseEntryDto> {
		const { recurringMonths, ...expense } = data;
		const created = await this.repo.create({ ...expense, userId });

		// Assinaturas se repetem: replica a despesa para os próximos meses.
		const isSubscription =
			expense.category.trim().toLowerCase() === SUBSCRIPTION_CATEGORY;
		if (isSubscription && recurringMonths && recurringMonths > 0) {
			await Promise.all(
				Array.from({ length: recurringMonths }, (_, index) =>
					this.repo.create({
						...expense,
						userId,
						date: addMonths(expense.date, index + 1),
					}),
				),
			);
		}

		return created;
	}

	async updateEntry(
		id: string,
		data: UpdateExpenseBody,
	): Promise<ExpenseEntryDto> {
		const updated = await this.repo.update(id, data);
		if (!updated) throw new NotFoundError("Expense", id);
		return updated;
	}

	async removeEntry(id: string): Promise<void> {
		const entry = await this.repo.findById(id);
		if (!entry) throw new NotFoundError("Expense", id);
		await this.repo.remove(id);
	}

	async getLimit(userId: string): Promise<{ limit: number }> {
		const limit = await this.repo.getLimit(userId);
		return { limit };
	}

	async setLimit(userId: string, limit: number): Promise<{ limit: number }> {
		const newLimit = await this.repo.setLimit(userId, limit);
		return { limit: newLimit };
	}
}
