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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const userId: string = (request as any).authUser?.id ?? "";
		const result = await this.service.getData(userId, request.query.month);
		return reply.send(result);
	};
}
