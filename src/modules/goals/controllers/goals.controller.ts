import type { FastifyReply, FastifyRequest } from "fastify";
import type { IGoalsService } from "@/modules/goals/interfaces/goals.service.interface.js";
import type {
	CreateGoalBody,
	DepositBody,
	GoalParams,
	UpdateGoalBody,
} from "@/modules/goals/schemas/index.js";

export class GoalsController {
	private service: IGoalsService;
	constructor({ goalsService }: { goalsService: IGoalsService }) {
		this.service = goalsService;
	}

	list = async (request: FastifyRequest, reply: FastifyReply) => {
		const result = await this.service.getData(request.authUser.id);
		return reply.send(result);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateGoalBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.createGoal(
			request.authUser.id,
			request.body,
		);
		return reply.status(201).send(result);
	};

	update = async (
		request: FastifyRequest<{ Params: GoalParams; Body: UpdateGoalBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.updateGoal(
			request.params.id,
			request.body,
		);
		return reply.send(result);
	};

	deposit = async (
		request: FastifyRequest<{ Params: GoalParams; Body: DepositBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.deposit(
			request.params.id,
			request.body.amount,
		);
		return reply.send(result);
	};

	remove = async (
		request: FastifyRequest<{ Params: GoalParams }>,
		reply: FastifyReply,
	) => {
		await this.service.removeGoal(request.params.id);
		return reply.status(204).send();
	};
}
