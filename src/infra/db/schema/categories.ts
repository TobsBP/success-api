import {
	pgEnum,
	pgTable,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const categoryTypeEnum = pgEnum("category_type", [
	"income",
	"expense",
	"both",
]);

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: varchar("user_id", { length: 128 }).notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		type: categoryTypeEnum("type").notNull().default("both"),
		color: varchar("color", { length: 20 }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [unique("categories_user_name_unique").on(t.userId, t.name)],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
