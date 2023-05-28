import { FiltersDef } from "../filters/filters"
import { FieldResolver, FieldResolverOptions } from "./field"
import { TableResolveModifier } from "./table"

export interface RelationResolverOptions
	extends Omit<FieldResolverOptions, "modify"> {
	filters?: FiltersDef
	modify?: TableResolveModifier
}

export function defineRelationResolver(
	options: RelationResolverOptions = {}
): FieldResolver {
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
