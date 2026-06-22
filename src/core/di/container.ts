import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { CacheService } from "@/infra/cache/cache.service.js";
import { getRedis } from "@/infra/cache/client.js";
import { getDb } from "@/infra/db/client.js";
import { UsersController } from "@/modules/users/controllers/users.controller.js";
import { UsersRepository } from "@/modules/users/repositories/users.repository.js";
import { UsersService } from "@/modules/users/services/users.service.js";

export const container = createContainer({
	injectionMode: InjectionMode.PROXY,
});

export function setupContainer() {
	container.register({
		// Infra
		db: asValue(getDb()),
		redis: asValue(getRedis()),
		cache: asClass(CacheService).singleton(),

		// Repositories
		usersRepository: asClass(UsersRepository).singleton(),

		// Services
		usersService: asClass(UsersService).singleton(),

		// Controllers
		usersController: asClass(UsersController).singleton(),
	});

	return container;
}
