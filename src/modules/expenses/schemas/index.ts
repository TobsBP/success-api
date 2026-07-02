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

export const PaymentMethodSchema = Type.Union([
	Type.Literal("credit"),
	Type.Literal("debit"),
	Type.Literal("pix"),
	Type.Literal("cash"),
	Type.Literal("boleto"),
]);

export const ExpenseEntrySchema = Type.Object({
	id: UuidSchema,
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	paymentMethod: Type.Optional(PaymentMethodSchema),
	amount: Type.Number(),
	// Data em que a despesa pesa no fluxo de caixa (vencimento da fatura para
	// crédito; igual a `date` nos demais meios).
	billingDate: Type.String({ format: "date" }),
	createdAt: Type.String({ format: "date-time" }),
	updatedAt: Type.String({ format: "date-time" }),
});

export const ExpenseListResponseSchema = Type.Array(ExpenseEntrySchema);

export const CreateExpenseBodySchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	// Meio de pagamento da compra (crédito/NuBank, débito, pix, dinheiro, boleto).
	// Independente da categoria.
	paymentMethod: Type.Optional(PaymentMethodSchema),
	amount: Type.Number(),
	// Quantos meses futuros replicar a despesa com o valor cheio (ex.: 2 gera a
	// despesa do mês seguinte e do subsequente). Útil para assinaturas. Vale para
	// qualquer categoria.
	recurringMonths: Type.Optional(Type.Integer({ minimum: 0, maximum: 12 })),
	// Divide `amount` (valor total) em N parcelas mensais, uma despesa por mês a
	// partir de `date`. Útil para compras parceladas no crédito. Vale para
	// qualquer categoria.
	installments: Type.Optional(Type.Integer({ minimum: 1, maximum: 48 })),
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

export type PaymentMethod = Static<typeof PaymentMethodSchema>;
export type ExpenseEntryDto = Static<typeof ExpenseEntrySchema>;
export type CreateExpenseBody = Static<typeof CreateExpenseBodySchema>;
export type UpdateExpenseBody = Static<typeof UpdateExpenseBodySchema>;
export type ExpenseParams = Static<typeof ExpenseParamsSchema>;
export type MonthQuery = Static<typeof MonthQuerySchema>;
export type LimitBody = Static<typeof LimitBodySchema>;
export type ExpensesResponseDto = Static<typeof ExpensesResponseSchema>;
