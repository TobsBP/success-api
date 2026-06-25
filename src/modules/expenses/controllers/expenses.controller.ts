import type { FastifyReply, FastifyRequest } from "fastify";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type {
	CreateExpenseBody,
	ExpenseParams,
	LimitBody,
	MonthQuery,
	UpdateExpenseBody,
} from "@/modules/expenses/schemas/index.js";

export class ExpensesController {
	private service: IExpensesService;

	constructor({ expensesService }: { expensesService: IExpensesService }) {
		this.service = expensesService;
	}

	list = async (
		request: FastifyRequest<{ Querystring: MonthQuery }>,
		reply: FastifyReply,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.getMonthData(
			userId,
			request.query.month ?? "",
		);
		return reply.send(result);
	};

	create = async (
		request: FastifyRequest<{ Body: CreateExpenseBody }>,
		reply: FastifyReply,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.createEntry(userId, request.body);
		return reply.status(201).send(result);
	};

	update = async (
		request: FastifyRequest<{ Params: ExpenseParams; Body: UpdateExpenseBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.updateEntry(
			request.params.id,
			request.body,
		);
		return reply.send(result);
	};

	remove = async (
		request: FastifyRequest<{ Params: ExpenseParams }>,
		reply: FastifyReply,
	) => {
		await this.service.removeEntry(request.params.id);
		return reply.status(204).send();
	};

	getLimit = async (request: FastifyRequest, reply: FastifyReply) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.getLimit(userId);
		return reply.send(result);
	};

	setLimit = async (
		request: FastifyRequest<{ Body: LimitBody }>,
		reply: FastifyReply,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.setLimit(userId, request.body.limit);
		return reply.send(result);
	};
}
