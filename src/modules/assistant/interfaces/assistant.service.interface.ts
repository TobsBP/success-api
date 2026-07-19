import type {
	ChatResponseDto,
	ConfirmResponseDto,
} from "@/modules/assistant/schemas/index.js";

export interface IAssistantService {
	chat(userId: string, message: string): Promise<ChatResponseDto>;
	confirmDraft(userId: string, draftId: string): Promise<ConfirmResponseDto>;
}
