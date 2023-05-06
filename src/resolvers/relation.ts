import { Model, QueryBuilder } from "objection"

import { FiltersDef } from "../filters"
import { create_field_resolver, FieldResolverOptions } from "./field"
import { QueryTreeModifier } from "./model"

export interface RelationResolverOptions<M extends Model, R extends Model>
	extends Omit<FieldResolverOptions<M>, "modify"> {
	filters?: FiltersDef
	modify?: QueryTreeModifier<R>
}

export function create_relation_resolver<M extends Model, R extends Model>(
	options: RelationResolverOptions<M, R> = {}
) {
	const { modelField, filters, modify } = options

	return create_field_resolver<M>({
		modify(query, { field, tree, graph }) {
			query
				.withGraphFetched(`${modelField || field} as ${field}`)
				.modifyGraph<R>(field, (_query) => {
					const query = _query as QueryBuilder<R, any>
					graph._resolve_model({ tree, query, filters })
					modify?.(query, tree)
				})
		},
	})
}
