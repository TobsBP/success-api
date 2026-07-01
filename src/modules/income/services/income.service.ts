import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { IIncomeRepository } from "@/modules/income/interfaces/income.repository.interface.js";
import type { IIncomeService } from "@/modules/income/interfaces/income.service.interface.js";
import type {
	CreateIncomeEntryBody,
	IncomeEntryDto,
	IncomeResponseDto,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";

const ptMonths = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
];

export function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(month: string): string {
	const [year, mon] = month.split("-").map(Number);
	const d = new Date(year, mon - 2, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function last6Months(
	month: string,
): Array<{ year: number; month: number; label: string }> {
	const [year, mon] = month.split("-").map(Number);
	const result = [];
	for (let i = 5; i >= 0; i--) {
		const d = new Date(year, mon - 1 - i, 1);
		result.push({
			year: d.getFullYear(),
			month: d.getMonth() + 1,
			label: ptMonths[d.getMonth()],
		});
	}
	return result;
}

export class IncomeService implements IIncomeService {
	private repo: IIncomeRepository;
	private cache: CacheService;
	constructor({
		incomeRepository,
		cache,
	}: {
		incomeRepository: IIncomeRepository;
		cache: CacheService;
	}) {
		this.repo = incomeRepository;
		this.cache = cache;
	}

	async getMonthData(
		userId: string,
		month: string,
	): Promise<IncomeResponseDto> {
		const entries = await this.repo.findByMonth(userId, month);
		const prevMon = previousMonth(month);
		const prevEntries = await this.repo.findByMonth(userId, prevMon);

		const received = entries.filter((e) => e.status === "received");
		const pending = entries.filter((e) => e.status === "pending");

		const totalReceivedAmount = received.reduce((sum, e) => sum + e.amount, 0);
		const toReceiveAmount = pending.reduce((sum, e) => sum + e.amount, 0);

		const prevTotalReceived = prevEntries
			.filter((e) => e.status === "received")
			.reduce((sum, e) => sum + e.amount, 0);

		// Cálculo do delta em relação ao mês anterior
		let deltaValue = 0;
		let deltaDirection: "up" | "down" | "neutral" = "neutral";
		if (prevTotalReceived > 0) {
			deltaValue = Math.round(
				((totalReceivedAmount - prevTotalReceived) / prevTotalReceived) * 100,
			);
			deltaDirection =
				deltaValue > 0 ? "up" : deltaValue < 0 ? "down" : "neutral";
		}

		// Fonte com maior total (categoria de entradas recebidas)
		const categoryTotals = new Map<string, number>();
		for (const e of received) {
			categoryTotals.set(
				e.category,
				(categoryTotals.get(e.category) ?? 0) + e.amount,
			);
		}
		let topSource = "";
		let topAmount = 0;
		for (const [cat, amt] of categoryTotals) {
			if (amt > topAmount) {
				topAmount = amt;
				topSource = cat;
			}
		}

		// Agrupamento por fonte/categoria
		const sources = Array.from(categoryTotals.entries()).map(
			([name, amount]) => ({
				id: name.toLowerCase().replace(/\s+/g, "-"),
				name,
				amount,
				percent:
					totalReceivedAmount > 0
						? Math.round((amount / totalReceivedAmount) * 100)
						: 0,
			}),
		);

		// Histórico: últimos 6 meses com totais (somente mês atual preenchido)
		const [currYear, currMon] = month.split("-").map(Number);
		const history = last6Months(month).map((m) => ({
			label: m.label,
			value:
				m.year === currYear && m.month === currMon ? totalReceivedAmount : 0,
		}));

		const prevLabel = ptMonths[Number(prevMon.split("-")[1]) - 1];

		return {
			summary: {
				totalReceived: {
					amount: totalReceivedAmount,
					delta: {
						value: Math.abs(deltaValue),
						unit: "percent",
						direction: deltaDirection,
						comparisonLabel: `vs ${prevLabel}`,
					},
				},
				toReceive: {
					amount: toReceiveAmount,
					pendingCount: pending.length,
				},
				topSource,
			},
			entries,
			history,
			sources,
		};
	}

	async createEntry(
		userId: string,
		data: CreateIncomeEntryBody,
	): Promise<IncomeEntryDto> {
		let { amount } = data;

		if (data.category === "Estágio") {
			const { daysWorked, hoursPerDay, hourlyRate } = data;
			if (
				daysWorked === undefined ||
				hoursPerDay === undefined ||
				hourlyRate === undefined
			) {
				throw new ValidationError(
					"Para categoria 'Estágio' informe daysWorked, hoursPerDay e hourlyRate",
				);
			}
			amount = Math.round(daysWorked * hoursPerDay * hourlyRate);
		}

		if (amount === undefined) {
			throw new ValidationError("O campo 'amount' é obrigatório");
		}

		const created = await this.repo.create({ ...data, amount, userId });
		await this.cache.delByPattern(`overview:${userId}:*`);
		return created;
	}

	async updateEntry(
		userId: string,
		id: string,
		data: UpdateIncomeEntryBody,
	): Promise<IncomeEntryDto> {
		const updated = await this.repo.update(id, data);
		if (!updated) throw new NotFoundError("Income entry", id);
		// Invalida o cache do overview: alterar status/valor/data de uma receita
		// muda os totais agregados (que só contam receitas "received").
		await this.cache.delByPattern(`overview:${userId}:*`);
		return updated;
	}

	async removeEntry(userId: string, id: string): Promise<void> {
		const entry = await this.repo.findById(id);
		if (!entry) throw new NotFoundError("Income entry", id);
		await this.repo.remove(id);
		await this.cache.delByPattern(`overview:${userId}:*`);
	}
}
