import type { FastifyReply, FastifyRequest } from "fastify";
import type { INetworthService } from "@/modules/networth/interfaces/networth.service.interface.js";

export class NetworthController {
	private service: INetworthService;

	constructor({ networthService }: { networthService: INetworthService }) {
		this.service = networthService;
	}

	get = async (request: FastifyRequest, reply: FastifyReply) => {
		const result = await this.service.getNetWorth(request.authUser.id);
		return reply.send(result);
	};
}
