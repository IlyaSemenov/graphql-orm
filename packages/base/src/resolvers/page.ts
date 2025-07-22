import type { OrmAdapter } from "../orm/orm"
import type { Paginator } from "../paginators/base"

import type { FieldResolver } from "./field"
import { parseFieldOptions } from "./field"
import type { RelationResolverOptions } from "./relation"

export function definePageResolver<Orm extends OrmAdapter, Context>(
	paginator: Paginator<Orm, Context>,
	options: RelationResolverOptions<Orm, Context> = {},
): FieldResolver<Orm, Context> {
	const { tableField, modify } = parseFieldOptions(options)

	return function resolve(query, context) {
		const { graph, field } = context
		// Objection.js requires a workaround to handle paginated content,
		// it must be saved into context and re-injected later.
		// The modify + finish is a no-op in Orchid.
		const paginationContext = {}
		query = graph.orm.selectRelation(query, {
			relation: tableField || field,
			as: field,
			modify(subquery) {
				subquery = modify ? modify(subquery, context) : subquery
				subquery = graph._resolvePage(subquery, paginator, context)
				subquery = graph.orm.modifySubqueryPagination(
					subquery,
					paginationContext,
				)
				return subquery
			},
		})
		query = graph.orm.finishQueryPagination(query, field, paginationContext)
		return query
	}
}
