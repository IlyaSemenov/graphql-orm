import { ApolloServer, ApolloServerOptions } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { GraphQLResolveInfo } from "graphql"
import { GraphQLClient } from "graphql-request"

export interface ResolverContext {
	user_id: number | null
}

export type Resolver<A> = (
	parent: unknown,
	args: A,
	ctx: ResolverContext,
	info: GraphQLResolveInfo
) => any

export type Resolvers = Partial<
	Record<"Query" | "Mutation", Record<string, Resolver<any>>>
>

export type ServerConfig = Required<
	Pick<ApolloServerOptions<ResolverContext>, "typeDefs" | "resolvers">
>

export async function setup_client(tap: Tap.Test, config: ServerConfig) {
	const server = new ApolloServer<ResolverContext>(config)
	const { url } = await startStandaloneServer(server, {
		listen: { port: 0 },
		async context({ req }) {
			const user_id = Number(req.headers.user_id) || null
			return { user_id }
		},
	})
	tap.teardown(async () => {
		await server.stop()
	})
	const client = new GraphQLClient(url)

	return client
}
