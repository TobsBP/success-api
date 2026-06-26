import type { FastifyReply, FastifyRequest } from "fastify";
import type { IOverviewService } from "@/modules/overview/interfaces/overview.service.interface.js";
import type { OverviewQuery } from "@/modules/overview/schemas/index.js";

export class OverviewController {
	private service: IOverviewService;

	constructor({ overviewService }: { overviewService: IOverviewService }) {
		this.service = overviewService;
	}

	getData = async (
		request: FastifyRequest<{ Querystring: OverviewQuery }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.getData(
			request.authUser.id,
			request.query.month,
		);
		return reply.send(result);
	};
}
