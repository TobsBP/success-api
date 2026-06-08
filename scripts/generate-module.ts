import fs from "node:fs";
import path from "node:path";

const moduleName = process.argv[2];

if (!moduleName) {
	console.error("❌ Por favor, forneça o nome do módulo (ex: products)");
	process.exit(1);
}

const singularName = moduleName.endsWith("s")
	? moduleName.slice(0, -1)
	: moduleName;
const capitalizedName =
	moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
const singularCapitalized =
	singularName.charAt(0).toUpperCase() + singularName.slice(1);

const baseDir = path.join(process.cwd(), "src", "modules", moduleName);

const dirs = [
	"controllers",
	"services",
	"repositories",
	"routes",
	"schemas",
	"interfaces",
];

// Criar pastas
console.log(`🚀 Gerando módulo: ${moduleName}...`);
if (!fs.existsSync(baseDir)) {
	for (const dir of dirs) {
		fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
	}
}

// 1. Schema
const schemaContent = `import { Type, Static } from "@sinclair/typebox";
import { UuidSchema, PaginationQuerySchema, PaginatedResponse } from "../../../shared/schemas/common.js";

export const ${singularCapitalized}Schema = Type.Object({
    id: UuidSchema,
    name: Type.String(),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
});

export const Create${singularCapitalized}BodySchema = Type.Object({
    name: Type.String(),
});

export const Update${singularCapitalized}BodySchema = Type.Partial(Create${singularCapitalized}BodySchema);

export const ${singularCapitalized}ParamsSchema = Type.Object({
    id: UuidSchema,
});

export const List${capitalizedName}QuerySchema = PaginationQuerySchema;
export const Paginated${capitalizedName}Schema = PaginatedResponse(${singularCapitalized}Schema);

export type ${singularCapitalized}Dto = Static<typeof ${singularCapitalized}Schema>;
export type Create${singularCapitalized}Body = Static<typeof Create${singularCapitalized}BodySchema>;
export type Update${singularCapitalized}Body = Static<typeof Update${singularCapitalized}BodySchema>;
export type ${singularCapitalized}Params = Static<typeof ${singularCapitalized}ParamsSchema>;
export type List${capitalizedName}Query = Static<typeof List${capitalizedName}QuerySchema>;
`;

// 2. Interfaces
const repoInterfaceContent = `import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "../schemas/index.js";

export interface I${capitalizedName}Repository {
    findById(id: string): Promise<${singularCapitalized}Dto | null>;
    create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto>;
}
`;

const serviceInterfaceContent = `import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "../schemas/index.js";

export interface I${capitalizedName}Service {
    getById(id: string): Promise<${singularCapitalized}Dto>;
    create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto>;
}
`;

// 3. Repository
const repoContent = `import type { Db } from "../../../infra/db/client.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "../schemas/index.js";
import type { I${capitalizedName}Repository } from "../interfaces/${moduleName}.repository.interface.js";

export class ${capitalizedName}Repository implements I${capitalizedName}Repository {
    private db: Db;
    constructor({ db }: { db: Db }) {
        this.db = db;
    }

    async findById(_id: string): Promise<${singularCapitalized}Dto | null> {
        // Implement database search here
        return null; 
    }

    async create(_data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto> {
        // Implement database insertion here
        return {} as ${singularCapitalized}Dto;
    }
}
`;

// 4. Service
const serviceContent = `import { NotFoundError } from "../../../core/errors/index.js";
import type { I${capitalizedName}Repository } from "../interfaces/${moduleName}.repository.interface.js";
import type { I${capitalizedName}Service } from "../interfaces/${moduleName}.service.interface.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "../schemas/index.js";

export class ${capitalizedName}Service implements I${capitalizedName}Service {
    private repo: I${capitalizedName}Repository;
    constructor({ ${moduleName}Repository }: { ${moduleName}Repository: I${capitalizedName}Repository }) {
        this.repo = ${moduleName}Repository;
    }

    async getById(id: string): Promise<${singularCapitalized}Dto> {
        const item = await this.repo.findById(id);
        if (!item) throw new NotFoundError("${singularCapitalized}", id);
        return item;
    }

    async create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto> {
        return this.repo.create(data);
    }
}
`;

// 5. Controller
const controllerContent = `import type { FastifyRequest, FastifyReply } from "fastify";
import type { I${capitalizedName}Service } from "../interfaces/${moduleName}.service.interface.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Params } from "../schemas/index.js";

export class ${capitalizedName}Controller {
    private service: I${capitalizedName}Service;
    constructor({ ${moduleName}Service }: { ${moduleName}Service: I${capitalizedName}Service }) {
        this.service = ${moduleName}Service;
    }

    getById = async (request: FastifyRequest<{ Params: ${singularCapitalized}Params }>, reply: FastifyReply) => {
        const result = await this.service.getById(request.params.id);
        return reply.send(result);
    };

    create = async (request: FastifyRequest<{ Body: Create${singularCapitalized}Body }>, reply: FastifyReply) => {
        const result = await this.service.create(request.body);
        return reply.status(201).send(result);
    };
}
`;

// 6. Routes
const routesContent = `import type { FastifyInstance } from "fastify";
import { container } from "../../../core/di/container.js";
import type { ${capitalizedName}Controller } from "../controllers/${moduleName}.controller.js";
import {
    ${singularCapitalized}Schema,
    Create${singularCapitalized}BodySchema,
    ${singularCapitalized}ParamsSchema,
} from "../schemas/index.js";

export async function ${moduleName}Routes(fastify: FastifyInstance) {
    const controller = container.resolve<${capitalizedName}Controller>("${moduleName}Controller");

    fastify.get(
        "/:id",
        {
            schema: {
                tags: ["${capitalizedName}"],
                params: ${singularCapitalized}ParamsSchema,
                response: { 200: ${singularCapitalized}Schema },
            },
        },
        controller.getById,
    );

    fastify.post(
        "/",
        {
            schema: {
                tags: ["${capitalizedName}"],
                body: Create${singularCapitalized}BodySchema,
                response: { 201: ${singularCapitalized}Schema },
            },
        },
        controller.create,
    );
}
`;

// 7. Tests
const serviceTestContent = `import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ${capitalizedName}Service } from "./${moduleName}.service.js";
import type { I${capitalizedName}Repository } from "../interfaces/${moduleName}.repository.interface.js";
import { NotFoundError } from "../../../core/errors/index.js";

describe("${capitalizedName}Service", () => {
    let service: ${capitalizedName}Service;
    let mockRepo: {
        findById: Mock;
        create: Mock;
    };

    beforeEach(() => {
        mockRepo = {
            findById: vi.fn(),
            create: vi.fn(),
        };
        service = new ${capitalizedName}Service({ ${moduleName}Repository: mockRepo as unknown as I${capitalizedName}Repository });
    });

    it("should find an item by id", async () => {
        const item = { id: "123", name: "Test" };
        mockRepo.findById.mockResolvedValue(item);
        await expect(service.getById("123")).resolves.toEqual(item);
    });

    it("should throw NotFoundError if item is not found", async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.getById("123")).rejects.toThrow(NotFoundError);
    });
});
`;

const routesTestContent = `import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { ${capitalizedName}Controller } from "../controllers/${moduleName}.controller.js";
import type { I${capitalizedName}Service } from "../interfaces/${moduleName}.service.interface.js";

describe("${capitalizedName} Routes", () => {
    let fastify: FastifyInstance;
    let mockService: {
        getById: Mock;
        create: Mock;
    };

    beforeEach(async () => {
        fastify = Fastify();
        mockService = {
            getById: vi.fn(),
            create: vi.fn(),
        };

        const controller = new ${capitalizedName}Controller({ ${moduleName}Service: mockService as unknown as I${capitalizedName}Service });

        fastify.get("/${moduleName}/:id", controller.getById);
        fastify.post("/${moduleName}", controller.create);

        await fastify.ready();
    });

    afterEach(async () => {
        await fastify.close();
    });

    it("GET /${moduleName}/:id should return item", async () => {
        const item = { id: "123", name: "Test" };
        mockService.getById.mockResolvedValue(item);

        const response = await fastify.inject({
            method: "GET",
            url: "/${moduleName}/123",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(item);
    });
});
`;

fs.writeFileSync(path.join(baseDir, "schemas", "index.ts"), schemaContent);
fs.writeFileSync(
	path.join(baseDir, "interfaces", `${moduleName}.repository.interface.ts`),
	repoInterfaceContent,
);
fs.writeFileSync(
	path.join(baseDir, "interfaces", `${moduleName}.service.interface.ts`),
	serviceInterfaceContent,
);
fs.writeFileSync(
	path.join(baseDir, "repositories", `${moduleName}.repository.ts`),
	repoContent,
);
fs.writeFileSync(
	path.join(baseDir, "services", `${moduleName}.service.ts`),
	serviceContent,
);
fs.writeFileSync(
	path.join(baseDir, "controllers", `${moduleName}.controller.ts`),
	controllerContent,
);
fs.writeFileSync(path.join(baseDir, "routes", "index.ts"), routesContent);
fs.writeFileSync(
	path.join(baseDir, "services", `${moduleName}.service.test.ts`),
	serviceTestContent,
);
fs.writeFileSync(
	path.join(baseDir, "routes", `${moduleName}.routes.test.ts`),
	routesTestContent,
);

// 8. Auto Module Registration in index.ts
const indexPath = path.join(process.cwd(), "src", "modules", "index.ts");
if (fs.existsSync(indexPath)) {
	let indexContent = fs.readFileSync(indexPath, "utf-8");
	const importStatement = `import { ${moduleName}Routes } from "./${moduleName}/routes/index.js";`;
	if (!indexContent.includes(importStatement)) {
		indexContent = `${importStatement}\n${indexContent}`;
	}
	const registerStatement = `    await fastify.register(${moduleName}Routes, { prefix: "/${moduleName}" });`;
	if (!indexContent.includes(registerStatement)) {
		indexContent = indexContent.replace(/}\s*$/, `${registerStatement}\n}`);
	}
	fs.writeFileSync(indexPath, indexContent);
	console.log("🔗 Módulo registrado em src/modules/index.ts");
}

// 9. Auto Registration in DI Container
const containerPath = path.join(
	process.cwd(),
	"src",
	"core",
	"di",
	"container.ts",
);
if (fs.existsSync(containerPath)) {
	let containerContent = fs.readFileSync(containerPath, "utf-8");

	const repoImport = `import { ${capitalizedName}Repository } from "../../modules/${moduleName}/repositories/${moduleName}.repository.js";`;
	const serviceImport = `import { ${capitalizedName}Service } from "../../modules/${moduleName}/services/${moduleName}.service.js";`;
	const controllerImport = `import { ${capitalizedName}Controller } from "../../modules/${moduleName}/controllers/${moduleName}.controller.js";`;

	if (!containerContent.includes(repoImport)) {
		containerContent = `${repoImport}\n${serviceImport}\n${controllerImport}\n${containerContent}`;
	}

	const registrations = [
		`        ${moduleName}Repository: asClass(${capitalizedName}Repository).singleton(),`,
		`        ${moduleName}Service: asClass(${capitalizedName}Service).singleton(),`,
		`        ${moduleName}Controller: asClass(${capitalizedName}Controller).singleton(),`,
	];

	for (const reg of registrations) {
		if (!containerContent.includes(reg)) {
			containerContent = containerContent.replace(
				/(container\.register\(\{[\s\S]*?)(\s*\}\);)/,
				`$1\n${reg}$2`,
			);
		}
	}

	fs.writeFileSync(containerPath, containerContent);
	console.log("🏗️  Módulo registrado no Container de DI");
}

console.log(
	`✅ Módulo ${moduleName} criado com sucesso em src/modules/${moduleName}`,
);
