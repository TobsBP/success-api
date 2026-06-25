import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const IncomeStatusSchema = Type.Union([
	Type.Literal("received"),
	Type.Literal("pending"),
]);

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

export const IncomeEntrySchema = Type.Object({
	id: UuidSchema,
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	status: IncomeStatusSchema,
	amount: Type.Integer(),
});

export const CreateIncomeEntryBodySchema = Type.Object({
	date: Type.String({ format: "date" }),
	description: Type.String(),
	category: Type.String(),
	status: Type.Optional(IncomeStatusSchema),
	amount: Type.Integer(),
});

export const UpdateIncomeEntryBodySchema = Type.Partial(
	Type.Object({
		date: Type.String({ format: "date" }),
		description: Type.String(),
		category: Type.String(),
		status: IncomeStatusSchema,
		amount: Type.Integer(),
	}),
);

export const IncomeParamsSchema = Type.Object({
	id: UuidSchema,
});

export const MonthQuerySchema = Type.Object({
	month: Type.Optional(Type.String()),
});

export const IncomeResponseSchema = Type.Object({
	summary: Type.Object({
		totalReceived: Type.Object({
			amount: Type.Integer(),
			delta: DeltaSchema,
		}),
		toReceive: Type.Object({
			amount: Type.Integer(),
			pendingCount: Type.Integer(),
		}),
		topSource: Type.String(),
	}),
	entries: Type.Array(IncomeEntrySchema),
	history: Type.Array(
		Type.Object({
			label: Type.String(),
			value: Type.Integer(),
		}),
	),
	sources: Type.Array(
		Type.Object({
			id: Type.String(),
			name: Type.String(),
			amount: Type.Integer(),
			percent: Type.Integer(),
		}),
	),
});

export type IncomeEntryDto = Static<typeof IncomeEntrySchema>;
export type CreateIncomeEntryBody = Static<typeof CreateIncomeEntryBodySchema>;
export type UpdateIncomeEntryBody = Static<typeof UpdateIncomeEntryBodySchema>;
export type IncomeParams = Static<typeof IncomeParamsSchema>;
export type MonthQuery = Static<typeof MonthQuerySchema>;
export type DeltaDto = Static<typeof DeltaSchema>;
export type IncomeResponseDto = Static<typeof IncomeResponseSchema>;
