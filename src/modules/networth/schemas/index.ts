import { type Static, Type } from "@sinclair/typebox";

export const NetWorthResponseSchema = Type.Object({
	amount: Type.Number(),
	changePercent: Type.Number(),
	changeLabel: Type.String(),
	sparkline: Type.Array(Type.Number()),
	updatedAt: Type.String({ format: "date-time" }),
});

export type NetWorthResponseDto = Static<typeof NetWorthResponseSchema>;
