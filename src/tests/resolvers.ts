import { GraphQLResolveInfo } from "graphql"

import { PostModel, UserModel } from "./models"

type Resolver<A> = (
	parent: unknown,
	args: A,
	ctx: unknown,
	info: GraphQLResolveInfo,
) => any

export const resolvers: Record<string, Record<string, Resolver<any>>> = {
	Query: {
		user: (parent, { id }, ctx: unknown, info) => {
			return UserModel.query().findById(id).fetchGraphQL(info)
		},
		posts: async (parent, { filter }, ctx, info) => {
			return PostModel.query().fetchGraphQL(info, { filter })
		},
	},
}
