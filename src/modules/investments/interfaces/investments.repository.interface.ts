import type {
	AssetDto,
	CreateAssetBody,
	UpdateAssetBody,
} from "@/modules/investments/schemas/index.js";

export interface IInvestmentsRepository {
	findAll(userId: string): Promise<AssetDto[]>;
	findById(id: string): Promise<AssetDto | null>;
	create(data: CreateAssetBody & { userId: string }): Promise<AssetDto>;
	update(id: string, data: UpdateAssetBody): Promise<AssetDto | null>;
	remove(id: string): Promise<void>;
}
