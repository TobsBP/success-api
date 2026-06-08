import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({ format: "uuid" });

export const PaginationQuerySchema = Type.Object({
	page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
	limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export function PaginatedResponse<T extends ReturnType<typeof Type.Object>>(
	itemSchema: T,
) {
	return Type.Object({
		data: Type.Array(itemSchema),
		meta: Type.Object({
			total: Type.Integer(),
			page: Type.Integer(),
			limit: Type.Integer(),
			totalPages: Type.Integer(),
		}),
	});
}

export const ErrorResponseSchema = Type.Object({
	statusCode: Type.Integer(),
	error: Type.String(),
	message: Type.String(),
	details: Type.Optional(Type.Array(Type.Any())),
});
