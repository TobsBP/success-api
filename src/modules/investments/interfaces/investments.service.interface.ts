import type {
	AssetDto,
	CreateAssetBody,
	InvestmentsResponseDto,
	UpdateAssetBody,
} from "@/modules/investments/schemas/index.js";

export interface IInvestmentsService {
	getData(userId: string, range?: string): Promise<InvestmentsResponseDto>;
	createAsset(userId: string, data: CreateAssetBody): Promise<AssetDto>;
	updateAsset(id: string, data: UpdateAssetBody): Promise<AssetDto>;
	removeAsset(id: string): Promise<void>;
}
