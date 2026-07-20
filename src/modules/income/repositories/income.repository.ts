import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { income } from "@/infra/db/schema/index.js";
import type { IIncomeRepository } from "@/modules/income/interfaces/income.repository.interface.js";
import type {
	CreateIncomeEntryBody,
	IncomeEntryDto,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";

function parseLocalDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function getMonthRange(month: string): { start: Date; end: Date } {
	const [year, mon] = month.split("-").map(Number);
	const start = new Date(year, mon - 1, 1);
	const end = new Date(year, mon, 1);
	return { start, end };
}

function formatDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export class IncomeRepository implements IIncomeRepository {
	private db: Db;
	constructor({ db }: { db: Db }) {
		this.db = db;
	}

	async findAll(userId: string): Promise<IncomeEntryDto[]> {
		const rows = await this.db
			.select()
			.from(income)
			.where(eq(income.userId, userId))
			.orderBy(desc(income.date));
		return rows.map((r) => this.toDto(r));
	}

	async findByMonth(userId: string, month: string): Promise<IncomeEntryDto[]> {
		const { start, end } = getMonthRange(month);
		const rows = await this.db
			.select()
			.from(income)
			.where(
				and(
					eq(income.userId, userId),
					gte(income.date, start),
					lt(income.date, end),
				),
			);
		return rows.map((r) => this.toDto(r));
	}

	async findById(id: string): Promise<IncomeEntryDto | null> {
		const [row] = await this.db.select().from(income).where(eq(income.id, id));
		return row ? this.toDto(row) : null;
	}

	async create(
		data: CreateIncomeEntryBody & { userId: string },
	): Promise<IncomeEntryDto> {
		const [row] = await this.db
			.insert(income)
			.values({
				userId: data.userId,
				date: parseLocalDate(data.date),
				description: data.description,
				category: data.category,
				amount: String(data.amount),
				status: data.status ?? "pending",
			})
			.returning();
		return this.toDto(row);
	}

	async update(
		id: string,
		data: UpdateIncomeEntryBody,
	): Promise<IncomeEntryDto | null> {
		const updates: Partial<typeof income.$inferInsert> = {};
		if (data.date !== undefined) updates.date = parseLocalDate(data.date);
		if (data.description !== undefined) updates.description = data.description;
		if (data.category !== undefined) updates.category = data.category;
		if (data.amount !== undefined) updates.amount = String(data.amount);
		if (data.status !== undefined) updates.status = data.status;
		updates.updatedAt = new Date();

		const [row] = await this.db
			.update(income)
			.set(updates)
			.where(eq(income.id, id))
			.returning();
		return row ? this.toDto(row) : null;
	}

	async remove(id: string): Promise<void> {
		await this.db.delete(income).where(eq(income.id, id));
	}

	private toDto(row: typeof income.$inferSelect): IncomeEntryDto {
		return {
			id: row.id,
			date: formatDate(row.date),
			description: row.description,
			category: row.category,
			amount: Math.round(Number(row.amount)),
			status: row.status,
		};
	}
}
