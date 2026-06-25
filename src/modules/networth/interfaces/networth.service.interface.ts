import type { NetWorthResponseDto } from "@/modules/networth/schemas/index.js";

export interface INetworthService {
	getNetWorth(userId: string): Promise<NetWorthResponseDto>;
}
