import { addParserToQuery } from "pqb"

import { get_query_pagination_handler, Paginator } from "../paginators/base"
import { defineFieldResolver } from "./field"
import { RelationResolverOptions } from "./relation"

export function definePageResolver(
	paginator: Paginator,
	options: RelationResolverOptions = {}
) {
	const { tableField, filters, modify } = options

	return defineFieldResolver({
		modify: (query, { field, tree, graph }) =>
			query.select({
				[field]: (q) => {
					const page_query = graph._resolve_page({
						tree,
						query: (q as any)[tableField || field],
						paginator,
						filters,
					})
					const get_page = get_query_pagination_handler(page_query)
					addParserToQuery(page_query.query, field, get_page as any)
					return modify ? modify(page_query, tree) : page_query
				},
			}),
	})
}
