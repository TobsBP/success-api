import { randomUUID } from "node:crypto";
import { AppError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IAssistantService } from "@/modules/assistant/interfaces/assistant.service.interface.js";
import type {
	ILlmProvider,
	LlmTool,
} from "@/modules/assistant/interfaces/llm-provider.interface.js";
import type {
	ChatResponseDto,
	ExpenseDraftData,
} from "@/modules/assistant/schemas/index.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type { ExpenseEntryDto } from "@/modules/expenses/schemas/index.js";

const DRAFT_TTL_SECONDS = 300;

const REGISTER_EXPENSE_TOOL: LlmTool = {
	name: "register_expense",
	description:
		"Registra um rascunho de despesa a partir do que o usuário descreveu. Só chame quando o usuário claramente relatou um gasto (valor + do que se trata).",
	inputSchema: {
		type: "object",
		properties: {
			date: {
				type: "string",
				format: "date",
				description: "Data da despesa (YYYY-MM-DD). Use hoje se não informado.",
			},
			description: { type: "string" },
			category: {
				type: "string",
				description: "Categoria livre, ex.: Alimentação, Transporte, Lazer.",
			},
			amount: { type: "number", description: "Valor em reais." },
		},
		required: ["date", "description", "category", "amount"],
	},
};

function draftKey(userId: string, draftId: string): string {
	return `assistant:draft:${userId}:${draftId}`;
}

function todayIso(): string {
	return new Date().toISOString().split("T")[0];
}

/** Resumo de gastos por categoria dos últimos 30 dias, usado como contexto pro LLM. */
function summarizeLast30Days(entries: ExpenseEntryDto[]): string {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const cutoffIso = cutoff.toISOString().split("T")[0];

	const recent = entries.filter((e) => e.date >= cutoffIso);
	if (recent.length === 0)
		return "Nenhum gasto registrado nos últimos 30 dias.";

	const byCategory = new Map<string, number>();
	for (const e of recent) {
		byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
	}

	const lines = Array.from(byCategory.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([category, total]) => `- ${category}: R$ ${total.toFixed(2)}`);

	return `Gastos dos últimos 30 dias por categoria:\n${lines.join("\n")}`;
}

export class AssistantService implements IAssistantService {
	private llmProvider: ILlmProvider;
	private expensesService: IExpensesService;
	private cache: CacheService;

	constructor({
		llmProvider,
		expensesService,
		cache,
	}: {
		llmProvider: ILlmProvider;
		expensesService: IExpensesService;
		cache: CacheService;
	}) {
		this.llmProvider = llmProvider;
		this.expensesService = expensesService;
		this.cache = cache;
	}

	async chat(userId: string, message: string): Promise<ChatResponseDto> {
		const entries = await this.expensesService.listAll(userId);
		const context = summarizeLast30Days(entries);

		const system = `Você é o assistente financeiro pessoal do usuário. Seja direto, natural e proativo: se notar um padrão de gasto alto numa categoria, comente e sugira algo. Hoje é ${todayIso()}.\n\n${context}`;

		const response = await this.llmProvider.complete(
			system,
			[{ role: "user", content: message }],
			[REGISTER_EXPENSE_TOOL],
		);

		if (response.toolCall?.name === "register_expense") {
			const data = response.toolCall.input as unknown as ExpenseDraftData;
			const id = randomUUID();
			await this.cache.set(draftKey(userId, id), data, DRAFT_TTL_SECONDS);

			return {
				reply:
					response.text ??
					`Quer que eu salve: "${data.description}" de R$ ${data.amount} em ${data.category}?`,
				draft: { id, action: "create_expense", data },
			};
		}

		return { reply: response.text ?? "" };
	}

	async confirmDraft(
		userId: string,
		draftId: string,
	): Promise<ExpenseEntryDto> {
		const key = draftKey(userId, draftId);
		const data = await this.cache.get<ExpenseDraftData>(key);
		if (!data) {
			throw new AppError(
				"Esse rascunho expirou, me manda a mensagem de novo que eu preparo outro",
				404,
				"DRAFT_EXPIRED",
			);
		}

		const created = await this.expensesService.createEntry(userId, data);
		await this.cache.del(key);
		return created;
	}
}
