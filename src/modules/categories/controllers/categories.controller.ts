import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	CategoryListQuery,
	CategoryParams,
	CreateCategoryBody,
	UpdateCategoryBody,
} from "@/modules/categories/schemas/index.js";
import type { CategoriesService } from "@/modules/categories/services/categories.service.js";

export class CategoriesController {
	private service: CategoriesService;

	constructor({ categoriesService }: { categoriesService: CategoriesService }) {
		this.service = categoriesService;
	}

	list = async (
		request: FastifyRequest<{ Querystring: CategoryListQuery }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.list(request.authUser.id, request.query);
		return reply.send(result);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateCategoryBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.create(request.authUser.id, request.body);
		return reply.status(201).send(result);
	};

	update = async (
		request: FastifyRequest<{
			Params: CategoryParams;
			Body: UpdateCategoryBody;
		}>,
		reply: FastifyReply,
	) => {
		const result = await this.service.update(
			request.params.id,
			request.authUser.id,
			request.body,
		);
		return reply.send(result);
	};

	remove = async (
		request: FastifyRequest<{ Params: CategoryParams }>,
		reply: FastifyReply,
	) => {
		await this.service.remove(request.params.id, request.authUser.id);
		return reply.status(204).send();
	};
}
