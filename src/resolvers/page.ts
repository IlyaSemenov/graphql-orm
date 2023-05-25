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
		modify: (query, { field, tree, graph }) => {
			// FIXME: refactor, add types
			let get_page: any
			query = query.select({
				[field]: (q) => {
					q = graph._resolve_page({
						tree,
						query: (q as any)[tableField || field],
						paginator,
						filters,
					})
					// Calling addParserToQuery here doesn't work, save the paginator for later.
					get_page = get_query_pagination_handler(q)
					return modify ? modify(q, tree) : q
				},
			})
			const parser = query.query.parsers?.[field]
			addParserToQuery(query.query, field, (nodes) => {
				nodes = parser ? parser(nodes) : nodes
				return get_page(nodes)
			})
			return query
		},
	})
}
