import { type Static, Type } from "@sinclair/typebox";

export const ReturnsByClassSchema = Type.Array(
	Type.Object({
		assetClass: Type.String(),
		annualRatePercent: Type.Number(),
	}),
);

export const AssumptionsSchema = Type.Object({
	inflationPercent: Type.Number(),
	contributionGrowthPercent: Type.Number(),
	returnsByClass: ReturnsByClassSchema,
});

export const UpdateAssumptionsBodySchema = Type.Object({
	plannedMonthlyContribution: Type.Integer(),
	estimatedAnnualRatePercent: Type.Number(),
	inflationPercent: Type.Number(),
	contributionGrowthPercent: Type.Number(),
	returnsByClass: ReturnsByClassSchema,
});

export const TimeframeQuerySchema = Type.Object({
	timeframe: Type.Optional(Type.String()),
});

export const ScenarioPointSchema = Type.Object({
	label: Type.String(),
	value: Type.Number(),
});

export const ScenarioSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	type: Type.Union([
		Type.Literal("base"),
		Type.Literal("conservative"),
		Type.Literal("aggressive"),
	]),
	points: Type.Array(ScenarioPointSchema),
});

export const ProjectionsResponseSchema = Type.Object({
	summary: Type.Object({
		initialNetWorth: Type.Number(),
		plannedMonthlyContribution: Type.Integer(),
		estimatedAnnualRatePercent: Type.Number(),
		projectionIn10Years: Type.Number(),
	}),
	timeframe: Type.Integer(),
	scenarios: Type.Array(ScenarioSchema),
	assumptions: AssumptionsSchema,
	compositionAtHorizon: Type.Object({
		total: Type.Number(),
		items: Type.Array(
			Type.Object({
				assetClass: Type.String(),
				amount: Type.Number(),
				percent: Type.Number(),
			}),
		),
	}),
});

export type UpdateAssumptionsBody = Static<typeof UpdateAssumptionsBodySchema>;
export type ProjectionsResponseDto = Static<typeof ProjectionsResponseSchema>;
