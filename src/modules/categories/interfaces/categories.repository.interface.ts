import type { Category } from "@/infra/db/schema/categories.js";
import type {
	CreateCategoryBody,
	UpdateCategoryBody,
} from "@/modules/categories/schemas/index.js";

export interface ICategoriesRepository {
	findAll(userId: string, type?: string): Promise<Category[]>;
	findById(id: string, userId: string): Promise<Category | null>;
	create(data: CreateCategoryBody & { userId: string }): Promise<Category>;
	update(id: string, data: UpdateCategoryBody): Promise<Category | null>;
	delete(id: string): Promise<Category | null>;
}
