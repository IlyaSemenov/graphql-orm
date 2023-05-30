import { FiltersDef } from "../filters/filters"
import { OrmAdapter } from "../orm/orm"
import { FieldResolver, FieldResolverOptions } from "./field"
import { TableResolveModifier } from "./table"

export interface RelationResolverOptions<Orm extends OrmAdapter>
	extends Omit<FieldResolverOptions<Orm>, "modify"> {
	filters?: FiltersDef
	modify?: TableResolveModifier<Orm>
}

export function defineRelationResolver<Orm extends OrmAdapter>(
	options: RelationResolverOptions<Orm> = {}
): FieldResolver<Orm> {
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
