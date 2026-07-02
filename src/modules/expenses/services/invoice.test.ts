import { describe, expect, it } from "vitest";
import { computeInvoiceDueDate } from "./invoice.js";

describe("computeInvoiceDueDate", () => {
	// Cartão com vencimento depois do fechamento (ex.: fecha dia 3, vence dia 10).
	describe("vencimento > fechamento", () => {
		it("compra após o fechamento cai na fatura do mês seguinte", () => {
			expect(computeInvoiceDueDate("2026-07-15", 3, 10)).toBe("2026-08-10");
		});

		it("compra até o fechamento cai na fatura do mês atual", () => {
			expect(computeInvoiceDueDate("2026-07-02", 3, 10)).toBe("2026-07-10");
		});
	});

	// Cartão com vencimento antes do fechamento (ex.: fecha dia 25, vence dia 5).
	describe("vencimento <= fechamento", () => {
		it("compra até o fechamento vence no mês seguinte ao fechamento", () => {
			expect(computeInvoiceDueDate("2026-07-15", 25, 5)).toBe("2026-08-05");
		});

		it("compra após o fechamento pula mais um mês", () => {
			expect(computeInvoiceDueDate("2026-07-26", 25, 5)).toBe("2026-09-05");
		});

		it("vira o ano corretamente", () => {
			expect(computeInvoiceDueDate("2026-12-26", 25, 5)).toBe("2027-02-05");
		});
	});

	it("limita o dia de vencimento ao último dia do mês", () => {
		// Fecha dia 15, vence dia 31; compra em fev fecha em fev e venceria 31/fev.
		expect(computeInvoiceDueDate("2026-02-10", 15, 31)).toBe("2026-02-28");
	});
});
