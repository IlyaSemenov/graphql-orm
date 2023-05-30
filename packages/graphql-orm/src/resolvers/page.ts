import { OrmAdapter } from "../orm/orm"
import { Paginator } from "../paginators/base"
import { FieldResolver } from "./field"
import { RelationResolverOptions } from "./relation"

export function definePageResolver<Orm extends OrmAdapter>(
	paginator: Paginator<Orm>,
	options: RelationResolverOptions<Orm> = {}
): FieldResolver<Orm> {
	const { tableField, modify } = options

	return function resolve(query, context) {
		const { graph, field } = context
		const pagination_context = {}
		query = graph.orm.select_relation(query, {
			relation: tableField || field,
			as: field,
			modify(subquery) {
				subquery = graph._resolve_page(subquery, paginator, context)
				// The modify+finish hack is needed for both Objection and Orchid (with completely different implementations)
				subquery = graph.orm.modify_subquery_pagination(
					subquery,
					pagination_context
				)
				return modify ? modify(subquery, context) : subquery
			},
		})
		query = graph.orm.finish_query_pagination(query, field, pagination_context)
		return query
	}
}
