import type { FastifyReply, FastifyRequest } from "fastify";
import type { ISettingsService } from "@/modules/settings/interfaces/settings.service.interface.js";
import type {
	ChangePasswordBody,
	UpdateCardBody,
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
		const result = await this.service.getSettings(
			request.authUser.id,
			request.authUser.email,
		);
		return reply.send(result);
	};

	updateProfile = async (
		request: FastifyRequest<{ Body: UpdateProfileBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		await this.service.updateProfile(userId, request.body);
		return reply.status(204).send();
	};

	updatePreferences = async (
		request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		await this.service.updatePreferences(userId, request.body);
		return reply.status(204).send();
	};

	updateNotifications = async (
		request: FastifyRequest<{ Body: UpdateNotificationsBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		await this.service.updateNotifications(userId, request.body);
		return reply.status(204).send();
	};

	updateCard = async (
		request: FastifyRequest<{ Body: UpdateCardBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		await this.service.updateCard(userId, request.body);
		return reply.status(204).send();
	};

	updateTwoFactor = async (
		request: FastifyRequest<{ Body: UpdateTwoFactorBody }>,
		reply: FastifyReply,
	) => {
		const userId = request.authUser.id;
		await this.service.updateTwoFactor(userId, request.body);
		return reply.status(204).send();
	};

	changePassword = async (
		request: FastifyRequest<{ Body: ChangePasswordBody }>,
		reply: FastifyReply,
	) => {
		await this.service.changePassword(request.authUser.email, request.body);
		return reply.status(200).send({ message: "Senha alterada com sucesso" });
	};
}
