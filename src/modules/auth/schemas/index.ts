import { type Static, Type } from "@sinclair/typebox";

export const LoginBodySchema = Type.Object({
	email: Type.String({ format: "email" }),
	password: Type.String({ minLength: 6 }),
});

export const UserProfileSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	email: Type.String(),
	avatarUrl: Type.Optional(Type.String()),
});

export const LoginResponseSchema = Type.Object({
	user: UserProfileSchema,
	token: Type.String(),
	expiresAt: Type.String({ format: "date-time" }),
});

export type LoginBody = Static<typeof LoginBodySchema>;
export type UserProfileDto = Static<typeof UserProfileSchema>;
export type LoginResponseDto = Static<typeof LoginResponseSchema>;
