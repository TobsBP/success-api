import { NotFoundError } from "@/core/errors/index.js";
import type { ICategoriesRepository } from "@/modules/categories/interfaces/categories.repository.interface.js";
import type { ICategoriesService } from "@/modules/categories/interfaces/categories.service.interface.js";
import type {
	CategoryDto,
	CategoryListQuery,
	CreateCategoryBody,
	UpdateCategoryBody,
} from "@/modules/categories/schemas/index.js";

function toDto(row: {
	id: string;
	name: string;
	type: string;
	color: string | null;
	createdAt: Date;
	updatedAt: Date;
}): CategoryDto {
	return {
		id: row.id,
		name: row.name,
		type: row.type as CategoryDto["type"],
		color: row.color ?? undefined,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export class CategoriesService implements ICategoriesService {
	private repo: ICategoriesRepository;

	constructor({
		categoriesRepository,
	}: { categoriesRepository: ICategoriesRepository }) {
		this.repo = categoriesRepository;
	}

	async list(userId: string, query: CategoryListQuery): Promise<CategoryDto[]> {
		const rows = await this.repo.findAll(userId, query.type);
		return rows.map(toDto);
	}

	async create(userId: string, data: CreateCategoryBody): Promise<CategoryDto> {
		const row = await this.repo.create({ ...data, userId });
		return toDto(row);
	}

	async update(
		id: string,
		userId: string,
		data: UpdateCategoryBody,
	): Promise<CategoryDto> {
		const existing = await this.repo.findById(id, userId);
		if (!existing) throw new NotFoundError("Category", id);
		const row = await this.repo.update(id, data);
		if (!row) throw new NotFoundError("Category", id);
		return toDto(row);
	}

	async remove(id: string, userId: string): Promise<void> {
		const existing = await this.repo.findById(id, userId);
		if (!existing) throw new NotFoundError("Category", id);
		await this.repo.delete(id);
	}
}
