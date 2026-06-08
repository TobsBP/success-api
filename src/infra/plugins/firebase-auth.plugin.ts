import { eq } from "drizzle-orm";
import fp from "fastify-plugin";
import admin from "firebase-admin";
import {
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "../../core/errors/index.js";
import { getDb } from "../db/client.js";
import { users } from "../db/schema/index.js";

declare module "fastify" {
	interface FastifyRequest {
		authUser: {
			id: string;
			email: string;
			name: string;
			companyId: string | null;
		};
	}
	interface FastifyContextConfig {
		tenancy?: boolean;
		isPublic?: boolean;
	}
}

let firebaseApp: admin.app.App;

function getFirebaseApp() {
	if (!firebaseApp) {
		firebaseApp = admin.initializeApp({
			credential: admin.credential.cert({
				projectId: process.env.FIREBASE_PROJECT_ID,
				clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
				privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
			}),
		});
	}
	return firebaseApp;
}

export default fp(async (fastify) => {
	const db = getDb();

	// Adiciona o decorator para ser usado nas rotas
	fastify.decorate("publicRoute", { isPublic: true });

	fastify.addHook("onRequest", async (request, _reply) => {
		// Ignora rotas de documentação e rotas marcadas explicitamente como públicas
		if (
			request.url.startsWith("/docs") ||
			request.url.startsWith("/openapi.json") ||
			request.routeOptions?.config?.isPublic
		) {
			return;
		}

		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			throw new UnauthorizedError("Missing or invalid Authorization header");
		}

		const token = authHeader.slice(7);

		let decoded: admin.auth.DecodedIdToken;
		try {
			decoded = await getFirebaseApp().auth().verifyIdToken(token);
		} catch {
			throw new UnauthorizedError("Invalid or expired token");
		}

		if (!decoded.email) {
			throw new UnauthorizedError("Token does not contain an email address");
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, decoded.email))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User", decoded.email);
		}

		const requiresTenancy = request.routeOptions?.config?.tenancy !== false;
		if (requiresTenancy) {
			const companyId = request.headers["x-company-id"] as string;
			if (!companyId) {
				throw new ForbiddenError("Missing x-company-id header");
			}
			request.authUser = { ...user, companyId };
		} else {
			request.authUser = { ...user, companyId: user.companyId ?? null };
		}
	});
});
