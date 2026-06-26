import Fastify, { type FastifyInstance } from "fastify";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { SettingsController } from "@/modules/settings/controllers/settings.controller.js";
import type { ISettingsService } from "@/modules/settings/interfaces/settings.service.interface.js";

const mockSettingsResponse = {
	profile: {
		fullName: "João Silva",
		birthDate: "1990-05-15",
		email: "joao@example.com",
		avatarUrl: undefined,
	},
	security: {
		twoFactor: { enabled: false, method: undefined },
		passwordLastChanged: "2024-01-01",
	},
	preferences: { theme: "dark" as const, currency: "BRL" as const },
	notifications: {
		weeklyDigest: true,
		dueDateAlerts: true,
		goalsAchieved: false,
	},
	appInfo: { version: "1.0.0", build: "1" },
};

describe("Settings Routes", () => {
	let fastify: FastifyInstance;
	let mockService: {
		getSettings: Mock;
		updateProfile: Mock;
		updatePreferences: Mock;
		updateNotifications: Mock;
		updateTwoFactor: Mock;
		changePassword: Mock;
	};

	beforeEach(async () => {
		fastify = Fastify();
		mockService = {
			getSettings: vi.fn(),
			updateProfile: vi.fn(),
			updatePreferences: vi.fn(),
			updateNotifications: vi.fn(),
			updateTwoFactor: vi.fn(),
			changePassword: vi.fn(),
		};

		const controller = new SettingsController({
			settingsService: mockService as unknown as ISettingsService,
		});

		// Simula authUser no request
		fastify.addHook("onRequest", async (request) => {
			request.authUser = {
				id: "user-1",
				name: "João",
				email: "joao@example.com",
			};
		});

		fastify.get("/settings", controller.getSettings);
		fastify.patch("/settings/profile", controller.updateProfile);
		fastify.patch("/settings/preferences", controller.updatePreferences);
		fastify.patch("/settings/notifications", controller.updateNotifications);
		fastify.patch("/settings/security/two-factor", controller.updateTwoFactor);
		fastify.post(
			"/settings/security/change-password",
			controller.changePassword,
		);

		await fastify.ready();
	});

	afterEach(async () => {
		await fastify.close();
	});

	it("GET /settings deve retornar as configurações do usuário", async () => {
		mockService.getSettings.mockResolvedValue(mockSettingsResponse);

		const response = await fastify.inject({ method: "GET", url: "/settings" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(mockSettingsResponse);
		expect(mockService.getSettings).toHaveBeenCalledWith(
			"user-1",
			"joao@example.com",
		);
	});

	it("PATCH /settings/profile deve retornar 204", async () => {
		mockService.updateProfile.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/settings/profile",
			payload: { fullName: "Novo Nome" },
		});

		expect(response.statusCode).toBe(204);
		expect(mockService.updateProfile).toHaveBeenCalledWith("user-1", {
			fullName: "Novo Nome",
		});
	});

	it("PATCH /settings/preferences deve retornar 204", async () => {
		mockService.updatePreferences.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/settings/preferences",
			payload: { theme: "dark" },
		});

		expect(response.statusCode).toBe(204);
	});

	it("PATCH /settings/notifications deve retornar 204", async () => {
		mockService.updateNotifications.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/settings/notifications",
			payload: { weeklyDigest: false },
		});

		expect(response.statusCode).toBe(204);
	});

	it("PATCH /settings/security/two-factor deve retornar 204", async () => {
		mockService.updateTwoFactor.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "PATCH",
			url: "/settings/security/two-factor",
			payload: { enabled: true, method: "totp" },
		});

		expect(response.statusCode).toBe(204);
	});

	it("POST /settings/security/change-password deve retornar 200", async () => {
		mockService.changePassword.mockResolvedValue(undefined);

		const response = await fastify.inject({
			method: "POST",
			url: "/settings/security/change-password",
			payload: { currentPassword: "old123", newPassword: "new456" },
		});

		expect(response.statusCode).toBe(200);
		expect(mockService.changePassword).toHaveBeenCalledWith(
			"joao@example.com",
			{
				currentPassword: "old123",
				newPassword: "new456",
			},
		);
	});
});
