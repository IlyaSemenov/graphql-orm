import { ApolloServer, Config } from "apollo-server"
import { GraphQLResolveInfo } from "graphql"
import { GraphQLClient } from "graphql-request"
import tap from "tap"

type Test = typeof tap.Test.prototype

export interface ResolverContext {
	user_id: number | null
}

export type Resolver<A> = (
	parent: unknown,
	args: A,
	ctx: ResolverContext,
	info: GraphQLResolveInfo,
) => any

export type Resolvers = Record<"Query", Record<string, Resolver<any>>>

export type ServerConfig = Required<Pick<Config, "typeDefs" | "resolvers">>

export async function use_server(tap: Test, config: ServerConfig) {
	const server = new ApolloServer({
		...config,
		context: ({ req }): ResolverContext => {
			const user_id = Number(req.headers.user_id) || null
			return { user_id }
		},
	})
	tap.teardown(async () => {
		await server.stop()
	})
	const { url } = await server.listen(0)
	const client = new GraphQLClient(url)
	return { client }
}
