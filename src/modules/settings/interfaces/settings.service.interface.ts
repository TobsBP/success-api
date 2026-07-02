import type {
	ChangePasswordBody,
	SettingsResponseDto,
	UpdateCardBody,
	UpdateNotificationsBody,
	UpdatePreferencesBody,
	UpdateProfileBody,
	UpdateTwoFactorBody,
} from "@/modules/settings/schemas/index.js";

export interface ISettingsService {
	getSettings(userId: string, email: string): Promise<SettingsResponseDto>;
	updateProfile(userId: string, data: UpdateProfileBody): Promise<void>;
	updatePreferences(userId: string, data: UpdatePreferencesBody): Promise<void>;
	updateNotifications(
		userId: string,
		data: UpdateNotificationsBody,
	): Promise<void>;
	updateCard(userId: string, data: UpdateCardBody): Promise<void>;
	updateTwoFactor(userId: string, data: UpdateTwoFactorBody): Promise<void>;
	changePassword(email: string, data: ChangePasswordBody): Promise<void>;
}
