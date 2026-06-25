import type { FastifyReply, FastifyRequest } from "fastify";
import type { IInvestmentsService } from "@/modules/investments/interfaces/investments.service.interface.js";
import type {
	AssetParams,
	CreateAssetBody,
	RangeQuery,
	UpdateAssetBody,
} from "@/modules/investments/schemas/index.js";

export class InvestmentsController {
	private service: IInvestmentsService;

	constructor({
		investmentsService,
	}: { investmentsService: IInvestmentsService }) {
		this.service = investmentsService;
	}

	list = async (
		request: FastifyRequest<{ Querystring: RangeQuery }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const result = await this.service.getData(userId, request.query.range);
		return reply.send(result);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateAssetBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const asset = await this.service.createAsset(userId, request.body);
		return reply.status(201).send(asset);
	};

	update = async (
		request: FastifyRequest<{ Params: AssetParams; Body: UpdateAssetBody }>,
		reply: FastifyReply,
	) => {
		const asset = await this.service.updateAsset(
			request.params.id,
			request.body,
		);
		return reply.send(asset);
	};

	remove = async (
		request: FastifyRequest<{ Params: AssetParams }>,
		reply: FastifyReply,
	) => {
		await this.service.removeAsset(request.params.id);
		return reply.status(204).send();
	};
}
