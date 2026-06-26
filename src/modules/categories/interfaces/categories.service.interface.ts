import type {
	CategoryDto,
	CategoryListQuery,
	CreateCategoryBody,
	UpdateCategoryBody,
} from "@/modules/categories/schemas/index.js";

export interface ICategoriesService {
	list(userId: string, query: CategoryListQuery): Promise<CategoryDto[]>;
	create(userId: string, data: CreateCategoryBody): Promise<CategoryDto>;
	update(
		id: string,
		userId: string,
		data: UpdateCategoryBody,
	): Promise<CategoryDto>;
	remove(id: string, userId: string): Promise<void>;
}
