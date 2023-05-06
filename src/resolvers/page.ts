import { Model, QueryBuilder } from "objection"

import { run_after_query } from "../helpers/run-after"
import { Paginator } from "../paginators/base"
import { create_field_resolver } from "./field"
import { RelationResolverOptions } from "./relation"

export function create_page_resolver<M extends Model, R extends Model>(
	paginator: Paginator<R, any>,
	options: RelationResolverOptions<M, R> = {}
) {
	const { modelField, filters, modify } = options

	return create_field_resolver<M>({
		modify(query, { field, tree, graph }) {
			// withGraphFetched will disregard paginator's runAfter callback (which converts object list into cursor and nodes).
			// Save the results locally and then re-inject.
			let paginated_results: any

			query
				.withGraphFetched(`${modelField || field} as ${field}`, {
					maxBatchSize: 1,
				})
				.modifyGraph<R>(field, (_query) => {
					const query = _query as QueryBuilder<R, any>
					graph._resolve_page({ tree, query, paginator, filters })
					query.runAfter((results) => {
						// Save paginated results
						paginated_results = results
					})
					modify?.(query, tree)
				})

			// Re-inject paginated results (they have been overwritten by objection.js by now).
			run_after_query(query, (instance) => {
				instance[field] = paginated_results
				return instance
			})
		},
	})
}
