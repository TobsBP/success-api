import { env } from "@/core/config/env.js";
import { UnauthorizedError } from "@/core/errors/index.js";
import type {
	LoginResponseDto,
	UserProfileDto,
} from "@/modules/auth/schemas/index.js";
import type { IUsersRepository } from "@/modules/users/interfaces/users.repository.interface.js";

export class AuthService {
	private usersRepository: IUsersRepository;

	constructor({ usersRepository }: { usersRepository: IUsersRepository }) {
		this.usersRepository = usersRepository;
	}

	async login(email: string, password: string): Promise<LoginResponseDto> {
		const res = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, returnSecureToken: true }),
			},
		);

		if (!res.ok) {
			throw new UnauthorizedError("Credenciais inválidas");
		}

		const data = (await res.json()) as { idToken: string; expiresIn: string };

		const user = await this.usersRepository.findByEmail(email);
		if (!user) {
			throw new UnauthorizedError("Usuário não encontrado");
		}

		const expiresAt = new Date(
			Date.now() + parseInt(data.expiresIn) * 1000,
		).toISOString();

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			token: data.idToken,
			expiresAt,
		};
	}

	getMe(authUser: { id: string; name: string; email: string }): UserProfileDto {
		return {
			id: authUser.id,
			name: authUser.name,
			email: authUser.email,
		};
	}

	// Firebase tokens são stateless — o cliente descarta o token no logout
	logout(): void {}
}
