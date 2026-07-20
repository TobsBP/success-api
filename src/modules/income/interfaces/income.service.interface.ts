import type {
	CreateIncomeEntryBody,
	IncomeEntryDto,
	IncomeResponseDto,
	UpdateIncomeEntryBody,
} from "@/modules/income/schemas/index.js";

export interface IIncomeService {
	getMonthData(userId: string, month: string): Promise<IncomeResponseDto>;
	listAll(userId: string): Promise<IncomeEntryDto[]>;
	createEntry(
		userId: string,
		data: CreateIncomeEntryBody,
	): Promise<IncomeEntryDto>;
	updateEntry(
		userId: string,
		id: string,
		data: UpdateIncomeEntryBody,
	): Promise<IncomeEntryDto>;
	removeEntry(userId: string, id: string): Promise<void>;
}
