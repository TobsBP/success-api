import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const ChatBodySchema = Type.Object({
	message: Type.String({ minLength: 1 }),
});

const GoalPrioritySchema = Type.Union([
	Type.Literal("high"),
	Type.Literal("medium"),
	Type.Literal("low"),
]);

const PaymentMethodSchema = Type.Union([
	Type.Literal("credit"),
	Type.Literal("debit"),
	Type.Literal("pix"),
	Type.Literal("cash"),
	Type.Literal("boleto"),
]);

export const ExpenseDraftDataSchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	amount: Type.Number(),
	paymentMethod: Type.Optional(PaymentMethodSchema),
	// Parcelamento no crédito: divide `amount` em N parcelas mensais.
	installments: Type.Optional(Type.Integer({ minimum: 1, maximum: 48 })),
	// Assinatura/recorrência: replica a despesa (valor cheio) nos N meses seguintes.
	recurringMonths: Type.Optional(Type.Integer({ minimum: 0, maximum: 12 })),
});

export const IncomeDraftDataSchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	amount: Type.Integer(),
});

export const RemoveIncomeDraftDataSchema = Type.Object({
	incomeId: UuidSchema,
	description: Type.String(),
});

export const CreateGoalDraftDataSchema = Type.Object({
	name: Type.String(),
	description: Type.Optional(Type.String()),
	priority: GoalPrioritySchema,
	targetAmount: Type.Integer(),
	currentAmount: Type.Integer(),
	icon: Type.String(),
	color: Type.String(),
});

export const EditGoalDraftDataSchema = Type.Object({
	goalId: UuidSchema,
	goalName: Type.String(),
	changes: Type.Partial(
		Type.Object({
			name: Type.String(),
			description: Type.String(),
			priority: GoalPrioritySchema,
			targetAmount: Type.Integer(),
			currentAmount: Type.Integer(),
			icon: Type.String(),
			color: Type.String(),
		}),
	),
});

export const RemoveGoalDraftDataSchema = Type.Object({
	goalId: UuidSchema,
	goalName: Type.String(),
});

export const DepositGoalDraftDataSchema = Type.Object({
	goalId: UuidSchema,
	goalName: Type.String(),
	amount: Type.Integer({ minimum: 1 }),
});

export const DraftSchema = Type.Union([
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("create_expense"),
		data: ExpenseDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("create_income"),
		data: IncomeDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("remove_income"),
		data: RemoveIncomeDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("create_goal"),
		data: CreateGoalDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("edit_goal"),
		data: EditGoalDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("remove_goal"),
		data: RemoveGoalDraftDataSchema,
	}),
	Type.Object({
		id: UuidSchema,
		action: Type.Literal("deposit_goal"),
		data: DepositGoalDraftDataSchema,
	}),
]);

export const ChatResponseSchema = Type.Object({
	reply: Type.String(),
	draft: Type.Optional(DraftSchema),
});

export const ConfirmBodySchema = Type.Object({
	draftId: UuidSchema,
});

export const ConfirmResponseSchema = Type.Object({
	action: Type.String(),
	result: Type.Any(),
});

export type ChatBody = Static<typeof ChatBodySchema>;
export type ExpenseDraftData = Static<typeof ExpenseDraftDataSchema>;
export type IncomeDraftData = Static<typeof IncomeDraftDataSchema>;
export type RemoveIncomeDraftData = Static<typeof RemoveIncomeDraftDataSchema>;
export type CreateGoalDraftData = Static<typeof CreateGoalDraftDataSchema>;
export type EditGoalDraftData = Static<typeof EditGoalDraftDataSchema>;
export type RemoveGoalDraftData = Static<typeof RemoveGoalDraftDataSchema>;
export type DepositGoalDraftData = Static<typeof DepositGoalDraftDataSchema>;
export type Draft = Static<typeof DraftSchema>;
export type ChatResponseDto = Static<typeof ChatResponseSchema>;
export type ConfirmBody = Static<typeof ConfirmBodySchema>;
export type ConfirmResponseDto = Static<typeof ConfirmResponseSchema>;
