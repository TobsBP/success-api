import type { CacheService } from "@/infra/cache/cache.service.js";
import type { INetworthRepository } from "@/modules/networth/interfaces/networth.repository.interface.js";
import type { INetworthService } from "@/modules/networth/interfaces/networth.service.interface.js";
import type { NetWorthResponseDto } from "@/modules/networth/schemas/index.js";

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `networth:${userId}`;

export class NetworthService implements INetworthService {
	private repo: INetworthRepository;
	private cache: CacheService;

	constructor({
		networthRepository,
		cache,
	}: {
		networthRepository: INetworthRepository;
		cache: CacheService;
	}) {
		this.repo = networthRepository;
		this.cache = cache;
	}

	async getNetWorth(userId: string): Promise<NetWorthResponseDto> {
		const cached = await this.cache.get<NetWorthResponseDto>(cacheKey(userId));
		if (cached) return cached;

		const amount = await this.repo.getTotalBalance(userId);

		const result: NetWorthResponseDto = {
			amount,
			changePercent: 0,
			changeLabel: "0% este mês",
			sparkline: [],
			updatedAt: new Date().toISOString(),
		};

		await this.cache.set(cacheKey(userId), result, CACHE_TTL_SECONDS);
		return result;
	}
}
