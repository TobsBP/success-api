import { count, eq } from "drizzle-orm";
import { ConflictError } from "@/core/errors/index.js";
import type { Db } from "@/infra/db/client.js";
import { users } from "@/infra/db/schema/index.js";
import type { IUsersRepository } from "@/modules/users/interfaces/users.repository.interface.js";
import type {
	CreateUserBody,
	UpdateUserBody,
} from "@/modules/users/schemas/index.js";

export class UsersRepository implements IUsersRepository {
	private db: Db;
	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findAll(page: number, limit: number) {
		const offset = (page - 1) * limit;

		const [rows, [{ value: total }]] = await Promise.all([
			this.db.select().from(users).limit(limit).offset(offset),
			this.db.select({ value: count() }).from(users),
		]);

		return { rows, total: Number(total) };
	}

	async findById(id: string) {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);
		return user ?? null;
	}

	async findByEmail(email: string) {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		return user ?? null;
	}

	async create(data: CreateUserBody) {
		try {
			const [user] = await this.db.insert(users).values(data).returning();
			return user;
		} catch (error) {
			const pgError = error as { code?: string };
			if (pgError.code === "23505") {
				throw new ConflictError(`Email '${data.email}' already in use`);
			}
			throw error;
		}
	}

	async update(id: string, data: UpdateUserBody) {
		const [user] = await this.db
			.update(users)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	}

	async delete(id: string) {
		const [user] = await this.db
			.delete(users)
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	}
}
