import {
	CursorPaginator,
	FieldResolver,
	ModelResolver,
	RelationResolver,
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
		posts: RelationResolver({ paginate: CursorPaginator({ take: 2 }) }),
		posts_page: RelationResolver({
			modelField: "posts",
			paginate: CursorPaginator({ take: 2 }),
		}),
		posts_by_one: RelationResolver({
			modelField: "posts",
			paginate: CursorPaginator({ take: 1 }),
		}),
		all_posts: "posts",
		all_posts_verbose: RelationResolver({ modelField: "posts" }),
	},
	clean(user, context) {
		if (context.hide_user_with_id && user.id === context.hide_user_with_id) {
			delete user.name
		}
	},
})
