import swagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	await fastify.register(swagger, {
		openapi: {
			info: {
				title: "API",
				description: "API Documentation",
				version: "1.0.0",
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
					},
				},
			},
			security: [{ bearerAuth: [] }],
		},
	});

	await fastify.register(scalarApiReference, {
		routePrefix: "/docs",
		configuration: {
			spec: {
				content: () => fastify.swagger(),
			},
		},
	});
});
