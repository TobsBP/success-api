import {
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const goalPriorityEnum = pgEnum("goal_priority", [
	"high",
	"medium",
	"low",
]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed"]);

export const goals = pgTable("goals", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: varchar("description", { length: 500 }),
	priority: goalPriorityEnum("priority").notNull().default("medium"),
	status: goalStatusEnum("status").notNull().default("active"),
	currentAmount: integer("current_amount").notNull().default(0),
	targetAmount: integer("target_amount").notNull(),
	icon: varchar("icon", { length: 50 }).notNull().default("shield"),
	color: varchar("color", { length: 50 }).notNull().default("primary"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
