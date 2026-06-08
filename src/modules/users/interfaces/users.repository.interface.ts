import type { User } from "../../../infra/db/schema/users.js";
import type { CreateUserBody, UpdateUserBody } from "../schemas/index.js";

export interface IUsersRepository {
	findAll(
		page: number,
		limit: number,
	): Promise<{ rows: User[]; total: number }>;
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	create(data: CreateUserBody): Promise<User>;
	update(id: string, data: UpdateUserBody): Promise<User | null>;
	delete(id: string): Promise<User | null>;
}
