import type {
	CreateIncomeEntryBody,
	IncomeEntryDto,
	IncomeResponseDto,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";

export interface IIncomeService {
	getMonthData(userId: string, month: string): Promise<IncomeResponseDto>;
	createEntry(
		userId: string,
		data: CreateIncomeEntryBody,
	): Promise<IncomeEntryDto>;
	updateEntry(id: string, data: UpdateIncomeEntryBody): Promise<IncomeEntryDto>;
	removeEntry(id: string): Promise<void>;
}
