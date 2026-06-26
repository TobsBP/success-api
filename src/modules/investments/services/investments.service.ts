import { NotFoundError } from "@/core/errors/index.js";
import type { IInvestmentsRepository } from "@/modules/investments/interfaces/investments.repository.interface.js";
import type { IInvestmentsService } from "@/modules/investments/interfaces/investments.service.interface.js";
import type {
	AssetDto,
	CreateAssetBody,
	InvestmentsResponseDto,
	UpdateAssetBody,
} from "@/modules/investments/schemas/index.js";

export class InvestmentsService implements IInvestmentsService {
	private repo: IInvestmentsRepository;

	constructor({
		investmentsRepository,
	}: { investmentsRepository: IInvestmentsRepository }) {
		this.repo = investmentsRepository;
	}

	async getData(
		userId: string,
		_range?: string,
	): Promise<InvestmentsResponseDto> {
		const assets = await this.repo.findAll(userId);

		const total = assets.reduce((sum, a) => sum + a.currentBalance, 0);

		// Calcula weightPercent de cada ativo
		const assetsWithWeight: AssetDto[] = assets.map((a) => ({
			...a,
			weightPercent: total > 0 ? (a.currentBalance / total) * 100 : 0,
		}));

		// Alocação por classe de ativo
		const allocationMap = new Map<string, number>();
		for (const a of assets) {
			allocationMap.set(
				a.assetClass,
				(allocationMap.get(a.assetClass) ?? 0) + a.currentBalance,
			);
		}
		const allocationItems = Array.from(allocationMap.entries()).map(
			([assetClass, amount]) => ({
				assetClass,
				percent: total > 0 ? (amount / total) * 100 : 0,
			}),
		);

		// Rendimentos mensais e anuais
		const totalMonthlyYieldAmount = assets.reduce(
			(sum, a) => sum + a.monthlyYield.amount,
			0,
		);

		const neutralDelta = {
			value: 0,
			unit: "percent" as const,
			direction: "neutral" as const,
		};

		return {
			summary: {
				investedNetWorth: {
					amount: total,
					delta: neutralDelta,
				},
				monthlyYield: {
					amount: totalMonthlyYieldAmount,
					delta: neutralDelta,
				},
				yearlyYield: {
					amount: totalMonthlyYieldAmount * 12,
					returnPercentYtd: 0,
				},
			},
			allocation: {
				total,
				items: allocationItems,
			},
			evolution: [],
			assets: assetsWithWeight,
		};
	}

	async createAsset(userId: string, data: CreateAssetBody): Promise<AssetDto> {
		return this.repo.create({ ...data, userId });
	}

	async updateAsset(id: string, data: UpdateAssetBody): Promise<AssetDto> {
		const updated = await this.repo.update(id, data);
		if (!updated) throw new NotFoundError("InvestmentAsset", id);
		return updated;
	}

	async removeAsset(id: string): Promise<void> {
		const existing = await this.repo.findById(id);
		if (!existing) throw new NotFoundError("InvestmentAsset", id);
		await this.repo.remove(id);
	}
}
