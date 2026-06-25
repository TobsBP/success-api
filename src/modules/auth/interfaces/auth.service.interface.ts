import type {
	LoginResponseDto,
	UserProfileDto,
} from "@/modules/auth/schemas/index.js";

export interface IAuthService {
	login(email: string, password: string): Promise<LoginResponseDto>;
	getMe(authUser: { id: string; name: string; email: string }): UserProfileDto;
	logout(): void;
}
