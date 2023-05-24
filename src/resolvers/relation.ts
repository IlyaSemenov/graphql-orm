import { FiltersDef } from "../filters/filters"
import { defineFieldResolver, FieldResolverOptions } from "./field"
import { QueryTreeModifier } from "./table"

export interface RelationResolverOptions
	extends Omit<FieldResolverOptions, "modify"> {
	filters?: FiltersDef
	modify?: QueryTreeModifier
}

export function defineRelationResolver(options: RelationResolverOptions = {}) {
	const { tableField, filters, modify } = options

	return defineFieldResolver({
		modify: (query, { field, tree, graph }) =>
			query.select({
				[field]: (q) => {
					const relation_query = graph._resolve_type({
						tree,
						query: (q as any)[tableField || field],
						filters,
					})
					return modify ? modify(relation_query, tree) : relation_query
				},
			}),
	})
}
