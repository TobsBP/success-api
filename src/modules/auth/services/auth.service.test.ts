import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { UnauthorizedError } from "@/core/errors/index.js";
import type { IUsersRepository } from "@/modules/users/interfaces/users.repository.interface.js";
import { AuthService } from "./auth.service.js";

// Silencia chamadas fetch no ambiente de teste
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("AuthService", () => {
	let service: AuthService;
	let mockUsersRepo: {
		findByEmail: Mock;
		findById: Mock;
		findAll: Mock;
		create: Mock;
		update: Mock;
		delete: Mock;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUsersRepo = {
			findByEmail: vi.fn(),
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		service = new AuthService({
			usersRepository: mockUsersRepo as unknown as IUsersRepository,
		});
	});

	describe("login", () => {
		it("deve retornar token e dados do usuário em caso de sucesso", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					idToken: "firebase-token-123",
					expiresIn: "3600",
				}),
			});
			mockUsersRepo.findByEmail.mockResolvedValue({
				id: "user-id",
				name: "João",
				email: "joao@example.com",
			});

			const result = await service.login("joao@example.com", "senha123");

			expect(result.token).toBe("firebase-token-123");
			expect(result.user.email).toBe("joao@example.com");
			expect(result.expiresAt).toBeDefined();
		});

		it("deve lançar UnauthorizedError quando Firebase rejeita as credenciais", async () => {
			mockFetch.mockResolvedValue({ ok: false });

			await expect(
				service.login("joao@example.com", "senha-errada"),
			).rejects.toThrow(UnauthorizedError);
		});

		it("deve lançar UnauthorizedError quando usuário não existe no banco", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ idToken: "token", expiresIn: "3600" }),
			});
			mockUsersRepo.findByEmail.mockResolvedValue(null);

			await expect(
				service.login("naoexiste@example.com", "senha123"),
			).rejects.toThrow(UnauthorizedError);
		});
	});

	describe("getMe", () => {
		it("deve retornar o perfil do usuário autenticado", () => {
			const authUser = { id: "abc", name: "Maria", email: "maria@example.com" };
			const result = service.getMe(authUser);
			expect(result).toEqual(authUser);
		});
	});

	describe("logout", () => {
		it("não deve lançar erros", () => {
			expect(() => service.logout()).not.toThrow();
		});
	});
});
