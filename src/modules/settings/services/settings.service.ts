import { getAuth } from "firebase-admin/auth";
import { env } from "@/core/config/env.js";
import { AppError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { ISettingsRepository } from "@/modules/settings/interfaces/settings.repository.interface.js";
import type { ISettingsService } from "@/modules/settings/interfaces/settings.service.interface.js";
import type {
	ChangePasswordBody,
	SettingsResponseDto,
	UpdateNotificationsBody,
	UpdatePreferencesBody,
	UpdateProfileBody,
	UpdateTwoFactorBody,
} from "@/modules/settings/schemas/index.js";

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `settings:${userId}`;

export class SettingsService implements ISettingsService {
	private repo: ISettingsRepository;
	private cache: CacheService;

	constructor({
		settingsRepository,
		cache,
	}: {
		settingsRepository: ISettingsRepository;
		cache: CacheService;
	}) {
		this.repo = settingsRepository;
		this.cache = cache;
	}

	async getSettings(
		userId: string,
		email: string,
	): Promise<SettingsResponseDto> {
		const cached = await this.cache.get<SettingsResponseDto>(cacheKey(userId));
		if (cached) return { ...cached, profile: { ...cached.profile, email } };

		// Cria registro com valores padrão caso não exista
		const row = await this.repo.upsert(userId, {});

		const result: SettingsResponseDto = {
			profile: {
				fullName: row.fullName,
				birthDate: row.birthDate ?? undefined,
				email,
				avatarUrl: row.avatarUrl ?? undefined,
			},
			security: {
				twoFactor: {
					enabled: row.twoFactorEnabled,
					method: row.twoFactorMethod ?? undefined,
				},
				passwordLastChanged: row.passwordLastChanged,
			},
			preferences: {
				theme: row.theme,
				currency: row.currency,
			},
			notifications: {
				weeklyDigest: row.weeklyDigest,
				dueDateAlerts: row.dueDateAlerts,
				goalsAchieved: row.goalsAchieved,
			},
			appInfo: {
				version: "1.0.0",
				build: "1",
			},
		};

		await this.cache.set(cacheKey(userId), result, CACHE_TTL_SECONDS);
		return result;
	}

	async updateProfile(userId: string, data: UpdateProfileBody): Promise<void> {
		await this.repo.upsert(userId, {
			...(data.fullName !== undefined && { fullName: data.fullName }),
			...(data.birthDate !== undefined && { birthDate: data.birthDate }),
			...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
		});
		await this.cache.del(cacheKey(userId));
	}

	async updatePreferences(
		userId: string,
		data: UpdatePreferencesBody,
	): Promise<void> {
		await this.repo.upsert(userId, {
			...(data.theme !== undefined && { theme: data.theme }),
			...(data.currency !== undefined && { currency: data.currency }),
		});
		await this.cache.del(cacheKey(userId));
	}

	async updateNotifications(
		userId: string,
		data: UpdateNotificationsBody,
	): Promise<void> {
		await this.repo.upsert(userId, {
			...(data.weeklyDigest !== undefined && {
				weeklyDigest: data.weeklyDigest,
			}),
			...(data.dueDateAlerts !== undefined && {
				dueDateAlerts: data.dueDateAlerts,
			}),
			...(data.goalsAchieved !== undefined && {
				goalsAchieved: data.goalsAchieved,
			}),
		});
		await this.cache.del(cacheKey(userId));
	}

	async updateTwoFactor(
		userId: string,
		data: UpdateTwoFactorBody,
	): Promise<void> {
		await this.repo.upsert(userId, {
			twoFactorEnabled: data.enabled,
			...(data.method !== undefined && { twoFactorMethod: data.method }),
		});
		await this.cache.del(cacheKey(userId));
	}

	async changePassword(email: string, data: ChangePasswordBody): Promise<void> {
		// Verifica a senha atual via Firebase REST API
		const verifyRes = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password: data.currentPassword,
					returnSecureToken: false,
				}),
			},
		);

		if (!verifyRes.ok) {
			throw new AppError(
				"Current password is incorrect",
				400,
				"INVALID_PASSWORD",
			);
		}

		// Atualiza a senha via Firebase Admin
		const userRecord = await getAuth().getUserByEmail(email);
		await getAuth().updateUser(userRecord.uid, { password: data.newPassword });

		// Registra a data de alteração da senha
		await getAuth()
			.getUserByEmail(email)
			.then(async (u) => {
				// Busca o userId pelo uid do Firebase
				// O userId armazenado no banco é o firebase uid
				await this.repo.upsert(u.uid, {
					passwordLastChanged: new Date().toISOString().slice(0, 10),
				});
				await this.cache.del(cacheKey(u.uid));
			});
	}
}
