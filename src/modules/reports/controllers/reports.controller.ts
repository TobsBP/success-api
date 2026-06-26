import type { FastifyReply, FastifyRequest } from "fastify";
import type { IReportsService } from "@/modules/reports/interfaces/reports.service.interface.js";
import type { ReportsQuery } from "@/modules/reports/schemas/index.js";

export class ReportsController {
	private service: IReportsService;

	constructor({ reportsService }: { reportsService: IReportsService }) {
		this.service = reportsService;
	}

	getData = async (
		request: FastifyRequest<{ Querystring: ReportsQuery }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.getData(
			request.authUser.id,
			request.query,
		);
		return reply.send(result);
	};
}
