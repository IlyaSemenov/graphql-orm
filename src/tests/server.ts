import { ApolloServer } from "apollo-server"
import { GraphQLResolveInfo } from "graphql"

import { resolvers } from "./resolvers"
import { schema } from "./schema"

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

export function create_server() {
	return new ApolloServer({
		typeDefs: schema,
		resolvers,
		context: ({ req }): ResolverContext => {
			const user_id = Number(req.headers.user_id) || null
			return { user_id }
		},
	})
}
