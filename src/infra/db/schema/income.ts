import {
	numeric,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const incomeStatusEnum = pgEnum("income_status", [
	"pending",
	"received",
]);

export const income = pgTable("income", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	date: timestamp("date").notNull(),
	description: varchar("description", { length: 255 }).notNull(),
	category: varchar("category", { length: 255 }).notNull(),
	amount: numeric("amount").notNull(),
	status: incomeStatusEnum("status").notNull().default("pending"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Income = typeof income.$inferSelect;
export type NewIncome = typeof income.$inferInsert;
