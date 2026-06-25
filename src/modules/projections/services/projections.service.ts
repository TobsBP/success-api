import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IProjectionsRepository } from "@/modules/projections/interfaces/projections.repository.interface.js";
import type { IProjectionsService } from "@/modules/projections/interfaces/projections.service.interface.js";
import type {
	ProjectionsResponseDto,
	UpdateAssumptionsBody,
} from "@/modules/projections/schemas/index.js";

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `projections:${userId}`;

// Calcula os pontos de uma projeção ano a ano
function calcScenario(
	initialNetWorth: number,
	monthlyContribution: number,
	annualRate: number,
	years: number,
): Array<{ label: string; value: number }> {
	const points: Array<{ label: string; value: number }> = [
		{ label: "Hoje", value: initialNetWorth },
	];
	let balance = initialNetWorth;
	for (let i = 1; i <= years; i++) {
		balance = balance * (1 + annualRate / 100) + monthlyContribution * 12;
		points.push({ label: `Ano ${i}`, value: Math.round(balance) });
	}
	return points;
}

export class ProjectionsService implements IProjectionsService {
	private repo: IProjectionsRepository;
	private cache: CacheService;

	constructor({
		projectionsRepository,
		cache,
	}: {
		projectionsRepository: IProjectionsRepository;
		cache: CacheService;
	}) {
		this.repo = projectionsRepository;
		this.cache = cache;
	}

	async getProjections(
		userId: string,
		timeframe: number,
	): Promise<ProjectionsResponseDto> {
		const cached = await this.cache.get<ProjectionsResponseDto>(
			cacheKey(userId),
		);
		if (cached && cached.timeframe === timeframe) return cached;

		const raw = await this.repo.getAssumptions(userId);

		// Valores padrão caso o usuário ainda não tenha configurado premissas
		const contribution = raw?.plannedMonthlyContribution ?? 0;
		const rate = raw?.estimatedAnnualRatePercent ?? 8.5;
		const inflation = raw?.inflationPercent ?? 4.5;
		const contributionGrowth = raw?.contributionGrowthPercent ?? 5.5;
		const returnsByClass = raw?.returnsByClass ?? [];

		// Patrimônio inicial é stub — seria calculado somando todos os ativos
		const initialNetWorth = 0;

		const basePoints = calcScenario(
			initialNetWorth,
			contribution,
			rate,
			timeframe,
		);
		const conservativePoints = calcScenario(
			initialNetWorth,
			contribution,
			rate - 2,
			timeframe,
		);
		const aggressivePoints = calcScenario(
			initialNetWorth,
			contribution,
			rate + 2,
			timeframe,
		);

		// Valor projetado em 10 anos (independente do timeframe solicitado)
		const horizon10Points = calcScenario(
			initialNetWorth,
			contribution,
			rate,
			10,
		);
		const projectionIn10Years =
			horizon10Points[horizon10Points.length - 1].value;

		// Valor no horizonte do timeframe atual (último ponto do cenário base)
		const horizonValue = basePoints[basePoints.length - 1].value;

		// Composição no horizonte usando returnsByClass proporcionalmente
		const totalPercent = returnsByClass.reduce(
			(acc, c) => acc + c.annualRatePercent,
			0,
		);
		const compositionItems = returnsByClass.map((c) => {
			const percent =
				totalPercent > 0
					? Math.round((c.annualRatePercent / totalPercent) * 100)
					: 0;
			return {
				assetClass: c.assetClass,
				amount: Math.round((percent / 100) * horizonValue),
				percent,
			};
		});

		const result: ProjectionsResponseDto = {
			summary: {
				initialNetWorth,
				plannedMonthlyContribution: contribution,
				estimatedAnnualRatePercent: rate,
				projectionIn10Years,
			},
			timeframe,
			scenarios: [
				{
					id: "base",
					name: "Cenário Base",
					type: "base",
					points: basePoints,
				},
				{
					id: "conservative",
					name: "Cenário Conservador",
					type: "conservative",
					points: conservativePoints,
				},
				{
					id: "aggressive",
					name: "Cenário Agressivo",
					type: "aggressive",
					points: aggressivePoints,
				},
			],
			assumptions: {
				inflationPercent: inflation,
				contributionGrowthPercent: contributionGrowth,
				returnsByClass,
			},
			compositionAtHorizon: {
				total: horizonValue,
				items: compositionItems,
			},
		};

		await this.cache.set(cacheKey(userId), result, CACHE_TTL_SECONDS);
		return result;
	}

	async updateAssumptions(
		userId: string,
		data: UpdateAssumptionsBody,
	): Promise<UpdateAssumptionsBody> {
		const updated = await this.repo.upsertAssumptions(userId, data);
		await this.cache.del(cacheKey(userId));
		return updated;
	}
}
