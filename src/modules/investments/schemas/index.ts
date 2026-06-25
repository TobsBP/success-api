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

export const AssetSchema = Type.Object({
	id: UuidSchema,
	name: Type.String(),
	assetClass: Type.String(),
	subtitle: Type.Optional(Type.String()),
	currentBalance: Type.Number(),
	weightPercent: Type.Number(),
	monthlyYield: Type.Object({
		amount: Type.Number(),
		percent: Type.Number(),
	}),
	totalInvested: Type.Optional(Type.Number()),
	averagePrice: Type.Optional(Type.Number()),
	createdAt: Type.String({ format: "date-time" }),
	updatedAt: Type.String({ format: "date-time" }),
});

export const CreateAssetBodySchema = Type.Object({
	name: Type.String(),
	assetClass: Type.String(),
	subtitle: Type.Optional(Type.String()),
	currentBalance: Type.Number(),
	totalInvested: Type.Optional(Type.Number()),
	averagePrice: Type.Optional(Type.Number()),
});

export const UpdateAssetBodySchema = Type.Partial(CreateAssetBodySchema);
export const AssetParamsSchema = Type.Object({ id: UuidSchema });
export const RangeQuerySchema = Type.Object({
	range: Type.Optional(Type.String()),
});

export const InvestmentsResponseSchema = Type.Object({
	summary: Type.Object({
		investedNetWorth: Type.Object({
			amount: Type.Number(),
			delta: DeltaSchema,
		}),
		monthlyYield: Type.Object({
			amount: Type.Number(),
			delta: DeltaSchema,
		}),
		yearlyYield: Type.Object({
			amount: Type.Number(),
			returnPercentYtd: Type.Number(),
		}),
	}),
	allocation: Type.Object({
		total: Type.Number(),
		items: Type.Array(
			Type.Object({
				assetClass: Type.String(),
				percent: Type.Number(),
			}),
		),
	}),
	evolution: Type.Array(
		Type.Object({
			label: Type.String(),
			value: Type.Number(),
		}),
	),
	assets: Type.Array(AssetSchema),
});

export type AssetDto = Static<typeof AssetSchema>;
export type CreateAssetBody = Static<typeof CreateAssetBodySchema>;
export type UpdateAssetBody = Static<typeof UpdateAssetBodySchema>;
export type AssetParams = Static<typeof AssetParamsSchema>;
export type RangeQuery = Static<typeof RangeQuerySchema>;
export type InvestmentsResponseDto = Static<typeof InvestmentsResponseSchema>;
