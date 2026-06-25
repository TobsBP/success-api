import type { FastifyReply, FastifyRequest } from "fastify";
import type { INetworthService } from "@/modules/networth/interfaces/networth.service.interface.js";

export class NetworthController {
	private service: INetworthService;

	constructor({ networthService }: { networthService: INetworthService }) {
		this.service = networthService;
	}

	get = async (request: FastifyRequest, reply: FastifyReply) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const userId: string = (request as any).authUser?.id ?? "";
		const result = await this.service.getNetWorth(userId);
		return reply.send(result);
	};
}
