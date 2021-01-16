import { raw } from "objection"
import {
	CursorPaginator,
	ModelResolver,
	RelationResolver,
} from "objection-graphql-resolver"

import { SectionModel } from "../models/section"

export const Section = ModelResolver(SectionModel, {
	modifier: (query) => {
		query.orderBy("name")
	},
	fields: {
		id: true,
		name: true,
		slug: true,
		url: (query) => query.select("slug"),
		upper_slug: (query) => query.select(raw("upper(slug) as upper_slug")),
		posts: RelationResolver({
			filter: true,
			paginate: CursorPaginator({ take: 2 }),
		}),
	},
})
