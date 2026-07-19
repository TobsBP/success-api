import type { FastifyReply, FastifyRequest } from "fastify";
import type { IAssistantService } from "@/modules/assistant/interfaces/assistant.service.interface.js";
import type {
	ChatBody,
	ConfirmBody,
} from "@/modules/assistant/schemas/index.js";

export class AssistantController {
	private service: IAssistantService;

	constructor({ assistantService }: { assistantService: IAssistantService }) {
		this.service = assistantService;
	}

	chat = async (
		request: FastifyRequest<{ Body: ChatBody }>,
		reply: FastifyReply,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.chat(userId, request.body.message);
		return reply.send(result);
	};

	confirm = async (
		request: FastifyRequest<{ Body: ConfirmBody }>,
		reply: FastifyReply,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: authUser é injetado pelo plugin firebase-auth
		const userId = (request as any).authUser?.id ?? "";
		const result = await this.service.confirmDraft(
			userId,
			request.body.draftId,
		);
		return reply.status(201).send(result);
	};
}
