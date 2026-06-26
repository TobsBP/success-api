import { type Static, Type } from "@sinclair/typebox";
import { UuidSchema } from "@/shared/schemas/common.js";

export const CategoryTypeSchema = Type.Union([
	Type.Literal("income"),
	Type.Literal("expense"),
	Type.Literal("both"),
]);

export const CategorySchema = Type.Object({
	id: UuidSchema,
	name: Type.String(),
	type: CategoryTypeSchema,
	color: Type.Optional(Type.String()),
	createdAt: Type.String({ format: "date-time" }),
	updatedAt: Type.String({ format: "date-time" }),
});

export const CreateCategoryBodySchema = Type.Object({
	name: Type.String({ minLength: 1, maxLength: 100 }),
	type: Type.Optional(CategoryTypeSchema),
	color: Type.Optional(Type.String({ maxLength: 20 })),
});

export const UpdateCategoryBodySchema = Type.Partial(CreateCategoryBodySchema);

export const CategoryParamsSchema = Type.Object({ id: UuidSchema });

export const CategoryListQuerySchema = Type.Object({
	type: Type.Optional(CategoryTypeSchema),
});

export type CategoryDto = Static<typeof CategorySchema>;
export type CreateCategoryBody = Static<typeof CreateCategoryBodySchema>;
export type UpdateCategoryBody = Static<typeof UpdateCategoryBodySchema>;
export type CategoryParams = Static<typeof CategoryParamsSchema>;
export type CategoryListQuery = Static<typeof CategoryListQuerySchema>;
