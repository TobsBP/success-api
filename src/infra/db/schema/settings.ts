import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const themeEnum = pgEnum("theme", ["dark", "light", "system"]);
export const currencyEnum = pgEnum("currency", ["BRL", "USD", "EUR"]);

export const userSettings = pgTable("user_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: varchar("user_id", { length: 128 }).notNull().unique(),
	fullName: varchar("full_name", { length: 255 }).notNull().default(""),
	birthDate: varchar("birth_date", { length: 20 }),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	theme: themeEnum("theme").notNull().default("system"),
	currency: currencyEnum("currency").notNull().default("BRL"),
	weeklyDigest: boolean("weekly_digest").notNull().default(true),
	dueDateAlerts: boolean("due_date_alerts").notNull().default(true),
	goalsAchieved: boolean("goals_achieved").notNull().default(false),
	twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
	twoFactorMethod: varchar("two_factor_method", { length: 50 }),
	// Cartão de crédito: dia de fechamento e de vencimento da fatura (1-31).
	// Usados para calcular em qual fatura cai uma compra no crédito.
	cardClosingDay: integer("card_closing_day"),
	cardDueDay: integer("card_due_day"),
	passwordLastChanged: varchar("password_last_changed", { length: 50 })
		.notNull()
		.default(""),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
