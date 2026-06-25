import { eq, sum } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { investmentAssets } from "@/infra/db/schema/index.js";

export class NetworthRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async getTotalBalance(userId: string): Promise<number> {
		const [row] = await this.db
			.select({ total: sum(investmentAssets.currentBalance) })
			.from(investmentAssets)
			.where(eq(investmentAssets.userId, userId));
		return Number(row?.total ?? 0);
	}
}
