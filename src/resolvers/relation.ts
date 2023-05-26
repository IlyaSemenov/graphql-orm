import { FiltersDef } from "../filters/filters"
import { defineFieldResolver, FieldResolverOptions } from "./field"
import { TableResolverFn } from "./table"

export interface RelationResolverOptions
	extends Omit<FieldResolverOptions, "modify"> {
	filters?: FiltersDef
	modify?: TableResolverFn
}

export function defineRelationResolver(options: RelationResolverOptions = {}) {
	const { tableField, filters, modify } = options

	return defineFieldResolver({
		modify(query, context) {
			const { graph, field } = context
			return query.select({
				[field]: (q) => {
					const relation_query = graph._resolve_type(
						(q as any)[tableField || field],
						{ ...context, filters }
					)
					return modify ? modify(relation_query, context) : relation_query
				},
			})
		},
	})
}
