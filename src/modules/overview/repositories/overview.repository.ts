import { and, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import {
	expenses,
	goals,
	income,
	investmentAssets,
} from "@/infra/db/schema/index.js";

export interface MonthTotals {
	totalIncome: number;
	totalExpenses: number;
}

export interface MonthlyTotals {
	month: string;
	totalIncome: number;
	totalExpenses: number;
}

export interface CategoryTotal {
	category: string;
	total: number;
}

export interface SourceTotal {
	source: string;
	total: number;
}

export interface GoalRow {
	id: string;
	name: string;
	currentAmount: number;
	targetAmount: number;
	indicatorClassName: string;
	iconClassName: string;
}

export interface InvestmentRow {
	name: string;
	indexLabel: string;
	balance: number;
	monthlyYieldAmount: number;
	monthlyYieldPercent: number;
}

export interface LargestExpenseRow {
	amount: number;
	category: string;
}

export class OverviewRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async getMonthTotals(
		userId: string,
		start: Date,
		end: Date,
	): Promise<MonthTotals> {
		const [incomeRow] = await this.db
			.select({ total: sum(income.amount) })
			.from(income)
			.where(
				and(
					eq(income.userId, userId),
					eq(income.status, "received"),
					gte(income.date, start),
					lt(income.date, end),
				),
			);

		const [expenseRow] = await this.db
			.select({ total: sum(expenses.amount) })
			.from(expenses)
			.where(
				and(
					eq(expenses.userId, userId),
					gte(expenses.date, start),
					lt(expenses.date, end),
				),
			);

		return {
			totalIncome: Number(incomeRow?.total ?? 0),
			totalExpenses: Number(expenseRow?.total ?? 0),
		};
	}

	async getMonthlyTotalsByMonth(
		userId: string,
		start: Date,
		end: Date,
	): Promise<MonthlyTotals[]> {
		const incomeMonth = sql<string>`to_char(${income.date}, 'YYYY-MM')`;
		const expenseMonth = sql<string>`to_char(${expenses.date}, 'YYYY-MM')`;

		const [incomeRows, expenseRows] = await Promise.all([
			this.db
				.select({ month: incomeMonth, total: sum(income.amount) })
				.from(income)
				.where(
					and(
						eq(income.userId, userId),
						eq(income.status, "received"),
						gte(income.date, start),
						lt(income.date, end),
					),
				)
				.groupBy(incomeMonth),
			this.db
				.select({ month: expenseMonth, total: sum(expenses.amount) })
				.from(expenses)
				.where(
					and(
						eq(expenses.userId, userId),
						gte(expenses.date, start),
						lt(expenses.date, end),
					),
				)
				.groupBy(expenseMonth),
		]);

		const totals = new Map<string, MonthlyTotals>();
		for (const row of incomeRows) {
			totals.set(row.month, {
				month: row.month,
				totalIncome: Number(row.total ?? 0),
				totalExpenses: 0,
			});
		}
		for (const row of expenseRows) {
			const current = totals.get(row.month);
			totals.set(row.month, {
				month: row.month,
				totalIncome: current?.totalIncome ?? 0,
				totalExpenses: Number(row.total ?? 0),
			});
		}

		return [...totals.values()].sort((a, b) => a.month.localeCompare(b.month));
	}

	async getExpensesByCategory(
		userId: string,
		start: Date,
		end: Date,
	): Promise<CategoryTotal[]> {
		const rows = await this.db
			.select({
				category: expenses.category,
				total: sum(expenses.amount),
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.userId, userId),
					gte(expenses.date, start),
					lt(expenses.date, end),
				),
			)
			.groupBy(expenses.category)
			.orderBy(desc(sum(expenses.amount)));

		return rows.map((r) => ({
			category: r.category,
			total: Number(r.total ?? 0),
		}));
	}

	async getIncomeBySource(
		userId: string,
		start: Date,
		end: Date,
	): Promise<SourceTotal[]> {
		const rows = await this.db
			.select({
				source: income.category,
				total: sum(income.amount),
			})
			.from(income)
			.where(
				and(
					eq(income.userId, userId),
					eq(income.status, "received"),
					gte(income.date, start),
					lt(income.date, end),
				),
			)
			.groupBy(income.category)
			.orderBy(desc(sum(income.amount)));

		return rows.map((r) => ({ source: r.source, total: Number(r.total ?? 0) }));
	}

	async getActiveGoals(userId: string): Promise<GoalRow[]> {
		const rows = await this.db
			.select({
				id: goals.id,
				name: goals.name,
				currentAmount: goals.currentAmount,
				targetAmount: goals.targetAmount,
				indicatorClassName: goals.color,
				iconClassName: goals.icon,
			})
			.from(goals)
			.where(and(eq(goals.userId, userId), eq(goals.status, "active")));

		return rows.map((r) => ({
			id: r.id,
			name: r.name,
			currentAmount: r.currentAmount,
			targetAmount: r.targetAmount,
			indicatorClassName: r.indicatorClassName,
			iconClassName: r.iconClassName,
		}));
	}

	async getTopInvestment(userId: string): Promise<InvestmentRow | null> {
		const [row] = await this.db
			.select({
				name: investmentAssets.name,
				indexLabel: investmentAssets.subtitle,
				balance: investmentAssets.currentBalance,
				monthlyYieldAmount: investmentAssets.monthlyYieldAmount,
				monthlyYieldPercent: investmentAssets.monthlyYieldPercent,
			})
			.from(investmentAssets)
			.where(eq(investmentAssets.userId, userId))
			.orderBy(desc(investmentAssets.currentBalance))
			.limit(1);

		if (!row) return null;
		return {
			name: row.name,
			indexLabel: row.indexLabel ?? "—",
			balance: Number(row.balance),
			monthlyYieldAmount: Number(row.monthlyYieldAmount),
			monthlyYieldPercent: Number(row.monthlyYieldPercent),
		};
	}

	async getLargestExpense(
		userId: string,
		start: Date,
		end: Date,
	): Promise<LargestExpenseRow | null> {
		const [row] = await this.db
			.select({ amount: expenses.amount, category: expenses.category })
			.from(expenses)
			.where(
				and(
					eq(expenses.userId, userId),
					gte(expenses.date, start),
					lt(expenses.date, end),
				),
			)
			.orderBy(desc(expenses.amount))
			.limit(1);

		if (!row) return null;
		return { amount: Number(row.amount), category: row.category };
	}

	async getDaysInMonth(start: Date): Promise<number> {
		const year = start.getFullYear();
		const month = start.getMonth(); // 0-indexed
		return new Date(year, month + 1, 0).getDate();
	}
}
