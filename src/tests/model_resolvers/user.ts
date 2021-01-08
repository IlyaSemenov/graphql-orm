import {
	CursorPaginator,
	FieldResolver,
	ModelResolver,
} from "objection-graphql-resolver"

import { UserModel } from "../models/user"

export const User = ModelResolver(UserModel, {
	fields: {
		id: true,
		name: true,
		password: FieldResolver({
			clean(password, user, context) {
				if (context.user_id && context.user_id === user.id) {
					return password
				} else {
					return undefined
				}
			},
		}),
		posts: FieldResolver({ paginate: CursorPaginator({ take: 2 }) }),
		posts_page: FieldResolver({
			modelField: "posts",
			paginate: CursorPaginator({ take: 2 }),
		}),
		posts_by_one: FieldResolver({
			modelField: "posts",
			paginate: CursorPaginator({ take: 1 }),
		}),
		all_posts: "posts",
		all_posts_verbose: FieldResolver({ modelField: "posts" }),
	},
})
