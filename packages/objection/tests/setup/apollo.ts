import type { ApolloServerOptions } from "@apollo/server"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { afterAll } from "vitest"

export interface ResolverContext {
	userId: number | null
}

export type Resolvers = ApolloServerOptions<any>["resolvers"]

export type ServerConfig = Required<
	Pick<ApolloServerOptions<ResolverContext>, "typeDefs" | "resolvers">
>

export async function createServer(config: ServerConfig) {
	const server = new ApolloServer<ResolverContext>(config)
	const { url } = await startStandaloneServer(server, {
		listen: { port: 0 },
		async context({ req }) {
			const userId = Number(req.headers.user_id) || null
			return { userId }
		},
	})
	afterAll(async () => {
		await server.stop()
	})
	return url
}
