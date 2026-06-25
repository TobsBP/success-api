import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { ISettingsRepository } from "@/modules/settings/interfaces/settings.repository.interface.js";
import { SettingsService } from "./settings.service.js";

// Mock do firebase-admin/auth
vi.mock("firebase-admin/auth", () => ({
	getAuth: vi.fn(() => ({
		getUserByEmail: vi.fn().mockResolvedValue({ uid: "firebase-uid" }),
		updateUser: vi.fn().mockResolvedValue(undefined),
	})),
}));

const makeDefaultRow = (overrides = {}) => ({
	id: "uuid-1",
	userId: "user-1",
	fullName: "",
	birthDate: null,
	avatarUrl: null,
	theme: "system" as const,
	currency: "BRL" as const,
	weeklyDigest: true,
	dueDateAlerts: true,
	goalsAchieved: false,
	twoFactorEnabled: false,
	twoFactorMethod: null,
	passwordLastChanged: "",
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

describe("SettingsService", () => {
	let service: SettingsService;
	let mockRepo: {
		findByUserId: Mock;
		upsert: Mock;
	};
	let mockCache: {
		get: Mock;
		set: Mock;
		del: Mock;
	};

	beforeEach(() => {
		mockRepo = {
			findByUserId: vi.fn(),
			upsert: vi.fn(),
		};
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};
		service = new SettingsService({
			settingsRepository: mockRepo as unknown as ISettingsRepository,
			cache: mockCache as unknown as CacheService,
		});
	});

	describe("getSettings", () => {
		it("deve retornar as configurações mapeadas do banco", async () => {
			const row = makeDefaultRow({
				fullName: "João Silva",
				theme: "dark" as const,
			});
			mockRepo.upsert.mockResolvedValue(row);

			const result = await service.getSettings("user-1", "joao@example.com");

			expect(result.profile.fullName).toBe("João Silva");
			expect(result.profile.email).toBe("joao@example.com");
			expect(result.preferences.theme).toBe("dark");
			expect(result.appInfo.version).toBe("1.0.0");
			expect(mockCache.set).toHaveBeenCalled();
		});

		it("deve retornar do cache quando disponível e injetar email atual", async () => {
			const cached = {
				profile: { fullName: "Cached", email: "old@example.com" },
				security: { twoFactor: { enabled: false }, passwordLastChanged: "" },
				preferences: { theme: "system", currency: "BRL" },
				notifications: {
					weeklyDigest: true,
					dueDateAlerts: true,
					goalsAchieved: false,
				},
				appInfo: { version: "1.0.0", build: "1" },
			};
			mockCache.get.mockResolvedValue(cached);

			const result = await service.getSettings("user-1", "new@example.com");

			expect(result.profile.email).toBe("new@example.com");
			expect(mockRepo.upsert).not.toHaveBeenCalled();
		});
	});

	describe("updateProfile", () => {
		it("deve fazer upsert dos campos de perfil e invalidar cache", async () => {
			mockRepo.upsert.mockResolvedValue(
				makeDefaultRow({ fullName: "Novo Nome" }),
			);

			await service.updateProfile("user-1", { fullName: "Novo Nome" });

			expect(mockRepo.upsert).toHaveBeenCalledWith("user-1", {
				fullName: "Novo Nome",
			});
			expect(mockCache.del).toHaveBeenCalledWith("settings:user-1");
		});
	});

	describe("updatePreferences", () => {
		it("deve fazer upsert das preferências e invalidar cache", async () => {
			mockRepo.upsert.mockResolvedValue(
				makeDefaultRow({ theme: "dark" as const }),
			);

			await service.updatePreferences("user-1", { theme: "dark" });

			expect(mockRepo.upsert).toHaveBeenCalledWith("user-1", { theme: "dark" });
			expect(mockCache.del).toHaveBeenCalledWith("settings:user-1");
		});
	});

	describe("updateNotifications", () => {
		it("deve fazer upsert das notificações e invalidar cache", async () => {
			mockRepo.upsert.mockResolvedValue(
				makeDefaultRow({ weeklyDigest: false }),
			);

			await service.updateNotifications("user-1", { weeklyDigest: false });

			expect(mockRepo.upsert).toHaveBeenCalledWith("user-1", {
				weeklyDigest: false,
			});
			expect(mockCache.del).toHaveBeenCalledWith("settings:user-1");
		});
	});

	describe("updateTwoFactor", () => {
		it("deve fazer upsert do 2FA e invalidar cache", async () => {
			mockRepo.upsert.mockResolvedValue(
				makeDefaultRow({ twoFactorEnabled: true }),
			);

			await service.updateTwoFactor("user-1", {
				enabled: true,
				method: "totp",
			});

			expect(mockRepo.upsert).toHaveBeenCalledWith("user-1", {
				twoFactorEnabled: true,
				twoFactorMethod: "totp",
			});
			expect(mockCache.del).toHaveBeenCalledWith("settings:user-1");
		});
	});

	describe("changePassword", () => {
		it("deve lançar AppError se a senha atual estiver incorreta", async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;

			await expect(
				service.changePassword("user@example.com", {
					currentPassword: "wrong",
					newPassword: "new123",
				}),
			).rejects.toThrow("Current password is incorrect");
		});

		it("deve chamar Firebase Admin para atualizar a senha quando a verificação passa", async () => {
			global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;
			mockRepo.upsert.mockResolvedValue(makeDefaultRow());

			const { getAuth } = await import("firebase-admin/auth");
			const mockGetAuth = vi.mocked(getAuth);

			await service.changePassword("user@example.com", {
				currentPassword: "correct",
				newPassword: "newpass123",
			});

			expect(mockGetAuth).toHaveBeenCalled();
		});
	});
});
