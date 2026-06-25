import type { UserSettings } from "@/infra/db/schema/index.js";

export interface ISettingsRepository {
	findByUserId(userId: string): Promise<UserSettings | null>;
	upsert(
		userId: string,
		data: Partial<
			Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
		>,
	): Promise<UserSettings>;
}
