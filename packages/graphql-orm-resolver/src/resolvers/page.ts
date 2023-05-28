import { GetPageFn, Paginator } from "../paginators/base"
import { FieldResolver } from "./field"
import { RelationResolverOptions } from "./relation"

export function definePageResolver(
	paginator: Paginator,
	options: RelationResolverOptions = {}
): FieldResolver {
	const { tableField, modify } = options

	return function resolve(query, context) {
		const { graph, field } = context
		let get_page: GetPageFn | undefined
		query = graph.orm.select_relation(query, {
			relation: tableField || field,
			as: field,
			modify(subquery) {
				subquery = graph._resolve_page(subquery, paginator, context)
				get_page = graph.orm.get_subquery_pagination_handler(subquery)
				return modify ? modify(subquery, context) : subquery
			},
		})
		if (!get_page) {
			throw new Error(
				`Internal error in ${context.type}.${context.field} pagination: subquery modifier didn't set get_page.`
			)
		}
		query = graph.orm.finish_subquery_pagination(query, field, get_page)
		return query
	}
}
