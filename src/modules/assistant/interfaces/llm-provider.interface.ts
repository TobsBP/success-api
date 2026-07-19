export interface LlmMessage {
	role: "user" | "assistant";
	content: string;
}

/** Descrição de uma tool no formato JSON Schema, independente de provider. */
export interface LlmTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
	name: string;
	input: Record<string, unknown>;
}

export interface LlmResponse {
	text: string | null;
	toolCall: LlmToolCall | null;
}

/**
 * Contrato único que qualquer provider de LLM (Claude, OpenAI, Gemini...)
 * precisa implementar. Trocar de provider é registrar outra implementação
 * no container DI — o resto do módulo assistant não muda.
 */
export interface ILlmProvider {
	complete(
		system: string,
		messages: LlmMessage[],
		tools: LlmTool[],
	): Promise<LlmResponse>;
}
