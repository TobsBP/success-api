/**
 * Regras de fatura de cartão de crédito.
 *
 * Dado o dia de fechamento (`closingDay`) e o dia de vencimento (`dueDay`) do
 * cartão, calcula em qual data a compra efetivamente vence (data da fatura).
 *
 * Regra:
 * - A compra entra na fatura que fecha no `closingDay`. Se a compra foi feita
 *   até o dia de fechamento (inclusive), fecha no mês da compra; caso contrário
 *   vai para a fatura do mês seguinte.
 * - O vencimento é o `dueDay` na relação usual com o fechamento: se o vencimento
 *   cai depois do fechamento (`dueDay > closingDay`), vence no mesmo mês do
 *   fechamento; se cai antes/igual, vence no mês seguinte ao fechamento.
 * - Dias inexistentes no mês (ex.: 31 em fevereiro) são limitados ao último dia.
 */
export function computeInvoiceDueDate(
	purchaseDate: string,
	closingDay: number,
	dueDay: number,
): string {
	const [year, month, day] = purchaseDate.split("-").map(Number);

	// Mês em que a fatura da compra fecha (0-indexed sobre year/month-1).
	const closingMonthOffset = day <= closingDay ? 0 : 1;
	const closingIndex = month - 1 + closingMonthOffset;

	// Vencimento em relação ao mês de fechamento.
	const dueMonthOffset = dueDay > closingDay ? 0 : 1;
	const dueIndex = closingIndex + dueMonthOffset;

	const dueYear = year + Math.floor(dueIndex / 12);
	const dueMonth = ((dueIndex % 12) + 12) % 12;
	const lastDay = new Date(dueYear, dueMonth + 1, 0).getDate();
	const clampedDay = Math.min(dueDay, lastDay);

	return `${dueYear}-${String(dueMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}
