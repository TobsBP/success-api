import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/core/errors/index.js";
import type { ILlmProvider } from "@/modules/assistant/interfaces/llm-provider.interface.js";
import { AssistantService } from "@/modules/assistant/services/assistant.service.js";
import type { IExpensesService } from "@/modules/expenses/interfaces/expenses.service.interface.js";
import type { IGoalsService } from "@/modules/goals/interfaces/goals.service.interface.js";
import type { GoalDto } from "@/modules/goals/schemas/index.js";
import type { IIncomeService } from "@/modules/income/interfaces/income.service.interface.js";

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

const goal: GoalDto = {
	id: "goal-1",
	name: "Viagem",
	priority: "medium",
	status: "active",
	currentAmount: 100,
	targetAmount: 1000,
	progressPercent: 10,
	remaining: 900,
	forecastDate: "",
	icon: "shield",
	color: "primary",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

function makeServices(overrides?: {
	expensesService?: Partial<IExpensesService>;
	incomeService?: Partial<IIncomeService>;
	goalsService?: Partial<IGoalsService>;
}) {
	const expensesService = {
		listAll: vi.fn().mockResolvedValue([]),
		createEntry: vi.fn(),
		...overrides?.expensesService,
	} as unknown as IExpensesService;
	const incomeService = {
		createEntry: vi.fn(),
		...overrides?.incomeService,
	} as unknown as IIncomeService;
	const goalsService = {
		getData: vi.fn().mockResolvedValue({
			summary: { activeCount: 1, completedCount: 0, totalSaved: 100 },
			goals: [goal],
		}),
		createGoal: vi.fn(),
		updateGoal: vi.fn(),
		removeGoal: vi.fn(),
		deposit: vi.fn(),
		...overrides?.goalsService,
	} as unknown as IGoalsService;
	return { expensesService, incomeService, goalsService };
}

describe("AssistantService", () => {
	it("chat: register_expense gera um rascunho de despesa sem salvar nada", async () => {
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
						paymentMethod: "debit",
					},
				},
			}),
		};
		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		const result = await service.chat(
			"user-1",
			"comprei um café de 12 reais no débito",
		);

		expect(result.draft?.action).toBe("create_expense");
		expect(expensesService.createEntry).not.toHaveBeenCalled();
		expect(cache.set).toHaveBeenCalledOnce();
	});

	it("chat: deposit_goal resolve o nome da meta e gera um rascunho", async () => {
		const cache = makeCache();
		const llmProvider: ILlmProvider = {
			complete: vi.fn().mockResolvedValue({
				text: null,
				toolCall: {
					name: "deposit_goal",
					input: { goalName: "viagem", amount: 200 },
				},
			}),
		};
		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		const result = await service.chat(
			"user-1",
			"guarda 200 na minha meta de viagem",
		);

		expect(result.draft?.action).toBe("deposit_goal");
		expect((result.draft?.data as { goalId: string }).goalId).toBe("goal-1");
	});

	it("chat: deposit_goal sem meta correspondente não gera rascunho", async () => {
		const cache = makeCache();
		const llmProvider: ILlmProvider = {
			complete: vi.fn().mockResolvedValue({
				text: null,
				toolCall: {
					name: "deposit_goal",
					input: { goalName: "carro", amount: 200 },
				},
			}),
		};
		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		const result = await service.chat(
			"user-1",
			"guarda 200 na minha meta de carro",
		);

		expect(result.draft).toBeUndefined();
		expect(result.reply).toContain("Viagem");
	});

	it("confirmDraft: create_expense lê o rascunho do cache, cria a despesa e limpa o rascunho", async () => {
		const cache = makeCache();
		const draftData = {
			date: "2026-07-19",
			description: "Café",
			category: "Alimentação",
			amount: 12,
		};
		await cache.set("assistant:draft:user-1:draft-1", {
			action: "create_expense",
			data: draftData,
		});

		const { expensesService, incomeService, goalsService } = makeServices({
			expensesService: {
				createEntry: vi
					.fn()
					.mockResolvedValue({ id: "expense-1", ...draftData }),
			},
		});

		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		const result = await service.confirmDraft("user-1", "draft-1");

		expect(expensesService.createEntry).toHaveBeenCalledWith(
			"user-1",
			draftData,
		);
		expect(result.action).toBe("create_expense");
		expect(cache.del).toHaveBeenCalledWith("assistant:draft:user-1:draft-1");
	});

	it("chat: edit_goal resolve o nome e gera um rascunho só com os campos alterados", async () => {
		const cache = makeCache();
		const llmProvider: ILlmProvider = {
			complete: vi.fn().mockResolvedValue({
				text: null,
				toolCall: {
					name: "edit_goal",
					input: { goalName: "viagem", targetAmount: 2000 },
				},
			}),
		};
		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		const result = await service.chat(
			"user-1",
			"muda o valor alvo da viagem pra 2000",
		);

		expect(result.draft?.action).toBe("edit_goal");
		expect((result.draft?.data as { goalId: string }).goalId).toBe("goal-1");
		expect((result.draft?.data as { changes: unknown }).changes).toEqual({
			targetAmount: 2000,
		});
	});

	it("confirmDraft: edit_goal chama goalsService.updateGoal com o id resolvido e as mudanças", async () => {
		const cache = makeCache();
		await cache.set("assistant:draft:user-1:draft-3", {
			action: "edit_goal",
			data: {
				goalId: "goal-1",
				goalName: "Viagem",
				changes: { targetAmount: 2000 },
			},
		});

		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		await service.confirmDraft("user-1", "draft-3");

		expect(goalsService.updateGoal).toHaveBeenCalledWith("goal-1", {
			targetAmount: 2000,
		});
	});

	it("confirmDraft: remove_goal chama goalsService.removeGoal com o id resolvido", async () => {
		const cache = makeCache();
		await cache.set("assistant:draft:user-1:draft-2", {
			action: "remove_goal",
			data: { goalId: "goal-1", goalName: "Viagem" },
		});

		const { expensesService, incomeService, goalsService } = makeServices();

		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService,
			incomeService,
			goalsService,
			cache: cache as never,
		});

		await service.confirmDraft("user-1", "draft-2");

		expect(goalsService.removeGoal).toHaveBeenCalledWith("goal-1");
	});

	it("confirmDraft: lança erro amigável quando o rascunho expirou ou não existe", async () => {
		const cache = makeCache();
		const { expensesService, incomeService, goalsService } = makeServices();
		const service = new AssistantService({
			llmProvider: {} as ILlmProvider,
			expensesService,
			incomeService,
			goalsService,
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
