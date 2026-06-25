import type { OverviewResponseDto } from "@/modules/overview/schemas/index.js";

export interface IOverviewService {
	getData(userId: string, month?: string): Promise<OverviewResponseDto>;
}
