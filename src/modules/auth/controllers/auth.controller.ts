import type { FastifyReply, FastifyRequest } from "fastify";
import type { LoginBody } from "@/modules/auth/schemas/index.js";
import type { AuthService } from "@/modules/auth/services/auth.service.js";

export class AuthController {
	private service: AuthService;

	constructor({ authService }: { authService: AuthService }) {
		this.service = authService;
	}

	login = async (
		request: FastifyRequest<{ Body: LoginBody }>,
		reply: FastifyReply,
	) => {
		const result = await this.service.login(
			request.body.email,
			request.body.password,
		);
		return reply.send(result);
	};

	logout = async (_request: FastifyRequest, reply: FastifyReply) => {
		this.service.logout();
		return reply.status(204).send();
	};

	me = async (request: FastifyRequest, reply: FastifyReply) => {
		const user = request.authUser;
		return reply.send(this.service.getMe(user));
	};
}
