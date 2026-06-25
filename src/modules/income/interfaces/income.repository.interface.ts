import type {
	CreateIncomeEntryBody,
	IncomeEntryDto,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";

export interface IIncomeRepository {
	findByMonth(userId: string, month: string): Promise<IncomeEntryDto[]>;
	findById(id: string): Promise<IncomeEntryDto | null>;
	create(
		data: CreateIncomeEntryBody & { userId: string },
	): Promise<IncomeEntryDto>;
	update(
		id: string,
		data: UpdateIncomeEntryBody,
	): Promise<IncomeEntryDto | null>;
	remove(id: string): Promise<void>;
}
