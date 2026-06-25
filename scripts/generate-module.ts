import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

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

const toSnakeCase = (str: string) =>
	str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// --- Coleta interativa de campos ---

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
const ask = (question: string): Promise<string> =>
	new Promise((resolve) => rl.question(question, resolve));

const FIELD_TYPES = [
	"varchar",
	"text",
	"integer",
	"boolean",
	"uuid",
	"timestamp",
	"jsonb",
	"numeric",
] as const;
type FieldType = (typeof FIELD_TYPES)[number];

interface FieldRef {
	table: string;
	column: string;
	file: string;
}

interface Field {
	name: string;
	type: FieldType;
	length?: number;
	nullable: boolean;
	references?: FieldRef;
}

// Lê tabelas existentes no schema Drizzle para sugerir como FK
const schemaDir = path.join(process.cwd(), "src", "infra", "db", "schema");
const existingTables: Array<{ tableName: string; file: string }> = [];
if (fs.existsSync(schemaDir)) {
	const schemaFiles = fs
		.readdirSync(schemaDir)
		.filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== `${moduleName}.ts`);
	for (const file of schemaFiles) {
		const content = fs.readFileSync(path.join(schemaDir, file), "utf-8");
		for (const match of content.matchAll(/export const (\w+) = pgTable\(/g)) {
			existingTables.push({ tableName: match[1], file: file.replace(".ts", "") });
		}
	}
}

console.log(`\n🚀 Gerando módulo: ${moduleName}`);
console.log(
	"ℹ️  Os campos id, createdAt e updatedAt são adicionados automaticamente.",
);
console.log("ℹ️  Digite o nome do campo ou pressione Enter vazio para finalizar.\n",
);

const fields: Field[] = [];
let fieldIndex = 1;

while (true) {
	console.log(`── Campo ${fieldIndex} ──`);
	const name = (await ask("  Nome (camelCase, Enter para sair): ")).trim();
	if (!name) break;

	console.log("  Tipo:");
	FIELD_TYPES.forEach((t, idx) => console.log(`    ${idx + 1}. ${t}`));
	const typeIdxStr = await ask("  Escolha o número: ");
	const typeIdx = parseInt(typeIdxStr) - 1;
	const type: FieldType = FIELD_TYPES[typeIdx] ?? "varchar";

	let length: number | undefined;
	if (type === "varchar") {
		const lengthStr = await ask("  Tamanho máximo? (padrão: 255) ");
		length = parseInt(lengthStr) || 255;
	}

	const nullableStr = await ask("  Permite nulo? (s/N) ");
	const nullable = nullableStr.trim().toLowerCase() === "s";

	let references: FieldRef | undefined;
	if (existingTables.length > 0) {
		const fkStr = await ask("  É chave estrangeira? (s/N) ");
		if (fkStr.trim().toLowerCase() === "s") {
			console.log("  Tabelas disponíveis:");
			existingTables.forEach((t, idx) =>
				console.log(`    ${idx + 1}. ${t.tableName} (${t.file}.ts)`),
			);
			const tableIdxStr = await ask("  Referencia qual tabela? ");
			const ref = existingTables[parseInt(tableIdxStr) - 1];
			if (ref) {
				const colStr = await ask("  Coluna referenciada? (padrão: id) ");
				references = {
					table: ref.tableName,
					column: colStr.trim() || "id",
					file: ref.file,
				};
			}
		}
	}

	fields.push({ name, type, length, nullable, references });
	fieldIndex++;
	console.log("");
}

console.log("");

// --- Helpers de geração ---

function drizzleColumn(field: Field): string {
	const col = toSnakeCase(field.name);
	let def: string;
	switch (field.type) {
		case "varchar":
			def = `varchar("${col}", { length: ${field.length ?? 255} })`;
			break;
		case "text":
			def = `text("${col}")`;
			break;
		case "integer":
			def = `integer("${col}")`;
			break;
		case "boolean":
			def = `boolean("${col}")`;
			break;
		case "uuid":
			def = `uuid("${col}")`;
			break;
		case "timestamp":
			def = `timestamp("${col}")`;
			break;
		case "jsonb":
			def = `jsonb("${col}")`;
			break;
		case "numeric":
			def = `numeric("${col}")`;
			break;
	}
	if (field.references) {
		def += `.references(() => ${field.references.table}.${field.references.column})`;
	}
	if (!field.nullable) def += ".notNull()";
	return `\t${field.name}: ${def},`;
}

function typeboxField(field: Field): string {
	let typeStr: string;
	switch (field.type) {
		case "varchar":
		case "text":
			typeStr = "Type.String()";
			break;
		case "integer":
			typeStr = "Type.Integer()";
			break;
		case "boolean":
			typeStr = "Type.Boolean()";
			break;
		case "uuid":
			typeStr = "UuidSchema";
			break;
		case "timestamp":
			typeStr = 'Type.String({ format: "date-time" })';
			break;
		case "jsonb":
			typeStr = "Type.Unknown()";
			break;
		case "numeric":
			typeStr = "Type.Number()";
			break;
		default:
			typeStr = "Type.String()";
	}
	if (field.nullable) typeStr = `Type.Optional(${typeStr})`;
	return `    ${field.name}: ${typeStr},`;
}

function toDtoField(field: Field): string {
	if (field.type === "timestamp") {
		const expr = field.nullable
			? `row.${field.name}?.toISOString() ?? null`
			: `row.${field.name}.toISOString()`;
		return `            ${field.name}: ${expr},`;
	}
	return `            ${field.name}: row.${field.name},`;
}

// Imports Drizzle dinâmicos baseados nos tipos usados
const drizzleImportSet = new Set<string>(["pgTable", "timestamp", "uuid"]);
for (const f of fields) {
	if (f.type !== "uuid" && f.type !== "timestamp") {
		drizzleImportSet.add(f.type);
	}
}
const drizzleImportLine = `import { ${[...drizzleImportSet].sort().join(", ")} } from "drizzle-orm/pg-core";`;

// Imports relativos para tabelas referenciadas (sem @/ — drizzle-kit não resolve paths)
const referencedFiles = [
	...new Map(
		fields
			.filter((f) => f.references)
			.map((f) => [f.references!.file, f.references!]),
	).values(),
];
const refImportLines = referencedFiles
	.map((r) => `import { ${r.table} } from "./${r.file}.js";`)
	.join("\n");

const customDrizzleColumns = fields.map(drizzleColumn).join("\n");
const customTypeboxFields = fields.map((f) => typeboxField(f)).join("\n");
const customToDtoFields = fields.map(toDtoField).join("\n");

const dtoFieldsBlock = customTypeboxFields ? `\n${customTypeboxFields}` : "";
const drizzleColumnsBlock = customDrizzleColumns
	? `\n${customDrizzleColumns}`
	: "";
const toDtoFieldsBlock = customToDtoFields ? `\n${customToDtoFields}` : "";
const createBodyBlock =
	customTypeboxFields || "    // adicione campos de criação aqui";

// --- Criação de pastas ---

const baseDir = path.join(process.cwd(), "src", "modules", moduleName);
const dirs = [
	"controllers",
	"services",
	"repositories",
	"routes",
	"schemas",
	"interfaces",
];

if (!fs.existsSync(baseDir)) {
	for (const dir of dirs) {
		fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
	}
}

// --- Templates ---

// 1. Schema TypeBox
const schemaContent = `import { Type, Static } from "@sinclair/typebox";
import { UuidSchema, PaginationQuerySchema, PaginatedResponse } from "@/shared/schemas/common.js";

export const ${singularCapitalized}Schema = Type.Object({
    id: UuidSchema,${dtoFieldsBlock}
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
});

export const Create${singularCapitalized}BodySchema = Type.Object({
${createBodyBlock}
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

// 2. Drizzle schema (sem alias @/ — drizzle-kit não resolve tsconfig paths)
const drizzleSchemaContent = `${drizzleImportLine}
${refImportLines ? `${refImportLines}\n` : ""}
export const ${moduleName} = pgTable("${moduleName}", {
\tid: uuid("id").primaryKey().defaultRandom(),${drizzleColumnsBlock}
\tcreatedAt: timestamp("created_at").notNull().defaultNow(),
\tupdatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ${singularCapitalized} = typeof ${moduleName}.$inferSelect;
export type New${singularCapitalized} = typeof ${moduleName}.$inferInsert;
`;

// 3. Interfaces
const repoInterfaceContent = `import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "@/modules/${moduleName}/schemas/index.js";

export interface I${capitalizedName}Repository {
    findById(id: string): Promise<${singularCapitalized}Dto | null>;
    create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto>;
}
`;

const serviceInterfaceContent = `import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "@/modules/${moduleName}/schemas/index.js";

export interface I${capitalizedName}Service {
    getById(id: string): Promise<${singularCapitalized}Dto>;
    create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto>;
}
`;

// 4. Repository (com queries Drizzle reais)
const repoContent = `import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { ${moduleName} } from "@/infra/db/schema/index.js";
import type { I${capitalizedName}Repository } from "@/modules/${moduleName}/interfaces/${moduleName}.repository.interface.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "@/modules/${moduleName}/schemas/index.js";

export class ${capitalizedName}Repository implements I${capitalizedName}Repository {
    private db: Db;
    constructor({ db }: { db: Db }) {
        this.db = db;
    }

    async findById(id: string): Promise<${singularCapitalized}Dto | null> {
        const [row] = await this.db
            .select()
            .from(${moduleName})
            .where(eq(${moduleName}.id, id));
        return row ? this.toDto(row) : null;
    }

    async create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto> {
        const [row] = await this.db
            .insert(${moduleName})
            .values(data)
            .returning();
        return this.toDto(row);
    }

    private toDto(row: typeof ${moduleName}.$inferSelect): ${singularCapitalized}Dto {
        return {
            id: row.id,${toDtoFieldsBlock}
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
}
`;

// 5. Service
const serviceContent = `import { NotFoundError } from "@/core/errors/index.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import type { I${capitalizedName}Repository } from "@/modules/${moduleName}/interfaces/${moduleName}.repository.interface.js";
import type { I${capitalizedName}Service } from "@/modules/${moduleName}/interfaces/${moduleName}.service.interface.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Dto } from "@/modules/${moduleName}/schemas/index.js";

const CACHE_TTL_SECONDS = 60;
const cacheKey = (id: string) => \`${singularName}:\${id}\`;

export class ${capitalizedName}Service implements I${capitalizedName}Service {
    private repo: I${capitalizedName}Repository;
    private cache: CacheService;
    constructor({
        ${moduleName}Repository,
        cache,
    }: {
        ${moduleName}Repository: I${capitalizedName}Repository;
        cache: CacheService;
    }) {
        this.repo = ${moduleName}Repository;
        this.cache = cache;
    }

    async getById(id: string): Promise<${singularCapitalized}Dto> {
        const cached = await this.cache.get<${singularCapitalized}Dto>(cacheKey(id));
        if (cached) return cached;

        const item = await this.repo.findById(id);
        if (!item) throw new NotFoundError("${singularCapitalized}", id);

        await this.cache.set(cacheKey(id), item, CACHE_TTL_SECONDS);
        return item;
    }

    async create(data: Create${singularCapitalized}Body): Promise<${singularCapitalized}Dto> {
        return this.repo.create(data);
    }
}
`;

// 6. Controller
const controllerContent = `import type { FastifyRequest, FastifyReply } from "fastify";
import type { I${capitalizedName}Service } from "@/modules/${moduleName}/interfaces/${moduleName}.service.interface.js";
import type { Create${singularCapitalized}Body, ${singularCapitalized}Params } from "@/modules/${moduleName}/schemas/index.js";

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

// 7. Routes
const routesContent = `import type { FastifyInstance } from "fastify";
import { container } from "@/core/di/container.js";
import type { ${capitalizedName}Controller } from "@/modules/${moduleName}/controllers/${moduleName}.controller.js";
import {
    ${singularCapitalized}Schema,
    Create${singularCapitalized}BodySchema,
    ${singularCapitalized}ParamsSchema,
} from "@/modules/${moduleName}/schemas/index.js";

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

// 8. Tests
const serviceTestContent = `import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ${capitalizedName}Service } from "./${moduleName}.service.js";
import type { I${capitalizedName}Repository } from "@/modules/${moduleName}/interfaces/${moduleName}.repository.interface.js";
import type { CacheService } from "@/infra/cache/cache.service.js";
import { NotFoundError } from "@/core/errors/index.js";

describe("${capitalizedName}Service", () => {
    let service: ${capitalizedName}Service;
    let mockRepo: {
        findById: Mock;
        create: Mock;
    };
    let mockCache: {
        get: Mock;
        set: Mock;
        del: Mock;
    };

    beforeEach(() => {
        mockRepo = {
            findById: vi.fn(),
            create: vi.fn(),
        };
        mockCache = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
            del: vi.fn(),
        };
        service = new ${capitalizedName}Service({
            ${moduleName}Repository: mockRepo as unknown as I${capitalizedName}Repository,
            cache: mockCache as unknown as CacheService,
        });
    });

    it("should find an item by id and cache it on a miss", async () => {
        const item = { id: "123" };
        mockRepo.findById.mockResolvedValue(item);
        await expect(service.getById("123")).resolves.toEqual(item);
        expect(mockCache.set).toHaveBeenCalled();
    });

    it("should return the cached item without hitting the repository", async () => {
        const item = { id: "123" };
        mockCache.get.mockResolvedValue(item);
        await expect(service.getById("123")).resolves.toEqual(item);
        expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if item is not found", async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.getById("123")).rejects.toThrow(NotFoundError);
    });
});
`;

const routesTestContent = `import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { ${capitalizedName}Controller } from "@/modules/${moduleName}/controllers/${moduleName}.controller.js";
import type { I${capitalizedName}Service } from "@/modules/${moduleName}/interfaces/${moduleName}.service.interface.js";

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
        const item = { id: "123" };
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

// --- Escrever arquivos ---

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

// --- Drizzle schema ---
const drizzleSchemaDir = path.join(
	process.cwd(),
	"src",
	"infra",
	"db",
	"schema",
);
const drizzleSchemaFile = path.join(drizzleSchemaDir, `${moduleName}.ts`);
fs.writeFileSync(drizzleSchemaFile, drizzleSchemaContent);
console.log(
	`🗄️  Schema Drizzle criado em src/infra/db/schema/${moduleName}.ts`,
);

const drizzleIndexPath = path.join(drizzleSchemaDir, "index.ts");
if (fs.existsSync(drizzleIndexPath)) {
	let drizzleIndexContent = fs.readFileSync(drizzleIndexPath, "utf-8");
	const exportLine = `export * from "./${moduleName}.js";`;
	if (!drizzleIndexContent.includes(exportLine)) {
		drizzleIndexContent = drizzleIndexContent.trimEnd() + `\n${exportLine}\n`;
		fs.writeFileSync(drizzleIndexPath, drizzleIndexContent);
		console.log("🔗 Schema exportado em src/infra/db/schema/index.ts");
	}
}

// --- Auto-registro em src/modules/index.ts ---
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

// --- Auto-registro no Container de DI ---
const containerPath = path.join(
	process.cwd(),
	"src",
	"core",
	"di",
	"container.ts",
);
if (fs.existsSync(containerPath)) {
	let containerContent = fs.readFileSync(containerPath, "utf-8");

	const repoImport = `import { ${capitalizedName}Repository } from "@/modules/${moduleName}/repositories/${moduleName}.repository.js";`;
	const serviceImport = `import { ${capitalizedName}Service } from "@/modules/${moduleName}/services/${moduleName}.service.js";`;
	const controllerImport = `import { ${capitalizedName}Controller } from "@/modules/${moduleName}/controllers/${moduleName}.controller.js";`;

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
	`\n✅ Módulo ${moduleName} criado com sucesso em src/modules/${moduleName}`,
);

// --- Prompt para db:generate e db:migrate ---

const generateAnswer = await ask(
	"\n📦 Deseja rodar db:generate para criar a migration? (s/N) ",
);

if (generateAnswer.trim().toLowerCase() === "s") {
	console.log("\n⚙️  Rodando npm run db:generate...");
	execSync("npm run db:generate", { stdio: "inherit" });

	const migrateAnswer = await ask(
		"\n🚀 Deseja rodar db:migrate para aplicar a migration? (s/N) ",
	);

	if (migrateAnswer.trim().toLowerCase() === "s") {
		console.log("\n⚙️  Rodando npm run db:migrate...");
		execSync("npm run db:migrate", { stdio: "inherit" });
		console.log("✅ Migration aplicada com sucesso!");
	} else {
		console.log(
			'⏭️  Migration não aplicada. Rode "npm run db:migrate" quando estiver pronto.',
		);
	}
} else {
	console.log(
		'⏭️  Pulando migrations. Rode "npm run db:generate && npm run db:migrate" quando estiver pronto.',
	);
}

rl.close();
