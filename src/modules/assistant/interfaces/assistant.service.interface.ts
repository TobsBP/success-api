import type { ChatResponseDto } from "@/modules/assistant/schemas/index.js";
import type { ExpenseEntryDto } from "@/modules/expenses/schemas/index.js";

export interface IAssistantService {
	chat(userId: string, message: string): Promise<ChatResponseDto>;
	confirmDraft(userId: string, draftId: string): Promise<ExpenseEntryDto>;
}
