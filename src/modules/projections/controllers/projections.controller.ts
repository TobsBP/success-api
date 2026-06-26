import type { FastifyReply, FastifyRequest } from "fastify";
import type { IProjectionsService } from "@/modules/projections/interfaces/projections.service.interface.js";
import type { UpdateAssumptionsBody } from "@/modules/projections/schemas/index.js";

const VALID_TIMEFRAMES = [5, 10, 20, 30] as const;
const DEFAULT_TIMEFRAME = 10;

export class ProjectionsController {
	private service: IProjectionsService;

	constructor({
		projectionsService,
	}: { projectionsService: IProjectionsService }) {
		this.service = projectionsService;
	}

	getProjections = async (
		request: FastifyRequest<{ Querystring: { timeframe?: string } }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const rawTimeframe = request.query.timeframe
			? Number(request.query.timeframe)
			: DEFAULT_TIMEFRAME;
		const timeframe = VALID_TIMEFRAMES.includes(
			rawTimeframe as (typeof VALID_TIMEFRAMES)[number],
		)
			? rawTimeframe
			: DEFAULT_TIMEFRAME;

		const result = await this.service.getProjections(userId, timeframe);
		return reply.send(result);
	};

	updateAssumptions = async (
		request: FastifyRequest<{ Body: UpdateAssumptionsBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const result = await this.service.updateAssumptions(userId, request.body);
		return reply.send(result);
	};
}
