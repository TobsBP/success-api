import { NotFoundError } from "../../../core/errors/index.js";
import type { IUsersRepository } from "../interfaces/users.repository.interface.js";
import type { IUsersService } from "../interfaces/users.service.interface.js";
import type {
	CreateUserBody,
	ListUsersQuery,
	UpdateUserBody,
} from "../schemas/index.js";

export class UsersService implements IUsersService {
	private repo: IUsersRepository;
	constructor({ usersRepository }: { usersRepository: IUsersRepository }) {
		this.repo = usersRepository;
	}

	async list(query: ListUsersQuery) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const { rows, total } = await this.repo.findAll(page, limit);

		return {
			data: rows,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async getById(id: string) {
		const user = await this.repo.findById(id);
		if (!user) throw new NotFoundError("User", id);
		return user;
	}

	async create(data: CreateUserBody) {
		return this.repo.create(data);
	}

	async update(id: string, data: UpdateUserBody) {
		await this.getById(id);
		const updated = await this.repo.update(id, data);
		if (!updated) throw new NotFoundError("User", id);
		return updated;
	}

	async remove(id: string) {
		await this.getById(id);
		await this.repo.delete(id);
	}
}
