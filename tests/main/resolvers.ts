import { CursorPaginator } from "objection-graphql-resolver"

import { Resolvers } from "../setup"
import { resolve_graph } from "./graph"
import { PostModel } from "./models/post"
import { SectionModel } from "./models/section"
import { UserModel } from "./models/user"

export const resolvers: Resolvers = {
	Query: {
		user: async (_parent, { id }, ctx, info) => {
			const user = await resolve_graph(
				ctx,
				info,
				UserModel.query().findById(id)
			)
			return user
		},
		section: async (parent, { slug }, ctx, info) => {
			const section = await resolve_graph(
				ctx,
				info,
				SectionModel.query().findOne({ slug })
			)
			return section
		},
		sections: async (parent, args, ctx, info) => {
			const page = await resolve_graph(ctx, info, SectionModel.query(), {
				paginate: CursorPaginator({
					take: 2,
					fields: ["name", "-id"],
				}),
			})
			return page
		},
		posts: async (parent, args, ctx, info) => {
			const page = await resolve_graph(
				ctx,
				info,
				PostModel.query().context({
					hide_user_with_id: 3,
				}),
				{
					paginate: CursorPaginator({ take: 2, fields: ["-id"] }),
					filter: true,
				}
			)
			return page
		},
	},
}

declare module "objection-graphql-resolver" {
	interface ResolverContext {
		hide_user_with_id?: number
	}
}
