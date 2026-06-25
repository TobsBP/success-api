import {
	integer,
	jsonb,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const projectionAssumptions = pgTable("projection_assumptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull().unique(),
	plannedMonthlyContribution: integer("planned_monthly_contribution")
		.notNull()
		.default(0),
	estimatedAnnualRatePercent: numeric("estimated_annual_rate_percent", {
		precision: 5,
		scale: 2,
	})
		.notNull()
		.default("8.5"),
	inflationPercent: numeric("inflation_percent", { precision: 5, scale: 2 })
		.notNull()
		.default("4.5"),
	contributionGrowthPercent: numeric("contribution_growth_percent", {
		precision: 5,
		scale: 2,
	})
		.notNull()
		.default("5.5"),
	returnsByClass: jsonb("returns_by_class").notNull().default("[]"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProjectionAssumptions = typeof projectionAssumptions.$inferSelect;
export type NewProjectionAssumptions =
	typeof projectionAssumptions.$inferInsert;
