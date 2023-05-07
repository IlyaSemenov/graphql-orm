import { Model } from "objection"

import { FiltersDef } from "../filter"
import { run_after } from "../helpers/run-after"
import { PaginatorFn } from "../paginators"
import { FieldResolver, FieldResolverOptions } from "./field"
import { Modifier } from "./model"

export interface RelationResolverOptions<M extends Model, R extends Model>
	extends Exclude<FieldResolverOptions<M>, "select"> {
	filter?: FiltersDef
	paginate?: PaginatorFn<R>
	modifier?: Modifier<R>
}

export function RelationResolver<M extends Model, R extends Model>(
	options?: RelationResolverOptions<M, R>
) {
	const filter = options?.filter
	const paginate = options?.paginate
	const modifier = options?.modifier

	return FieldResolver<M>({
		select(query, { field, tree, resolve_tree }) {
			// withGraphFetched will disregard paginator's runAfter callback (which converts object list into cursor and nodes)
			// Save it locally and then re-inject
			let paginated_results: any

			query
				.withGraphFetched(
					`${options?.modelField || field}(${field}) as ${field}`,
					paginate ? { maxBatchSize: 1 } : undefined
				)
				.modifiers({
					[field]: (subquery) => {
						resolve_tree({
							tree,
							query: subquery,
							filter,
							paginate,
						})
						if (paginate) {
							subquery.runAfter((results) => {
								// Save paginated results
								paginated_results = results
							})
						}
						if (modifier) {
							modifier(subquery, tree)
						}
					},
				})

			if (paginate) {
				query.runAfter(
					// Re-inject paginated results
					// They have been overwritten by objection.js by now
					run_after((instance) => {
						instance[field] = paginated_results
						return instance
					})
				)
			}
		},
	})
}
