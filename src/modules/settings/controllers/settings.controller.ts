import type { FastifyReply, FastifyRequest } from "fastify";
import type { ISettingsService } from "@/modules/settings/interfaces/settings.service.interface.js";
import type {
	ChangePasswordBody,
	UpdateNotificationsBody,
	UpdatePreferencesBody,
	UpdateProfileBody,
	UpdateTwoFactorBody,
} from "@/modules/settings/schemas/index.js";

export class SettingsController {
	private service: ISettingsService;

	constructor({ settingsService }: { settingsService: ISettingsService }) {
		this.service = settingsService;
	}

	getSettings = async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = (request as any).authUser?.id as string;
		const email = (request as any).authUser?.email as string;
		const result = await this.service.getSettings(userId, email);
		return reply.send(result);
	};

	updateProfile = async (
		request: FastifyRequest<{ Body: UpdateProfileBody }>,
		reply: FastifyReply,
	) => {
		const userId = (request as any).authUser?.id as string;
		await this.service.updateProfile(userId, request.body);
		return reply.status(204).send();
	};

	updatePreferences = async (
		request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
		reply: FastifyReply,
	) => {
		const userId = (request as any).authUser?.id as string;
		await this.service.updatePreferences(userId, request.body);
		return reply.status(204).send();
	};

	updateNotifications = async (
		request: FastifyRequest<{ Body: UpdateNotificationsBody }>,
		reply: FastifyReply,
	) => {
		const userId = (request as any).authUser?.id as string;
		await this.service.updateNotifications(userId, request.body);
		return reply.status(204).send();
	};

	updateTwoFactor = async (
		request: FastifyRequest<{ Body: UpdateTwoFactorBody }>,
		reply: FastifyReply,
	) => {
		const userId = (request as any).authUser?.id as string;
		await this.service.updateTwoFactor(userId, request.body);
		return reply.status(204).send();
	};

	changePassword = async (
		request: FastifyRequest<{ Body: ChangePasswordBody }>,
		reply: FastifyReply,
	) => {
		const email = (request as any).authUser?.email as string;
		await this.service.changePassword(email, request.body);
		return reply.status(200).send({ message: "Senha alterada com sucesso" });
	};
}
