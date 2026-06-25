import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { investmentAssets } from "@/infra/db/schema/index.js";
import type { InvestmentAsset } from "@/infra/db/schema/investments.js";
import type { IInvestmentsRepository } from "@/modules/investments/interfaces/investments.repository.interface.js";
import type {
	AssetDto,
	CreateAssetBody,
	UpdateAssetBody,
} from "@/modules/investments/schemas/index.js";

export class InvestmentsRepository implements IInvestmentsRepository {
	private db: Db;
	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findAll(userId: string): Promise<AssetDto[]> {
		const rows = await this.db
			.select()
			.from(investmentAssets)
			.where(eq(investmentAssets.userId, userId));
		return rows.map((row) => this.toDto(row));
	}

	async findById(id: string): Promise<AssetDto | null> {
		const [row] = await this.db
			.select()
			.from(investmentAssets)
			.where(eq(investmentAssets.id, id))
			.limit(1);
		return row ? this.toDto(row) : null;
	}

	async create(data: CreateAssetBody & { userId: string }): Promise<AssetDto> {
		const [row] = await this.db
			.insert(investmentAssets)
			.values({
				userId: data.userId,
				name: data.name,
				assetClass: data.assetClass,
				subtitle: data.subtitle,
				currentBalance: String(data.currentBalance),
				totalInvested:
					data.totalInvested != null ? String(data.totalInvested) : null,
				averagePrice:
					data.averagePrice != null ? String(data.averagePrice) : null,
			})
			.returning();
		return this.toDto(row);
	}

	async update(id: string, data: UpdateAssetBody): Promise<AssetDto | null> {
		const updateValues: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateValues.name = data.name;
		if (data.assetClass !== undefined)
			updateValues.assetClass = data.assetClass;
		if (data.subtitle !== undefined) updateValues.subtitle = data.subtitle;
		if (data.currentBalance !== undefined)
			updateValues.currentBalance = String(data.currentBalance);
		if (data.totalInvested !== undefined)
			updateValues.totalInvested =
				data.totalInvested != null ? String(data.totalInvested) : null;
		if (data.averagePrice !== undefined)
			updateValues.averagePrice =
				data.averagePrice != null ? String(data.averagePrice) : null;

		const [row] = await this.db
			.update(investmentAssets)
			.set(updateValues)
			.where(eq(investmentAssets.id, id))
			.returning();
		return row ? this.toDto(row) : null;
	}

	async remove(id: string): Promise<void> {
		await this.db.delete(investmentAssets).where(eq(investmentAssets.id, id));
	}

	private toDto(row: InvestmentAsset): AssetDto {
		return {
			id: row.id,
			name: row.name,
			assetClass: row.assetClass,
			subtitle: row.subtitle ?? undefined,
			currentBalance: Number(row.currentBalance),
			weightPercent: 0, // calculado no serviço
			monthlyYield: {
				amount: Number(row.monthlyYieldAmount),
				percent: Number(row.monthlyYieldPercent),
			},
			totalInvested:
				row.totalInvested != null ? Number(row.totalInvested) : undefined,
			averagePrice:
				row.averagePrice != null ? Number(row.averagePrice) : undefined,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
