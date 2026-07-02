import {
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const expenses = pgTable("expenses", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	date: timestamp("date").notNull(),
	description: varchar("description", { length: 255 }).notNull(),
	category: varchar("category", { length: 100 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 20 })
		.notNull()
		.default("debit"),
	amount: numeric("amount").notNull(),
	// Data em que a despesa efetivamente pesa no fluxo de caixa: para compras no
	// crédito é o vencimento da fatura; para os demais meios é a própria `date`.
	// Todo bucketização por mês (overview/reports/despesas) usa esta coluna.
	billingDate: timestamp("billing_date").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const expensesLimit = pgTable("expenses_limit", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull().unique(),
	limitAmount: integer("limit_amount").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseLimit = typeof expensesLimit.$inferSelect;
