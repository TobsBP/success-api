import type { User } from "../../../infra/db/schema/users.js";
import type {
	CreateUserBody,
	ListUsersQuery,
	UpdateUserBody,
} from "../schemas/index.js";

export interface IUsersService {
	list(query: ListUsersQuery): Promise<{
		data: User[];
		meta: {
			total: number;
			page: number;
			limit: number;
			totalPages: number;
		};
	}>;
	getById(id: string): Promise<User>;
	create(data: CreateUserBody): Promise<User>;
	update(id: string, data: UpdateUserBody): Promise<User>;
	remove(id: string): Promise<void>;
}
