import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { AssistantController } from "@/modules/assistant/controllers/assistant.controller.js";
import {
	ChatBodySchema,
	ChatResponseSchema,
	ConfirmBodySchema,
} from "@/modules/assistant/schemas/index.js";
import { ExpenseEntrySchema } from "@/modules/expenses/schemas/index.js";

export async function assistantRoutes(fastify: FastifyInstance) {
	const controller = container.resolve<AssistantController>(
		"assistantController",
	);

	fastify.post(
		"/chat",
		{
			schema: {
				tags: ["assistant"],
				summary: "Conversar com o assistente financeiro",
				body: ChatBodySchema,
				response: { 200: ChatResponseSchema },
			},
		},
		controller.chat,
	);

	fastify.post(
		"/confirm",
		{
			schema: {
				tags: ["assistant"],
				summary: "Confirmar um rascunho sugerido pelo assistente",
				body: ConfirmBodySchema,
				response: { 201: ExpenseEntrySchema },
			},
		},
		controller.confirm,
	);
}
