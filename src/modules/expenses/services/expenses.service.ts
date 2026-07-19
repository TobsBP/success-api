import { NotFoundError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type {
	CardConfig,
	IExpensesRepository,
	UpdateExpenseData,
} from "@/modules/expenses/interfaces/expenses.repository.interface.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type {
	CreateExpenseBody,
	ExpenseEntryDto,
	ExpensesResponseDto,
	PaymentMethod,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";
import { computeInvoiceDueDate } from "./invoice.js";

/**
 * Data em que a despesa pesa no fluxo de caixa: para compras no crédito com
 * cartão configurado, é o vencimento da fatura; caso contrário, a própria data.
 */
function resolveBillingDate(
	date: string,
	paymentMethod: PaymentMethod | undefined,
	card: CardConfig | null,
): string {
	if (paymentMethod === "credit" && card) {
		return computeInvoiceDueDate(date, card.closingDay, card.dueDay);
	}
	return date;
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Divide um valor total inteiro em `parts` parcelas cujo somatório é exatamente
 * o total. O resto da divisão é distribuído nas primeiras parcelas (ex.: 10000
 * em 3 → [3334, 3333, 3333]).
 */
function splitAmount(total: number, parts: number): number[] {
	const base = Math.floor(total / parts);
	let remainder = total - base * parts;
	return Array.from({ length: parts }, () => {
		if (remainder > 0) {
			remainder -= 1;
			return base + 1;
		}
		return base;
	});
}

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
	private cache: CacheService;

	constructor({
		expensesRepository,
		cache,
	}: { expensesRepository: IExpensesRepository; cache: CacheService }) {
		this.repo = expensesRepository;
		this.cache = cache;
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

	async listAll(userId: string): Promise<ExpenseEntryDto[]> {
		return this.repo.findAll(userId);
	}

	async createEntry(
		userId: string,
		data: CreateExpenseBody,
	): Promise<ExpenseEntryDto> {
		const { recurringMonths, installments, ...expense } = data;
		const card = await this.repo.getCardConfig(userId);

		// Parcelamento: divide o valor total em N parcelas mensais (a primeira já
		// no mês de `date`). Cada parcela é uma despesa própria. Vale para
		// qualquer categoria.
		if (installments && installments > 1) {
			const parcels = splitAmount(expense.amount, installments);
			const entries = parcels.map((amount, index) => {
				const date = addMonths(expense.date, index);
				return {
					...expense,
					userId,
					amount,
					date,
					billingDate: resolveBillingDate(date, expense.paymentMethod, card),
					description: `${expense.description} (${index + 1}/${installments})`,
				};
			});
			const [first, ...rest] = entries;
			const created = await this.repo.create(first);
			await Promise.all(rest.map((parcel) => this.repo.create(parcel)));
			await this.cache.delByPattern(`overview:${userId}:*`);
			return created;
		}

		const created = await this.repo.create({
			...expense,
			userId,
			billingDate: resolveBillingDate(
				expense.date,
				expense.paymentMethod,
				card,
			),
		});

		// Recorrência: replica a despesa (valor cheio) nos próximos meses. Útil
		// para assinaturas. Vale para qualquer categoria.
		if (recurringMonths && recurringMonths > 0) {
			await Promise.all(
				Array.from({ length: recurringMonths }, (_, index) => {
					const date = addMonths(expense.date, index + 1);
					return this.repo.create({
						...expense,
						userId,
						date,
						billingDate: resolveBillingDate(date, expense.paymentMethod, card),
					});
				}),
			);
		}

		await this.cache.delByPattern(`overview:${userId}:*`);
		return created;
	}

	async updateEntry(
		userId: string,
		id: string,
		data: UpdateExpenseBody,
	): Promise<ExpenseEntryDto> {
		const patch: UpdateExpenseData = { ...data };

		// Se a data ou o meio de pagamento mudarem, a fatura/vencimento pode mudar.
		if (data.date !== undefined || data.paymentMethod !== undefined) {
			const existing = await this.repo.findById(id);
			if (!existing) throw new NotFoundError("Expense", id);
			const date = data.date ?? existing.date;
			const paymentMethod = data.paymentMethod ?? existing.paymentMethod;
			const card = await this.repo.getCardConfig(userId);
			patch.billingDate = resolveBillingDate(date, paymentMethod, card);
		}

		const updated = await this.repo.update(id, patch);
		if (!updated) throw new NotFoundError("Expense", id);
		await this.cache.delByPattern(`overview:${userId}:*`);
		return updated;
	}

	async removeEntry(userId: string, id: string): Promise<void> {
		const entry = await this.repo.findById(id);
		if (!entry) throw new NotFoundError("Expense", id);
		await this.repo.remove(id);
		await this.cache.delByPattern(`overview:${userId}:*`);
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
