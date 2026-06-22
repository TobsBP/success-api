import type { FastifyReply, FastifyRequest } from "fastify";
import type { IUsersService } from "@/modules/users/interfaces/users.service.interface.js";
import type {
	CreateUserBody,
	ListUsersQuery,
	UpdateUserBody,
	UserParams,
} from "@/modules/users/schemas/index.js";

export class UsersController {
	private service: IUsersService;
	constructor({ usersService }: { usersService: IUsersService }) {
		this.service = usersService;
	}

	list = async (
		request: FastifyRequest<{ Querystring: ListUsersQuery }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.list(request.query);
		return reply.send(result);
	};

	getById = async (
		request: FastifyRequest<{ Params: UserParams }>,
		reply: FastifyReply,
	) => {
		const user = await this.service.getById(request.params.id);
		return reply.send(user);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateUserBody }>,
		reply: FastifyReply,
	) => {
		const user = await this.service.create(request.body);
		return reply.status(201).send(user);
	};

	update = async (
		request: FastifyRequest<{ Params: UserParams; Body: UpdateUserBody }>,
		reply: FastifyReply,
	) => {
		const user = await this.service.update(request.params.id, request.body);
		return reply.send(user);
	};

	remove = async (
		request: FastifyRequest<{ Params: UserParams }>,
		reply: FastifyReply,
	) => {
		await this.service.remove(request.params.id);
		return reply.status(204).send();
	};
}
