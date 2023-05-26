import { overrideParserInQuery } from "orchid-core"

import { get_query_pagination_handler, Paginator } from "../paginators/base"
import { defineFieldResolver } from "./field"
import { RelationResolverOptions } from "./relation"

export function definePageResolver(
	paginator: Paginator,
	options: RelationResolverOptions = {}
) {
	const { tableField, modify } = options

	return defineFieldResolver({
		modify(query, context) {
			const { field, graph } = context
			// FIXME: refactor, add types
			let get_page: any
			query = query.select({
				[field]: (q) => {
					q = graph._resolve_page(
						(q as any)[tableField || field],
						paginator,
						context
					)
					// Calling addParserToQuery here doesn't work, save the paginator for later.
					get_page = get_query_pagination_handler(q)
					return modify ? modify(q, context) : q
				},
			})
			overrideParserInQuery(query.query, field, get_page)
			return query
		},
	})
}
