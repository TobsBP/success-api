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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const userId: string = (request as any).authUser?.id ?? "";
		const result = await this.service.getData(userId, request.query);
		return reply.send(result);
	};
}
