import { ApolloServer, ApolloServerOptions } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { afterAll } from "vitest"

export interface ResolverContext {
	user_id: number | null
}

export type Resolvers = ApolloServerOptions<any>["resolvers"]

export type ServerConfig = Required<
	Pick<ApolloServerOptions<ResolverContext>, "typeDefs" | "resolvers">
>

export async function create_server(config: ServerConfig) {
	const server = new ApolloServer<ResolverContext>(config)
	const { url } = await startStandaloneServer(server, {
		listen: { port: 0 },
		async context({ req }) {
			const user_id = Number(req.headers.user_id) || null
			return { user_id }
		},
	})
	afterAll(async () => {
		await server.stop()
	})
	return url
}
