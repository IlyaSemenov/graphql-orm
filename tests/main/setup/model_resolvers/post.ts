import { ModelResolver } from "objection-graphql-resolver"

import { PostModel } from "../models/post"

export const Post = ModelResolver(PostModel, {
	modifier: (query) => {
		query.orderBy("id", "desc")
	},
	// No fields = all allowed
})
