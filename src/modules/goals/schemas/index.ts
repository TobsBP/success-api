import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const GoalSchema = Type.Object({
	id: UuidSchema,
	name: Type.String(),
	description: Type.Optional(Type.String()),
	priority: Type.Union([
		Type.Literal("high"),
		Type.Literal("medium"),
		Type.Literal("low"),
	]),
	status: Type.Union([Type.Literal("active"), Type.Literal("completed")]),
	currentAmount: Type.Integer(),
	targetAmount: Type.Integer(),
	progressPercent: Type.Number(),
	remaining: Type.Integer(),
	forecastDate: Type.String(),
	icon: Type.String(),
	color: Type.String(),
	createdAt: Type.String({ format: "date-time" }),
	updatedAt: Type.String({ format: "date-time" }),
});

export const CreateGoalBodySchema = Type.Object({
	name: Type.String(),
	description: Type.Optional(Type.String()),
	priority: Type.Union([
		Type.Literal("high"),
		Type.Literal("medium"),
		Type.Literal("low"),
	]),
	targetAmount: Type.Integer(),
	currentAmount: Type.Integer(),
	icon: Type.String(),
	color: Type.String(),
});

export const UpdateGoalBodySchema = Type.Partial(CreateGoalBodySchema);
export const GoalParamsSchema = Type.Object({ id: UuidSchema });
export const DepositBodySchema = Type.Object({
	amount: Type.Integer({ minimum: 1 }),
});

export const GoalsResponseSchema = Type.Object({
	summary: Type.Object({
		activeCount: Type.Integer(),
		completedCount: Type.Integer(),
		totalSaved: Type.Integer(),
	}),
	goals: Type.Array(GoalSchema),
});

export type GoalDto = Static<typeof GoalSchema>;
export type CreateGoalBody = Static<typeof CreateGoalBodySchema>;
export type UpdateGoalBody = Static<typeof UpdateGoalBodySchema>;
export type GoalParams = Static<typeof GoalParamsSchema>;
export type GoalsResponseDto = Static<typeof GoalsResponseSchema>;
export type DepositBody = Static<typeof DepositBodySchema>;
