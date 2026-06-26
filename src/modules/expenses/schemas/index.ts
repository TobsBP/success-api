import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const DeltaSchema = Type.Object({
	value: Type.Number(),
	unit: Type.Union([
		Type.Literal("percent"),
		Type.Literal("pp"),
		Type.Literal("currency"),
	]),
	direction: Type.Union([
		Type.Literal("up"),
		Type.Literal("down"),
		Type.Literal("neutral"),
	]),
	comparisonLabel: Type.Optional(Type.String()),
});

export const ExpenseEntrySchema = Type.Object({
	id: UuidSchema,
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	amount: Type.Number(),
	createdAt: Type.String({ format: "date-time" }),
	updatedAt: Type.String({ format: "date-time" }),
});

export const CreateExpenseBodySchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	amount: Type.Number(),
});

export const UpdateExpenseBodySchema = Type.Partial(CreateExpenseBodySchema);

export const ExpenseParamsSchema = Type.Object({ id: UuidSchema });
export const MonthQuerySchema = Type.Object({
	month: Type.Optional(Type.String()),
});
export const LimitBodySchema = Type.Object({ limit: Type.Integer() });
export const LimitResponseSchema = Type.Object({ limit: Type.Integer() });

export const ExpensesResponseSchema = Type.Object({
	summary: Type.Object({
		totalSpent: Type.Object({ amount: Type.Number(), delta: DeltaSchema }),
		monthlyLimit: Type.Object({
			limit: Type.Number(),
			spent: Type.Number(),
			remaining: Type.Number(),
			usedPercent: Type.Number(),
		}),
	}),
	byCategory: Type.Object({
		total: Type.Number(),
		items: Type.Array(
			Type.Object({
				category: Type.String(),
				amount: Type.Number(),
				percent: Type.Number(),
			}),
		),
	}),
	recent: Type.Array(
		Type.Object({
			id: UuidSchema,
			description: Type.String(),
			category: Type.String(),
			date: Type.String(),
			amount: Type.Number(),
		}),
	),
});

export type ExpenseEntryDto = Static<typeof ExpenseEntrySchema>;
export type CreateExpenseBody = Static<typeof CreateExpenseBodySchema>;
export type UpdateExpenseBody = Static<typeof UpdateExpenseBodySchema>;
export type ExpenseParams = Static<typeof ExpenseParamsSchema>;
export type MonthQuery = Static<typeof MonthQuerySchema>;
export type LimitBody = Static<typeof LimitBodySchema>;
export type ExpensesResponseDto = Static<typeof ExpensesResponseSchema>;
