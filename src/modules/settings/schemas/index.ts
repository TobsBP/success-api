import { type Static, Type } from "@sinclair/typebox";

export const SettingsResponseSchema = Type.Object({
	profile: Type.Object({
		fullName: Type.String(),
		birthDate: Type.Optional(Type.String()),
		email: Type.String(),
		avatarUrl: Type.Optional(Type.String()),
	}),
	security: Type.Object({
		twoFactor: Type.Object({
			enabled: Type.Boolean(),
			method: Type.Optional(Type.String()),
		}),
		passwordLastChanged: Type.String(),
	}),
	preferences: Type.Object({
		theme: Type.Union([
			Type.Literal("dark"),
			Type.Literal("light"),
			Type.Literal("system"),
		]),
		currency: Type.Union([
			Type.Literal("BRL"),
			Type.Literal("USD"),
			Type.Literal("EUR"),
		]),
	}),
	notifications: Type.Object({
		weeklyDigest: Type.Boolean(),
		dueDateAlerts: Type.Boolean(),
		goalsAchieved: Type.Boolean(),
	}),
	appInfo: Type.Object({
		version: Type.String(),
		build: Type.String(),
	}),
});

export const UpdateProfileBodySchema = Type.Partial(
	Type.Object({
		fullName: Type.String(),
		birthDate: Type.String(),
		avatarUrl: Type.String(),
	}),
);

export const UpdatePreferencesBodySchema = Type.Partial(
	Type.Object({
		theme: Type.Union([
			Type.Literal("dark"),
			Type.Literal("light"),
			Type.Literal("system"),
		]),
		currency: Type.Union([
			Type.Literal("BRL"),
			Type.Literal("USD"),
			Type.Literal("EUR"),
		]),
	}),
);

export const UpdateNotificationsBodySchema = Type.Partial(
	Type.Object({
		weeklyDigest: Type.Boolean(),
		dueDateAlerts: Type.Boolean(),
		goalsAchieved: Type.Boolean(),
	}),
);

export const UpdateTwoFactorBodySchema = Type.Object({
	enabled: Type.Boolean(),
	method: Type.Optional(Type.String()),
});

export const ChangePasswordBodySchema = Type.Object({
	currentPassword: Type.String(),
	newPassword: Type.String(),
});

export type SettingsResponseDto = Static<typeof SettingsResponseSchema>;
export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;
export type UpdatePreferencesBody = Static<typeof UpdatePreferencesBodySchema>;
export type UpdateNotificationsBody = Static<
	typeof UpdateNotificationsBodySchema
>;
export type UpdateTwoFactorBody = Static<typeof UpdateTwoFactorBodySchema>;
export type ChangePasswordBody = Static<typeof ChangePasswordBodySchema>;
