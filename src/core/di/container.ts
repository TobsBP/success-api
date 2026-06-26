import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { CacheService } from "@/infra/cache/cache.service.js";
import { getRedis } from "@/infra/cache/client.js";
import { getDb } from "@/infra/db/client.js";
import { AuthController } from "@/modules/auth/controllers/auth.controller.js";
import { AuthService } from "@/modules/auth/services/auth.service.js";
import { CategoriesController } from "@/modules/categories/controllers/categories.controller.js";
import { CategoriesRepository } from "@/modules/categories/repositories/categories.repository.js";
import { CategoriesService } from "@/modules/categories/services/categories.service.js";
import { ExpensesController } from "@/modules/expenses/controllers/expenses.controller.js";
import { ExpensesRepository } from "@/modules/expenses/repositories/expenses.repository.js";
import { ExpensesService } from "@/modules/expenses/services/expenses.service.js";
import { GoalsController } from "@/modules/goals/controllers/goals.controller.js";
import { GoalsRepository } from "@/modules/goals/repositories/goals.repository.js";
import { GoalsService } from "@/modules/goals/services/goals.service.js";
import { IncomeController } from "@/modules/income/controllers/income.controller.js";
import { IncomeRepository } from "@/modules/income/repositories/income.repository.js";
import { IncomeService } from "@/modules/income/services/income.service.js";
import { InvestmentsController } from "@/modules/investments/controllers/investments.controller.js";
import { InvestmentsRepository } from "@/modules/investments/repositories/investments.repository.js";
import { InvestmentsService } from "@/modules/investments/services/investments.service.js";
import { NetworthController } from "@/modules/networth/controllers/networth.controller.js";
import { NetworthRepository } from "@/modules/networth/repositories/networth.repository.js";
import { NetworthService } from "@/modules/networth/services/networth.service.js";
import { OverviewController } from "@/modules/overview/controllers/overview.controller.js";
import { OverviewRepository } from "@/modules/overview/repositories/overview.repository.js";
import { OverviewService } from "@/modules/overview/services/overview.service.js";
import { ProjectionsController } from "@/modules/projections/controllers/projections.controller.js";
import { ProjectionsRepository } from "@/modules/projections/repositories/projections.repository.js";
import { ProjectionsService } from "@/modules/projections/services/projections.service.js";
import { ReportsController } from "@/modules/reports/controllers/reports.controller.js";
import { ReportsRepository } from "@/modules/reports/repositories/reports.repository.js";
import { ReportsService } from "@/modules/reports/services/reports.service.js";
import { SettingsController } from "@/modules/settings/controllers/settings.controller.js";
import { SettingsRepository } from "@/modules/settings/repositories/settings.repository.js";
import { SettingsService } from "@/modules/settings/services/settings.service.js";
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
		incomeRepository: asClass(IncomeRepository).singleton(),

		// Services
		usersService: asClass(UsersService).singleton(),
		incomeService: asClass(IncomeService).singleton(),

		// Controllers
		usersController: asClass(UsersController).singleton(),
		incomeController: asClass(IncomeController).singleton(),
		expensesRepository: asClass(ExpensesRepository).singleton(),
		expensesService: asClass(ExpensesService).singleton(),
		expensesController: asClass(ExpensesController).singleton(),
		investmentsRepository: asClass(InvestmentsRepository).singleton(),
		investmentsService: asClass(InvestmentsService).singleton(),
		investmentsController: asClass(InvestmentsController).singleton(),
		goalsRepository: asClass(GoalsRepository).singleton(),
		goalsService: asClass(GoalsService).singleton(),
		goalsController: asClass(GoalsController).singleton(),
		authService: asClass(AuthService).singleton(),
		authController: asClass(AuthController).singleton(),
		networthRepository: asClass(NetworthRepository).singleton(),
		networthService: asClass(NetworthService).singleton(),
		networthController: asClass(NetworthController).singleton(),
		overviewRepository: asClass(OverviewRepository).singleton(),
		overviewService: asClass(OverviewService).singleton(),
		overviewController: asClass(OverviewController).singleton(),
		reportsRepository: asClass(ReportsRepository).singleton(),
		reportsService: asClass(ReportsService).singleton(),
		reportsController: asClass(ReportsController).singleton(),
		projectionsRepository: asClass(ProjectionsRepository).singleton(),
		projectionsService: asClass(ProjectionsService).singleton(),
		projectionsController: asClass(ProjectionsController).singleton(),
		settingsRepository: asClass(SettingsRepository).singleton(),
		settingsService: asClass(SettingsService).singleton(),
		settingsController: asClass(SettingsController).singleton(),
		categoriesRepository: asClass(CategoriesRepository).singleton(),
		categoriesService: asClass(CategoriesService).singleton(),
		categoriesController: asClass(CategoriesController).singleton(),
	});

	return container;
}
