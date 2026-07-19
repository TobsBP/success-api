import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const ChatBodySchema = Type.Object({
	message: Type.String({ minLength: 1 }),
});

export const ExpenseDraftDataSchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	amount: Type.Number(),
});

export const DraftSchema = Type.Object({
	id: UuidSchema,
	action: Type.Literal("create_expense"),
	data: ExpenseDraftDataSchema,
});

export const ChatResponseSchema = Type.Object({
	reply: Type.String(),
	draft: Type.Optional(DraftSchema),
});

export const ConfirmBodySchema = Type.Object({
	draftId: UuidSchema,
});

export type ChatBody = Static<typeof ChatBodySchema>;
export type ExpenseDraftData = Static<typeof ExpenseDraftDataSchema>;
export type Draft = Static<typeof DraftSchema>;
export type ChatResponseDto = Static<typeof ChatResponseSchema>;
export type ConfirmBody = Static<typeof ConfirmBodySchema>;
