import { ResolveTree } from "graphql-parse-resolve-info"
import { Query } from "pqb"

import { get_query_context } from "../utils/query-context"
import { run_after_query } from "../utils/run-after"
import type { GraphResolver } from "./graph"

/* A function that modifies the query to select a field. */
export type FieldResolverFn = (
	query: Query,
	options: {
		/** GraphQL field */
		field: string
		/** GraphQL resolve tree */
		tree: ResolveTree
		/** Current graph resolver */
		graph: GraphResolver
	}
) => Query

export interface FieldResolverOptions {
	/** Table field (if different from GraphQL field) */
	tableField?: string
	/** Custom query modifier (if different than simply selecting a field). */
	modify?: FieldResolverFn
	/** Post-process selected value. Return a new value or a promise. */
	transform?(value: any, instance: any, context: any): any
}

export function defineFieldResolver(
	options: FieldResolverOptions = {}
): FieldResolverFn {
	const { tableField, modify, transform } = options

	return function resolve(query, options) {
		const { field } = options
		if (modify) {
			return modify(query, options)
		} else {
			query = query.select({ [field]: tableField || field })
		}
		if (transform) {
			const context = get_query_context(query)
			query = run_after_query(query, async (instance) => {
				instance[field] = await transform(instance[field], instance, context)
				return instance
			})
		}
		return query
	}
}
