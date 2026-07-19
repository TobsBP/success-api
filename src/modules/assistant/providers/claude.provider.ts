import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/core/config/env.js";
import { AppError } from "@/core/errors/index.js";
import type {
	ILlmProvider,
	LlmMessage,
	LlmResponse,
	LlmTool,
} from "@/modules/assistant/interfaces/llm-provider.interface.js";

export class ClaudeProvider implements ILlmProvider {
	private client: Anthropic | null;

	constructor() {
		this.client = env.ANTHROPIC_API_KEY
			? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
			: null;
	}

	async complete(
		system: string,
		messages: LlmMessage[],
		tools: LlmTool[],
	): Promise<LlmResponse> {
		if (!this.client) {
			throw new AppError(
				"Assistente indisponível: ANTHROPIC_API_KEY não configurada",
				503,
				"ASSISTANT_UNAVAILABLE",
			);
		}

		const response = await this.client.messages.create({
			model: env.ANTHROPIC_MODEL,
			max_tokens: 1024,
			system,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
				input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
			})),
		});

		const textBlock = response.content.find((b) => b.type === "text");
		const toolBlock = response.content.find((b) => b.type === "tool_use");

		return {
			text: textBlock?.type === "text" ? textBlock.text : null,
			toolCall:
				toolBlock?.type === "tool_use"
					? {
							name: toolBlock.name,
							input: toolBlock.input as Record<string, unknown>,
						}
					: null,
		};
	}
}
