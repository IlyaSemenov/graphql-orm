import type { FilterConfig } from "../filter"
import type { OrmAdapter } from "../orm/orm"

import type {
	FieldResolver,
	FieldResolverOptions,
} from "./field"
import { parseFieldOptions } from "./field"
import type { TableResolveModifier } from "./table"

export interface RelationResolverOptions<Orm extends OrmAdapter, Context>
	extends Omit<FieldResolverOptions<Orm, Context>, "modify"> {
	filters?: FilterConfig
	modify?: TableResolveModifier<Orm, Context>
}

export function defineRelationResolver<Orm extends OrmAdapter, Context>(
	options: RelationResolverOptions<Orm, Context> = {},
): FieldResolver<Orm, Context> {
	const { tableField, filters, modify } = parseFieldOptions(options)

	return function resolve(query, context) {
		const { graph, field } = context
		return graph.orm.selectRelation(query, {
			relation: tableField || field,
			as: field,
			modify(subquery) {
				subquery = graph._resolveType(subquery, { ...context, filters })
				return modify ? modify(subquery, context) : subquery
			},
		})
	}
}
