import { GraphQLResolveInfo } from "graphql"

import { PostModel, SectionModel, UserModel } from "./models"

type Resolver<A> = (
	parent: unknown,
	args: A,
	ctx: unknown,
	info: GraphQLResolveInfo,
) => any

export const resolvers: Record<string, Record<string, Resolver<any>>> = {
	Query: {
		user: (parent, { id }, ctx: unknown, info) => {
			return UserModel.query().findById(id).withGraphQL(info)
		},
		sections: async (parent, { filter }, ctx, info) => {
			return SectionModel.query().withGraphQL(info, { filter })
		},
		posts: async (parent, { filter }, ctx, info) => {
			return PostModel.query().withGraphQL(info, { filter })
		},
	},
}
