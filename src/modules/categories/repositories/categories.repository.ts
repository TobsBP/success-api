import { and, eq } from "drizzle-orm";
import { ConflictError } from "@/core/errors/index.js";
import type { Db } from "@/infra/db/client.js";
import { categories } from "@/infra/db/schema/index.js";
import type { ICategoriesRepository } from "@/modules/categories/interfaces/categories.repository.interface.js";
import type {
	CreateCategoryBody,
	UpdateCategoryBody,
} from "@/modules/categories/schemas/index.js";

export class CategoriesRepository implements ICategoriesRepository {
	private db: Db;

	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findAll(userId: string, type?: string) {
		const query = this.db
			.select()
			.from(categories)
			.where(
				type
					? and(
							eq(categories.userId, userId),
							eq(categories.type, type as "income" | "expense" | "both"),
						)
					: eq(categories.userId, userId),
			);
		return query;
	}

	async findById(id: string, userId: string) {
		const [row] = await this.db
			.select()
			.from(categories)
			.where(and(eq(categories.id, id), eq(categories.userId, userId)))
			.limit(1);
		return row ?? null;
	}

	async create(data: CreateCategoryBody & { userId: string }) {
		try {
			const [row] = await this.db
				.insert(categories)
				.values({
					userId: data.userId,
					name: data.name,
					type: data.type ?? "both",
					color: data.color,
				})
				.returning();
			return row;
		} catch (error) {
			const pgError = error as { code?: string };
			if (pgError.code === "23505") {
				throw new ConflictError(`Categoria '${data.name}' já existe`);
			}
			throw error;
		}
	}

	async update(id: string, data: UpdateCategoryBody) {
		const [row] = await this.db
			.update(categories)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(categories.id, id))
			.returning();
		return row ?? null;
	}

	async delete(id: string) {
		const [row] = await this.db
			.delete(categories)
			.where(eq(categories.id, id))
			.returning();
		return row ?? null;
	}
}
