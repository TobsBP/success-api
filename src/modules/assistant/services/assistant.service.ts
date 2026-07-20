import { randomUUID } from "node:crypto";
import { AppError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IAssistantService } from "@/modules/assistant/interfaces/assistant.service.interface.js";
import type {
	ILlmProvider,
	LlmMessage,
	LlmTool,
	LlmToolCall,
} from "@/modules/assistant/interfaces/llm-provider.interface.js";
import type {
	ChatResponseDto,
	ConfirmResponseDto,
	CreateGoalDraftData,
	DepositGoalDraftData,
	Draft,
	EditGoalDraftData,
	ExpenseDraftData,
	IncomeDraftData,
	RemoveGoalDraftData,
} from "@/modules/assistant/schemas/index.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type { IGoalsService } from "@/modules/goals/interfaces/goals.service.interface.js";
import type { GoalDto } from "@/modules/goals/schemas/index.js";
import type { IIncomeService } from "@/modules/income/interfaces/income.service.interface.js";

const DRAFT_TTL_SECONDS = 300;
// Histórico da conversa: sobrevive por 15min de inatividade, e carrega no
// máximo as últimas 20 mensagens pro contexto não crescer sem limite.
const HISTORY_TTL_SECONDS = 900;
const MAX_HISTORY_MESSAGES = 20;

const TOOLS: LlmTool[] = [
	{
		name: "register_expense",
		description:
			"Registra um rascunho de despesa a partir do que o usuário descreveu. Só chame quando o usuário claramente relatou um gasto (valor + do que se trata).",
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					format: "date",
					description:
						"Data da despesa (YYYY-MM-DD). Use hoje se não informado.",
				},
				description: { type: "string" },
				category: {
					type: "string",
					description: "Categoria livre, ex.: Alimentação, Transporte, Lazer.",
				},
				amount: { type: "number", description: "Valor total em reais." },
				paymentMethod: {
					type: "string",
					enum: ["credit", "debit", "pix", "cash", "boleto"],
					description:
						"Meio de pagamento. Pergunte se não estiver claro se foi crédito ou débito.",
				},
				installments: {
					type: "integer",
					description:
						"Número de parcelas no crédito (compra parcelada). Não usar para assinatura.",
				},
				recurringMonths: {
					type: "integer",
					description:
						"Preencha quando for uma assinatura/gasto recorrente: quantos meses futuros repetir o mesmo valor.",
				},
			},
			required: ["date", "description", "category", "amount"],
		},
	},
	{
		name: "register_income",
		description:
			"Registra um rascunho de receita/renda a partir do que o usuário descreveu (salário, freela, etc).",
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					format: "date",
					description:
						"Data do recebimento (YYYY-MM-DD). Use hoje se não informado.",
				},
				description: { type: "string" },
				category: { type: "string", description: "Ex.: Salário, Freelance." },
				amount: { type: "integer", description: "Valor em reais." },
			},
			required: ["date", "description", "category", "amount"],
		},
	},
	{
		name: "create_goal",
		description: "Cria uma nova meta financeira.",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string" },
				description: { type: "string" },
				priority: { type: "string", enum: ["high", "medium", "low"] },
				targetAmount: { type: "integer", description: "Valor alvo em reais." },
				currentAmount: {
					type: "integer",
					description: "Valor já guardado, 0 se não informado.",
				},
				icon: {
					type: "string",
					description: "Nome de ícone livre, use 'shield' se não souber.",
				},
				color: {
					type: "string",
					description: "Cor livre, use 'primary' se não souber.",
				},
			},
			required: ["name", "priority", "targetAmount"],
		},
	},
	{
		name: "edit_goal",
		description:
			"Edita uma meta existente pelo nome. Só informe os campos que o usuário pediu pra mudar.",
		inputSchema: {
			type: "object",
			properties: {
				goalName: { type: "string", description: "Nome atual da meta." },
				name: { type: "string", description: "Novo nome, se for mudar." },
				description: { type: "string" },
				priority: { type: "string", enum: ["high", "medium", "low"] },
				targetAmount: {
					type: "integer",
					description: "Novo valor alvo em reais.",
				},
				currentAmount: {
					type: "integer",
					description: "Novo valor já guardado em reais.",
				},
				icon: { type: "string" },
				color: { type: "string" },
			},
			required: ["goalName"],
		},
	},
	{
		name: "remove_goal",
		description: "Remove uma meta existente pelo nome.",
		inputSchema: {
			type: "object",
			properties: {
				goalName: { type: "string" },
			},
			required: ["goalName"],
		},
	},
	{
		name: "deposit_goal",
		description: "Adiciona um aporte (valor) a uma meta existente pelo nome.",
		inputSchema: {
			type: "object",
			properties: {
				goalName: { type: "string" },
				amount: { type: "integer", description: "Valor do aporte em reais." },
			},
			required: ["goalName", "amount"],
		},
	},
];

function draftKey(userId: string, draftId: string): string {
	return `assistant:draft:${userId}:${draftId}`;
}

function historyKey(userId: string): string {
	return `assistant:history:${userId}`;
}

function todayIso(): string {
	return new Date().toISOString().split("T")[0];
}

const LLM_RETRY_ATTEMPTS = 3;
const LLM_RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reenvia ao modelo em caso de falha transitória (modelo fora do ar, timeout, etc).
 * Não reenvia AppError (ex.: API key não configurada), pois é um erro de config, não transitório.
 */
async function completeWithRetry(
	llmProvider: ILlmProvider,
	system: string,
	messages: LlmMessage[],
	tools: LlmTool[],
): Promise<Awaited<ReturnType<ILlmProvider["complete"]>>> {
	for (let attempt = 1; attempt <= LLM_RETRY_ATTEMPTS; attempt++) {
		try {
			return await llmProvider.complete(system, messages, tools);
		} catch (err) {
			if (err instanceof AppError || attempt === LLM_RETRY_ATTEMPTS) throw err;
			await sleep(LLM_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
		}
	}
	throw new Error("unreachable");
}

/** Resumo de gastos por categoria dos últimos 30 dias, usado como contexto pro LLM. */
function summarizeExpenses(
	entries: { date: string; category: string; amount: number }[],
): string {
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

function summarizeGoals(goals: GoalDto[]): string {
	if (goals.length === 0) return "O usuário não tem metas cadastradas ainda.";
	const lines = goals.map(
		(g) =>
			`- ${g.name}: R$ ${g.currentAmount} de R$ ${g.targetAmount} (${g.status})`,
	);
	return `Metas atuais:\n${lines.join("\n")}`;
}

/** Encontra a meta pelo nome (case-insensitive). Retorna null se não achar exatamente uma. */
function findGoalByName(goals: GoalDto[], name: string): GoalDto | null {
	const needle = name.trim().toLowerCase();
	const matches = goals.filter((g) => g.name.toLowerCase().includes(needle));
	return matches.length === 1 ? matches[0] : null;
}

export class AssistantService implements IAssistantService {
	private llmProvider: ILlmProvider;
	private expensesService: IExpensesService;
	private incomeService: IIncomeService;
	private goalsService: IGoalsService;
	private cache: CacheService;

	constructor({
		llmProvider,
		expensesService,
		incomeService,
		goalsService,
		cache,
	}: {
		llmProvider: ILlmProvider;
		expensesService: IExpensesService;
		incomeService: IIncomeService;
		goalsService: IGoalsService;
		cache: CacheService;
	}) {
		this.llmProvider = llmProvider;
		this.expensesService = expensesService;
		this.incomeService = incomeService;
		this.goalsService = goalsService;
		this.cache = cache;
	}

	async chat(userId: string, message: string): Promise<ChatResponseDto> {
		const [expenses, goalsData] = await Promise.all([
			this.expensesService.listAll(userId),
			this.goalsService.getData(userId),
		]);
		const goals = goalsData.goals;

		const system = `Você é o assistente financeiro pessoal do usuário. Seja direto, natural e proativo: se notar um padrão de gasto alto numa categoria, comente e sugira algo. Hoje é ${todayIso()}.\n\nQuando o usuário pedir uma ação em lote (ex: "remova todas as metas"), chame a tool para UMA única ação por resposta e avise no texto que fará as demais uma a uma após a confirmação. Nunca chame mais de uma tool na mesma resposta.\n\n${summarizeExpenses(expenses)}\n\n${summarizeGoals(goals)}`;

		const history =
			(await this.cache.get<LlmMessage[]>(historyKey(userId))) ?? [];
		const messages: LlmMessage[] = [
			...history,
			{ role: "user", content: message },
		];

		const response = await completeWithRetry(
			this.llmProvider,
			system,
			messages,
			TOOLS,
		);
		const result = await this.resolveToolCall(
			userId,
			response.toolCall,
			response.text,
			goals,
		);

		const updatedHistory = [
			...messages,
			{ role: "assistant" as const, content: result.reply },
		].slice(-MAX_HISTORY_MESSAGES);
		await this.cache.set(
			historyKey(userId),
			updatedHistory,
			HISTORY_TTL_SECONDS,
		);

		return result;
	}

	private async resolveToolCall(
		userId: string,
		call: LlmToolCall | null,
		text: string | null,
		goals: GoalDto[],
	): Promise<ChatResponseDto> {
		if (!call) return { reply: text ?? "" };

		if (call.name === "register_expense") {
			const data = call.input as unknown as ExpenseDraftData;
			return this.stageDraft(
				userId,
				"create_expense",
				data,
				text ??
					`Quer que eu salve: "${data.description}" de R$ ${data.amount} em ${data.category}?`,
			);
		}

		if (call.name === "register_income") {
			const data = call.input as unknown as IncomeDraftData;
			return this.stageDraft(
				userId,
				"create_income",
				data,
				text ??
					`Quer que eu registre a receita "${data.description}" de R$ ${data.amount}?`,
			);
		}

		if (call.name === "create_goal") {
			const input = call.input as {
				name: string;
				description?: string;
				priority: "high" | "medium" | "low";
				targetAmount: number;
				currentAmount?: number;
				icon?: string;
				color?: string;
			};
			const data: CreateGoalDraftData = {
				name: input.name,
				description: input.description,
				priority: input.priority,
				targetAmount: input.targetAmount,
				currentAmount: input.currentAmount ?? 0,
				icon: input.icon ?? "shield",
				color: input.color ?? "primary",
			};
			return this.stageDraft(
				userId,
				"create_goal",
				data,
				text ??
					`Quer que eu crie a meta "${data.name}" de R$ ${data.targetAmount}?`,
			);
		}

		if (call.name === "edit_goal") {
			const { goalName, ...changes } = call.input as {
				goalName: string;
				name?: string;
				description?: string;
				priority?: "high" | "medium" | "low";
				targetAmount?: number;
				currentAmount?: number;
				icon?: string;
				color?: string;
			};
			const goal = findGoalByName(goals, goalName);
			if (!goal) return { reply: this.goalNotFoundReply(goalName, goals) };
			const data: EditGoalDraftData = {
				goalId: goal.id,
				goalName: goal.name,
				changes,
			};
			return this.stageDraft(
				userId,
				"edit_goal",
				data,
				`Quer que eu atualize a meta "${goal.name}"?`,
			);
		}

		if (call.name === "remove_goal") {
			const { goalName } = call.input as { goalName: string };
			const goal = findGoalByName(goals, goalName);
			if (!goal) return { reply: this.goalNotFoundReply(goalName, goals) };
			const data: RemoveGoalDraftData = {
				goalId: goal.id,
				goalName: goal.name,
			};
			return this.stageDraft(
				userId,
				"remove_goal",
				data,
				`Quer que eu remova a meta "${goal.name}"?`,
			);
		}

		if (call.name === "deposit_goal") {
			const { goalName, amount } = call.input as {
				goalName: string;
				amount: number;
			};
			const goal = findGoalByName(goals, goalName);
			if (!goal) return { reply: this.goalNotFoundReply(goalName, goals) };
			const data: DepositGoalDraftData = {
				goalId: goal.id,
				goalName: goal.name,
				amount,
			};
			return this.stageDraft(
				userId,
				"deposit_goal",
				data,
				`Quer que eu aporte R$ ${amount} na meta "${goal.name}"?`,
			);
		}

		return { reply: text ?? "" };
	}

	private goalNotFoundReply(goalName: string, goals: GoalDto[]): string {
		if (goals.length === 0) {
			return `Você ainda não tem nenhuma meta cadastrada, então não achei "${goalName}".`;
		}
		const names = goals.map((g) => g.name).join(", ");
		return `Não achei uma meta única chamada "${goalName}". Suas metas são: ${names}.`;
	}

	private async stageDraft(
		userId: string,
		action: Draft["action"],
		data: Draft["data"],
		reply: string,
	): Promise<ChatResponseDto> {
		const id = randomUUID();
		await this.cache.set(
			draftKey(userId, id),
			{ action, data },
			DRAFT_TTL_SECONDS,
		);
		return { reply, draft: { id, action, data } as Draft };
	}

	async confirmDraft(
		userId: string,
		draftId: string,
	): Promise<ConfirmResponseDto> {
		const key = draftKey(userId, draftId);
		const staged = await this.cache.get<{
			action: Draft["action"];
			data: Draft["data"];
		}>(key);
		if (!staged) {
			throw new AppError(
				"Esse rascunho expirou, me manda a mensagem de novo que eu preparo outro",
				404,
				"DRAFT_EXPIRED",
			);
		}
		await this.cache.del(key);

		switch (staged.action) {
			case "create_expense": {
				const data = staged.data as ExpenseDraftData;
				const result = await this.expensesService.createEntry(userId, data);
				return { action: staged.action, result };
			}
			case "create_income": {
				const data = staged.data as IncomeDraftData;
				const result = await this.incomeService.createEntry(userId, data);
				return { action: staged.action, result };
			}
			case "create_goal": {
				const data = staged.data as CreateGoalDraftData;
				const result = await this.goalsService.createGoal(userId, data);
				return { action: staged.action, result };
			}
			case "edit_goal": {
				const data = staged.data as EditGoalDraftData;
				const result = await this.goalsService.updateGoal(
					data.goalId,
					data.changes,
				);
				return { action: staged.action, result };
			}
			case "remove_goal": {
				const data = staged.data as RemoveGoalDraftData;
				await this.goalsService.removeGoal(data.goalId);
				return { action: staged.action, result: { goalId: data.goalId } };
			}
			case "deposit_goal": {
				const data = staged.data as DepositGoalDraftData;
				const result = await this.goalsService.deposit(
					data.goalId,
					data.amount,
				);
				return { action: staged.action, result };
			}
		}
	}
}
