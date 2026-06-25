import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { type UserSettings, userSettings } from "@/infra/db/schema/index.js";
import type { ISettingsRepository } from "@/modules/settings/interfaces/settings.repository.interface.js";

export class SettingsRepository implements ISettingsRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findByUserId(userId: string): Promise<UserSettings | null> {
		const [row] = await this.db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, userId));

		return row ?? null;
	}

	async upsert(
		userId: string,
		data: Partial<
			Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
		>,
	): Promise<UserSettings> {
		const [row] = await this.db
			.insert(userSettings)
			.values({ userId, ...data })
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: { ...data, updatedAt: new Date() },
			})
			.returning();

		return row;
	}
}
