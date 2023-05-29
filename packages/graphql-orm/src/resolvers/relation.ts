import { FiltersDef } from "../filters/filters"
import { FieldResolver, FieldResolverOptions } from "./field"
import { TableResolveModifier } from "./table"

export interface RelationResolverOptions<Query = unknown>
	extends Omit<FieldResolverOptions<Query>, "modify"> {
	filters?: FiltersDef
	modify?: TableResolveModifier<Query>
}

export function defineRelationResolver<Query = unknown>(
	options: RelationResolverOptions<Query> = {}
): FieldResolver<Query> {
	const { tableField, filters, modify } = options

	return function resolve(query, context) {
		const { graph, field } = context
		return graph.orm.select_relation(query, {
			relation: tableField || field,
			as: field,
			modify(subquery) {
				subquery = graph._resolve_type(subquery, { ...context, filters })
				return modify ? modify(subquery, context) : subquery
			},
		})
	}
}
