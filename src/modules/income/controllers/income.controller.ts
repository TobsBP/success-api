import type { FastifyReply, FastifyRequest } from "fastify";
import type { IIncomeService } from "@/modules/income/interfaces/income.service.interface.js";
import type {
	CreateIncomeEntryBody,
	IncomeParams,
	MonthQuery,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";
import { currentMonth } from "@/modules/income/services/income.service.js";

export class IncomeController {
	private service: IIncomeService;
	constructor({ incomeService }: { incomeService: IIncomeService }) {
		this.service = incomeService;
	}

	list = async (
		request: FastifyRequest<{ Querystring: MonthQuery }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const month = request.query.month ?? currentMonth();
		const result = await this.service.getMonthData(userId, month);
		return reply.send(result);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateIncomeEntryBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		const result = await this.service.createEntry(userId, request.body);
		return reply.status(201).send(result);
	};

	update = async (
		request: FastifyRequest<{
			Params: IncomeParams;
			Body: UpdateIncomeEntryBody;
		}>,
		reply: FastifyReply,
	) => {
		const result = await this.service.updateEntry(
			request.params.id,
			request.body,
		);
		return reply.send(result);
	};

	remove = async (
		request: FastifyRequest<{ Params: IncomeParams }>,
		reply: FastifyReply,
	) => {
		await this.service.removeEntry(request.params.id);
		return reply.status(204).send();
	};
}
