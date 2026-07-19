import { GoogleGenAI } from "@google/genai";
import { env } from "@/core/config/env.js";
import { AppError } from "@/core/errors/index.js";
import type {
	ILlmProvider,
	LlmMessage,
	LlmResponse,
	LlmTool,
} from "@/modules/assistant/interfaces/llm-provider.interface.js";

const MODEL = "gemini-2.5-flash";

export class GeminiProvider implements ILlmProvider {
	private client: GoogleGenAI | null;

	constructor() {
		this.client = env.GEMINI_API_KEY
			? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
			: null;
	}

	async complete(
		system: string,
		messages: LlmMessage[],
		tools: LlmTool[],
	): Promise<LlmResponse> {
		if (!this.client) {
			throw new AppError(
				"Assistente indisponível: GEMINI_API_KEY não configurada",
				503,
				"ASSISTANT_UNAVAILABLE",
			);
		}

		const response = await this.client.models.generateContent({
			model: MODEL,
			contents: messages.map((m) => ({
				role: m.role === "assistant" ? "model" : "user",
				parts: [{ text: m.content }],
			})),
			config: {
				systemInstruction: system,
				tools: [
					{
						functionDeclarations: tools.map((t) => ({
							name: t.name,
							description: t.description,
							parametersJsonSchema: t.inputSchema,
						})),
					},
				],
			},
		});

		const call = response.functionCalls?.[0];

		return {
			text: response.text ?? null,
			toolCall: call?.name ? { name: call.name, input: call.args ?? {} } : null,
		};
	}
}
