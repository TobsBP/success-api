import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { SettingsController } from "@/modules/settings/controllers/settings.controller.js";
import {
	ChangePasswordBodySchema,
	SettingsResponseSchema,
	UpdateNotificationsBodySchema,
	UpdatePreferencesBodySchema,
	UpdateProfileBodySchema,
	UpdateTwoFactorBodySchema,
} from "@/modules/settings/schemas/index.js";

export async function settingsRoutes(fastify: FastifyInstance) {
	const controller =
		container.resolve<SettingsController>("settingsController");

	fastify.get(
		"",
		{
			schema: {
				tags: ["settings"],
				summary: "Configurações",
				response: { 200: SettingsResponseSchema },
			},
		},
		controller.getSettings,
	);

	fastify.patch(
		"/profile",
		{
			schema: {
				tags: ["settings"],
				summary: "Atualizar perfil",
				body: UpdateProfileBodySchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.updateProfile,
	);

	fastify.patch(
		"/preferences",
		{
			schema: {
				tags: ["settings"],
				summary: "Atualizar preferências",
				body: UpdatePreferencesBodySchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.updatePreferences,
	);

	fastify.patch(
		"/notifications",
		{
			schema: {
				tags: ["settings"],
				summary: "Atualizar notificações",
				body: UpdateNotificationsBodySchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.updateNotifications,
	);

	fastify.patch(
		"/security/two-factor",
		{
			schema: {
				tags: ["settings"],
				summary: "Configurar 2FA",
				body: UpdateTwoFactorBodySchema,
				response: { 204: { type: "null" } },
			},
		},
		controller.updateTwoFactor,
	);

	fastify.post(
		"/security/change-password",
		{
			schema: {
				tags: ["settings"],
				summary: "Trocar senha",
				body: ChangePasswordBodySchema,
			},
		},
		controller.changePassword,
	);
}
