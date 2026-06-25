import {
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const investmentAssets = pgTable("investment_assets", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	assetClass: varchar("asset_class", { length: 100 }).notNull(),
	subtitle: varchar("subtitle", { length: 255 }),
	currentBalance: numeric("current_balance").notNull(),
	totalInvested: numeric("total_invested"),
	averagePrice: numeric("average_price"),
	monthlyYieldAmount: numeric("monthly_yield_amount").notNull().default("0"),
	monthlyYieldPercent: numeric("monthly_yield_percent").notNull().default("0"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type InvestmentAsset = typeof investmentAssets.$inferSelect;
export type NewInvestmentAsset = typeof investmentAssets.$inferInsert;
