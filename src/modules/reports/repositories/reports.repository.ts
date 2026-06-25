import { and, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { expenses, income } from "@/infra/db/schema/index.js";

export interface MonthlyAggregate {
	year: number;
	month: number;
	totalIncome: number;
	totalExpenses: number;
}

export interface ReportCategoryRow {
	category: string;
	total: number;
}

export class ReportsRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async getMonthlyAggregates(
		userId: string,
		start: Date,
		end: Date,
		categories?: string[],
	): Promise<MonthlyAggregate[]> {
		// Busca receitas mensais
		const incomeRows = await this.db
			.select({
				year: sql<number>`EXTRACT(YEAR FROM ${income.date})::int`,
				month: sql<number>`EXTRACT(MONTH FROM ${income.date})::int`,
				total: sum(income.amount),
			})
			.from(income)
			.where(
				and(
					eq(income.userId, userId),
					gte(income.date, start),
					lt(income.date, end),
				),
			)
			.groupBy(
				sql`EXTRACT(YEAR FROM ${income.date})`,
				sql`EXTRACT(MONTH FROM ${income.date})`,
			)
			.orderBy(
				sql`EXTRACT(YEAR FROM ${income.date})`,
				sql`EXTRACT(MONTH FROM ${income.date})`,
			);

		// Busca despesas mensais (com filtro de categorias opcional)
		const expenseConditions = [
			eq(expenses.userId, userId),
			gte(expenses.date, start),
			lt(expenses.date, end),
			...(categories && categories.length > 0
				? [
						sql`${expenses.category} = ANY(${sql.raw(`ARRAY[${categories.map((c) => `'${c}'`).join(",")}]`)})`,
					]
				: []),
		];

		const expenseRows = await this.db
			.select({
				year: sql<number>`EXTRACT(YEAR FROM ${expenses.date})::int`,
				month: sql<number>`EXTRACT(MONTH FROM ${expenses.date})::int`,
				total: sum(expenses.amount),
			})
			.from(expenses)
			.where(and(...expenseConditions))
			.groupBy(
				sql`EXTRACT(YEAR FROM ${expenses.date})`,
				sql`EXTRACT(MONTH FROM ${expenses.date})`,
			)
			.orderBy(
				sql`EXTRACT(YEAR FROM ${expenses.date})`,
				sql`EXTRACT(MONTH FROM ${expenses.date})`,
			);

		// Combina resultados
		const map = new Map<string, MonthlyAggregate>();

		for (const r of incomeRows) {
			const key = `${r.year}-${r.month}`;
			map.set(key, {
				year: r.year,
				month: r.month,
				totalIncome: Number(r.total ?? 0),
				totalExpenses: 0,
			});
		}

		for (const r of expenseRows) {
			const key = `${r.year}-${r.month}`;
			const existing = map.get(key);
			if (existing) {
				existing.totalExpenses = Number(r.total ?? 0);
			} else {
				map.set(key, {
					year: r.year,
					month: r.month,
					totalIncome: 0,
					totalExpenses: Number(r.total ?? 0),
				});
			}
		}

		return Array.from(map.values()).sort((a, b) =>
			a.year !== b.year ? a.year - b.year : a.month - b.month,
		);
	}

	async getExpensesByCategory(
		userId: string,
		start: Date,
		end: Date,
		categories?: string[],
	): Promise<ReportCategoryRow[]> {
		const conditions = [
			eq(expenses.userId, userId),
			gte(expenses.date, start),
			lt(expenses.date, end),
			...(categories && categories.length > 0
				? [
						sql`${expenses.category} = ANY(${sql.raw(`ARRAY[${categories.map((c) => `'${c}'`).join(",")}]`)})`,
					]
				: []),
		];

		const rows = await this.db
			.select({ category: expenses.category, total: sum(expenses.amount) })
			.from(expenses)
			.where(and(...conditions))
			.groupBy(expenses.category)
			.orderBy(desc(sum(expenses.amount)));

		return rows.map((r) => ({
			category: r.category,
			total: Number(r.total ?? 0),
		}));
	}
}
