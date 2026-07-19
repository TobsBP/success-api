import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/core/errors/index.js";
import type { ILlmProvider } from "@/modules/assistant/interfaces/llm-provider.interface.js";
import { AssistantService } from "@/modules/assistant/services/assistant.service.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";

function makeCache() {
	const store = new Map<string, unknown>();
	return {
		get: vi.fn(async (key: string) => store.get(key) ?? null),
		set: vi.fn(async (key: string, value: unknown) => {
			store.set(key, value);
		}),
		del: vi.fn(async (key: string) => {
			store.delete(key);
		}),
	};
}

describe("AssistantService", () => {
	it("chat: quando o LLM chama register_expense, cria um rascunho no cache e não salva a despesa", async () => {
		const cache = makeCache();
		const llmProvider: ILlmProvider = {
			complete: vi.fn().mockResolvedValue({
				text: "Quer que eu salve esse café?",
				toolCall: {
					name: "register_expense",
					input: {
						date: "2026-07-19",
						description: "Café",
						category: "Alimentação",
						amount: 12,
					},
				},
			}),
		};
		const expensesService = {
			listAll: vi.fn().mockResolvedValue([]),
			createEntry: vi.fn(),
		} as unknown as IExpensesService;

		const service = new AssistantService({
			llmProvider,
			expensesService,
			cache: cache as never,
		});

		const result = await service.chat("user-1", "comprei um café de 12 reais");

		expect(result.draft?.action).toBe("create_expense");
		expect(result.draft?.data.amount).toBe(12);
		expect(expensesService.createEntry).not.toHaveBeenCalled();
		expect(cache.set).toHaveBeenCalledOnce();
	});

	it("confirmDraft: lê o rascunho do cache, cria a despesa e limpa o rascunho", async () => {
		const cache = makeCache();
		const draftData = {
			date: "2026-07-19",
			description: "Café",
			category: "Alimentação",
			amount: 12,
		};
		await cache.set("assistant:draft:user-1:draft-1", draftData);

		const expensesService = {
			listAll: vi.fn(),
			createEntry: vi.fn().mockResolvedValue({ id: "expense-1", ...draftData }),
		} as unknown as IExpensesService;

		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService,
			cache: cache as never,
		});

		const result = await service.confirmDraft("user-1", "draft-1");

		expect(expensesService.createEntry).toHaveBeenCalledWith(
			"user-1",
			draftData,
		);
		expect(result.id).toBe("expense-1");
		expect(cache.del).toHaveBeenCalledWith("assistant:draft:user-1:draft-1");
	});

	it("confirmDraft: lança erro amigável quando o rascunho expirou ou não existe", async () => {
		const cache = makeCache();
		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService: {} as IExpensesService,
			cache: cache as never,
		});

		await expect(
			service.confirmDraft("user-1", "unknown-draft"),
		).rejects.toThrow(
			new AppError(
				"Esse rascunho expirou, me manda a mensagem de novo que eu preparo outro",
				404,
				"DRAFT_EXPIRED",
			),
		);
	});
});
